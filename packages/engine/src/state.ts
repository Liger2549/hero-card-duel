import { chebyshev, type Pos } from "./board.ts";
import type { MatchConfig, Seat } from "./config.ts";
import { heroDef, unitDef, type AbilityRef, type Content } from "./content.ts";
import type { Aim } from "./rules/targeting.ts";
import type { BuffStat, CcKind, ModifierKind, StatName } from "./defs.ts";

export const Seats = ["A", "B"] as const;

export function otherSeat(seat: Seat): Seat {
  return seat === "A" ? "B" : "A";
}

// combat.md "Durations": which Turns count down a timed effect.
// turn: every Turn. team: only that team's Turns. own: only Turns in which that unit used its Own Turn.
export type Countdown = { per: "turn" } | { per: "team"; seat: Seat } | { per: "own"; unitId: string };

export const EveryTurn: Countdown = { per: "turn" };

// combat.md "Shields". appliedTurn: the Turn it was given in, which is not counted (combat.md "Durations").
export interface Shield {
  mode: "add" | "set";
  amount: number;
  turnsLeft: number; // -1 = permanent
  count: Countdown;
  appliedTurn: number;
  seq: number; // order given; added shields are used oldest first
  name?: string; // given by a hero's hook (e.g. "lantern"), so the hook can find it again
}

export interface ActiveBuff {
  stat: BuffStat;
  amount: number;
  kind: ModifierKind; // combat.md "Stat Modifiers"
  name?: string; // a named status from statuses.md (e.g. "wither"), for the UI
  turnsLeft: number; // -1 = permanent
  count: Countdown;
  appliedTurn: number;
}

// combat.md "Damage over Time". Stacks per applier: one copy per (id, sourceId).
export interface Dot {
  id: string;
  kind: "round" | "turn"; // Round DOT ticks at the end of every Round; Turn DOT at the end of each Turn of the target's team
  damageH: number; // DOT Damage in hundredths, stored when applied: (Damage per tick + DOT Boost) × DOT Power%
  breakPerTick: number; // only some DOTs (e.g. Nocturnal Flame); never lowers the Break Bar below 1
  mods: { stat: StatName; amount: number }[]; // flat stat changes while it lasts (e.g. Voidmark's Erosion)
  ticksLeft: number;
  appliedTurn: number;
  sourceId: string;
}

// A hero or summoned unit.
export interface Unit {
  id: string;
  defId: string;
  kind: "hero" | "summon";
  owner: Seat;
  pos: Pos | null; // null = not placed yet, or dead
  dead: boolean;

  hp: number;
  breakBar: number;
  broken: boolean; // until its Break Stun ends (combat.md "Break")
  ult: number;
  shields: Shield[];
  cc: Partial<Record<CcKind, number>>; // Remaining Recovery (combat.md "Crowd Control")
  dots: Dot[];
  buffs: ActiveBuff[];
  items: string[];

  // board.md "Step Cost": Melee always, Mixed only if its sheet says so.
  getsFreeStep: boolean;
  baseMove: number;
  remainingMove: number;
  stepCost: number;
  freeStepUsed: boolean; // this Round
  prepMoved: boolean; // this Preparation Phase

  // rules.md "Cards": summoned units' cheap first attack
  summonedRound: number | null;
  attacksThisRound: number;

  // combat.md "Turn Flow": did a normal attack, skill or ultimate this Turn (a Free Action does not count).
  usedOwnTurn: boolean;
  // combat.md "Action Order": Actions (normal or interject) this Turn.
  actionCount: number;
  // Numbers a hero's hooks keep (gauges, counters left, …), by name.
  vars: Record<string, number>;
  // Steps that cost no mana, given by skills (e.g. Falka's Exfil). Unused ones are lost when the Round ends.
  freeSteps: number;
  // statuses.md "Stealth".
  stealth: boolean;
  // Out of play for now (e.g. Pley in the air): no Actions, no steps, cannot be swapped.
  lockedOut: boolean;
}

// A thing on a tile that is not a unit (e.g. Falka's Scanner, Ribu's Volatile Core). It never blocks movement.
export interface BoardObject {
  id: string;
  kind: string;
  ownerId: string; // the unit that made it
  owner: Seat;
  pos: Pos;
  hp: number | null; // null = cannot be hit
  turnsLeft: number; // -1 = until its hook removes it
  count: Countdown;
  appliedTurn: number;
  vars: Record<string, number>;
}

export interface Choice {
  seat: Seat;
  pending: Pending; // the interject that asked
  options: Pos[];
  fallback: Pos; // taken when the timer runs out
}

// combat.md "Interject": an Action waiting to resolve.
export interface Pending {
  id: number; // also the order it was cast or triggered in
  unitId: string;
  name: string; // shown in the action order panel
  actionValue: number; // stored when cast or triggered
  key: string; // the hero hook that resolves it (hooks.interjects), or "ability" for a manual interject skill
  ability?: AbilityRef; // manual interject: the skill, with its aim locked to tiles
  aim?: Aim;
  turnsLeft: number; // 0 = resolves at the next resolution point
  count: Countdown;
  appliedTurn: number;
  data?: Record<string, number | string>; // anything the hook wants to keep
}

// One step that can still be undone (board.md "Undo").
export interface StepRecord {
  unitId: string;
  from: Pos;
  cost: number;
  usedFreeStep: boolean;
  usedSkillStep?: boolean; // paid with a free step from a skill (Unit.freeSteps)
  swappedWith?: { unitId: string; cost: number; usedFreeStep: boolean; usedSkillStep?: boolean };
}

