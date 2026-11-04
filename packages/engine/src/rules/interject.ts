// combat.md "Action Order" and "Interject", and the hero hooks that use them.
// CLAUDE.md "Engine rules": unusual mechanics live in each hero's own file as hooks, not in the engine core.
// The core only offers the trigger points below; a hero's hooks decide what happens.
import { abilityOf, unitDef, type AbilityRef, type Content } from "../content.ts";
import type { StatName } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { EveryTurn, findUnit, type Countdown, type GameState, type Pending, type Unit } from "../state.ts";
import { stat } from "../stats.ts";
import { resolveAbility } from "./abilities.ts";
import type { Pos } from "../board.ts";
import type { Aim, Area } from "./targeting.ts";

// What a hook may use. `self` is the unit whose hooks run.
export interface HookApi {
  c: Content;
  s: GameState;
  events: GameEvent[];
  self: Unit;
  // combat.md "Automatic Interject": queue an interject of `self`, resolved by hooks.interjects[key].
  // Ignored while `self` is dead or crowd-controlled ("Fizzle").
  interject(name: string, key: string, opts?: InterjectOptions): void;
  // Inside an interject: the tile its player chose, once they have (see ask).
  picked?: Pos;
  // Inside an interject: stop and let its player choose one of `options` (`fallback` when time runs out).
  // The interject runs again with `picked` set.
  ask(options: Pos[], fallback: Pos): void;
}

export interface SpecialContext {
  area: Area;
  aim: Aim;
}

export interface InterjectOptions {
  actionValue?: number; // for something with its own Speed and Action Count (e.g. Zoran's lantern); default: this unit's
  turns?: number; // resolve after this many Turns (counted like Durations); default 0 = right away
  count?: Countdown;
  data?: Record<string, number | string>;
}

export interface UnitHooks {
  // A passive that changes a stat (e.g. Bianca's DEF → Armor). `raw` reads stats before this hook.
  stat?(u: Unit, name: StatName, value: number, raw: (name: StatName) => number): number;
  // Sees every event of the match, on any player's Turn (e.g. to trigger an automatic interject).
  onEvent?(api: HookApi, e: GameEvent): void;
  // Changes one of this unit's hits on `target` before mitigation (e.g. Eira: +2 on a Slowed enemy).
  hitValues?(api: HookApi, target: Unit, v: { physical: number; magic: number }): { physical: number; magic: number };
  // Extra HP damage once per hit that gets past shields (e.g. Valen's passive). extraPen = the ability's own Penetration.
  bonusDamage?(api: HookApi, target: Unit, extraPen: number): number;
  // Changes the Break of this unit's hit on `target` (e.g. Falka's marked shots).
  hitBreak?(api: HookApi, target: Unit, brk: number): number;
  // When this unit is hit: the HP damage it really takes (e.g. Pley's speed dodge). `api.self` is the unit hit.
  hitTaken?(api: HookApi, attacker: Unit, damage: number): number;
  // Tiles a Hit: First lane goes on through after its last tile (e.g. Falka's Scan Field). step = the lane's direction.
  extendLane?(api: HookApi, end: Pos, step: Pos): Pos[];
  // Things the player can do with this unit outside the normal attack / skills (e.g. Falka ending her Stealth).
  // Free, does not end the Turn (actions.ts "UnitCommand").
  commands?: Readonly<Record<string, { check?(api: HookApi): string | null; run(api: HookApi): void }>>;
  // An ability's `special`, run after its normal effects; `checks` can refuse the aim first.
  specials?: Readonly<Record<string, (api: HookApi, ctx: SpecialContext) => void>>;
  checks?: Readonly<Record<string, (api: HookApi, ctx: SpecialContext) => string | null>>;
  // Resolves an interject this unit queued.
  interjects?: Readonly<Record<string, (api: HookApi, p: Pending) => void>>;
}

export function hookApi(c: Content, s: GameState, events: GameEvent[], self: Unit, during?: Pending, picked?: Pos): HookApi {
  return {
    c,
    s,
    events,
    self,
    ...(picked ? { picked } : {}),
    interject: (name, key, opts) => queueInterject(c, s, self, name, key, events, true, opts),
    ask: (options, fallback) => {
      if (!during) throw new Error("ask() only works inside an interject");
      s.choice = { seat: self.owner, pending: during, options, fallback };
      events.push({ type: "ChoiceAsked", seat: self.owner, unitId: self.id, name: during.name, options });
    },
  };
}

