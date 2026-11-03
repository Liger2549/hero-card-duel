import { addBuff, inBounds, moveUnit, placeSummon, unitAt, type GameEvent, type HookApi, type Pos, type SpecialContext } from "@hcd/engine";
import { ATK, defineHero, FRONT1 } from "../define.ts";

const around4 = [[0, 1], [1, 0], [0, -1], [-1, 0]] as const;
const around8 = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1]] as const;
const step = (d: string): Pos => ({ N: { x: 0, y: 1 }, E: { x: 1, y: 0 }, S: { x: 0, y: -1 }, W: { x: -1, y: 0 } })[d] ?? { x: 0, y: 0 };

// Rally Banner: allies standing next to Konrad in the 4 directions get DEF +1 while they stay there.
// Worked out again whenever something moves, arrives or dies.
const reshuffles = new Set<GameEvent["type"]>(["UnitStepped", "UnitsSwapped", "UnitMoved", "UnitPushed", "UnitPrepMoved", "HeroPlaced", "UnitSummoned", "UnitDied", "StepUndone", "CombatStarted"]);
function rally(api: HookApi): void {
  const { s, self } = api;
  const name = `rally:${self.id}`;
  for (const u of s.units) u.buffs = u.buffs.filter((b) => b.name !== name);
  if (self.dead || !self.pos) return;
  for (const [dx, dy] of around4) {
    const u = unitAt(s, { x: self.pos.x + dx, y: self.pos.y + dy });
    if (u && !u.dead && u.owner === self.owner) addBuff(s, self, u, { stat: "def", amount: 1, turns: -1, name }, []);
  }
}

// Vanguard Charge: straight up to 2 tiles in the chosen direction, stopping before a unit or the board edge.
function chargePath(api: HookApi, ctx: SpecialContext): Pos[] {
  const { s, self } = api;
  const d = step(ctx.area.dir ?? "N");
  const path: Pos[] = [];
  for (let i = 1; i <= 2; i++) {
    const p = { x: self.pos!.x + d.x * i, y: self.pos!.y + d.y * i };
    if (!inBounds(s.config, p) || unitAt(s, p)) break;
    path.push(p);
  }
  return path;
}

// Call to Arms: 2 Footmen, on the picked free tile and on another free tile around Konrad.
function callToArms(api: HookApi, ctx: SpecialContext): void {
  const { c, s, self, events } = api;
  const first = ctx.aim.tiles![0]!;
  placeSummon(c, s, "footman", self.owner, first, events);
  const second = around8.map(([dx, dy]) => ({ x: self.pos!.x + dx, y: self.pos!.y + dy })).find((p) => inBounds(s.config, p) && !unitAt(s, p));
  if (second) placeSummon(c, s, "footman", self.owner, second, events);
}

// docs/heroes/Konrad.md (the prototype's iron flag bearer, as is)
export const konrad = defineHero({
  id: "konrad",
  name: "Konrad",
  icon: "🚩",
  role: "Tank / Control",
  origin: "idea",
  attackType: "melee",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 22, atk: 3, def: 1, speed: 85, move: 1, breakBar: 16, aggroBar: 5, armor: 1 },
  passive: { name: "Rally Banner (ธงรวมพล)", text: "พวกที่ยืนติดกัน 4 ทิศได้ DEF +1" },
  hooks: {
    onEvent: (api, e) => {
      if (reshuffles.has(e.type)) rally(api);
    },
    specials: {
      charge: (api, ctx) => {
        const path = chargePath(api, ctx);
        if (path.length) moveUnit(api.self, path[path.length - 1]!, api.events);
      },
      callToArms,
    },
    checks: {
      charge: (api, ctx) => (chargePath(api, ctx).length ? null : "the way is blocked"),
      callToArms: (api, ctx) => (unitAt(api.s, ctx.aim.tiles![0]!) ? "choose a free tile" : null),
    },
  },
  normalAttack: {
    name: "Banner Strike (ฟาด)",
    mana: 2,
    text: "ฟาด 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK Break 2",
    form: FRONT1,
    physical: ATK,
    break: 2,
  },
  skills: [
    {
      name: "Challenge Flag (ปักธงท้าทาย)",
      mana: 3,
      text: "กระแทก 4 ช่องรอบตัว กายภาพ 2 ติด Root 300",
      form: { rotate: 0, hit: "all", grid: [". X .", "X C X", ". X ."] },
      physical: 2,
      break: 2,
      onHit: [{ type: "cc", cc: "root", recovery: 300 }],
    },
    {
      name: "Vanguard Charge (บุกนำทัพ)",
      mana: 2,
      text: "พุ่งตรงสูงสุด 2 ช่อง (เคลื่อนที่อย่างเดียว)",
      form: { rotate: 4, hit: "allies", grid: ["X", "X", "C"] },
      ultGain: 1,
      special: "charge",
    },
  ],
  ultimate: {
    name: "Call to Arms (เรียกพลทหาร)",
    mana: 3,
    ultCost: 4,
    ultMax: 4,
    text: "เรียก Footman 2 ตัวข้างตัว (เลือกช่องแรก)",
    form: { rotate: 0, hit: "allies", range: { square: 1 } },
    special: "callToArms",
  },
});
