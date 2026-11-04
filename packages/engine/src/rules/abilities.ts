// Normal attacks, skills and ultimates (heroes/README.md, combat.md "Turn Flow" and "Damage Resolution").
import type { ActionOf } from "../actions.ts";
import { abilityOf, evalFormula, heroDef, unitDef, type AbilityRef, type Content } from "../content.ts";
import type { AbilityDef, Falloff, FormulaInput, OnHit, SummonDef } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { findUnit, unitAt, type GameState, type Unit } from "../state.ts";
import { stat, statBeforeHooks } from "../stats.ts";
import {
  applyCc,
  giveShield,
  healFrom,
  hitDamage,
  lifeStealOnHit,
  loseHp,
  reduceBreakBar,
  shieldTotal,
  useShields,
} from "./damage.ts";
import { addBuff, applyDot, countdown, damageObject, endStealth } from "./status.ts";
import { hookApi, queueInterject, takeAction } from "./interject.ts";
import { resolveArea, type Aim, type Area, type AreaOptions } from "./targeting.ts";
import { hitTower, towerAt, validateTowerAttack } from "./towers.ts";

const evalF = evalFormula;

// rules.md "Cards": a summoned unit's first attack each Round is cheaper.
export function manaCost(c: Content, s: GameState, u: Unit, ref: AbilityRef, ab: AbilityDef): number {
  if (ref === "normal" && u.kind === "summon" && u.attacksThisRound === 0) {
    const first = (unitDef(c, u.defId) as SummonDef).firstAttackMana;
    return u.summonedRound === s.round ? first.summonRound : first.laterRounds;
  }
  return ab.mana;
}

export function validateUseAbility(c: Content, s: GameState, a: ActionOf<"UseAbility">): string | null {
  if (s.phase !== "combat" || a.seat !== s.activeSeat) return "not your Turn";
  const u = findUnit(s, a.unitId);
  if (!u || u.owner !== a.seat) return "not your unit";
  if (u.dead || !u.pos) return "unit is not on the board";
  const ab = abilityOf(c, u.defId, a.ability);
  if (!ab) return "no such ability";
  // CC effects as in the prototype: Stun stops everything, Silence stops skills and ultimates.
  if (u.cc.stun !== undefined) return "stunned";
  if (a.ability !== "normal" && u.cc.silence !== undefined) return "silenced";
  if (u.lockedOut) return "cannot act right now";
  // A special needs its hero's hook (interject.ts "UnitHooks").
  if (ab.special && !unitDef(c, u.defId).hooks?.specials?.[ab.special]) return "not available yet";
  if (s.players[a.seat].mana < manaCost(c, s, u, a.ability, ab)) return "not enough mana";
  if (a.ability === "ultimate" && u.ult < heroDef(c, u.defId)!.ultimate.ultCost) return "not enough Ult Points";
  const tower = towerTile(s, a);
  if (tower) return a.ability === "normal" ? validateTowerAttack(s, u, ab, tower) : "only normal attacks can hit towers";
  const area = resolveArea(s, u, ab.form, a.aim, areaOptions(c, s, [], u));
  if (typeof area === "string") return area;
  if (ab.special) {
    const why = unitDef(c, u.defId).hooks?.checks?.[ab.special]?.(hookApi(c, s, [], u), { area, aim: a.aim });
    if (why) return why;
  }
  // An attack must hit someone (as in the prototype: no swinging at empty air).
  // A manual interject is locked to tiles, so units may still walk in before it resolves.
  const damages = ab.physical !== undefined || ab.magic !== undefined || (ab.onHit?.length ?? 0) > 0;
  if (damages && !ab.interject && (ab.form.hit === "all" || ab.form.hit === "first") && area.enemies.length === 0) return "no enemy in the area";
  return null;
}

// board.md "Falloff": after zone values, before mitigation; only on a type the tile has, never below 1.
function falloff(value: number, f: Falloff | undefined, step: number): number {
  if (!f || value <= 0 || step <= 1) return value;
  const cut = "each" in f ? f.each * (step - 1) : f.steps[Math.min(step - 2, f.steps.length - 1)]!;
  return Math.max(value - cut, 1);
}

// The aimed tile, if it is a tower's (rules.md "Tower").
function towerTile(s: GameState, a: ActionOf<"UseAbility">) {
  const p = a.aim.tiles?.[0];
  return p && towerAt(s, p) ? p : null;
}

