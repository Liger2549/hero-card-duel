import { applyDot, chebyshev, giveShield, healFrom, manhattan, pctOf, stat, type HookApi, type Unit } from "@hcd/engine";
import { defineHero, pctSum } from "../define.ts";
import { nocturnalFlame } from "../statuses.ts";

const maxHp = (api: HookApi) => stat(api.c, api.self, "maxHp");
const own = (api: HookApi, u: Unit) => ({ per: "own" as const, unitId: u.id });
const flame1 = nocturnalFlame(1);
const burn = (api: HookApi, t: Unit) => applyDot(api.c, api.s, api.self, t, flame1, pctOf(stat(api.c, api.self, "atk"), 50), api.events);

// Guiding Light: an ally within 2 tiles (not Zoran) that drops to 20% HP or lower gets an added shield of
// 2 + 25% Max HP for 1 Own Turn of that ally. 1 Wick each; each ally once per Turn; allies that drop at the
// same time share one interject. Wicks: max 2, start at 1, +1 at the start of every Round.
function guidingLight(api: HookApi, e: { unitId: string; hp: number; amount: number }): void {
  const { s, self } = api;
  const t = s.units.find((u) => u.id === e.unitId)!;
  const max = stat(api.c, t, "maxHp");
  const wicks = self.vars.wicks ?? 1;
  if (t.id === self.id || t.owner !== self.owner || !t.pos || !self.pos || manhattan(t.pos, self.pos) > 2) return;
  if (wicks < 1 || e.hp * 5 > max || (e.hp + e.amount) * 5 <= max || t.vars[`wick:${self.id}`] === s.turn) return;
  self.vars.wicks = wicks - 1;
  t.vars[`wick:${self.id}`] = s.turn;
  const queued = s.pending.find((p) => p.unitId === self.id && p.key === "guidingLight" && p.appliedTurn === s.turn);
  if (queued) queued.data!.allies += `,${t.id}`;
  else api.interject("Guiding Light", "guidingLight", { data: { allies: t.id } });
}

// Vigil Lantern: a zone on a tile (Zoran's vars), 4 pulses of Zoran's team: one when summoned, then one in each of
// the next 3 Turns of his team. It has its own Speed (50% of Zoran's) and Action Count. Pulse: allies in the 3x3
// area get an added shield of 15% Max HP (kept while the lantern is up) and heal 10% Max HP; enemies get Nocturnal Flame.
function queuePulse(api: HookApi): void {
  const v = api.self.vars;
  v.lanternActions = (v.lanternActions ?? 0) + 1;
  const speed = Math.max(pctOf(stat(api.c, api.self, "speed"), 50), 1);
  api.interject("Vigil Lantern", "pulse", { actionValue: Math.floor((v.lanternActions * 10000 + speed - 1) / speed) });
}
function lanternGone(api: HookApi): void {
  const { s, self } = api;
  delete self.vars.lanternX;
  delete self.vars.lanternY;
  self.vars.lanternPulses = 0;
  // Lantern shields end together 2 Turns of Zoran's team after the lantern is gone.
  for (const u of s.units) for (const sh of u.shields) if (sh.name === `lantern:${self.id}`) Object.assign(sh, { turnsLeft: 2, count: { per: "team", seat: self.owner }, appliedTurn: s.turn });
}

