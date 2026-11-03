// combat.md "Damage Resolution", "Shields", "Break", "Healing", hero death (heroes/README.md "Death").
// Formulas work in hundredths and round once at the end (num.ts).
import { itemValue, unitDef, type Content } from "../content.ts";
import type { CcKind, HeroDef, SummonDef } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { divH, divRound, h, mulPct, roundH } from "../num.ts";
import { EveryTurn, type Countdown, type GameState, type Shield, type Unit } from "../state.ts";
import { maxBreakBar, stat } from "../stats.ts";

export interface HitResult {
  damage: number; // HP lost
  absorbed: number; // taken by Shield by Damage
  through: boolean; // false = the shield took the whole hit
}

// One hit of Physical + Magic. Shield by Damage absorbs the lower type first (Magic first on a tie),
// then what is left goes through the Damage Resolution formula:
//   Effective Armor = max(Armor × Armor Shred% − Penetration, 0)   (same for Magic Armor)
//   Physical part   = max(Physical − Effective Armor, 0) × Physical Taken%
//   Magic part      = max(Magic − Effective Magic Armor, 0) × Magic Taken%
//   Damage          = max((Physical part + Magic part − DEF) × Damage Taken%, 0)
export function hitDamage(c: Content, attacker: Unit, target: Unit, physical: number, magic: number, extraPen: number): HitResult {
  // statuses.md "Physical ATK +N": only a hit that has Physical damage gets it.
  let p = physical > 0 ? physical + stat(c, attacker, "physicalAtk") : 0;
  let m = Math.max(magic, 0);
  const shield = shieldTotal(target);
  let absorbed = 0;
  if (shield > 0) {
    absorbed = Math.min(shield, p + m);
    const rest = absorbed;
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
  const pen = h(stat(c, attacker, "penetration") + extraPen);
  const shred = stat(c, attacker, "armorShred");
  const armor = Math.max(mulPct(h(stat(c, target, "armor")), shred) - pen, 0);
  const magicArmor = Math.max(mulPct(h(stat(c, target, "magicArmor")), shred) - pen, 0);
  const physPart = mulPct(Math.max(h(p) - armor, 0), stat(c, target, "physicalTaken"));
  const magicPart = mulPct(Math.max(h(m) - magicArmor, 0), stat(c, target, "magicTaken"));
  const total = mulPct(Math.max(physPart + magicPart - h(stat(c, target, "def")), 0), stat(c, target, "damageTaken"));
  return { damage: Math.max(roundH(total), 0), absorbed, through: true };
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
export function giveShield(s: GameState, u: Unit, mode: Shield["mode"], amount: number, turns: number, count: Countdown = EveryTurn): void {
  if (mode === "set") u.shields = u.shields.filter((sh) => sh.mode !== "set");
  u.shields.push({ mode, amount, turnsLeft: turns, count, appliedTurn: s.turn, seq: s.shieldSeq++ });
}

// Lowers HP; a unit at 0 dies and its killer's player gets the bounty.
export function loseHp(c: Content, s: GameState, target: Unit, amount: number, source: Unit | null, events: GameEvent[]): void {
  if (target.dead || amount <= 0) return;
  target.hp = Math.max(target.hp - amount, 0);
  events.push({ type: "Damaged", unitId: target.id, amount, hp: target.hp, sourceId: source?.id ?? null });
  if (target.hp > 0) return;

  // heroes/README.md "Death": Bounty = Base Bounty + held item value / 4. Items are cleared, Ult Points reset.
  const def = unitDef(c, target.defId) as HeroDef | SummonDef;
  const bounty = def.bounty + divRound(target.items.reduce((sum, id) => sum + itemValue(c, id), 0), 4);
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

// Raises HP by exactly `amount`, never above Max HP. Used for restores (e.g. a Max HP item) and Life Steal.
export function heal(c: Content, target: Unit, amount: number, events: GameEvent[]): void {
  if (target.dead) return;
  const healed = Math.min(amount, stat(c, target, "maxHp") - target.hp);
  if (healed <= 0) return;
  target.hp += healed;
  events.push({ type: "Healed", unitId: target.id, amount: healed, hp: target.hp });
}

// combat.md "Healing": a heal from a skill, card or item.
//   Heal = ((Base heal + Healing Bonus) × Healing Power% + Healing Received) × Healing Taken%
// healer = null for a card or item (no Healing Bonus, Power 100%).
export function healFrom(c: Content, healer: Unit | null, target: Unit, base: number, events: GameEvent[]): void {
  const bonus = healer ? stat(c, healer, "healingBonus") : 0;
  const power = healer ? stat(c, healer, "healingPower") : 100;
  const given = mulPct(h(base + bonus), power) + h(stat(c, target, "healingReceived"));
  heal(c, target, Math.max(roundH(mulPct(given, stat(c, target, "healingTaken"))), 0), events);
}

// combat.md "Crowd Control": Remaining Recovery = max(Recovery × CC Taken% − Tenacity, 0); the higher one is kept.
export function applyCc(c: Content, target: Unit, kind: CcKind, recovery: number, events: GameEvent[]): void {
  if (target.dead) return;
  const remaining = Math.max(roundH(mulPct(h(recovery), stat(c, target, "ccTaken")) - h(stat(c, target, "tenacity"))), 0);
  if (remaining <= 0) return;
  if ((target.cc[kind] ?? -1) >= remaining) return;
  target.cc[kind] = remaining;
  events.push({ type: "StatusApplied", unitId: target.id, status: kind });
}

// combat.md "Break": once per action (or per hit with breakPerHit).
//   Reduction = max((Break + Break Boost) × Break Power% × Break Taken% − Break Resistance, 1)
//   Break DMG = (max(Max Break Bar / 5, 1) + Break DMG Bonus) × Break DMG Power%
export function reduceBreakBar(c: Content, s: GameState, attacker: Unit, target: Unit, brk: number, events: GameEvent[]): void {
  if (target.dead || target.broken) return;
  const raw = mulPct(mulPct(h(brk + stat(c, attacker, "breakBoost")), stat(c, attacker, "breakPower")), stat(c, target, "breakTaken"));
  target.breakBar -= Math.max(roundH(raw - h(stat(c, target, "breakResistance"))), 1);
  if (target.breakBar > 0) return;
  target.breakBar = 0;
  target.broken = true;
  const base = Math.max(divH(h(maxBreakBar(c, target)), 5), h(1)) + h(stat(c, attacker, "breakDmgBonus"));
  const dmg = roundH(mulPct(base, stat(c, attacker, "breakDmgPower")));
  events.push({ type: "Broken", unitId: target.id, damage: dmg });
  loseHp(c, s, target, dmg, attacker, events);
  applyCc(c, target, "stun", 500, events);
}

// combat.md "Healing": a hit that lowers the target's HP heals the attacker by
//   min(max(Life Steal × Drain Taken% − Life Steal Resistance, 0), HP damage of the hit)
// Life Steal does not go through the Heal formula.
export function lifeStealOnHit(c: Content, attacker: Unit, target: Unit, damage: number, events: GameEvent[]): void {
  if (damage <= 0) return;
  const ls = roundH(mulPct(h(stat(c, attacker, "lifeSteal")), stat(c, target, "drainTaken")) - h(stat(c, target, "lifeStealResistance")));
  const amount = Math.min(Math.max(ls, 0), damage);
  if (amount > 0) heal(c, attacker, amount, events);
}
