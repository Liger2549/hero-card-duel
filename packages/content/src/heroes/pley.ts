import {
  addBuff,
  applyWither,
  candidateAims,
  chebyshev,
  divRound,
  inBounds,
  manhattan,
  pctOf,
  placeObject,
  removeObject,
  resolveAbility,
  resolveArea,
  stat,
  strike,
  unitAt,
  type AbilityDef,
  type GameEvent,
  type HookApi,
  type Pos,
  type UnitHooks,
} from "@hcd/engine";
import { ATK, defineHero } from "../define.ts";

// docs/heroes/Pley.md: two forms. The draft offers "pley" (Ribu); "pleyDemon" (Pley) takes over when Ribu dies
// or uses Paradox Shift.

// Out of Phase (both forms).
const outOfPhase: Pick<UnitHooks, "hitTaken" | "stat"> = {
  // Speed dodge (hits only): Speed more than 1.5× the attacker's → half damage; more than 2× → none.
  // In the air (Falling Seraph) Pley takes no damage from hits.
  hitTaken(api, attacker, damage) {
    if (api.self.vars.airborne === 1) return 0;
    const me = stat(api.c, api.self, "speed");
    const them = stat(api.c, attacker, "speed");
    if (me > 2 * them) return 0;
    if (2 * me > 3 * them) return divRound(damage, 2);
    return damage;
  },
  // Armor shift: DEF and Armor are always 0 and all of it becomes Magic Armor.
  stat: (_u, name, value, raw) => (name === "def" || name === "armor" ? 0 : name === "magicArmor" ? value + raw("def") + raw("armor") : value),
};

// ---- Ribu ----

// Volatile Core: an object with its own Speed (125% of Ribu's) and Action Count. vars.stage: 0 waiting, 1 grown.
const corners: Record<string, Pos> = { NE: { x: 1, y: 1 }, SE: { x: 1, y: -1 }, SW: { x: -1, y: -1 }, NW: { x: -1, y: 1 } };
const cornerNames = Object.keys(corners);
const cores = (api: HookApi) => api.s.objects.filter((o) => o.kind === "core" && o.ownerId === api.self.id);
const removeCores = (api: HookApi) => cores(api).forEach((o) => removeObject(api.s, o, api.events));

function queueCore(api: HookApi, coreId: string): void {
  const o = api.s.objects.find((x) => x.id === coreId)!;
  o.vars.actions = (o.vars.actions ?? 0) + 1;
  const speed = Math.max(pctOf(stat(api.c, api.self, "speed"), 125), 1);
  api.interject("Volatile Core", "core", { actionValue: Math.floor((o.vars.actions * 10000 + speed - 1) / speed), data: { core: coreId } });
}

function explode(api: HookApi, tiles: Pos[], physical: number): void {
  for (const p of tiles) {
    const t = unitAt(api.s, p);
    if (t && !t.dead && t.owner !== api.self.owner) strike(api.c, api.s, api.self, t, physical, 0, 0, api.events);
  }
}

// Ribu dies, or uses Paradox Shift: Pley appears on that tile, fresh (buffs, shields, CC and DOTs gone; items
// only kept with Paradox Shift), with Speed +5 and Life Steal +2 per Paradox point, and strikes with
// Revenant's Cross: a plus shape 3 tiles wide to the board edges.
function becomePley(api: HookApi, at: Pos, paradox: number, crossDamage: (atk: number) => number, keepItems: boolean): void {
  const { c, s, self, events } = api;
  removeCores(api);
  Object.assign(self, { defId: "pleyDemon", dead: false, pos: at, ult: 0, shields: [], buffs: [], dots: [], cc: {}, freeSteps: 0, stealth: false, lockedOut: false, vars: {} });
  if (!keepItems) self.items = [];
  self.hp = stat(c, self, "maxHp");
  addBuff(s, self, self, { stat: "speed", amount: 5 * paradox, turns: -1, name: "paradox" }, events);
  addBuff(s, self, self, { stat: "lifeSteal", amount: 2 * paradox, turns: -1, name: "paradox" }, events);
  events.push({ type: "UnitSummoned", unitId: self.id, defId: self.defId, owner: self.owner, to: at });
  const damage = crossDamage(stat(c, self, "atk"));
  for (const t of [...s.units]) {
    if (t.dead || !t.pos || t.owner === self.owner) continue;
    if (Math.abs(t.pos.x - at.x) <= 1 || Math.abs(t.pos.y - at.y) <= 1) strike(c, s, self, t, damage, 0, 0, events);
  }
}