// docs/heroes/Zoran.md
export const zoran = defineHero({
  id: "zoran",
  name: "Zoran",
  icon: "🏮",
  role: "Support / Damage",
  origin: "own",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 20, atk: 2, def: 1, speed: 105, move: 1, breakBar: 14, aggroBar: 5, fortitude: 2 },
  passive: {
    name: "Guiding Light",
    text: "ไส้ตะเกียง (สูงสุด 2 เริ่ม 1 ได้ +1 ทุกรอบ) พวกในระยะ 2 เลือดเหลือ ≤20% → แทรกให้โล่ 2 + 25% Max HP นาน 1 Own Turn",
  },
  hooks: {
    onEvent(api, e) {
      const self = api.self;
      if (e.type === "Damaged") guidingLight(api, e);
      if (e.type === "RoundStarted") self.vars.wicks = Math.min((self.vars.wicks ?? 1) + 1, 2);
      if (e.type === "TurnStarted" && e.seat === self.owner && (self.vars.lanternPulses ?? 0) > 0) queuePulse(api);
      if (e.type === "UnitDied" && e.unitId === self.id && self.vars.lanternX !== undefined) lanternGone(api);
    },
    interjects: {
      guidingLight(api, p) {
        const amount = pctSum([2, 100], [maxHp(api), 25]);
        for (const id of String(p.data!.allies).split(",")) {
          const u = api.s.units.find((x) => x.id === id);
          if (u && !u.dead) giveShield(api.s, u, "add", amount, 1, own(api, u));
        }
      },
      pulse(api) {
        const { s, self } = api;
        const v = self.vars;
        if (v.lanternX === undefined) return;
        const at = { x: v.lanternX, y: v.lanternY! };
        for (const u of s.units) {
          if (u.dead || !u.pos || chebyshev(u.pos, at) > 1) continue;
          if (u.owner === self.owner) {
            giveShield(s, u, "add", pctOf(maxHp(api), 15), -1, undefined, `lantern:${self.id}`);
            healFrom(api.c, self, u, pctOf(maxHp(api), 10), api.events);
          } else burn(api, u);
        }
        v.lanternPulses = (v.lanternPulses ?? 1) - 1;
        if (v.lanternPulses <= 0) lanternGone(api);
      },
    },
    specials: {
      // Veil of Nightflame: Zoran and allies within 2 tiles get a set shield of 25% Max HP for 2 Own Turns of each.
      veil(api) {
        for (const u of api.s.units) {
          if (u.dead || !u.pos || u.owner !== api.self.owner || manhattan(u.pos, api.self.pos!) > 2) continue;
          giveShield(api.s, u, "set", pctOf(maxHp(api), 25), 2, own(api, u));
        }
      },
      // A new lantern replaces the old one. Its first pulse resolves when this Turn ends.
      lantern(api, { aim }) {
        if (api.self.vars.lanternX !== undefined) lanternGone(api);
        const p = aim.tiles![0]!;
        Object.assign(api.self.vars, { lanternX: p.x, lanternY: p.y, lanternPulses: 4, lanternActions: 0 });
        queuePulse(api);
      },
    },
  },
  normalAttack: {
    name: "Lanternlight",
    mana: 2,
    text: "เป้า 1 ช่องในระยะ 2 (ยิงข้ามยูนิตไม่ได้) เวท ATK + 5% Max HP Break 20% Max HP ติดเพลิงรัตติกาล 1 เทิร์น",
    form: { rotate: 0, hit: "all", range: { manhattan: 2 }, blocked: true },
    magic: (f) => pctSum([f.atk, 100], [f.stat("maxHp"), 5]),
    break: (f) => pctOf(f.stat("maxHp"), 20),
    onHit: [flame1],
  },
  skills: [
    {
      name: "Veil of Nightflame",
      mana: 3,
      text: "พ่นเพลิงไปข้างหน้า 2 ช่อง เวท 150% ATK + 10% Max HP Break 50% Max HP ติดเพลิง 1 เทิร์น · ตัวเองและพวกในระยะ 2 ได้โล่ Set 25% Max HP นาน 2 Own Turns",
      form: { rotate: 8, hit: "all", grid: ["X", "X", "C"] },
      magic: (f) => pctSum([f.atk, 150], [f.stat("maxHp"), 10]),
      break: (f) => pctOf(f.stat("maxHp"), 50),
      onHit: [flame1],
      special: "veil",
    },
  ],
  ultimate: {
    name: "Lantern of the Long Night",
    mana: 3,
    ultCost: 4,
    ultMax: 4,
    text: "เสกตะเกียงในสี่เหลี่ยม 5x5 รอบตัว ส่งผล 3x3: พวกได้โล่ 15% Max HP + ฮีล 10% Max HP ศัตรูติดเพลิง · 4 ครั้ง (ตอนเสก + 3 เทิร์นฝั่งเรา)",
    form: { rotate: 0, hit: "allies", range: { square: 2 } },
    special: "lantern",
  },
});