// combat.md "Action Order": counts this Action and returns its Action Value,
//   Action Value = Action Count × 10,000 / Speed, rounded up.
export function takeAction(c: Content, u: Unit): number {
  u.actionCount += 1;
  const speed = stat(c, u, "speed");
  return Math.floor((u.actionCount * 10000 + speed - 1) / speed);
}

export function queueInterject(
  c: Content,
  s: GameState,
  u: Unit,
  name: string,
  key: string,
  events: GameEvent[],
  automatic: boolean,
  opts: InterjectOptions & { ability?: AbilityRef; aim?: Aim } = {},
): void {
  // "Fizzle": a crowd-controlled unit cannot trigger automatic interjects.
  if (u.dead || (automatic && Object.keys(u.cc).length > 0)) return;
  const p: Pending = {
    id: s.nextPendingId++,
    unitId: u.id,
    name,
    actionValue: opts.actionValue ?? takeAction(c, u),
    key,
    turnsLeft: opts.turns ?? 0,
    count: opts.count ?? EveryTurn,
    appliedTurn: s.turn,
  };
  if (opts.ability !== undefined) p.ability = opts.ability;
  if (opts.aim) p.aim = opts.aim;
  if (opts.data) p.data = opts.data;
  s.pending.push(p);
  events.push({ type: "InterjectQueued", id: p.id, unitId: u.id, name, actionValue: p.actionValue, turnsLeft: p.turnsLeft });
}

// "Fizzle": the caster died or is crowd-controlled before it resolves.
function resolvePending(c: Content, s: GameState, p: Pending, events: GameEvent[], picked?: Pos): void {
  const u = findUnit(s, p.unitId);
  if (!u || u.dead || Object.keys(u.cc).length > 0) {
    events.push({ type: "InterjectFizzled", id: p.id, unitId: p.unitId, name: p.name });
    return;
  }
  if (!picked) events.push({ type: "InterjectResolved", id: p.id, unitId: u.id, name: p.name });
  if (p.key === "ability") {
    if (!resolveAbility(c, s, u, abilityOf(c, u.defId, p.ability!)!, p.aim ?? {}, events)) {
      events.push({ type: "InterjectFizzled", id: p.id, unitId: u.id, name: p.name }); // its tiles are no longer reachable
    }
    return;
  }
  unitDef(c, u.defId).hooks?.interjects?.[p.key]?.(hookApi(c, s, events, u, p, picked), p);
}

// The player chose (or time ran out): the interject that asked runs again with that tile.
export function resumeChoice(c: Content, s: GameState, picked: Pos, events: GameEvent[]): void {
  const ch = s.choice!;
  s.choice = null;
  resolvePending(c, s, ch.pending, events, picked);
}

// How many events of one apply() the hooks have already seen.
const seenCount = new WeakMap<GameEvent[], number>();

// Lets every unit's hooks see the events they have not seen yet. Hooks may queue interjects here;
// nothing resolves until the Turn ends.
export function notify(c: Content, s: GameState, events: GameEvent[]): void {
  for (let i = seenCount.get(events) ?? 0; i < events.length; i++) {
    seenCount.set(events, i + 1);
    for (const u of [...s.units]) unitDef(c, u.defId).hooks?.onEvent?.(hookApi(c, s, events, u), events[i]!);
  }
}

// combat.md "Interject": interjects resolve when a Turn ends, after its Action and its end-of-Turn countdowns.
// "Resolution Order": lower Action Value first, then the one cast or triggered first. Interjects they
// trigger resolve right after, until nothing new happens.
// Returns false if an interject is waiting for its player's choice (the rest resolve after it).
export function resolveInterjects(c: Content, s: GameState, events: GameEvent[]): boolean {
  for (let round = 0; round < 200; round++) {
    notify(c, s, events);
    if (s.choice) return false;
    const due = s.pending.filter((p) => p.turnsLeft === 0).sort((a, b) => a.actionValue - b.actionValue || a.id - b.id);
    if (due.length === 0 || s.phase === "over") return true;
    s.pending = s.pending.filter((p) => p.turnsLeft !== 0);
    for (const [i, p] of due.entries()) {
      resolvePending(c, s, p, events);
      if (s.choice) {
        s.pending.push(...due.slice(i + 1)); // still due, after the choice
        return false;
      }
    }
  }
  throw new Error("interjects keep triggering each other");
}
