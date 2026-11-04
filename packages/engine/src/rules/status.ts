// Things that count down: CC (combat.md "Crowd Control"), buffs and shields ("Durations"),
// DOT ("Damage over Time"), shared statuses (statuses.md), and the win check (rules.md "Win Conditions").
import type { Seat } from "../config.ts";
import { unitDef, type Content } from "../content.ts";
import type { Buff, CcKind, OnHit, Per } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { h, mulPct, roundH } from "../num.ts";
import type { Pos } from "../board.ts";
import { findUnit, Seats, type BoardObject, type Countdown, type Dot, type GameState, type Unit } from "../state.ts";
import { stat } from "../stats.ts";
import { loseHp } from "./damage.ts";

// Board objects (state.ts "BoardObject"): placed by hooks, counted down like Durations, removed at 0 HP.
export function placeObject(s: GameState, maker: Unit, kind: string, pos: Pos, hp: number | null, turns: number, count: Countdown, events: GameEvent[]): BoardObject {
  const o: BoardObject = { id: `O${s.nextObjectId++}`, kind, ownerId: maker.id, owner: maker.owner, pos, hp, turnsLeft: turns, count, appliedTurn: s.turn, vars: {} };
  s.objects.push(o);
  events.push({ type: "ObjectPlaced", id: o.id, kind, owner: o.owner, to: pos });
  return o;
}

export function removeObject(s: GameState, o: BoardObject, events: GameEvent[]): void {
  if (!s.objects.includes(o)) return;
  s.objects = s.objects.filter((x) => x !== o);
  events.push({ type: "ObjectRemoved", id: o.id });
}

export function damageObject(s: GameState, o: BoardObject, amount: number, events: GameEvent[]): void {
  if (o.hp === null) return;
  o.hp = Math.max(o.hp - amount, 0);
  events.push({ type: "ObjectDamaged", id: o.id, amount, hp: o.hp });
  if (o.hp === 0) removeObject(s, o, events);
}

// statuses.md "Stealth".
export function endStealth(u: Unit, events: GameEvent[]): void {
  if (!u.stealth) return;
  u.stealth = false;
  events.push({ type: "StatusEnded", unitId: u.id, status: "stealth" });
}

// combat.md "Durations": team = the caster's team; own = the holder's Own Turns.
export function countdown(per: Per | undefined, caster: Unit | null, holder: Unit): Countdown {
  if (per === "team") return { per: "team", seat: (caster ?? holder).owner };
  if (per === "own") return { per: "own", unitId: holder.id };
  return { per: "turn" };
}

export function addBuff(s: GameState, caster: Unit | null, holder: Unit, b: Buff, events: GameEvent[]): void {
  holder.buffs.push({
    stat: b.stat,
    amount: b.amount,
    kind: b.kind ?? "flat",
    turnsLeft: b.turns,
    count: countdown(b.per, caster, holder),
    appliedTurn: s.turn,
  });
  if (b.name) holder.buffs[holder.buffs.length - 1]!.name = b.name;
  events.push({ type: "StatusApplied", unitId: holder.id, status: b.name ?? `${b.stat} +${b.amount}` });
}

// statuses.md "Wither N": Max HP − N, stacks, each stack counts on its own. Max HP never goes below 1 (stats.ts).
// HP above the lowered max is kept (Keep); when a stack ends Max HP comes back, HP does not.
export function applyWither(s: GameState, caster: Unit | null, holder: Unit, n: number, turns: number, per: Per, events: GameEvent[]): void {
  if (holder.dead || n <= 0) return;
  holder.buffs.push({
    stat: "maxHp",
    amount: -n,
    kind: "flat",
    name: "wither",
    turnsLeft: turns,
    count: countdown(per, caster, holder),
    appliedTurn: s.turn,
  });
  events.push({ type: "StatusApplied", unitId: holder.id, status: "wither" });
}

// combat.md "Damage over Time": DOT Damage = (Damage per tick + DOT Boost) × DOT Power%, stored when applied.
// Stacks per applier: the same applier replaces its own copy; copies from different appliers stack.
export function applyDot(
  c: Content,
  s: GameState,
  applier: Unit,
  t: Unit,
  e: Extract<OnHit, { type: "dot" }>,
  damage: number,
  events: GameEvent[],
  mods: Dot["mods"] = [],
): void {
  if (t.dead) return;
  t.dots = t.dots.filter((d) => !(d.id === e.id && d.sourceId === applier.id));
  t.dots.push({
    id: e.id,
    kind: e.kind,
    damageH: mulPct(h(damage + stat(c, applier, "dotBoost")), stat(c, applier, "dotPower")),
    breakPerTick: e.breakPerTick ?? 0,
    mods,
    ticksLeft: e.duration,
    appliedTurn: s.turn,
    sourceId: applier.id,
  });
  events.push({ type: "StatusApplied", unitId: t.id, status: e.id });
}

// Tick Damage = max(DOT Damage × DOT Taken% − Fortitude, 1). Ignores shields, DEF, Armor and Magic Armor.
// A DOT with Break per tick lowers the Break Bar, but never below 1 (statuses.md "Nocturnal Flame").
// combat.md "Damage over Time": max(raw × DOT Taken% − Fortitude, 1); ignores shields, DEF, Armor and Magic Armor.
// Also for damage that "follows the DOT rules" but is not a tick (e.g. Serie's Collapse).
export function dotDamage(c: Content, u: Unit, rawH: number): number {
  return Math.max(roundH(mulPct(rawH, stat(c, u, "dotTaken")) - h(stat(c, u, "fortitude"))), 1);
}

