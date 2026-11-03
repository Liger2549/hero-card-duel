import { pctOf } from "@hcd/engine";
import { ATK, defineHero, FRONT1 } from "../define.ts";

// docs/heroes/Serie.md
export const serie = defineHero({
  id: "serie",
  name: "Serie",
  icon: "🌀",
  role: "Damage / DOT, AoE",
  origin: "own",
  attackType: "melee",
  damageType: "mixed",
  bounty: 400,
  stats: { maxHp: 18, atk: 3, def: 0, speed: 125, move: 1, breakBar: 10, aggroBar: 4, dotBoost: 2 },
  passive: {
    name: "The Abyss Hungers",
    text: "ไม่ได้แต้มอัลติ แต่ได้ Singularity +1 ทุกครั้งที่ Voidmark ทิกโดนศัตรู (นับแยกต่อตัว)",
  },
  normalAttack: {
    name: "Hollow Edge",
    mana: 2,
    text: "ฟัน 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK − 1 + เวท 1",
    form: FRONT1,
    physical: (f) => Math.max(f.atk - 1, 0),
    magic: 1,
    break: 1,
    ultGain: 0,
  },
  skills: [
    {
      name: "Voidrend Crescent",
      mana: 3,
      text: "ฟันแถวหน้า 3 ช่อง กายภาพ 2 + เวท ATK ติด Voidmark 2 Turns",
      form: { rotate: 4, hit: "all", grid: ["X X X", ". C ."] },
      physical: 2,
      magic: ATK,
      break: 2,
      ultGain: 0,
      // Voidmark tick: 40% ATK (statuses.md). Erosion and Singularity come with Serie's hooks.
      onHit: [{ type: "dot", id: "voidmark", kind: "turn", damage: (f) => pctOf(f.atk, 40), duration: 2 }],
    },
  ],
  ultimate: {
    name: "Event Horizon",
    mana: 3,
    ultCost: 8,
    ultMax: 8,
    gaugeName: "Singularity",
    text: "ฟันแถวหน้า 3 ช่อง แล้วระเบิด Voidmark ทุกตัวบนกระดาน: (ดาเมจทิก × ทิกที่เหลือ) + ATK แล้วติด Voidmark ใหม่ 1 Turn",
    form: { rotate: 4, hit: "all", grid: ["X X X", ". C ."] },
    physical: 1,
    magic: 1,
    break: 1,
    special: "collapse",
  },
});
