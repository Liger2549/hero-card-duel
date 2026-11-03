import { applyDot, dotDamage, h, loseHp, pctOf, stat, type FormulaInput, type HookApi, type OnHit } from "@hcd/engine";
import { ATK, defineHero, FRONT1, pctSum } from "../define.ts";

// statuses.md "Voidmark": a Turn DOT of 40% ATK. Erosion: the target's DEF − (1 + 20% DOT Boost) while it lasts.
const erosion = (dotBoost: number) => -pctSum([1, 100], [dotBoost, 20]);
const voidmark = (turns: number): Extract<OnHit, { type: "dot" }> => ({
  type: "dot",
  id: "voidmark",
  kind: "turn",
  damage: (f: FormulaInput) => pctOf(f.atk, 40),
  duration: turns,
  mods: [{ stat: "def", amount: (f: FormulaInput) => erosion(f.stat("dotBoost")) }],
});

// Event Horizon's Collapse: every enemy with Serie's Voidmark takes (tick damage × ticks left) + ATK, by the DOT
// rules (not a tick, so no Singularity), then gets a new Voidmark for 1 Turn.
function collapse(api: HookApi): void {
  const { c, s, self, events } = api;
  const atk = stat(c, self, "atk");
  for (const t of s.units) {
    const mark = t.dots.find((d) => d.id === "voidmark" && d.sourceId === self.id);
    if (t.dead || !mark) continue;
    loseHp(c, s, t, dotDamage(c, t, mark.damageH * mark.ticksLeft + h(atk)), self, events);
    t.dots = t.dots.filter((d) => d !== mark);
    if (!t.dead) applyDot(c, s, self, t, voidmark(1), pctOf(atk, 40), events, [{ stat: "def", amount: erosion(stat(c, self, "dotBoost")) }]);
  }
}

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
  hooks: {
    // The Abyss Hungers: +1 Singularity (her Ult Points) for each Voidmark tick of hers that deals damage.
    onEvent: (api, e) => {
      if (e.type === "DotTick" && e.dot === "voidmark" && e.sourceId === api.self.id && e.damage > 0) api.self.ult = Math.min(api.self.ult + 1, 8);
    },
    specials: { collapse },
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
      onHit: [voidmark(2)],
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
