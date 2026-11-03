import { ATK, defineHero, FRONT1 } from "../define.ts";

// docs/heroes/Valen.md
export const valen = defineHero({
  id: "valen",
  name: "Valen",
  icon: "⚔️",
  role: "Damage / Penetration",
  origin: "own",
  attackType: "mixed",
  getsFreeStep: true,
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
    form: FRONT1,
    physical: ATK,
    break: 1,
  },
  skills: [
    {
      name: "Light of Vow",
      mana: 3,
      text: "เส้นตรง 3 ช่อง ช่องแรกกายภาพ 2 + เวท ATK ช่องถัดไปเวทลดทีละ 1",
      form: { rotate: 4, hit: "all", grid: ["b", "b", "a", "C"] },
      magic: ATK,
      break: 2,
      zones: { a: { physical: 2 } },
      falloff: { magic: { each: 1 } },
    },
  ],
  ultimate: {
    name: "Sword of Justice",
    mana: 4,
    ultCost: 4,
    ultMax: 4,
    text: "ดาบ 3 เล่ม เลือก 3 ช่องในระยะ 2 (ซ้ำได้) ดาบละกายภาพ 1 + เวท ATK − 2 Penetration +5",
    form: { rotate: 0, hit: "all", range: { manhattan: 2 }, picks: 3 },
    physical: 1,
    magic: (f) => Math.max(f.atk - 2, 0),
    penetration: 5,
    break: 1,
    breakPerHit: true,
  },
});