const ribuHooks: UnitHooks = {
  ...outOfPhase,
  // Borrowed Time: Ribu's Physical damage +30% against enemies in the 5x5 square around him.
  hitValues: (api, target, v) => (target.pos && api.self.pos && chebyshev(target.pos, api.self.pos) <= 2 ? { ...v, physical: pctOf(v.physical, 130) } : v),
  onEvent(api, e: GameEvent) {
    const { s, self } = api;
    if (self.defId !== "pley") return;
    // 1 free step every Turn of his team: not kept, not stacked.
    if (e.type === "TurnStarted") self.freeSteps = e.seat === self.owner && !self.dead ? 1 : 0;
    // Each Core interjects in the enemy's Turns: first 1x1, then 2x2.
    if (e.type === "TurnStarted" && e.seat !== self.owner) for (const o of cores(api)) queueCore(api, o.id);
    if (e.type === "UnitDied" && e.unitId === self.id && e.at) becomePley(api, e.at, e.ult, () => 2, false);
  },
  interjects: {
    core(api, p) {
      const o = api.s.objects.find((x) => x.id === p.data!.core);
      if (!o) return;
      const atk = stat(api.c, api.self, "atk");
      if (o.vars.stage !== 1) {
        explode(api, [o.pos], pctOf(atk, 50));
        o.vars.stage = 1;
        return;
      }
      const d = corners[cornerNames[o.vars.corner!]!]!;
      const tiles = [o.pos, { x: o.pos.x + d.x, y: o.pos.y }, { x: o.pos.x, y: o.pos.y + d.y }, { x: o.pos.x + d.x, y: o.pos.y + d.y }].filter((t) => inBounds(api.s.config, t));
      explode(api, tiles, atk);
      removeObject(api.s, o, api.events);
      api.self.ult = Math.min(api.self.ult + 1, 7); // a Core that finishes gives +1 Paradox
    },
  },
  specials: {
    core(api, { aim, area }) {
      api.self.vars.coreTurn = api.s.turn;
      const o = placeObject(api.s, api.self, "core", aim.tiles![0]!, null, -1, { per: "turn" }, api.events);
      o.vars = { stage: 0, corner: cornerNames.indexOf(area.dir!), actions: 0 };
    },
    // Paradox Shift: counted with the points the Ultimate just spent (7).
    shift: (api) => becomePley(api, api.self.pos!, api.self.ult + 7, (atk) => atk, true),
  },
  checks: {
    core: (api, { area }) => (api.self.vars.coreTurn === api.s.turn ? "once per Turn" : area.dir && area.dir in corners ? null : "pick a corner (NE, SE, SW, NW)"),
  },
};

