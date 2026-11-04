import { manhattan, pctOf, resolveAbility, type AbilityDef, type HookApi } from "@hcd/engine";
import { defineHero, pctSum } from "../define.ts";
import { nocturnalFlame } from "../statuses.ts";

// Raven's Intercession: the raven's explosion, around the enemy the ally hit.
const raven: AbilityDef = {
  name: "Raven",
  mana: 0,
  text: "",
  form: { rotate: 0, hit: "all", range: { manhattan: 2 }, grid: ["X X X", "X P X", "X X X"] },
  magic: (f) => pctOf(f.atk, 120),
  break: (f) => pctOf(f.atk, 150),
  onHit: [nocturnalFlame(1)],
};

// Nightfall Raven Gauge: max 3, starts at 0.
const addRavens = (api: HookApi, n: number) => (api.self.vars.ravens = Math.min((api.self.vars.ravens ?? 0) + n, 3));

// docs/heroes/Karas.md
export const karas = defineHero({
  id: "karas",
  name: "Karas",
  icon: "🐦‍⬛",
  role: "Damage",
  origin: "own",
  attackType: "mixed",
  getsFreeStep: true,
  damageType: "mixed",
  bounty: 400,
  stats: { maxHp: 22, atk: 4, def: 1, speed: 120, move: 1, breakBar: 12, aggroBar: 4, dotBoost: 1 },
  passive: {
    name: "Raven's Intercession",
    text: "เกจอีการัตติกาล (สูงสุด 3) เพื่อนในระยะ 2 ตีศัตรูที่อยู่ในระยะ 2 → ใช้ 1 แต้ม ส่งอีการะเบิด 3x3 เวท 120% ATK Break 150% ATK ติดเพลิงรัตติกาล 1 เทิร์น (เทิร์นละครั้ง)",
  },
  hooks: {
    onEvent(api, e) {
      const { s, self } = api;
      if (e.type !== "Hit" || self.dead || !self.pos || (self.vars.ravens ?? 0) < 1 || self.vars.ravenTurn === s.turn) return;
      const ally = s.units.find((u) => u.id === e.sourceId);
      const enemy = s.units.find((u) => u.id === e.unitId);
      if (!ally?.pos || !enemy?.pos || ally.id === self.id || ally.owner !== self.owner || enemy.owner === self.owner) return;
      if (manhattan(ally.pos, self.pos) > 2 || manhattan(enemy.pos, self.pos) > 2) return;
      self.vars.ravens! -= 1;
      self.vars.ravenTurn = s.turn; // once per Turn
      api.interject("Raven", "raven", { data: { x: enemy.pos.x, y: enemy.pos.y } });
    },
    interjects: {
      raven: (api, p) => void resolveAbility(api.c, api.s, api.self, raven, { tiles: [{ x: Number(p.data!.x), y: Number(p.data!.y) }] }, api.events),
    },
    specials: {
      wraithfire: (api) => addRavens(api, 2),
      eclipse: (api) => addRavens(api, 3),
    },
  },
  normalAttack: {
    name: "Cinder Shot",
    mana: 2,
    text: "1 ช่องรอบตัว 8 ทิศ กายภาพ 25% ATK + เวท 75% ATK Break 50% ATK",
    form: { rotate: 8, hit: "all", grid: ["X", "C"] },
    physical: (f) => pctOf(f.atk, 25),
    magic: (f) => pctOf(f.atk, 75),
    break: (f) => pctOf(f.atk, 50),
  },
  skills: [
    {
      name: "Wraithfire",
      mana: 3,
      text: "กายภาพ 75% ATK + เวท 2 + 150% ATK Break 150% ATK ติดเพลิงรัตติกาล 2 เทิร์น ได้อีกา +2",
      form: {
        rotate: 8,
        hit: "all",
        grid: [". X .", "X X X", "X C X", "X . X"],
        diagonal: ["X X . .", "X X X .", ". X C X", ". . X ."],
      },
      physical: (f) => pctOf(f.atk, 75),
      magic: (f) => pctSum([2, 100], [f.atk, 150]),
      break: (f) => pctOf(f.atk, 150),
      onHit: [nocturnalFlame(2)],
      special: "wraithfire",
    },
  ],
  ultimate: {
    name: "Ravenous Eclipse",
    mana: 4,
    ultCost: 5,
    ultMax: 5,
    text: "โซน a: กายภาพ 120% ATK + เวท 250% ATK Break 200% ATK ติดเพลิง 2 เทิร์น · โซน b: ติดเพลิง 1 เทิร์น · ได้อีกา +3",
    form: { rotate: 4, hit: "all", grid: [". . b . .", ". b a b .", "b a a a b", "b a C a b", "b b b b b"] },
    zones: {
      a: { physical: (f) => pctOf(f.atk, 120), magic: (f) => pctOf(f.atk, 250), break: (f) => pctOf(f.atk, 200), onHit: [nocturnalFlame(2)] },
      b: { physical: 0, magic: 0, break: 0, onHit: [nocturnalFlame(1)] },
    },
    special: "eclipse",
  },
});
