import { ATK, defineSummon, FRONT1 } from "./define.ts";

// Summoned units from the prototype (cards and hero skills). Placeholder values; the owner sets the real ones.

export const guard = defineSummon({
  id: "guard",
  name: "ทหารยาม",
  icon: "🪖",
  attackType: "melee",
  damageType: "physical",
  stats: { maxHp: 10, atk: 2, def: 1, speed: 60, move: 1, breakBar: 6, aggroBar: 5 },
  bounty: 100,
  firstAttackMana: { summonRound: 0, laterRounds: 1 },
  normalAttack: { name: "ฟัน", mana: 2, text: "1 ช่องรอบตัว กายภาพ ATK", form: FRONT1, physical: ATK, break: 1, ultGain: 0 },
});

export const bow = defineSummon({
  id: "bow",
  name: "พลธนู",
  icon: "🎯",
  attackType: "ranged",
  damageType: "physical",
  stats: { maxHp: 6, atk: 2, def: 0, speed: 80, move: 1, breakBar: 4, aggroBar: 5 },
  bounty: 100,
  firstAttackMana: { summonRound: 0, laterRounds: 1 },
  normalAttack: { name: "ยิง", mana: 2, text: "ศัตรู 1 ตัวในระยะ 2 กายภาพ ATK", form: { rotate: 0, hit: "all", range: { manhattan: 2 } }, physical: ATK, break: 1, ultGain: 0 },
});

export const soldier = defineSummon({
  id: "soldier",
  name: "พลทหาร",
  icon: "💂",
  attackType: "melee",
  damageType: "physical",
  stats: { maxHp: 8, atk: 2, def: 1, speed: 70, move: 1, breakBar: 5, aggroBar: 5 },
  bounty: 100,
  firstAttackMana: { summonRound: 0, laterRounds: 1 },
  normalAttack: { name: "แทง", mana: 2, text: "1 ช่องรอบตัว กายภาพ ATK", form: FRONT1, physical: ATK, break: 1, ultGain: 0 },
});

export const shade = defineSummon({
  id: "shade",
  name: "ทหารเงา",
  icon: "👤",
  attackType: "melee",
  damageType: "physical",
  stats: { maxHp: 6, atk: 3, def: 0, speed: 100, move: 1, breakBar: 4, aggroBar: 5 },
  bounty: 100,
  firstAttackMana: { summonRound: 0, laterRounds: 1 },
  normalAttack: { name: "ฟัน", mana: 2, text: "1 ช่องรอบตัว กายภาพ ATK", form: FRONT1, physical: ATK, break: 1, ultGain: 0 },
});

export const units = [guard, bow, soldier, shade];