// One hit of Physical + Magic from `u` on `t` (combat.md "Hits"): shields, damage, the attacker's hit hooks
// (interject.ts "UnitHooks": hitValues before mitigation, bonusDamage after), Life Steal, and a Hit event.
// Returns false if a shield took the whole hit. Counter-attacks and other hook hits use this too.
export function strike(c: Content, s: GameState, u: Unit, t: Unit, physical: number, magic: number, extraPen: number, events: GameEvent[]): boolean {
  const hooks = unitDef(c, u.defId).hooks;
  const api = hookApi(c, s, events, u);
  const v = hooks?.hitValues ? hooks.hitValues(api, t, { physical, magic }) : { physical, magic };
  let damage = 0;
  let through = true;
  if (v.physical > 0 || v.magic > 0) {
    const hadShield = shieldTotal(t) > 0;
    const r = hitDamage(c, u, t, v.physical, v.magic, extraPen);
    if (r.absorbed > 0) {
      useShields(t, r.absorbed);
      events.push({ type: "ShieldAbsorbed", unitId: t.id, amount: r.absorbed });
    }
    damage = r.damage;
    through = r.through || !hadShield;
    if (through && hooks?.bonusDamage) damage += Math.max(hooks.bonusDamage(api, t, extraPen), 0);
  }
  // The target's own hook (e.g. Pley's speed dodge, or no damage while in the air).
  const taken = unitDef(c, t.defId).hooks?.hitTaken;
  if (taken) damage = Math.max(taken(hookApi(c, s, events, t), u, damage), 0);
  // statuses.md "Stealth": being hit ends it.
  if (t.stealth && t.owner !== u.owner) endStealth(t, events);
  loseHp(c, s, t, damage, u, events);
  lifeStealOnHit(c, u, t, damage, events);
  events.push({ type: "Hit", unitId: t.id, sourceId: u.id, damage });
  return through;
}

// The unit's own targeting hooks (interject.ts "UnitHooks.extendLane").
function areaOptions(c: Content, s: GameState, events: GameEvent[], u: Unit): AreaOptions {
  const extend = unitDef(c, u.defId).hooks?.extendLane;
  return extend ? { extendLane: (end, step) => extend(hookApi(c, s, events, u), end, step) } : {};
}

// What a formula reads (defs.ts "FormulaInput"). DEF is the value before hero hooks (Bianca's conversion).
function formulaInput(c: Content, u: Unit, index: number, target: Unit | null): FormulaInput {
  return {
    atk: stat(c, u, "atk"),
    def: statBeforeHooks(c, u, "def"),
    stat: (name) => stat(c, u, name),
    index,
    target: target ? { hp: target.hp, maxHp: stat(c, target, "maxHp") } : null,
  };
}

export function applyUseAbility(c: Content, s: GameState, a: ActionOf<"UseAbility">, events: GameEvent[]): void {
  const u = findUnit(s, a.unitId)!;
  const ab = abilityOf(c, u.defId, a.ability)!;
  const mana = manaCost(c, s, u, a.ability, ab);

  s.players[a.seat].mana -= mana;
  s.undoSteps = []; // board.md "Undo": steps cannot be undone after an action
  if (a.ability === "normal") u.attacksThisRound += 1;
  if (!ab.freeAction) u.usedOwnTurn = true; // combat.md "Turn Flow": a Free Action does not use the Own Turn
  gainOrSpendUlt(c, u, a.ability, ab);

  const tower = towerTile(s, a);
  const tiles = tower ? [tower] : (resolveArea(s, u, ab.form, a.aim, areaOptions(c, s, events, u)) as Area).tiles;
  events.push({ type: "AbilityUsed", unitId: u.id, ability: a.ability, name: ab.name, tiles, mana });

  // combat.md "Manual Interject": the aim is locked now, the effects come `delay` Turns later.
  if (ab.interject) {
    queueInterject(c, s, u, ab.name, "ability", events, false, { turns: ab.interject.delay, ability: a.ability, aim: a.aim });
    return;
  }
  takeAction(c, u);
  if (tower) {
    const input = formulaInput(c, u, 0, null);
    hitTower(s, tower, evalF(ab.physical, input) + evalF(ab.magic, input), events);
    return;
  }
  resolveAbility(c, s, u, ab, a.aim, events);
}

