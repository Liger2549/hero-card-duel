import { defineHero, FRONT1 } from "../define.ts";

// docs/heroes/Bianca.md
export const bianca = defineHero({
  id: "bianca",
  name: "Bianca",
  icon: "🛡️",
  role: "Damage / Counter-based",
  origin: "own",
  attackType: "melee",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 18, atk: 2, def: 2, speed: 100, move: 1, breakBar: 14, aggroBar: 5, armor: 1, magicArmor: 1 },
  passive: {
    name: "Bastione Bianco",
    text: "DEF เป็น 0 เสมอ แปลงเป็น Armor +1 ต่อ DEF 1 และ Magic Armor +1 ต่อ DEF 2 (DEF ในสูตรสกิลคือค่าก่อนแปลง)",
  },
  normalAttack: {
    name: "Pugno d'Acciaio",
    mana: 2,
    text: "ต่อย 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK + DEF",
    form: FRONT1,
    physical: (f) => f.atk + f.def,
    break: 1,
  },
  skills: [
    {
      name: "Martello del Giuramento",
      mana: 3,
      text: "ทุบ 1 ช่องรอบตัว 8 ทิศ กายภาพ DEF + ATK Break 3",
      form: FRONT1,
      physical: (f) => f.def + f.atk,
      break: 3,
    },
    {
      name: "Scudo d'Avorio",
      mana: 3,
      text:
        "Giuramento d'Avorio: ตัวเองและพวกในระยะ 1 ได้ Armor +2 Magic Armor +1 นาน 4 Turns " +
        "ถ้าศัตรูตีคนที่คุ้มกัน สวนกลับ 1 + DEF (สูงสุด 2 ครั้ง)",
      form: { rotate: 0, hit: "allies", self: true, grid: ["X X X", "X C X", "X X X"] },
      special: "oath",
    },
  ],
  ultimate: {
    name: "Fortezza Inviolata",
    mana: 4,
    ultCost: 5,
    ultMax: 5,
    text: "ฟาดเส้นตรง 2 ช่อง กายภาพ 5 + DEF Break 5 แล้วได้ Vendetta della Cittadella (สวนกลับ 2 + 3 ต่อ DEF 2)",
    form: { rotate: 4, hit: "all", grid: ["X", "X", "C"] },
    physical: (f) => 5 + f.def,
    break: 5,
    special: "vendetta",
  },
});
