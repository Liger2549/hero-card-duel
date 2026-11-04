import { healFrom, heroDef, manhattan, pctOf, reduceBreakBar, stat, strike, type HookApi } from "@hcd/engine";
import { defineHero, pctSum } from "../define.ts";

const gainUlt = (api: HookApi, n: number) => (api.self.ult = Math.min(api.self.ult + n, heroDef(api.c, api.self.defId)!.ultimate.ultMax));

// Rolling Tide: 4 pulses of her team (one when cast, then one in each of the next 3 Turns of her team),
// centered on Leilani: heal her and allies within 2 tiles for 150% ATK; enemies within 3 tiles take Magic 1 + 35% ATK, Break 1.
function pulse(api: HookApi): void {
  const { c, s, self, events } = api;
  if (!self.pos) return;
  const atk = stat(c, self, "atk");
  for (const u of [...s.units]) {
    if (u.dead || !u.pos) continue;
    const d = manhattan(u.pos, self.pos);
    if (u.owner === self.owner && d <= 2) healFrom(c, self, u, pctOf(atk, 150), events);
    if (u.owner !== self.owner && d <= 3 && strike(c, s, self, u, 0, pctSum([1, 100], [atk, 35]), 0, events)) reduceBreakBar(c, s, self, u, 1, events);
  }
  self.vars.tide = (self.vars.tide ?? 1) - 1;
}

// docs/heroes/Leilani.md
export const leilani = defineHero({
  id: "leilani",
  name: "Leilani",
  icon: "🐋",
  role: "Support",
  origin: "own",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 16, atk: 3, def: 1, speed: 105, move: 1, breakBar: 14, aggroBar: 5, healingBonus: 2, healingPower: 125 },
  passive: {
    name: "Lifebuoy (ห่วงชูชีพ)",
    text: "พวกในระยะ 2 เลือดต่ำกว่า 25% → แทรกฮีล 2 + 25% Max HP และได้อัลติ +1 (คูลดาวน์ 4 เทิร์นฝั่งเรา) · ไม่ได้ใช้เทิร์น 3 เทิร์นฝั่งเรา → ท่าถัดไปได้อัลติ +1",
  },
  hooks: {
    onEvent(api, e) {
      const { c, s, self } = api;
      // Lifebuoy: an ally hero or unit within 2 tiles (not Leilani) drops below 25% of its Max HP.
      if (e.type === "Damaged" && (self.vars.lifebuoyCooldown ?? 0) === 0) {
        const t = s.units.find((u) => u.id === e.unitId)!;
        const max = stat(c, t, "maxHp");
        if (t.id !== self.id && t.owner === self.owner && t.pos && self.pos && manhattan(t.pos, self.pos) <= 2 && e.hp * 4 < max && (e.hp + e.amount) * 4 >= max) {
          self.vars.lifebuoyCooldown = 4;
          api.interject("Lifebuoy", "lifebuoy", { data: { ally: t.id } });
        }
      }
      if (e.type === "TurnStarted" && e.seat === self.owner) {
        // Lifebuoy's cooldown counts her team's Turns.
        if ((self.vars.lifebuoyCooldown ?? 0) > 0) self.vars.lifebuoyCooldown! -= 1;
        // Return to the stage: her team's Turns in a row in which she did not act.
        self.vars.idle = self.vars.actedSince === 1 ? 0 : (self.vars.idle ?? 0) + 1;
        self.vars.actedSince = 0;
        if ((self.vars.tide ?? 0) > 0) api.interject("Rolling Tide", "tide");
      }
      if (e.type === "AbilityUsed" && e.unitId === self.id) {
        if ((self.vars.idle ?? 0) >= 3) gainUlt(api, 1);
        self.vars.idle = 0;
        self.vars.actedSince = 1;
      }
    },
    interjects: {
      lifebuoy(api, p) {
        const t = api.s.units.find((u) => u.id === p.data!.ally);
        if (t && !t.dead) healFrom(api.c, api.self, t, pctSum([2, 100], [stat(api.c, api.self, "maxHp"), 25]), api.events);
        gainUlt(api, 1);
      },
      tide: pulse,
    },
    specials: {
      // The first pulse resolves when this Turn ends.
      tide(api) {
        api.self.vars.tide = 4;
        api.interject("Rolling Tide", "tide");
      },
      // Whale Breach: the ripple heals every ally hero and unit on the board, Leilani too (not objects).
      whale(api) {
        const n = pctOf(stat(api.c, api.self, "atk"), 150);
        for (const u of api.s.units) if (!u.dead && u.pos && u.owner === api.self.owner) healFrom(api.c, api.self, u, n, api.events);
      },
    },
  },
  normalAttack: {
    name: "Sea Spray (ละอองทะเล)",
    mana: 2,
    text: "เวทน้ำใส่เป้า 1 ช่องในระยะ 2 เวท 50% ATK Break 120% ATK",
    form: { rotate: 0, hit: "all", range: { manhattan: 2 } },
    magic: (f) => pctOf(f.atk, 50),
    break: (f) => pctOf(f.atk, 120),
  },
  skills: [
    {
      name: "Rolling Tide (คลื่นม้วน)",
      mana: 3,
      text: "คลื่นรอบตัว 4 ครั้ง (ตอนใช้ + 3 เทิร์นฝั่งเรา): ฮีลตัวเองและพวกในระยะ 2 150% ATK · ศัตรูในระยะ 3 เวท 1 + 35% ATK Break 1",
      form: { rotate: 0, hit: "allies", self: true, grid: [". . X . .", ". X X X .", "X X C X X", ". X X X .", ". . X . ."] },
      special: "tide",
    },
  ],
  ultimate: {
    name: "Whale Breach (วาฬกระเพื่อม)",
    mana: 4,
    ultCost: 6,
    ultMax: 6,
    text: "เลือกจุดบนขอบห่าง 3 ช่อง หมุนได้ 4 ทิศ เวท 120% ATK Break 220% ATK · ฮีลพวกทุกตัวบนกระดาน 150% ATK",
    form: {
      rotate: 4,
      hit: "all",
      range: { ring: 3 },
      grid: ["X X X X X", "X X X X X", "X X X X X", "X X X X X", "X X P X X", "X X X X X"],
    },
    magic: (f) => pctOf(f.atk, 120),
    break: (f) => pctOf(f.atk, 220),
    special: "whale",
  },
});
