import { addBuff, chebyshev, pctOf, reduceBreakBar, statBeforeHooks, strike, type GameEvent, type HookApi, type UnitHooks } from "@hcd/engine";
import { defineHero, FRONT1, pctSum } from "../define.ts";

// Guarded units carry two buffs named after this Bianca (Armor +2, Magic Armor +1).
const guardName = (api: HookApi) => `oath:${api.self.id}`;
const isGuarded = (api: HookApi, unitId: string) => api.s.units.some((u) => u.id === unitId && u.buffs.some((b) => b.name === guardName(api)));
const unguard = (api: HookApi, unitId?: string) => {
  for (const u of api.s.units) if (!unitId || u.id === unitId) u.buffs = u.buffs.filter((b) => b.name !== guardName(api));
};

// Giuramento d'Avorio / Vendetta della Cittadella: Bianca and allies within 1 are guarded for 4 Turns, 2 counters.
// Casting either replaces the other and resets the duration and the counter count.
function guard(api: HookApi, vendetta: boolean): void {
  const { s, self } = api;
  unguard(api);
  for (const u of s.units) {
    if (u.dead || !u.pos || u.owner !== self.owner || chebyshev(u.pos, self.pos!) > 1) continue;
    addBuff(s, self, u, { stat: "armor", amount: 2, turns: 4, name: guardName(api) }, api.events);
    addBuff(s, self, u, { stat: "magicArmor", amount: 1, turns: 4, name: guardName(api) }, api.events);
  }
  self.vars.counters = 2;
  self.vars.vendetta = vendetta ? 1 : 0;
}

const moves = (e: GameEvent): string[] =>
  e.type === "UnitStepped" || e.type === "UnitMoved" || e.type === "UnitPushed" || e.type === "UnitPrepMoved"
    ? [e.unitId]
    : e.type === "UnitsSwapped"
      ? [e.unitId, e.allyId]
      : [];

const hooks: UnitHooks = {
  // Bastione Bianco: DEF is always 0; Armor + 100% DEF, Magic Armor + 50% DEF (DEF before the conversion).
  stat: (_u, name, value, raw) => (name === "def" ? 0 : name === "armor" ? value + raw("def") : name === "magicArmor" ? value + pctOf(raw("def"), 50) : value),
  specials: {
    oath: (api) => guard(api, false),
    vendetta: (api) => guard(api, true),
  },
  onEvent(api, e) {
    const { s, self } = api;
    // An enemy hit on a guarded unit: counter (up to 2 per cast), as an automatic interject.
    if (e.type === "Hit" && (self.vars.counters ?? 0) > 0 && isGuarded(api, e.unitId)) {
      const attacker = s.units.find((u) => u.id === e.sourceId);
      if (attacker && attacker.owner !== self.owner) {
        self.vars.counters! -= 1;
        api.interject("Counter", "counter", { data: { attacker: attacker.id } });
      }
    }
    // Bianca moving ends it for everyone; a guarded ally more than 1 tile away loses it.
    for (const id of moves(e)) {
      if (id === self.id) unguard(api);
      else {
        const u = s.units.find((x) => x.id === id);
        if (u?.pos && self.pos && isGuarded(api, id) && chebyshev(u.pos, self.pos) > 1) unguard(api, id);
      }
    }
  },
  interjects: {
    // The attacker if it is in the 5x5 square around Bianca, else the nearest enemy there (heroes first).
    counter(api, p) {
      const { c, s, self } = api;
      // Counter-attacks are Lock-on: they skip units in Stealth.
      const near = s.units.filter((u) => !u.dead && u.pos && !u.stealth && u.owner !== self.owner && chebyshev(u.pos, self.pos!) <= 2);
      const target =
        near.find((u) => u.id === p.data?.attacker) ??
        near.sort((a, b) => Number(b.kind === "hero") - Number(a.kind === "hero") || chebyshev(a.pos!, self.pos!) - chebyshev(b.pos!, self.pos!))[0];
      if (!target) return;
      const def = statBeforeHooks(c, self, "def");
      const vendetta = self.vars.vendetta === 1;
      const through = strike(c, s, self, target, vendetta ? pctSum([2, 100], [def, 150]) : 1 + def, 0, 0, api.events);
      if (through) reduceBreakBar(c, s, self, target, vendetta ? 3 : 2, api.events);
    },
  },
};

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
    text: "DEF เป็น 0 เสมอ แปลงเป็น Armor + 100% DEF และ Magic Armor + 50% DEF (DEF ในสูตรสกิลคือค่าก่อนแปลง)",
  },
  hooks,
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
        "ถ้าศัตรูตีคนที่คุ้มกัน สวนกลับ 1 + DEF ในระยะ 5x5 (สูงสุด 2 ครั้ง)",
      form: { rotate: 0, hit: "allies", self: true, grid: ["X X X", "X C X", "X X X"] },
      special: "oath",
    },
  ],
  ultimate: {
    name: "Fortezza Inviolata",
    mana: 4,
    ultCost: 5,
    ultMax: 5,
    text: "ฟาดเส้นตรง 2 ช่อง กายภาพ 5 + DEF Break 5 แล้วได้ Vendetta della Cittadella (สวนกลับ 2 + 150% DEF)",
    form: { rotate: 4, hit: "all", grid: ["X", "X", "C"] },
    physical: (f) => 5 + f.def,
    break: 5,
    special: "vendetta",
  },
});