// An ability's effects on its area. False if the aim no longer gives an area (e.g. a manual interject's tiles).
export function resolveAbility(c: Content, s: GameState, u: Unit, ab: AbilityDef, aim: Aim, events: GameEvent[]): boolean {
  const area = resolveArea(s, u, ab.form, aim, areaOptions(c, s, events, u));
  if (typeof area === "string") return false;
  const input = (index: number, target: Unit | null) => formulaInput(c, u, index, target);

  // Damage and on-hit effects on enemies. A zone's values replace the main ones (board.md "Zones").
  const through = new Map<string, boolean>(); // per unit: did any hit get past its shield?
  const breakOf = new Map<string, number>(); // per unit: the Break of the tile it was hit on
  for (const { unit: t, index, zone: zoneId, step } of area.enemies) {
    if (t.dead) continue;
    const zone = zoneId ? ab.zones?.[zoneId] : undefined;
    const inp = input(index, t);
    const physical = falloff(evalF(zone?.physical ?? ab.physical, inp), ab.falloff?.physical, step);
    const magic = falloff(evalF(zone?.magic ?? ab.magic, inp), ab.falloff?.magic, step);
    const rawBrk = evalF(zone?.break ?? ab.break, inp);
    const hitBreak = unitDef(c, u.defId).hooks?.hitBreak;
    const brk = hitBreak ? hitBreak(hookApi(c, s, events, u), t, rawBrk) : rawBrk;
    const wentThrough = strike(c, s, u, t, physical, magic, ab.penetration ?? 0, events);
    through.set(t.id, (through.get(t.id) ?? false) || wentThrough);
    if (!breakOf.has(t.id)) breakOf.set(t.id, brk);

    // combat.md "Break": with a shield that held the whole action, the Break Bar is not reduced.
    if (brk > 0 && ab.breakPerHit && wentThrough) reduceBreakBar(c, s, u, t, brk, events, evalF(ab.breakDmgBonus, inp));
    if (!t.dead) for (const e of [...(ab.onHit ?? []), ...(zone?.onHit ?? [])]) applyOnHit(c, s, u, t, e, inp, events);
    if (!t.dead && ab.knockback) push(s, u, t, events);
  }
  if (!ab.breakPerHit) {
    for (const [id, ok] of through) {
      const brk = breakOf.get(id) ?? 0;
      if (ok && brk > 0) reduceBreakBar(c, s, u, findUnit(s, id)!, brk, events, evalF(ab.breakDmgBonus, input(0, findUnit(s, id)!)));
    }
  }

  // Enemy board objects in the area take the tile's raw damage, no mitigation (e.g. Falka's Scanner).
  for (const { object: o, zone: zoneId, step } of area.objects) {
    const zone = zoneId ? ab.zones?.[zoneId] : undefined;
    const inp = input(0, null);
    const dmg = falloff(evalF(zone?.physical ?? ab.physical, inp), ab.falloff?.physical, step) + falloff(evalF(zone?.magic ?? ab.magic, inp), ab.falloff?.magic, step);
    if (dmg > 0) damageObject(s, o, dmg, events);
  }

  // Support on allies
  for (const ally of area.allies) {
    const inp = input(0, ally);
    if (ab.heal !== undefined) healFrom(c, u, ally, evalF(ab.heal, inp), events);
    if (ab.shield) {
      const amount = evalF(ab.shield.amount, inp);
      giveShield(s, ally, ab.shield.mode, amount, ab.shield.turns, countdown(ab.shield.per, u, ally));
      events.push({ type: "ShieldGained", unitId: ally.id, amount, mode: ab.shield.mode });
    }
    for (const b of ab.buffs ?? []) addBuff(s, u, ally, b, events);
    if (ab.cleanse) cleanse(c, ally, events);
  }

  // On the user
  if (ab.selfHeal !== undefined) healFrom(c, u, u, evalF(ab.selfHeal, input(0, u)), events);
  if (ab.selfBuff) addBuff(s, u, u, ab.selfBuff, events);

  // The hero's own mechanic, if the ability has one (interject.ts "UnitHooks").
  if (ab.special) unitDef(c, u.defId).hooks?.specials?.[ab.special]?.(hookApi(c, s, events, u), { area, aim });
  return true;
}

// heroes/README.md "Ult Points". Summons have no Ult Points.
function gainOrSpendUlt(c: Content, u: Unit, ref: AbilityRef, ab: AbilityDef): void {
  const hero = heroDef(c, u.defId);
  if (!hero) return;
  if (ref === "ultimate") {
    u.ult -= hero.ultimate.ultCost;
    return;
  }
  const gain = ab.ultGain ?? (ref === "normal" ? 1 : 2);
  u.ult = Math.min(u.ult + gain, hero.ultimate.ultMax);
}

function applyOnHit(c: Content, s: GameState, user: Unit, t: Unit, e: OnHit, input: FormulaInput, events: GameEvent[]): void {
  if (e.type === "cc") {
    applyCc(c, t, e.cc, e.recovery, events);
    return;
  }
  const mods = (e.mods ?? []).map((m) => ({ stat: m.stat, amount: evalF(m.amount, input) }));
  applyDot(c, s, user, t, e, evalF(e.damage, input), events, mods);
}

// Removes CC and DOT. Ending a Break Stun refills the Break Bar (combat.md "Break").
function cleanse(c: Content, u: Unit, events: GameEvent[]): void {
  for (const kind of Object.keys(u.cc)) events.push({ type: "StatusEnded", unitId: u.id, status: kind });
  for (const d of u.dots) events.push({ type: "StatusEnded", unitId: u.id, status: d.id });
  if (u.broken && u.cc.stun !== undefined) {
    u.broken = false;
    u.breakBar = unitDef(c, u.defId).stats.breakBar;
    events.push({ type: "BreakRestored", unitId: u.id });
  }
  u.cc = {};
  u.dots = [];
}

// Push 1 tile straight away from the user (prototype): along the longer axis, if that tile is free.
function push(s: GameState, user: Unit, t: Unit, events: GameEvent[]): void {
  const dx = t.pos!.x - user.pos!.x;
  const dy = t.pos!.y - user.pos!.y;
  const step = Math.abs(dx) >= Math.abs(dy) ? { x: Math.sign(dx), y: 0 } : { x: 0, y: Math.sign(dy) };
  const to = { x: t.pos!.x + step.x, y: t.pos!.y + step.y };
  if (to.x < 0 || to.y < 0 || to.x >= s.config.boardWidth || to.y >= s.config.boardHeight || unitAt(s, to)) return;
  events.push({ type: "UnitPushed", unitId: t.id, from: t.pos!, to });
  t.pos = to;
}
