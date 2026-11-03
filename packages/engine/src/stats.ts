import { itemDef, unitDef, type Content } from "./content.ts";
import type { ItemStat, PercentStat, StatName } from "./defs.ts";
import { h, mulPct, roundH } from "./num.ts";
import type { Unit } from "./state.ts";

export type { StatName };

const percentStats: ReadonlySet<StatName> = new Set<PercentStat>([
  "armorShred",
  "breakPower",
  "breakDmgPower",
  "dotPower",
  "resonancePower",
  "healingPower",
  "physicalTaken",
  "magicTaken",
  "damageTaken",
  "breakTaken",
  "dotTaken",
  "drainTaken",
  "healingTaken",
  "ccTaken",
]);

// combat.md "Stat Modifiers":
//   Final stat = (Base + all Flat) × (100% + all pct points) × every mult, rounded once.
// A % Multiplier ("% Multipliers") starts at 100; flat buffs move it by percentage points.
// A final stat is never below 0, except Tenacity; Speed is at least 1.
export function stat(c: Content, u: Unit, name: StatName): number {
  let flat = baseStat(c, u, name);
  let pctPoints = 0;
  const mults: number[] = [];
  for (const b of u.buffs) {
    if (b.stat !== name) continue;
    if (b.kind === "pct") pctPoints += b.amount;
    else if (b.kind === "mult") mults.push(b.amount);
    else flat += b.amount;
  }
  for (const id of u.items) flat += itemDef(c, id).mods[name as ItemStat] ?? 0;

  let hv = mulPct(h(flat), 100 + pctPoints);
  for (const m of mults) hv = mulPct(hv, m);
  const total = roundH(hv);

  if (name === "tenacity") return total;
  if (name === "speed") return Math.max(total, 1);
  return Math.max(total, 0);
}

function baseStat(c: Content, u: Unit, name: StatName): number {
  const s = unitDef(c, u.defId).stats;
  if (percentStats.has(name)) return s[name as PercentStat] ?? 100;
  switch (name) {
    case "atk":
      return s.atk;
    case "def":
      return s.def;
    case "maxHp":
      return s.maxHp;
    case "speed":
      return s.speed;
    default:
      return s[name] ?? 0;
  }
}

export function maxBreakBar(c: Content, u: Unit): number {
  return unitDef(c, u.defId).stats.breakBar;
}
