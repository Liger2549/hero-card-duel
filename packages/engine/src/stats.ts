import { itemDef, unitDef, type Content } from "./content.ts";
import type { BuffStat, ItemStat } from "./defs.ts";
import type { Unit } from "./state.ts";

export type StatName = BuffStat | ItemStat;

// combat.md "Stat Modifiers": base + every flat buff and item mod. (Only Flat exists so far.)
// A final stat is never below 0, except Tenacity; Speed is at least 1.
export function stat(c: Content, u: Unit, name: StatName): number {
  const base = baseStat(c, u, name);
  const buffs = u.buffs.reduce((sum, b) => (b.stat === name ? sum + b.amount : sum), 0);
  const items = u.items.reduce((sum, id) => sum + (itemDef(c, id).mods[name as ItemStat] ?? 0), 0);
  const total = base + buffs + items;
  if (name === "tenacity") return total;
  if (name === "speed") return Math.max(total, 1);
  return Math.max(total, 0);
}

function baseStat(c: Content, u: Unit, name: StatName): number {
  const s = unitDef(c, u.defId).stats;
  switch (name) {
    case "atk":
      return s.atk;
    case "def":
      return s.def;
    case "maxHp":
      return s.maxHp;
    case "speed":
      return s.speed;
    case "armor":
      return s.armor ?? 0;
    case "magicArmor":
      return s.magicArmor ?? 0;
    case "penetration":
      return s.penetration ?? 0;
    case "dotBoost":
      return s.dotBoost ?? 0;
    default:
      return 0;
  }
}

export function maxBreakBar(c: Content, u: Unit): number {
  return unitDef(c, u.defId).stats.breakBar;
}