export const pley = defineHero({
  id: "pley",
  name: "Pley (Ribu)",
  icon: "🔫",
  role: "Damage",
  origin: "own",
  attackType: "mixed",
  getsFreeStep: true,
  damageType: "physical",
  bounty: 0,
  stats: { maxHp: 8, atk: 3, def: 0, speed: 140, move: 1, breakBar: -1, aggroBar: -1, healingTaken: 25 },
  passive: {
    name: "Out of Phase · Borrowed Time",
    text:
      "Speed เกิน 1.5 เท่าของคนตี รับดาเมจครึ่งเดียว เกิน 2 เท่าไม่รับเลย · DEF และ Armor กลายเป็น Magic Armor · ไม่มี Break Bar และ Aggro · ได้รับฮีล 25% " +
      "· ศัตรูในสี่เหลี่ยม 5x5 โดนกายภาพ +30% · เดินฟรีทุกเทิร์น 1 ครั้ง · ตายแล้ว Pley ปรากฏแทนพร้อม Revenant's Cross",
  },
  hooks: ribuHooks,
  normalAttack: {
    name: "Neon Spray (ห่ากระสุนนีออน)",
    mana: 2,
    text: "ยิงเป้า 1 ช่องในสี่เหลี่ยม 5x5 (ยิงข้ามไม่ได้) กายภาพ 2 + ATK Break 1 · Paradox +1",
    form: { rotate: 0, hit: "all", range: { square: 2 }, blocked: true },
    physical: (f) => 2 + f.atk,
    break: 1,
  },
  skills: [
    {
      name: "Core Drop (ทิ้งแกน)",
      mana: 2,
      text: "วางแกนในสี่เหลี่ยม 5x5 เลือกมุมขยาย (เทิร์นละครั้ง) · เทิร์นศัตรูถัดไประเบิด 1x1 กายภาพ 50% ATK · เทิร์นศัตรูถัดจากนั้นระเบิด 2x2 กายภาพ ATK แล้ว Paradox +1",
      form: { rotate: 8, hit: "allies", range: { square: 2 }, grid: ["P"] },
      ultGain: 0,
      freeAction: true,
      special: "core",
    },
  ],
  ultimate: {
    name: "Paradox Shift (สลับปฏิทรรศน์)",
    mana: 0,
    ultCost: 7,
    ultMax: 7,
    gaugeName: "Paradox",
    text: "สละร่าง Ribu กลายเป็น Pley (ของไม่หาย) Revenant's Cross ใช้ ATK ของ Pley",
    form: { rotate: 0, hit: "allies", self: true, grid: ["C"] },
    freeAction: true,
    special: "shift",
  },
});

// ---- Pley ----

// Falling Seraph's dive: centre 180% ATK, the 8 tiles around 120% ATK.
const dive: AbilityDef = {
  name: "Falling Seraph",
  mana: 0,
  text: "",
  form: { rotate: 0, hit: "all", range: { manhattan: 2 }, grid: ["b b b", "b P b", "b b b"] },
  physical: (f) => pctOf(f.atk, 180),
  zones: { b: { physical: (f) => pctOf(f.atk, 120) } },
};

// Max HP buffs from his own skills ("halo"), capped at 250% of his Max HP before them (base + items).
const halo = (api: HookApi, pct: number) => addBuff(api.s, api.self, api.self, { stat: "maxHp", amount: pctOf(stat(api.c, api.self, "atk"), pct), turns: 2, per: "own", name: "halo" }, api.events);

// Tiles Pley can dive on: within 2 tiles, and a tile a Lock-on skill may pick.
const diveOptions = (api: HookApi): Pos[] =>
  candidateAims(api.s, api.self, dive.form)
    .map((a) => a.tiles![0]!)
    .filter((p) => typeof resolveArea(api.s, api.self, dive.form, { tiles: [p] }) !== "string");

// The docs' time-out pick: most enemies hit, then most damage.
function bestDive(api: HookApi): Pos | null {
  const { s, self } = api;
  let best: { p: Pos; hits: number; damage: number } | null = null;
  for (let y = 0; y < s.config.boardHeight; y++) {
    for (let x = 0; x < s.config.boardWidth; x++) {
      const p = { x, y };
      const d = manhattan(p, self.pos!);
      if (d < 1 || d > 2) continue;
      let hits = 0;
      let damage = 0;
      for (const t of s.units) {
        if (t.dead || !t.pos || t.owner === self.owner || t.stealth || chebyshev(t.pos, p) > 1) continue;
        hits += 1;
        damage += chebyshev(t.pos, p) === 0 ? 180 : 120;
      }
      if (hits && (!best || hits > best.hits || (hits === best.hits && damage > best.damage))) best = { p, hits, damage };
    }
  }
  return best?.p ?? null;
}

