// rules.md "Cards": drawing and playing cards. board.md "Placement" for unit cards.
import type { ActionOf } from "../actions.ts";
import { chebyshev, inBounds, inZone, type Pos } from "../board.ts";
import type { Seat } from "../config.ts";
import type { Content } from "../content.ts";
import type { CardDef } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { createUnit, destroyedTowers, findUnit, unitAt, type Countdown, type GameState, type Unit } from "../state.ts";
import { healFrom } from "./damage.ts";
import { addBuff } from "./status.ts";

// Puts a new summoned unit on a free tile (from a card or a hero skill).
export function placeSummon(c: Content, s: GameState, defId: string, owner: Seat, p: Pos, events: GameEvent[]): Unit {
  const u = createUnit(c, defId, owner, `S${s.nextUnitId++}`, s.round);
  u.pos = p;
  s.units.push(u);
  events.push({ type: "UnitSummoned", unitId: u.id, defId: u.defId, owner: u.owner, to: p });
  return u;
}

function cardDef(c: Content, id: string): CardDef {
  const d = c.cards.find((x) => x.id === id);
  if (!d) throw new Error(`unknown card ${id}`);
  return d;
}

// Draws up to `count` cards, never past the hand limit.
export function draw(s: GameState, seat: Seat, count: number, events: GameEvent[]): void {
  const p = s.players[seat];
  let drawn = 0;
  while (drawn < count && p.hand.length < s.config.handLimit && p.deck.length > 0) {
    p.hand.push(p.deck.pop()!);
    drawn++;
  }
  if (drawn > 0) events.push({ type: "CardsDrawn", seat, count: drawn });
}

// Unit cards in both phases (each player on their own in the Preparation Phase);
// other cards only on the player's own Turn in the Combat Phase.
export function validatePlayCard(c: Content, s: GameState, a: ActionOf<"PlayCard">): string | null {
  const id = s.players[a.seat].hand[a.card];
  if (id === undefined) return "no such card";
  const card = cardDef(c, id);
  if (s.phase === "prep") {
    if (s.ready[a.seat]) return "already Ready";
    if (card.kind !== "unit") return "only unit cards in the Preparation Phase";
  } else if (s.phase !== "combat" || a.seat !== s.activeSeat) {
    return "not your Turn";
  }
  if (s.players[a.seat].mana < card.mana) return "not enough mana";
  if (card.offField && s.players[a.seat].offField.length >= s.config.offFieldLimit) return "too many off-field cards in play";

  const p = a.aim.tiles?.[0];
  if (card.target === "none") return null;
  if (!p || !inBounds(s.config, p)) return "choose a tile";
  const there = unitAt(s, p);
  if (card.target === "tile") {
    if (there) return "tile is taken";
    return canPlace(s, a.seat, p) ? null : "place in your zone or next to your own unit";
  }
  if (!there || there.dead || there.owner !== a.seat) return "choose your own unit";
  if (card.target === "allyHero" && there.kind !== "hero") return "choose your own hero";
  return null;
}

// board.md "Placement": inside the own zone, or next to (8 directions) any own hero or unit.
function canPlace(s: GameState, seat: Seat, p: Pos): boolean {
  if (inZone(s.config, seat, p, destroyedTowers(s, seat))) return true;
  return s.units.some((u) => u.owner === seat && !u.dead && u.pos && chebyshev(u.pos, p) === 1);
}

export function applyPlayCard(c: Content, s: GameState, a: ActionOf<"PlayCard">, events: GameEvent[]): void {
  const player = s.players[a.seat];
  const id = player.hand.splice(a.card, 1)[0]!;
  const card = cardDef(c, id);
  player.mana -= card.mana;
  if (s.phase === "combat") s.undoSteps = []; // board.md "Undo": a card ends undo
  events.push({ type: "CardPlayed", seat: a.seat, cardId: id });

  const p = a.aim.tiles?.[0];
  if (card.summon) {
    placeSummon(c, s, card.summon, a.seat, p!, events);
    return;
  }
  // rules.md "Cards": an off-field card buffs the whole team while it is in play (at most offFieldLimit at once).
  if (card.offField) {
    const player = s.players[a.seat];
    const id = `F${s.nextObjectId++}`;
    const count: Countdown = card.offField.per === "team" ? { per: "team", seat: a.seat } : { per: "turn" };
    player.offField.push({ id, cardId: card.id, turnsLeft: card.offField.turns, count, appliedTurn: s.turn });
    events.push({ type: "OffFieldPlayed", seat: a.seat, id, cardId: card.id });
    for (const u of s.units) {
      if (u.dead || u.owner !== a.seat) continue;
      for (const b of card.offField.buffs) addBuff(s, null, u, { ...b, turns: card.offField.turns, ...(card.offField.per ? { per: card.offField.per } : {}), name: id }, events);
    }
    return;
  }
  if (card.manaGain) {
    player.mana += card.manaGain;
    events.push({ type: "ManaGained", seat: a.seat, amount: card.manaGain });
  }
  const target = p ? unitAt(s, p) : undefined;
  if (!target) return;
  if (card.heal) healFrom(c, null, target, card.heal, events);
  for (const b of card.buffs ?? []) addBuff(s, null, target, b, events);
}

// Can this seat play any card right now? (For "can do nothing", combat.md "Turn Flow".)
export function canPlayAnyCard(c: Content, s: GameState, seat: Seat): boolean {
  const hand = s.players[seat].hand;
  for (let card = 0; card < hand.length; card++) {
    if (validatePlayCard(c, s, { type: "PlayCard", seat, card, aim: {} }) === null) return true;
    for (let y = 0; y < s.config.boardHeight; y++) {
      for (let x = 0; x < s.config.boardWidth; x++) {
        if (validatePlayCard(c, s, { type: "PlayCard", seat, card, aim: { tiles: [{ x, y }] } }) === null) return true;
      }
    }
  }
  return false;
}
