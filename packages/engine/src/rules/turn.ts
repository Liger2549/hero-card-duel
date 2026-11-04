// rules.md "Game Start" (rounds, Preparation Phase, Combat Phase) and combat.md "Turn Flow".
import type { ActionOf } from "../actions.ts";
import { inZone, type Pos } from "../board.ts";
import { TimesOfDay, type MatchConfig, type Seat } from "../config.ts";
import { abilityOf, abilityRefs, type Content } from "../content.ts";
import type { GameEvent } from "../events.ts";
import { randInt } from "../rng.ts";
import { destroyedTowers, findUnit, otherSeat, Seats, unitAt, type GameState, type Unit, hiddenByPosition } from "../state.ts";
import { validateUseAbility } from "./abilities.ts";
import { canPlayAnyCard, draw } from "./cards.ts";
import { canStepAny } from "./movement.ts";
import { notify, resolveInterjects } from "./interject.ts";
import { checkWin, countdownInterjects, endOfRoundDots, endOfTurn } from "./status.ts";
import { candidateAims } from "./targeting.ts";
import { decayTowers, newTowers, updateTowersForRound } from "./towers.ts";

// An empty match before the draft. draft.ts newMatch() starts from this.
export function baseState(config: MatchConfig, seed: number): GameState {
  const player = () => ({ mana: 0, gold: config.startGold, deck: [], hand: [], stash: [], offField: [] });
  return {
    config,
    rng: seed,
    round: 1,
    turn: 0,
    phase: "prep",
    winner: null,
    draft: null,
    timeOfDay: TimesOfDay.indexOf(config.defaultTimeOfDay),
    players: { A: player(), B: player() },
    units: [],
    towers: { A: newTowers(config), B: newTowers(config) },
    shieldSeq: 0,
    pending: [],
    nextPendingId: 1,
    objects: [],
    nextObjectId: 1,
    hiddenAtTurnStart: [],
    choice: null,
    nextUnitId: 1,
    ready: { A: false, B: false },
    nextStarter: config.firstRoundStarter,
    activeSeat: config.firstRoundStarter,
    stepsThisTurn: 0,
    undoSteps: [],
    outOfRound: [],
  };
}

// Skips the draft: round 1's Preparation Phase with these units (made with createUnit()), not placed yet.
// For tests and custom setups. Decks are used as given (not shuffled).
export function newMatchWithUnits(
  config: MatchConfig,
  seed: number,
  units: Unit[],
  decks: Record<Seat, string[]> = { A: [], B: [] },
): GameState {
  const s = baseState(config, seed);
  s.units = units.map((u) => ({ ...u, pos: null }));
  for (const seat of Seats) s.players[seat].deck = [...decks[seat]];
  startFirstRound(s, []);
  return s;
}

export function startFirstRound(s: GameState, events: GameEvent[]): void {
  s.draft = null;
  beginRound(s, events);
}

// rules.md "Preparation Phase": what every round starts with.
function beginRound(s: GameState, events: GameEvent[]): void {
  s.phase = "prep";
  s.ready = { A: false, B: false };
  if (s.round > 1) {
    s.timeOfDay = (s.timeOfDay + 1) % TimesOfDay.length; // rules.md: time of day cycles forward each round
    updateTowersForRound(s);
  }
  for (const seat of Seats) {
    s.players[seat].mana = s.config.manaPerRound;
    if (s.round > 1) s.players[seat].gold += s.config.goldPerRound;
    draw(s, seat, s.round === 1 ? s.config.cardsFirstRound : s.config.cardsPerRound, events);
  }
  for (const u of s.units) {
    u.remainingMove = u.baseMove;
    u.freeStepUsed = false;
    u.prepMoved = false;
    u.attacksThisRound = 0;
    u.freeSteps = 0; // free steps from skills last until the end of the Round
  }
}

// Round 1: place heroes anywhere in the own zone. A placed hero can be placed again.
export function validatePlaceHero(s: GameState, a: ActionOf<"PlaceHero">): string | null {
  if (s.phase !== "prep" || s.round !== 1) return "heroes are placed only in round 1's Preparation Phase";
  if (s.ready[a.seat]) return "already Ready";
  const u = findUnit(s, a.unitId);
  if (!u || u.owner !== a.seat) return "not your unit";
  if (!inZone(s.config, a.seat, a.to, destroyedTowers(s, a.seat))) return "target is outside the zone";
  const other = unitAt(s, a.to);
  if (other && other !== u) return "tile is taken";
  return null;
}

export function applyPlaceHero(s: GameState, a: ActionOf<"PlaceHero">, events: GameEvent[]): void {
  findUnit(s, a.unitId)!.pos = a.to;
  events.push({ type: "HeroPlaced", unitId: a.unitId, to: a.to, random: false });
}

export function validateReady(s: GameState, a: ActionOf<"Ready">): string | null {
  if (s.phase !== "prep") return "only in the Preparation Phase";
  return s.ready[a.seat] ? "already Ready" : null;
}

export function applyReady(c: Content, s: GameState, a: ActionOf<"Ready">, events: GameEvent[]): void {
  s.ready[a.seat] = true;
  events.push({ type: "PlayerReady", seat: a.seat });
  if (Seats.every((seat) => s.ready[seat])) startCombat(c, s, events);
}

export function applyPrepTimeUp(c: Content, s: GameState, events: GameEvent[]): void {
  startCombat(c, s, events);
}