export interface PlayerState {
  mana: number;
  gold: number;
  deck: string[]; // card ids; the next card drawn is the last one
  hand: string[];
  stash: string[]; // rules.md "Shop and Items": items not on a hero
  offField: OffFieldCard[]; // rules.md "Cards": off-field cards in play
}

// An off-field card in play. Its team buffs carry the same name, so they end (or are removed) with it.
export interface OffFieldCard {
  id: string; // also the name of its buffs
  cardId: string;
  turnsLeft: number;
  count: Countdown;
  appliedTurn: number;
}

// rules.md "Tower HP"
export interface Tower {
  hp: number;
  maxHp: number;
  shieldByHits: number;
  destroyed: boolean;
}

// rules.md "Before the Game Starts"
export interface DraftState {
  stage: "timeOfDay" | "ban" | "pick";
  bans: Record<Seat, string[]>;
  picks: Record<Seat, string[]>;
  banIndex: number; // into config.banOrder
  pickIndex: number; // into config.pickOrder
}

export interface GameState {
  config: MatchConfig;
  rng: number; // seed, advanced by rng.ts
  round: number;
  turn: number; // counts every Turn of the match (combat.md "Durations")
  phase: "draft" | "prep" | "combat" | "over";
  winner: Seat | null;
  draft: DraftState | null;
  timeOfDay: number; // index into TimesOfDay
  players: Record<Seat, PlayerState>;
  units: Unit[];
  towers: Record<Seat, Tower[]>;
  shieldSeq: number;
  nextUnitId: number; // for summoned units
  pending: Pending[]; // combat.md "Interject"
  nextPendingId: number;
  objects: BoardObject[];
  nextObjectId: number;
  // statuses.md "Stealth": units hidden from the active player when their Turn started. While a player moves,
  // the game shows nothing new, so this stays fixed for the whole Turn.
  hiddenAtTurnStart: string[];
  // combat.md "Interject": an interject waiting for its player to choose (e.g. Pley's dive tile). The Turn's end
  // stops here until a Choose (or ChoiceTimeUp) action.
  choice: Choice | null;

  // Preparation Phase
  ready: Record<Seat, boolean>;
  nextStarter: Seat; // who starts the coming Combat Phase

  // Combat Phase
  activeSeat: Seat; // whose Turn it is
  stepsThisTurn: number; // steps not undone; End Turn needs one
  undoSteps: StepRecord[]; // this Turn only
  outOfRound: Seat[]; // in the order they went out; the first starts next round
}

// A unit as it enters the match, full HP and Break Bar.
export function createUnit(c: Content, defId: string, owner: Seat, id: string, summonedRound: number | null = null): Unit {
  const d = unitDef(c, defId);
  const hero = heroDef(c, defId);
  return {
    id,
    defId,
    kind: hero ? "hero" : "summon",
    owner,
    pos: null,
    dead: false,
    hp: d.stats.maxHp,
    breakBar: d.stats.breakBar,
    broken: false,
    ult: 0,
    shields: [],
    cc: {},
    dots: [],
    buffs: [],
    items: [],
    getsFreeStep: d.attackType === "melee" || (d.attackType === "mixed" && hero?.getsFreeStep === true),
    baseMove: d.stats.move,
    remainingMove: d.stats.move,
    stepCost: 1,
    freeStepUsed: false,
    prepMoved: false,
    summonedRound,
    attacksThisRound: 0,
    usedOwnTurn: false,
    actionCount: 0,
    vars: {},
    freeSteps: 0,
    stealth: false,
    lockedOut: false,
  };
}

export function destroyedTowers(s: GameState, seat: Seat): boolean[] {
  return s.towers[seat].map((t) => t.destroyed);
}

// statuses.md "Stealth": hidden from `seat` while no unit of that seat is in the 8 tiles around it.
// For the player whose Turn it is, what they see is fixed at the start of the Turn (nothing is shown while they move).
export function hiddenFrom(s: GameState, u: Unit, seat: Seat): boolean {
  if (!u.stealth || u.dead || !u.pos || u.owner === seat) return false;
  if (s.phase === "combat" && seat === s.activeSeat) return s.hiddenAtTurnStart.includes(u.id);
  return hiddenByPosition(s, u, seat);
}

export function hiddenByPosition(s: GameState, u: Unit, seat: Seat): boolean {
  return u.stealth && !s.units.some((o) => !o.dead && o.pos && o.owner === seat && chebyshev(o.pos, u.pos!) === 1);
}

// Does `seat` have an enemy it cannot see? (board.md "Undo": then steps cannot be undone.)
export function enemyHidden(s: GameState, seat: Seat): boolean {
  return s.units.some((u) => hiddenFrom(s, u, seat));
}

export function unitAt(s: GameState, p: Pos): Unit | undefined {
  return s.units.find((u) => u.pos !== null && u.pos.x === p.x && u.pos.y === p.y);
}

export function findUnit(s: GameState, id: string): Unit | undefined {
  return s.units.find((u) => u.id === id);
}

// board.md "Step Cost": what this unit's next step costs. Slow adds 1 (prototype).
export function stepCostOf(u: Unit): number {
  if (u.freeSteps > 0 && !(u.getsFreeStep && !u.freeStepUsed)) return 0; // a free step from a skill costs no mana
  const base = u.getsFreeStep && !u.freeStepUsed ? 0 : u.stepCost;
  return base + (u.cc.slow !== undefined ? 1 : 0);
}
