// combat.md "Damage Resolution", "Shields", "Break", "Healing", hero death (heroes/README.md "Death").
import { itemValue, unitDef, type Content } from "../content.ts";
import type { CcKind, HeroDef, SummonDef } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import type { GameState, Shield, Unit } from "../state.ts";
import { maxBreakBar, stat } from "../stats.ts";

export interface HitResult {
  damage: number; // HP lost
  absorbed: number; // taken by Shield by Damage
  through: boolean; // false = the shield took the whole hit
}

// One hit of Physical + Magic. Shield by Damage absorbs the lower type first (Magic first on a tie),
// then what is left is reduced by Armor / Magic Armor (minus Penetration) and DEF.
export function hitDamage(c: Content, attacker: Unit, target: Unit, physical: number, magic: number, extraPen: number): HitResult {
  let p = Math.max(physical, 0);
  let m = Math.max(magic, 0);
  const shield = shieldTotal(target);
  let absorbed = 0;
  if (shield > 0) {
    absorbed = Math.min(shield, p + m);
    let rest = absorbed;
    if (p < m) {
      const x = Math.min(rest, p);
      p -= x;
      m -= rest - x;
    } else {
      const x = Math.min(rest, m);
      m -= x;
      p -= rest - x;
    }
    if (p + m === 0) return { damage: 0, absorbed, through: false };
  }
  const pen = stat(c, attacker, "penetration") + extraPen;
  const armor = Math.max(stat(c, target, "armor") - pen, 0);
  const magicArmor = Math.max(stat(c, target, "magicArmor") - pen, 0);
  const damage = Math.max(Math.max(p - armor, 0) + Math.max(m - magicArmor, 0) - stat(c, target, "def"), 0);
  return { damage, absorbed, through: true };
}

export function shieldTotal(u: Unit): number {
  return u.shields.reduce((sum, sh) => sum + sh.amount, 0);
}

// Added shields first, oldest first; the set shield last.
export function useShields(u: Unit, amount: number): void {
  const order = [...u.shields].sort((a, b) => Number(a.mode === "set") - Number(b.mode === "set") || a.seq - b.seq);
  for (const sh of order) {
    if (amount <= 0) break;
    const x = Math.min(sh.amount, amount);
    sh.amount -= x;
    amount -= x;
  }
  u.shields = u.shields.filter((sh) => sh.amount > 0);
}

// Add stacks; Set replaces only the previous set shield.
export function giveShield(s: GameState, u: Unit, mode: Shield["mode"], amount: number, turns: number): void {
  if (mode === "set") u.shields = u.shields.filter((sh) => sh.mode !== "set");
  u.shields.push({ mode, amount, turnsLeft: turns, appliedTurn: s.turn, seq: s.shieldSeq++ });
}

// Lowers HP; a unit at 0 dies and its killer's player gets the bounty.
export function loseHp(c: Content, s: GameState, target: Unit, amount: number, source: Unit | null, events: GameEvent[]): void {
  if (target.dead || amount <= 0) return;
  target.hp = Math.max(target.hp - amount, 0);
  events.push({ type: "Damaged", unitId: target.id, amount, hp: target.hp, sourceId: source?.id ?? null });
  if (target.hp > 0) return;

  // heroes/README.md "Death": Bounty = Base Bounty + held item value / 4. Items are cleared, Ult Points reset.
  const def = unitDef(c, target.defId) as HeroDef | SummonDef;
  const bounty = def.bounty + Math.floor(target.items.reduce((sum, id) => sum + itemValue(c, id), 0) / 4);
  target.dead = true;
  target.pos = null;
  target.ult = 0;
  target.items = [];
  target.shields = [];
  target.buffs = [];
  target.cc = {};
  const killer = source && source.owner !== target.owner ? source.owner : null;
  if (killer) s.players[killer].gold += bounty;
  events.push({ type: "UnitDied", unitId: target.id, killerSeat: killer, bounty: killer ? bounty : 0 });
}

export function heal(c: Content, target: Unit, amount: number, events: GameEvent[]): void {
  if (target.dead) return;
  const healed = Math.min(amount, stat(c, target, "maxHp") - target.hp);
  if (healed <= 0) return;
  target.hp += healed;
  events.push({ type: "Healed", unitId: target.id, amount: healed, hp: target.hp });
}

// combat.md "Crowd Control": Remaining Recovery = Recovery − Tenacity; the higher one is kept.
export function applyCc(c: Content, target: Unit, kind: CcKind, recovery: number, events: GameEvent[]): void {
  if (target.dead) return;
  const remaining = Math.max(recovery - stat(c, target, "tenacity"), 0);
  if (remaining <= 0) return;
  if ((target.cc[kind] ?? -1) >= remaining) return;
  target.cc[kind] = remaining;
  events.push({ type: "StatusApplied", unitId: target.id, status: kind });
}

// combat.md "Break": once per action (or per hit with breakPerHit).
export function reduceBreakBar(c: Content, s: GameState, attacker: Unit, target: Unit, brk: number, events: GameEvent[]): void {
  if (target.dead || target.broken) return;
  target.breakBar -= Math.max(brk + stat(c, attacker, "breakBoost"), 1);
  if (target.breakBar > 0) return;
  target.breakBar = 0;
  target.broken = true;
  const dmg = Math.max(Math.floor(maxBreakBar(c, target) / 5), 1) + stat(c, attacker, "breakDmgBonus");
  events.push({ type: "Broken", unitId: target.id, damage: dmg });
  loseHp(c, s, target, dmg, attacker, events);
  applyCc(c, target, "stun", 500, events);
}

// combat.md "Healing": each damaging hit heals the attacker by its Life Steal.
export function lifeStealOnHit(c: Content, attacker: Unit, damage: number, events: GameEvent[]): void {
  if (damage <= 0) return;
  const ls = stat(c, attacker, "lifeSteal");
  if (ls > 0) heal(c, attacker, ls, events);
}