// Heroes still not placed go to random free tiles of their zone.
function startCombat(c: Content, s: GameState, events: GameEvent[]): void {
  for (const u of s.units) {
    if (u.pos || u.dead) continue;
    const free = zoneTiles(s, u.owner).filter((p) => !unitAt(s, p));
    const to = free[randInt(s, free.length)]!;
    u.pos = to;
    events.push({ type: "HeroPlaced", unitId: u.id, to, random: true });
  }
  s.phase = "combat";
  s.outOfRound = [];
  events.push({ type: "CombatStarted", round: s.round, starter: s.nextStarter });
  giveTurn(c, s, [s.nextStarter, otherSeat(s.nextStarter)], events);
}

function zoneTiles(s: GameState, seat: Seat): Pos[] {
  const tiles: Pos[] = [];
  for (let y = 0; y < s.config.boardHeight; y++) {
    for (let x = 0; x < s.config.boardWidth; x++) {
      if (inZone(s.config, seat, { x, y }, destroyedTowers(s, seat))) tiles.push({ x, y });
    }
  }
  return tiles;
}

// End Turn needs at least 1 step this Turn, unless no step is possible.
export function validateEndTurn(s: GameState, a: ActionOf<"EndTurn">): string | null {
  if (s.phase !== "combat" || a.seat !== s.activeSeat) return "not your Turn";
  if (s.stepsThisTurn === 0 && canStepAny(s, a.seat)) return "move at least 1 unit before ending the Turn";
  return null;
}

// End Turn passes the Turn to the other player.
export function applyEndTurn(c: Content, s: GameState, events: GameEvent[]): void {
  events.push({ type: "TurnEnded", seat: s.activeSeat });
  endTurn(c, s, events);
}

export function validateEndRound(s: GameState, a: ActionOf<"EndRound">): string | null {
  return s.phase !== "combat" || a.seat !== s.activeSeat ? "not your Turn" : null;
}

// End Round takes the player out of the Round; the other keeps playing alone.
export function applyEndRound(c: Content, s: GameState, events: GameEvent[]): void {
  s.outOfRound.push(s.activeSeat);
  events.push({ type: "PlayerOut", seat: s.activeSeat, stuck: false });
  endTurn(c, s, events);
}

// Every Turn ends here: by End Turn, or by an Action that is not a Free Action.
// The other player goes next; if they are out, the same player goes again.
export function endTurn(c: Content, s: GameState, events: GameEvent[]): void {
  // combat.md "Interject": interjects resolve when the Turn ends; then the end-of-Turn countdowns, DOT last.
  countdownInterjects(s);
  finishTurn(c, s, events);
}

// The rest of a Turn's end. Stops while an interject waits for its player's choice; Choose comes back here.
export function finishTurn(c: Content, s: GameState, events: GameEvent[]): void {
  if (!resolveInterjects(c, s, events)) return;
  endOfTurn(c, s, events);
  notify(c, s, events); // hooks see deaths from DOT before the win check (e.g. Ribu becoming Pley)
  if (checkWin(s, events)) return;
  decayTowers(s);
  giveTurn(c, s, [otherSeat(s.activeSeat), s.activeSeat], events);
}

// Gives the Turn to the first seat in `order` that is still in the Round.
// A seat that can do nothing goes out instead. When everyone is out, the Round ends.
function giveTurn(c: Content, s: GameState, order: Seat[], events: GameEvent[]): void {
  // board.md "Movement": Remaining Move refills at the end of every Turn.
  for (const u of s.units) u.remainingMove = u.baseMove;
  s.stepsThisTurn = 0;
  s.undoSteps = [];

  for (const seat of order) {
    if (s.outOfRound.includes(seat)) continue;
    s.activeSeat = seat;
    if (canDoAnything(c, s, seat)) {
      s.turn += 1;
      s.hiddenAtTurnStart = s.units.filter((u) => !u.dead && u.pos && u.owner !== seat && hiddenByPosition(s, u, seat)).map((u) => u.id);
      events.push({ type: "TurnStarted", seat });
      return;
    }
    s.outOfRound.push(seat);
    events.push({ type: "PlayerOut", seat, stuck: true });
  }
  endRound(c, s, s.outOfRound[0]!, events);
}

// Can this seat step, play a card, or use any ability somewhere?
function canDoAnything(c: Content, s: GameState, seat: Seat): boolean {
  return (
    canStepAny(s, seat) ||
    canPlayAnyCard(c, s, seat) ||
    s.units.some((u) => u.owner === seat && !u.dead && u.pos && canUseAnyAbility(c, s, u))
  );
}

function canUseAnyAbility(c: Content, s: GameState, u: Unit): boolean {
  return abilityRefs(c, u.defId).some((ability) => {
    const ab = abilityOf(c, u.defId, ability)!;
    return candidateAims(s, u, ab.form, ability === "normal").some(
      (aim) => validateUseAbility(c, s, { type: "UseAbility", seat: u.owner, unitId: u.id, ability, aim }) === null,
    );
  });
}

// rules.md "Who starts": whoever went out first starts the next round.
function endRound(c: Content, s: GameState, starter: Seat, events: GameEvent[]): void {
  endOfRoundDots(c, s, events); // combat.md "Damage over Time"
  notify(c, s, events);
  events.push({ type: "RoundEnded", round: s.round, nextStarter: starter });
  if (checkWin(s, events)) return;
  s.round += 1;
  s.nextStarter = starter;
  s.outOfRound = [];
  beginRound(s, events);
  events.push({ type: "RoundStarted", round: s.round });
}