function tick(c: Content, s: GameState, u: Unit, d: Dot, events: GameEvent[]): void {
  const damage = dotDamage(c, u, d.damageH);
  events.push({ type: "DotTick", unitId: u.id, dot: d.id, damage, sourceId: d.sourceId });
  loseHp(c, s, u, damage, findUnit(s, d.sourceId) ?? null, events);
  if (!u.dead && !u.broken && d.breakPerTick > 0 && u.breakBar > 1) u.breakBar = Math.max(u.breakBar - d.breakPerTick, 1);
  d.ticksLeft -= 1;
}

function dropEndedDots(u: Unit, events: GameEvent[]): void {
  for (const d of u.dots.filter((x) => x.ticksLeft <= 0)) events.push({ type: "StatusEnded", unitId: u.id, status: d.id });
  u.dots = u.dots.filter((d) => d.ticksLeft > 0);
}

// Does this Turn count down an effect with this countdown? (The Turn it was applied in never does.)
function counts(s: GameState, count: Countdown, appliedTurn: number): boolean {
  if (appliedTurn >= s.turn) return false;
  if (count.per === "team") return s.activeSeat === count.seat;
  if (count.per === "own") return findUnit(s, count.unitId)?.usedOwnTurn === true;
  return true;
}

// combat.md "Manual Interject": a delayed interject counts down like a Duration; at 0 it resolves when the Turn ends.
// Called first at the end of a Turn, while s.activeSeat is still the player whose Turn is ending.
export function countdownInterjects(s: GameState): void {
  for (const p of s.pending) if (p.turnsLeft > 0 && counts(s, p.count, p.appliedTurn)) p.turnsLeft -= 1;
}

// Called at the end of every Turn after its interjects have resolved, while s.activeSeat is still the
// player whose Turn is ending: CC, buffs and shields count down, then Turn DOTs tick last.
export function endOfTurn(c: Content, s: GameState, events: GameEvent[]): void {
  for (const u of s.units) {
    if (u.dead) continue;

    // Remaining Recovery − Speed; the CC ends when it drops below Speed.
    const speed = stat(c, u, "speed");
    for (const kind of Object.keys(u.cc) as CcKind[]) {
      const left = u.cc[kind]! - speed;
      if (left >= speed) {
        u.cc[kind] = left;
        continue;
      }
      delete u.cc[kind];
      events.push({ type: "StatusEnded", unitId: u.id, status: kind });
      if (kind === "stun" && u.broken) {
        u.broken = false;
        u.breakBar = unitDef(c, u.defId).stats.breakBar;
        events.push({ type: "BreakRestored", unitId: u.id });
      }
    }

    // -1 = permanent.
    for (const b of u.buffs) if (b.turnsLeft > 0 && counts(s, b.count, b.appliedTurn)) b.turnsLeft -= 1;
    for (const b of u.buffs.filter((x) => x.turnsLeft === 0)) {
      events.push({ type: "StatusEnded", unitId: u.id, status: b.name ?? `${b.stat} +${b.amount}` });
    }
    u.buffs = u.buffs.filter((b) => b.turnsLeft !== 0);
    for (const sh of u.shields) if (sh.turnsLeft > 0 && counts(s, sh.count, sh.appliedTurn)) sh.turnsLeft -= 1;
    u.shields = u.shields.filter((sh) => sh.turnsLeft !== 0);
  }

  // Turn DOT: ticks at the end of each Turn of the target's team, not in the Turn it was applied in.
  for (const u of s.units) {
    if (u.dead || u.owner !== s.activeSeat) continue;
    for (const d of u.dots.filter((x) => x.kind === "turn" && x.appliedTurn < s.turn)) {
      if (u.dead) break;
      tick(c, s, u, d, events);
    }
    dropEndedDots(u, events);
  }

  for (const o of [...s.objects]) {
    if (o.turnsLeft > 0 && counts(s, o.count, o.appliedTurn)) o.turnsLeft -= 1;
    if (o.turnsLeft === 0) removeObject(s, o, events);
  }

  // rules.md "Cards": off-field cards leave play when their Turns run out (their team buffs end with them).
  for (const seat of Seats) {
    const p = s.players[seat];
    for (const f of p.offField) if (f.turnsLeft > 0 && counts(s, f.count, f.appliedTurn)) f.turnsLeft -= 1;
    for (const f of p.offField.filter((x) => x.turnsLeft === 0)) events.push({ type: "OffFieldEnded", seat, id: f.id });
    p.offField = p.offField.filter((f) => f.turnsLeft !== 0);
  }

  for (const u of s.units) {
    u.usedOwnTurn = false;
    u.actionCount = 0; // combat.md "Action Order": Action Counts reset at the end of each Turn
  }
}

// Round DOT: ticks at the end of every Round, the first time at the end of the Round it was applied in.
export function endOfRoundDots(c: Content, s: GameState, events: GameEvent[]): void {
  for (const u of s.units) {
    if (u.dead) continue;
    for (const d of u.dots.filter((x) => x.kind === "round")) {
      if (u.dead) break;
      tick(c, s, u, d, events);
    }
    dropEndedDots(u, events);
  }
}

// A team with no living hero, or with towersToWin of its towers destroyed, loses.
// No draw: if both lose at once, the active player wins (ideas.md).
export function checkWin(s: GameState, events: GameEvent[]): boolean {
  if (s.phase === "over") return true;
  const lost = (seat: Seat) =>
    !s.units.some((u) => u.kind === "hero" && u.owner === seat && !u.dead) ||
    s.towers[seat].filter((t) => t.destroyed).length >= s.config.towersToWin;
  const losers = Seats.filter(lost);
  if (losers.length === 0) return false;
  const winner = losers.length === 2 ? s.activeSeat : losers[0] === "A" ? "B" : "A";
  s.phase = "over";
  s.winner = winner;
  events.push({ type: "GameOver", winner });
  return true;
}