export const pleyDemon = defineHero({
  id: "pleyDemon",
  name: "Pley",
  icon: "🪽",
  inDraft: false,
  role: "Damage",
  origin: "own",
  attackType: "mixed",
  getsFreeStep: true,
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 12, atk: 5, def: 0, speed: 125, move: 1, breakBar: -1, aggroBar: -1, lifeSteal: 1, healingTaken: 25 },
  passive: {
    name: "Out of Phase · Fallen Halo",
    text: "เหมือน Ribu · เลือดต่ำกว่า 20% Life Steal +2 · ทุก hit ลด Max HP ศัตรู 25% ATK นาน 1 Own Turn ของศัตรู · Max HP สูงสุด 250%",
  },
  hooks: {
    ...outOfPhase,
    stat(u, name, value, raw) {
      const v = outOfPhase.stat!(u, name, value, raw);
      // Hunger: Life Steal +2 while HP is below 20% of Max HP.
      if (name === "lifeSteal") return u.hp * 5 < raw("maxHp") ? v + 2 : v;
      // Max HP cap: 250% of Max HP without his own halo buffs.
      if (name === "maxHp") return Math.min(v, pctOf(v - u.buffs.filter((b) => b.name === "halo").reduce((sum, b) => sum + b.amount, 0), 250));
      return v;
    },
    onEvent(api, e) {
      const { s, self } = api;
      // Wither: each hit lowers the enemy's Max HP by 25% ATK for 1 Own Turn of that enemy (even through shields).
      if (e.type === "Hit" && e.sourceId === self.id) {
        const t = s.units.find((u) => u.id === e.unitId);
        if (t && t.owner !== self.owner) applyWither(s, self, t, pctOf(stat(api.c, self, "atk"), 25), 1, "own", api.events);
      }
      // Falling Seraph: dives in the enemy's next Turn.
      if (e.type === "TurnStarted" && e.seat !== self.owner && self.vars.airborne === 1 && self.vars.diveQueued !== 1) {
        self.vars.diveQueued = 1;
        api.interject("Falling Seraph", "dive");
      }
    },
    interjects: {
      // His player picks the centre tile while the interject resolves (time-out: bestDive).
      dive(api) {
        if (!api.picked) {
          const options = diveOptions(api);
          if (options.length) return api.ask(options, bestDive(api) ?? options[0]!);
        }
        if (api.picked) resolveAbility(api.c, api.s, api.self, dive, { tiles: [api.picked] }, api.events);
        halo(api, 90);
        Object.assign(api.self.vars, { airborne: 0, diveQueued: 0 });
        api.self.lockedOut = false;
      },
    },
    specials: {
      psalm: (api) => halo(api, 15),
      arc: (api) => halo(api, 40),
      seraph(api) {
        Object.assign(api.self.vars, { airborne: 1, diveQueued: 0 });
        api.self.lockedOut = true;
      },
    },
  },
  normalAttack: {
    name: "Piercing Psalm (บทสวดทะลวง)",
    mana: 3,
    text: "แทงไปข้างหน้า 2 ช่อง 8 ทิศ กายภาพ 120% ATK Break 30% ATK · Max HP +15% ATK นาน 2 Own Turns",
    form: { rotate: 8, hit: "all", grid: ["X", "X", "C"] },
    physical: (f) => pctOf(f.atk, 120),
    break: (f) => pctOf(f.atk, 30),
    special: "psalm",
  },
  skills: [
    {
      name: "Severing Arc (เสี้ยวตัดขาด)",
      mana: 3,
      text: "กวาดแถวหน้า 3 ช่อง กายภาพ 75% ATK Break 10% ATK · Max HP +40% ATK นาน 2 Own Turns",
      form: { rotate: 4, hit: "all", grid: ["X X X", ". C ."] },
      physical: (f) => pctOf(f.atk, 75),
      break: (f) => pctOf(f.atk, 10),
      ultGain: 1,
      special: "arc",
    },
  ],
  ultimate: {
    name: "Falling Seraph (เทวทูตร่วงหล่น)",
    mana: 4,
    ultCost: 3,
    ultMax: 3,
    text: "บินขึ้น (ไม่รับดาเมจจาก hit ทำอะไรไม่ได้) แล้วดิ่งในเทิร์นศัตรูถัดไป: ตรงกลาง 180% ATK รอบ ๆ 120% ATK ในระยะ 2 · Max HP +90% ATK",
    form: { rotate: 0, hit: "allies", self: true, grid: ["C"] },
    freeAction: true,
    special: "seraph",
  },
});
