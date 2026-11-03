import { ATK, defineHero, FRONT1 } from "../define.ts";

// docs/heroes/Eira.md (the prototype's frost hunter, as is)
export const eira = defineHero({
  id: "eira",
  name: "Eira",
  icon: "❄️",
  role: "Damage / Control",
  origin: "idea",
  attackType: "melee",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 22, atk: 4, def: 1, speed: 105, move: 1, breakBar: 13, aggroBar: 5 },
  passive: { name: "Thin Ice (น้ำแข็งบาง)", text: "ตีศัตรูที่ติด Slow ได้กายภาพ +2" },
  hooks: {
    // Thin Ice: Physical +2 on an enemy with Slow.
    hitValues: (_api, target, v) => (target.cc.slow !== undefined ? { ...v, physical: v.physical + 2 } : v),
  },
  normalAttack: {
    name: "Frost Jab (แทง)",
    mana: 2,
    text: "แทง 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK",
    form: FRONT1,
    physical: ATK,
    break: 1,
  },
  skills: [
    {
      name: "Glacial Spear (หอกเยือกแข็ง)",
      mana: 3,
      text: "แทงทะลุ 2 ช่อง กายภาพ ATK ติด Slow 300 (เดินใช้มานา +1)",
      form: { rotate: 4, hit: "all", grid: ["X", "X", "C"] },
      physical: ATK,
      break: 2,
      onHit: [{ type: "cc", cc: "slow", recovery: 300 }],
    },
  ],
  ultimate: {
    name: "Whiteout (พายุหิมะ)",
    mana: 4,
    ultCost: 5,
    ultMax: 5,
    text: "ศัตรูในระยะ 2 รอบตัว กายภาพ 2 ติด Stun 300",
    form: { rotate: 0, hit: "all", grid: [". . X . .", ". X X X .", "X X C X X", ". X X X .", ". . X . ."] },
    physical: 2,
    break: 3,
    onHit: [{ type: "cc", cc: "stun", recovery: 300 }],
  },
});
