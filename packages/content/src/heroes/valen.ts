import { ATK, defineHero } from "../define.ts";

// docs/heroes/Valen.md
export const valen = defineHero({
  id: "valen",
  name: "Valen",
  icon: "⚔️",
  role: "Damage / Penetration",
  origin: "own",
  attackType: "melee",
  damageType: "mixed",
  bounty: 400,
  stats: { maxHp: 20, atk: 4, def: 0, speed: 115, move: 1, breakBar: 12, aggroBar: 5, penetration: 2 },
  passive: {
    name: "Let the light pierce the eternal darkness",
    text: "ทุกครั้งที่ตีโดน ได้ดาเมจโบนัส (Penetration − (Armor + Magic Armor) ÷ 2) ÷ 2",
  },
  normalAttack: {
    name: "The Sword's Radiant Waltz",
    mana: 2,
    text: "ฟัน 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK",
    targeting: { type: "adjacent" },
    physical: ATK,
    break: 1,
  },
  skills: [
    {
      name: "Light of Vow",
      mana: 3,
      text: "เส้นตรง 3 ช่อง ช่องแรกกายภาพ 2 + เวท ATK ช่องถัดไปเวทลดทีละ 1",
      targeting: { type: "shape", shape: [[0, 1], [0, 2], [0, 3]] },
      physical: (f) => (f.index === 0 ? 2 : 0),
      magic: (f) => Math.max(0, f.atk - f.index),
      break: 2,
    },
  ],
  ultimate: {
    name: "Sword of Justice",
    mana: 4,
    ultCost: 4,
    ultMax: 4,
    text: "ดาบ 3 เล่ม เลือก 3 ช่องในระยะ 2 (ซ้ำได้) ดาบละกายภาพ 1 + เวท ATK − 2 Penetration +5",
    targeting: { type: "tiles", range: 2, count: 3 },
    physical: 1,
    magic: (f) => Math.max(f.atk - 2, 0),
    penetration: 5,
    break: 1,
    breakPerHit: true,
  },
});
