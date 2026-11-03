import type { Pos } from "./board.ts";
import type { MatchConfig, Seat } from "./config.ts";
import { heroDef, unitDef, type Content } from "./content.ts";
import type { BuffStat, CcKind, ModifierKind } from "./defs.ts";

export const Seats = ["A", "B"] as const;

export function otherSeat(seat: Seat): Seat {
  return seat === "A" ? "B" : "A";
}

// combat.md "Shields". appliedTurn: the Turn it was given in, which is not counted (combat.md "Durations").
export interface Shield {
  mode: "add" | "set";
  amount: number;
  turnsLeft: number; // -1 = permanent
  appliedTurn: number;
  seq: number; // order given; added shields are used oldest first
}

export interface ActiveBuff {
  stat: BuffStat;
  amount: number;
  kind: ModifierKind; // combat.md "Stat Modifiers"
  turnsLeft: number;
  appliedTurn: number;
}

// combat.md "Damage over Time": damage per tick is worked out when applied.
export interface Dot {
  id: string;
  physical: number;
  magic: number;
  boost: number;
  roundsLeft: number;
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
}

// One step that can still be undone (board.md "Undo").
export interface StepRecord {
  unitId: string;
  from: Pos;
  cost: number;
  usedFreeStep: boolean;
  swappedWith?: { unitId: string; cost: number; usedFreeStep: boolean };
}

export interface PlayerState {
  mana: number;
  gold: number;
  deck: string[]; // card ids; the next card drawn is the last one
  hand: string[];
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
  };
}

export function destroyedTowers(s: GameState, seat: Seat): boolean[] {
  return s.towers[seat].map((t) => t.destroyed);
}

export function unitAt(s: GameState, p: Pos): Unit | undefined {
  return s.units.find((u) => u.pos !== null && u.pos.x === p.x && u.pos.y === p.y);
}

export function findUnit(s: GameState, id: string): Unit | undefined {
  return s.units.find((u) => u.id === id);
}

// board.md "Step Cost": what this unit's next step costs. Slow adds 1 (prototype).
export function stepCostOf(u: Unit): number {
  const base = u.getsFreeStep && !u.freeStepUsed ? 0 : u.stepCost;
  return base + (u.cc.slow !== undefined ? 1 : 0);
}
