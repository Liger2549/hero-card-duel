// Normal attacks, skills and ultimates (heroes/README.md, combat.md "Turn Flow" and "Damage Resolution").
import type { ActionOf } from "../actions.ts";
import { abilityOf, heroDef, unitDef, type AbilityRef, type Content } from "../content.ts";
import type { AbilityDef, Formula, FormulaInput, OnHit, SummonDef } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { findUnit, unitAt, type GameState, type Unit } from "../state.ts";
import { stat } from "../stats.ts";
import {
  applyCc,
  giveShield,
  heal,
  hitDamage,
  lifeStealOnHit,
  loseHp,
  reduceBreakBar,
  shieldTotal,
  useShields,
} from "./damage.ts";
import { resolveArea, type Area } from "./targeting.ts";
import { hitTower, towerAt, validateTowerAttack } from "./towers.ts";

const evalF = (f: Formula | undefined, input: FormulaInput) => (f === undefined ? 0 : typeof f === "number" ? f : f(input));

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
  // Effects that need hero hooks, which are not written yet.
  if (ab.special === "shuffle" || ab.special === "oath" || ab.zone) return "not available yet";
  if (s.players[a.seat].mana < manaCost(c, s, u, a.ability, ab)) return "not enough mana";
  if (a.ability === "ultimate" && u.ult < heroDef(c, u.defId)!.ultimate.ultCost) return "not enough Ult Points";
  if (ab.hpCost && u.hp <= ab.hpCost) return "not enough HP";
  const tower = towerTile(s, a);
  if (tower) return a.ability === "normal" ? validateTowerAttack(s, u, ab, tower) : "only normal attacks can hit towers";
  const area = resolveArea(s, u, ab.targeting, a.aim);
  return typeof area === "string" ? area : null;
}

// The aimed tile, if it is a tower's (rules.md "Tower").
function towerTile(s: GameState, a: ActionOf<"UseAbility">) {
  const p = a.aim.tiles?.[0];
  return p && towerAt(s, p) ? p : null;
}

export function applyUseAbility(c: Content, s: GameState, a: ActionOf<"UseAbility">, events: GameEvent[]): void {
  const u = findUnit(s, a.unitId)!;
  const ab = abilityOf(c, u.defId, a.ability)!;
  const tower = towerTile(s, a);
  const area: Area = tower ? { tiles: [tower], enemies: [], allies: [] } : (resolveArea(s, u, ab.targeting, a.aim) as Area);
  const mana = manaCost(c, s, u, a.ability, ab);

  s.players[a.seat].mana -= mana;
  s.undoSteps = []; // board.md "Undo": steps cannot be undone after an action
  if (a.ability === "normal") u.attacksThisRound += 1;
  if (ab.hpCost) u.hp -= ab.hpCost;
  gainOrSpendUlt(c, u, a.ability, ab);
  events.push({ type: "AbilityUsed", unitId: u.id, ability: a.ability, name: ab.name, tiles: area.tiles, mana });

  const input = (index: number, target: Unit | null): FormulaInput => ({
    atk: stat(c, u, "atk"),
    def: stat(c, u, "def"),
    index,
    target: target ? { hp: target.hp, maxHp: stat(c, target, "maxHp") } : null,
  });

  if (tower) {
    hitTower(s, tower, evalF(ab.physical, input(0, null)) + evalF(ab.magic, input(0, null)), events);
    return;
  }

  // Damage and on-hit effects on enemies
  const hasDamage = ab.physical !== undefined || ab.magic !== undefined || ab.trueDamage !== undefined;
  const through = new Map<string, boolean>(); // per unit: did any hit get past its shield?
  let dealt = 0;
  for (const { unit: t, index } of area.enemies) {
    if (t.dead) continue;
    let damage = 0;
    let wentThrough = true;
    if (ab.trueDamage !== undefined) {
      damage = Math.max(evalF(ab.trueDamage, input(index, t)), 0);
    } else if (hasDamage) {
      const hadShield = shieldTotal(t) > 0;
      const r = hitDamage(c, u, t, evalF(ab.physical, input(index, t)), evalF(ab.magic, input(index, t)), ab.penetration ?? 0);
      if (r.absorbed > 0) {
        useShields(t, r.absorbed);
        events.push({ type: "ShieldAbsorbed", unitId: t.id, amount: r.absorbed });
      }
      damage = r.damage;
      wentThrough = r.through || !hadShield;
    }
    loseHp(c, s, t, damage, u, events);
    lifeStealOnHit(c, u, damage, events);
    dealt += damage;
    through.set(t.id, (through.get(t.id) ?? false) || wentThrough);

    // combat.md "Break": with a shield that held the whole action, the Break Bar is not reduced.
    if (ab.break && ab.breakPerHit && wentThrough) reduceBreakBar(c, s, u, t, ab.break, events);
    if (!t.dead) for (const e of ab.onHit ?? []) applyOnHit(c, s, u, t, e, input(index, t), events);
    if (!t.dead && ab.knockback) push(s, u, t, events);
  }
  if (ab.break && !ab.breakPerHit) {
    for (const [id, ok] of through) {
      const t = findUnit(s, id)!;
      if (ok) reduceBreakBar(c, s, u, t, ab.break, events);
    }
  }

  // Support on allies
  for (const ally of area.allies) {
    if (ab.heal) heal(c, ally, ab.heal, events);
    if (ab.shield) {
      giveShield(s, ally, ab.shield.mode, ab.shield.amount, ab.shield.turns);
      events.push({ type: "ShieldGained", unitId: ally.id, amount: ab.shield.amount, mode: ab.shield.mode });
    }
    for (const b of ab.buffs ?? []) addBuff(s, ally, b.stat, b.amount, b.turns, events);
    if (ab.cleanse) cleanse(c, ally, events);
  }

  // On the user
  if (ab.lifeSteal === "half") heal(c, u, Math.floor(dealt / 2), events);
  if (ab.selfHeal) heal(c, u, ab.selfHeal, events);
  if (ab.selfBuff) addBuff(s, u, ab.selfBuff.stat, ab.selfBuff.amount, ab.selfBuff.turns, events);
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
  // combat.md "Damage over Time": damage is stored when applied; the same DOT replaces the old one.
  t.dots = t.dots.filter((d) => d.id !== e.id);
  t.dots.push({
    id: e.id,
    physical: evalF(e.physical, input),
    magic: evalF(e.magic, input),
    boost: stat(c, user, "dotBoost"),
    roundsLeft: e.rounds,
    sourceId: user.id,
  });
  events.push({ type: "StatusApplied", unitId: t.id, status: e.id });
}

function addBuff(s: GameState, u: Unit, statName: Unit["buffs"][number]["stat"], amount: number, turns: number, events: GameEvent[]): void {
  u.buffs.push({ stat: statName, amount, turnsLeft: turns, appliedTurn: s.turn });
  events.push({ type: "StatusApplied", unitId: u.id, status: `${statName} +${amount}` });
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
