import { addBuff, chebyshev, manhattan, pctOf, stat, unitDef, type HookApi, type Unit } from "@hcd/engine";
import { defineHero, pctSum } from "../define.ts";

const allies = (api: HookApi, near: (u: Unit) => boolean) =>
  api.s.units.filter((u) => !u.dead && u.pos && u.owner === api.self.owner && u.id !== api.self.id && near(u));

// statuses.md "Physical ATK +N": N is worked out now from Linnet's stats, for 1 or 2 Own Turns of the ally.
const physicalAtk = (api: HookApi, u: Unit, n: number, turns: number, name?: string) =>
  addBuff(api.s, api.self, u, { stat: "physicalAtk", amount: n, turns, per: "own", ...(name ? { name } : {}) }, api.events);

// Rising Chorus: Echoes of the Elder Flock, max 3 (extra points are lost). At 3, Crescendo interjects.
function addEchoes(api: HookApi, n: number): void {
  const v = api.self.vars;
  if (v.chorus !== 1 || v.crescendo === 1) return;
  v.echoes = Math.min((v.echoes ?? 0) + n, 3);
  if (v.echoes === 3) {
    v.crescendo = 1;
    api.interject("Crescendo", "crescendo");
  }
}
const enterChorus = (api: HookApi, ifIn: number) => {
  if (api.self.vars.chorus === 1) addEchoes(api, ifIn);
  else Object.assign(api.self.vars, { chorus: 1, echoes: 0, crescendo: 0 });
};

// Linnet or an ally within 2 tiles of her.
const byTeam = (api: HookApi, id: string | null) => {
  const u = api.s.units.find((x) => x.id === id);
  return !!u && u.owner === api.self.owner && (u.id === api.self.id || (!!u.pos && !!api.self.pos && manhattan(u.pos, api.self.pos) <= 2));
};

// docs/heroes/Linnet.md
export const linnet = defineHero({
  id: "linnet",
  name: "Linnet",
  icon: "🪶",
  role: "Support",
  origin: "own",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 18, atk: 2, def: 0, speed: 110, move: 1, breakBar: 15, aggroBar: 6 },
  passive: {
    name: "Tidal Chorus",
    text: "ทุกการโจมตีที่โดนศัตรู พวกใน 8 ช่องรอบตัวได้ Physical ATK +1% Speed นาน 2 Own Turns (สูงสุด 5 stack)",
  },
  hooks: {
    onEvent(api, e) {
      const { s, self } = api;
      // Tidal Chorus: once per attack of hers that hits an enemy (not once per enemy hit).
      if (e.type === "Hit" && e.sourceId === self.id && self.pos) {
        const key = s.turn * 1000 + self.actionCount;
        if (self.vars.chorusHit !== key) {
          self.vars.chorusHit = key;
          for (const u of allies(api, (u) => chebyshev(u.pos!, self.pos!) === 1)) {
            if (u.buffs.filter((b) => b.name === "tidalChorus").length < 5) physicalAtk(api, u, pctOf(stat(api.c, self, "speed"), 1), 2, "tidalChorus");
          }
        }
      }
      if (self.vars.chorus !== 1) return;
      // Echoes: a kill by Linnet or an ally near her (+1 unit, +2 hero) …
      if (e.type === "UnitDied" && byTeam(api, e.killerId)) {
        const dead = s.units.find((u) => u.id === e.unitId)!;
        if (dead.owner !== self.owner) addEchoes(api, dead.kind === "hero" ? 2 : 1);
      }
      // … or an enemy hero brought below 50% HP (one already below does not count). These add up.
      if (e.type === "Damaged" && byTeam(api, e.sourceId)) {
        const t = s.units.find((u) => u.id === e.unitId)!;
        const max = stat(api.c, t, "maxHp");
        if (t.owner !== self.owner && t.kind === "hero" && (e.hp + e.amount) * 2 >= max && e.hp * 2 < max) addEchoes(api, 1);
      }
    },
    interjects: {
      // Crescendo: allies within 2 tiles (not Linnet) get Physical ATK +5% Speed for 1 Own Turn; Rising Chorus ends.
      crescendo(api) {
        const n = pctOf(stat(api.c, api.self, "speed"), 5);
        for (const u of allies(api, (u) => manhattan(u.pos!, api.self.pos!) <= 2)) physicalAtk(api, u, n, 1);
        Object.assign(api.self.vars, { chorus: 0, echoes: 0, crescendo: 0 });
      },
    },
    specials: {
      wings(api, { area }) {
        const n = pctSum([stat(api.c, api.self, "atk"), 50], [stat(api.c, api.self, "speed"), 2.5]);
        for (const u of area.allies) if (u.id !== api.self.id) physicalAtk(api, u, n, 1);
        enterChorus(api, 1);
      },
      hymn(api, { area }) {
        const t = area.allies[0]!;
        physicalAtk(api, t, pctOf(stat(api.c, api.self, "speed"), 2.5), 1);
        if (t.broken && t.cc.stun !== undefined) {
          t.broken = false;
          t.breakBar = unitDef(api.c, t.defId).stats.breakBar;
          api.events.push({ type: "BreakRestored", unitId: t.id });
        }
        for (const kind of Object.keys(t.cc)) api.events.push({ type: "StatusEnded", unitId: t.id, status: kind });
        t.cc = {};
        enterChorus(api, 2);
      },
    },
    checks: {
      hymn: (_api, { area }) => (area.allies.length ? null : "choose an ally"),
    },
  },
  normalAttack: {
    name: "Silver Trill",
    mana: 2,
    text: "ศัตรู 1 ตัวในระยะ 2 (ยิงข้ามได้) เวท ATK Break 1 + 150% ATK",
    form: { rotate: 0, hit: "all", range: { manhattan: 2 } },
    magic: (f) => f.atk,
    break: (f) => pctSum([1, 100], [f.atk, 150]),
  },
  skills: [
    {
      name: "Wings over the Waves",
      mana: 3,
      text: "พวกในระยะ 2 (ไม่รวมตัวเอง) ได้ Physical ATK +50% ATK + 2.5% Speed นาน 1 Own Turn แล้วเข้า Rising Chorus (ใช้ซ้ำได้ +1 แต้ม)",
      form: { rotate: 0, hit: "allies", grid: [". . X . .", ". X X X .", "X X C X X", ". X X X .", ". . X . ."] },
      special: "wings",
    },
  ],
  ultimate: {
    name: "Hymn of the Ancestral Waters",
    mana: 3,
    ultCost: 5,
    ultMax: 5,
    text: "พวก 1 ตัวในระยะ 2 (ไม่ใช่ตัวเอง) ได้ Physical ATK +2.5% Speed นาน 1 Own Turn และล้าง CC · เข้า Rising Chorus +1 แต้ม (ถ้าอยู่แล้ว +2)",
    form: { rotate: 0, hit: "allies", range: { manhattan: 2 } },
    special: "hymn",
  },
});
