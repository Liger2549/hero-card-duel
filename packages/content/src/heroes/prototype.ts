import {
  addBuff,
  chebyshev,
  divRound,
  endStealth,
  findUnit,
  giveShield,
  healFrom,
  inBounds,
  loseHp,
  manhattan,
  moveUnit,
  pctOf,
  placeObject,
  placeSummon,
  reduceBreakBar,
  stat,
  strike,
  TimesOfDay,
  unitAt,
  type HookApi,
  type HitForm,
  type Pos,
  type SpecialContext,
  type Unit,
} from "@hcd/engine";
import { ATK, defineHero, FRONT1 } from "../define.ts";
import { burn } from "../statuses.ts";

// docs/heroes/prototype-set.md: the prototype's other heroes, taken as is (names by Claude).

const pick = (n: number, hit: HitForm["hit"] = "all", extra: Partial<HitForm> = {}): HitForm => ({ rotate: 0, hit, range: { manhattan: n }, ...extra });
const ally = (n: number): HitForm => pick(n, "allies", { pickSelf: true });
const everyAlly: HitForm = { rotate: 0, hit: "allies", board: true };
const self: HitForm = { rotate: 0, hit: "allies", self: true, grid: ["C"] };
const SQ3 = ["X X X", "X P X", "X X X"];
const PLUS = [". X .", "X P X", ". X ."];
const RING8 = ["X X X", "X C X", "X X X"];
const R2 = [". . X . .", ". X X X .", "X X C X X", ". X X X .", ". . X . ."];
const around8 = [[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1]] as const;
const isNight = (api: HookApi) => ["Night", "Late Night"].includes(TimesOfDay[api.s.timeOfDay]!);
const enemyAt = (api: HookApi, p: Pos | undefined) => {
  const u = p ? unitAt(api.s, p) : undefined;
  return u && !u.dead && u.owner !== api.self.owner ? u : undefined;
};
const freeAround = (api: HookApi, at: Pos) =>
  around8.map(([dx, dy]) => ({ x: at.x + dx, y: at.y + dy })).filter((p) => inBounds(api.s.config, p) && !unitAt(api.s, p));
// A named buff that is worked out again (replaced) each time.
const setBuff = (api: HookApi, name: string, stat_: "atk" | "def", amount: number) => {
  api.self.buffs = api.self.buffs.filter((b) => b.name !== name);
  if (amount) addBuff(api.s, api.self, api.self, { stat: stat_, amount, turns: -1, name }, api.events);
};
// HP the user's hits took away in the Action that just ran (from its AbilityUsed event on).
const dealtThisAction = (api: HookApi) => {
  let total = 0;
  for (let i = api.events.length - 1; i >= 0; i--) {
    const e = api.events[i]!;
    if (e.type === "AbilityUsed" && e.unitId === api.self.id) break;
    if (e.type === "Damaged" && e.sourceId === api.self.id) total += e.amount;
  }
  return total;
};

// ---- Dante (นักดาบโลหิต) ----
export const dante = defineHero({
  id: "dante",
  name: "Dante",
  icon: "🩸",
  role: "Damage / Burst",
  origin: "idea",
  attackType: "melee",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 22, atk: 4, def: 0, speed: 100, move: 1, breakBar: 12, aggroBar: 5 },
  passive: { name: "Blood Edge (คมเลือด)", text: "ตีปกติแรงขึ้น 2 แต่เสีย HP ตัวเอง 2" },
  hooks: {
    specials: {
      bloodCost: (api) => loseHp(api.c, api.s, api.self, 2, null, api.events),
      // Bloodline Cut: 22% of the target's Max HP, past Armor and shields.
      bloodline(api, { area }) {
        for (const t of area.enemies) loseHp(api.c, api.s, t.unit, pctOf(stat(api.c, t.unit, "maxHp"), 22), api.self, api.events);
      },
      bloodNight: (api) => healFrom(api.c, api.self, api.self, divRound(dealtThisAction(api), 2), api.events),
    },
    checks: {
      bloodCost: (api) => (api.self.hp > 2 ? null : "not enough HP"),
      bloodline: (_api, { area }) => (area.enemies.length ? null : "no enemy in the area"),
    },
  },
  normalAttack: { name: "Blood Slash (ฟันเลือด)", mana: 2, text: "ฟัน 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK + 2 เสีย HP ตัวเอง 2", form: FRONT1, physical: (f) => f.atk + 2, break: 1, special: "bloodCost" },
  skills: [
    { name: "Bloodline Cut (ตัดสายเลือด)", mana: 3, text: "ศัตรูที่ยืนติดกัน เสียเลือด 22% ของ HP สูงสุด ไม่สนเกราะและโล่", form: pick(1), break: 2, special: "bloodline" },
  ],
  ultimate: { name: "Blood Night (ราตรีเลือด)", mana: 4, ultCost: 4, ultMax: 4, text: "ฟาด 8 ช่องรอบตัว กายภาพ ATK + 2 ฟื้น HP ครึ่งหนึ่งของดาเมจ", form: { rotate: 0, hit: "all", grid: RING8 }, physical: (f) => f.atk + 2, break: 2, special: "bloodNight" },
});

// ---- Ember (นักเวทเพลิง) ----
export const ember = defineHero({
  id: "ember",
  name: "Ember",
  icon: "🔥",
  role: "Damage / DOT",
  origin: "idea",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 16, atk: 3, def: 0, speed: 100, move: 1, breakBar: 9, aggroBar: 5 },
  passive: { name: "Kindling (เชื้อไฟ)", text: "ตีศัตรูที่ติด Burn ได้ดาเมจ +1 · ช่วง Day ATK +1" },
  hooks: {
    hitValues: (_api, t, v) => (t.dots.some((d) => d.id === "burn") ? { ...v, magic: v.magic + 1 } : v),
    onEvent: (api, e) => {
      if (e.type === "CombatStarted") setBuff(api, "noon", "atk", TimesOfDay[api.s.timeOfDay] === "Day" ? 1 : 0);
    },
  },
  normalAttack: { name: "Fire Bolt (ยิงไฟ)", mana: 2, text: "ยิงไฟ 1 ตัวในระยะ 2 เวท ATK", form: pick(2), magic: ATK, break: 1 },
  skills: [
    { name: "Fireball (ลูกไฟ)", mana: 3, text: "ระเบิดกากบาทในระยะ 2 เวท ATK − 1 ติด Burn 1 นาน 2 Rounds", form: pick(2, "all", { grid: PLUS }), magic: (f) => f.atk - 1, break: 2, onHit: [burn(2)] },
  ],
  ultimate: { name: "Sea of Flames (ทะเลเพลิง)", mana: 4, ultCost: 5, ultMax: 5, text: "พื้นที่ 3x3 ในระยะ 3 เวท ATK ติด Burn 1 นาน 4 Rounds", form: pick(3, "all", { grid: SQ3 }), magic: ATK, break: 2, onHit: [burn(4)] },
});

// ---- Kage (นักฆ่าไร้เงา) ----
function shadowstep(api: HookApi, { aim }: SpecialContext): Pos | undefined {
  const t = enemyAt(api, aim.tiles?.[0]);
  return t ? freeAround(api, t.pos!).sort((a, b) => manhattan(a, api.self.pos!) - manhattan(b, api.self.pos!))[0] : undefined;
}
export const kage = defineHero({
  id: "kage",
  name: "Kage",
  icon: "🗡️",
  role: "Damage / Burst",
  origin: "idea",
  attackType: "melee",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 18, atk: 4, def: 0, speed: 130, move: 1, breakBar: 10, aggroBar: 5 },
  passive: { name: "Unseen (ไร้เงา)", text: "ต้นทุกช่วงต่อสู้ล่องหนจนกว่าจะโจมตี โจมตีตอนล่องหนดาเมจ +2 (Night และ Late Night +3)" },
  hooks: {
    // Only on a hit that already deals damage (not the empty hit of a skill without a damage formula).
    hitValues: (api, _t, v) => (api.self.stealth && v.physical + v.magic > 0 ? { ...v, physical: v.physical + (isNight(api) ? 3 : 2) } : v),
    onEvent(api, e) {
      if (e.type === "CombatStarted" && !api.self.dead) {
        api.self.stealth = true;
        api.events.push({ type: "StatusApplied", unitId: api.self.id, status: "stealth" });
      }
      // His own attacks end his Stealth (Death Shadow may give it back).
      if (e.type === "AbilityUsed" && e.unitId === api.self.id && api.self.vars.rehide !== 1) endStealth(api.self, api.events);
      if (e.type === "AbilityUsed" && e.unitId === api.self.id) api.self.vars.rehide = 0;
    },
    specials: {
      shadowstep(api, ctx) {
        const to = shadowstep(api, ctx);
        const t = enemyAt(api, ctx.aim.tiles?.[0]);
        if (!to || !t) return;
        moveUnit(api.self, to, api.events);
        if (strike(api.c, api.s, api.self, t, stat(api.c, api.self, "atk") + 1, 0, 0, api.events)) reduceBreakBar(api.c, api.s, api.self, t, 2, api.events);
      },
      // Death Shadow: a kill puts him back in Stealth.
      rehide(api, { area }) {
        if (area.enemies.some((t) => t.unit.dead)) {
          api.self.stealth = true;
          api.self.vars.rehide = 1;
          api.events.push({ type: "StatusApplied", unitId: api.self.id, status: "stealth" });
        }
      },
    },
    checks: { shadowstep: (api, ctx) => (shadowstep(api, ctx) ? null : "no free tile next to that enemy") },
  },
  normalAttack: { name: "Stab (แทง)", mana: 2, text: "แทง 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK", form: FRONT1, physical: ATK, break: 1 },
  skills: [
    { name: "Shadowstep (แทงจากเงา)", mana: 3, text: "วาร์ปไปข้างศัตรูในระยะ 3 แล้วแทง กายภาพ ATK + 1", form: pick(3), special: "shadowstep" },
  ],
  ultimate: { name: "Death Shadow (เงามรณะ)", mana: 4, ultCost: 4, ultMax: 4, text: "แทงศัตรูที่ยืนติดกัน กายภาพ ATK + 4 ถ้าฆ่าได้จะล่องหนอีกครั้ง", form: pick(1), physical: (f) => f.atk + 4, break: 3, special: "rehide" },
});

// ---- Misty (ภูตหมอกควัน) ----
// Rises once (HP 8) if her team kills an enemy hero in the Round she died or the next, while allies remain.
function mistRise(api: HookApi): void {
  const { s, self } = api;
  const at = { x: self.vars.diedX!, y: self.vars.diedY! };
  const to = unitAt(s, at) ? freeAround(api, at)[0] : at;
  if (!to) return;
  Object.assign(self, { dead: false, pos: to, hp: 8 });
  self.vars.risen = 1;
  api.events.push({ type: "UnitSummoned", unitId: self.id, defId: self.defId, owner: self.owner, to });
}
export const misty = defineHero({
  id: "misty",
  name: "Misty",
  icon: "🌫️",
  role: "Support / Control",
  origin: "idea",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 18, atk: 4, def: 0, speed: 105, move: 1, breakBar: 11, aggroBar: 5 },
  passive: { name: "Second Breath (ลมหายใจที่สอง)", text: "ตายแล้วฟื้นได้ 1 ครั้ง (HP 8) ถ้าทีมฆ่าฮีโร่ศัตรูได้ในรอบที่ตายหรือรอบถัดไป และยังมีพวกเหลือ" },
  hooks: {
    onEvent(api, e) {
      const { s, self } = api;
      if (e.type === "UnitDied" && e.unitId === self.id && e.at && self.vars.risen !== 1) Object.assign(self.vars, { diedRound: s.round, diedX: e.at.x, diedY: e.at.y });
      if (e.type !== "UnitDied" || !self.dead || self.vars.diedRound === undefined || self.vars.risen === 1) return;
      const victim = findUnit(s, e.unitId);
      const allies = s.units.some((u) => !u.dead && u.owner === self.owner && u.kind === "hero");
      if (victim?.kind === "hero" && victim.owner !== self.owner && e.killerSeat === self.owner && s.round - self.vars.diedRound <= 1 && allies) mistRise(api);
    },
    // Smoke Screen: smoke on the area for 4 Turns; her team's units in it cannot be picked by enemy Lock-on.
    // The damage is part of the special, so the smoke can go where no enemy stands.
    specials: {
      smoke(api, { area }) {
        for (const p of area.tiles) placeObject(api.s, api.self, "smoke", p, null, 4, { per: "turn" }, api.events).vars.shroud = 1;
        for (const { unit } of area.enemies) if (strike(api.c, api.s, api.self, unit, 0, 2, 0, api.events)) reduceBreakBar(api.c, api.s, api.self, unit, 1, api.events);
      },
    },
  },
  normalAttack: { name: "Mist Bolt (ยิงหมอก)", mana: 2, text: "ยิงหมอก 1 ตัวในระยะ 2 เวท ATK", form: pick(2), magic: ATK, break: 1 },
  skills: [
    { name: "Smoke Screen (ม่านควัน)", mana: 3, text: "ควันกากบาทในระยะ 3 นาน 4 Turns ศัตรูในควันโดนเวท 2 พวกในควันโดนสกิลเล็งเป้าไม่ได้", form: pick(3, "all", { grid: PLUS }), special: "smoke" },
  ],
  ultimate: { name: "Engulfing Mist (หมอกกลืนกิน)", mana: 4, ultCost: 4, ultMax: 4, text: "พื้นที่ 3x3 ในระยะ 3 เวท ATK + 1 ติด Silence 300", form: pick(3, "all", { grid: SQ3 }), magic: (f) => f.atk + 1, break: 2, onHit: [{ type: "cc", cc: "silence", recovery: 300 }] },
});

// ---- Silas (ผู้ผนึกเวท) ----
export const silas = defineHero({
  id: "silas",
  name: "Silas",
  icon: "🔒",
  role: "Support / Control",
  origin: "idea",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 20, atk: 3, def: 1, speed: 95, move: 1, breakBar: 13, aggroBar: 5, magicArmor: 1 },
  passive: { name: "Hush (เงียบ)", text: "ตีศัตรูที่ติด Silence ได้ดาเมจ +2" },
  hooks: { hitValues: (_api, t, v) => (t.cc.silence !== undefined ? { ...v, magic: v.magic + 2 } : v) },
  normalAttack: { name: "Arcane Bolt (ยิงเวท)", mana: 2, text: "ยิงเวท 1 ตัวในระยะ 2 เวท ATK", form: pick(2), magic: ATK, break: 1 },
  skills: [
    { name: "Seal Mark (ตราผนึก)", mana: 3, text: "ศัตรู 1 ตัวในระยะ 3 เวท ATK ติด Silence 300", form: pick(3), magic: ATK, break: 2, onHit: [{ type: "cc", cc: "silence", recovery: 300 }] },
  ],
  ultimate: { name: "Silent Domain (อาณาเขตเงียบ)", mana: 4, ultCost: 5, ultMax: 5, text: "ศัตรูในระยะ 2 รอบตัวติด Silence 500", form: { rotate: 0, hit: "all", grid: R2 }, break: 1, onHit: [{ type: "cc", cc: "silence", recovery: 500 }] },
});

// ---- Morgan (ราชันเงา) ----
function summonShades(api: HookApi, tiles: Pos[]): void {
  for (const p of tiles) placeSummon(api.c, api.s, "shade", api.self.owner, p, api.events);
}
export const morgan = defineHero({
  id: "morgan",
  name: "Morgan",
  icon: "👑",
  role: "Damage / Summoner",
  origin: "idea",
  attackType: "melee",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 18, atk: 2, def: 1, speed: 100, move: 1, breakBar: 12, aggroBar: 5 },
  passive: { name: "Rising Throne (บัลลังก์ที่ก่อตัว)", text: "ทุก 2 รอบใหญ่ ATK +1 (สูงสุด +3) · Night และ Late Night ATK +1" },
  hooks: {
    onEvent: (api, e) => {
      if (e.type === "CombatStarted") setBuff(api, "throne", "atk", Math.min(Math.floor(api.s.round / 2), 3) + (isNight(api) ? 1 : 0));
    },
    specials: {
      raise: (api, { aim }) => summonShades(api, [aim.tiles![0]!]),
      army: (api) => summonShades(api, freeAround(api, api.self.pos!).slice(0, 3)),
    },
    checks: { raise: (api, { aim }) => (unitAt(api.s, aim.tiles![0]!) ? "choose a free tile" : null) },
  },
  normalAttack: { name: "Slash (ฟัน)", mana: 2, text: "ฟัน 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK", form: FRONT1, physical: ATK, break: 1 },
  skills: [
    { name: "Raise Shade (ปลุกเงา)", mana: 3, text: "เรียกทหารเงา (HP 6 ATK 3) ช่องติดตัว", form: { rotate: 0, hit: "allies", range: { square: 1 } }, special: "raise" },
  ],
  ultimate: { name: "Shadow Army (กองทัพเงา)", mana: 4, ultCost: 5, ultMax: 5, text: "เรียกทหารเงาสูงสุด 3 ตัว และ ATK +2 นาน 4 Turns", form: self, selfBuff: { stat: "atk", amount: 2, turns: 4 }, special: "army" },
});

// ---- Wren (มือปืนสายลม) ----
export const wren = defineHero({
  id: "wren",
  name: "Wren",
  icon: "🔭",
  role: "Damage / Single-target",
  origin: "idea",
  attackType: "ranged",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 16, atk: 3, def: 0, speed: 110, move: 1, breakBar: 9, aggroBar: 5 },
  passive: { name: "First Shot (นัดแรก)", text: "ตีปกตินัดแรกของแต่ละรอบใหญ่ดาเมจ +2" },
  hooks: {
    // The first normal attack of the Round (its special marks the Round as used).
    hitValues: (api, _t, v) => (api.self.attacksThisRound === 1 && api.self.vars.shotRound !== api.s.round ? { ...v, physical: v.physical + 2 } : v),
    specials: { shot: (api) => void (api.self.vars.shotRound = api.s.round) },
  },
  normalAttack: { name: "Shoot (ยิง)", mana: 2, text: "ยิงศัตรู 1 ตัวในระยะ 2 กายภาพ ATK", form: pick(2), physical: ATK, break: 1, special: "shot" },
  skills: [
    { name: "Piercing Round (กระสุนเจาะเกราะ)", mana: 3, text: "ยิงเส้นตรง 3 ช่อง โดนตัวแรก กายภาพ ATK + 3 Penetration +3", form: { rotate: 4, hit: "first", grid: ["3", "2", "1", "C"] }, physical: (f) => f.atk + 3, penetration: 3, break: 2 },
  ],
  ultimate: { name: "Dead Aim (เป้าตาย)", mana: 4, ultCost: 5, ultMax: 5, text: "ยิงศัตรู 1 ตัวในระยะ 3 กายภาพ ATK + 4", form: pick(3), physical: (f) => f.atk + 4, break: 3 },
});

// ---- Crystal (ผู้พิทักษ์ผลึก) ----
// Shields she gives are +2 on a target below half HP.
const crystalShield = (api: HookApi, u: Unit, mode: "add" | "set", amount: number) =>
  giveShield(api.s, u, mode, amount + (u.hp * 2 < stat(api.c, u, "maxHp") ? 2 : 0), 4);
export const crystal = defineHero({
  id: "crystal",
  name: "Crystal",
  icon: "💎",
  role: "Support / Shield",
  origin: "new",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 20, atk: 2, def: 1, speed: 95, move: 1, breakBar: 14, aggroBar: 5, magicArmor: 1 },
  passive: { name: "Prism (ปริซึม)", text: "โล่ที่ตัวนี้ให้ ได้เพิ่ม 2 ถ้าเป้าหมายมี HP ไม่ถึงครึ่ง" },
  hooks: {
    specials: {
      ward: (api, { area }) => area.allies.forEach((u) => crystalShield(api, u, "set", 6)),
      bastion: (api, { area }) => area.allies.forEach((u) => crystalShield(api, u, "add", 5)),
    },
  },
  normalAttack: { name: "Crystal Shot (ยิงผลึก)", mana: 2, text: "ยิงผลึก 1 ตัวในระยะ 2 เวท ATK", form: pick(2), magic: ATK, break: 1 },
  skills: [
    { name: "Crystal Ward (ผลึกคุ้มภัย)", mana: 3, text: "โล่แบบ Set 6 ให้พวก 1 ตัวในระยะ 2 (รวมตัวเอง) นาน 4 Turns", form: ally(2), special: "ward" },
  ],
  ultimate: { name: "Crystal Bastion (ปราการผลึก)", mana: 4, ultCost: 5, ultMax: 5, text: "ทั้งทีมได้โล่แบบ Add 5 และ Armor +1 นาน 4 Turns", form: everyAlly, buffs: [{ stat: "armor", amount: 1, turns: 4 }], special: "bastion" },
});

// ---- Lyra (นักกวีศึก) ----
function chorus(api: HookApi): void {
  const { s, self } = api;
  const name = `chorus:${self.id}`;
  for (const u of s.units) u.buffs = u.buffs.filter((b) => b.name !== name);
  if (self.dead || !self.pos) return;
  for (const u of s.units) {
    if (u.dead || !u.pos || u.id === self.id || u.owner !== self.owner || chebyshev(u.pos, self.pos) !== 1) continue;
    addBuff(s, self, u, { stat: "atk", amount: 1, turns: -1, name }, []);
  }
}
const moved = new Set(["UnitStepped", "UnitsSwapped", "UnitMoved", "UnitPushed", "UnitPrepMoved", "HeroPlaced", "UnitSummoned", "UnitDied", "StepUndone", "CombatStarted"]);
export const lyra = defineHero({
  id: "lyra",
  name: "Lyra",
  icon: "🎺",
  role: "Support / Buffer",
  origin: "new",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 17, atk: 2, def: 0, speed: 110, move: 1, breakBar: 11, aggroBar: 5 },
  passive: { name: "Battle Chorus (เพลงศึก)", text: "พวกที่ยืนติดตัว (8 ทิศ) ATK +1" },
  hooks: {
    onEvent: (api, e) => {
      if (moved.has(e.type)) chorus(api);
    },
  },
  normalAttack: { name: "Sound Wave (คลื่นเสียง)", mana: 2, text: "ยิงคลื่นเสียง 1 ตัวในระยะ 2 เวท ATK", form: pick(2), magic: ATK, break: 1 },
  skills: [
    { name: "Rousing Song (บทเพลงฮึกเหิม)", mana: 3, text: "พวก 1 ตัวในระยะ 3 (รวมตัวเอง) ATK +2 นาน 4 Turns", form: ally(3), buffs: [{ stat: "atk", amount: 2, turns: 4 }] },
    { name: "Piercing Beat (จังหวะเจาะเกราะ)", mana: 2, text: "พวก 1 ตัวในระยะ 3 (รวมตัวเอง) Penetration +2 นาน 4 Turns", form: ally(3), buffs: [{ stat: "penetration", amount: 2, turns: 4 }], ultGain: 1 },
  ],
  ultimate: {
    name: "War Symphony (ซิมโฟนีสงคราม)",
    mana: 4,
    ultCost: 5,
    ultMax: 5,
    text: "ทั้งทีม ATK +2 และ Break Boost +1 นาน 4 Turns",
    form: everyAlly,
    buffs: [
      { stat: "atk", amount: 2, turns: 4 },
      { stat: "breakBoost", amount: 1, turns: 4 },
    ],
  },
});

// ---- Brooke (หมอธารา) ----
export const brooke = defineHero({
  id: "brooke",
  name: "Brooke",
  icon: "💧",
  role: "Support / Healer",
  origin: "new",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 18, atk: 2, def: 0, speed: 105, move: 1, breakBar: 11, aggroBar: 5 },
  passive: { name: "Clear Stream (ธารใส)", text: "ฮีลจากตัวนี้ได้เพิ่ม ATK ÷ 2" },
  // Her heals get + ATK / 2: as Healing Bonus.
  hooks: { stat: (_u, name, value, raw) => (name === "healingBonus" ? value + divRound(raw("atk"), 2) : value) },
  normalAttack: { name: "Water Bolt (ยิงน้ำ)", mana: 2, text: "ยิงน้ำ 1 ตัวในระยะ 2 เวท ATK", form: pick(2), magic: ATK, break: 1 },
  skills: [
    { name: "Cleansing Stream (สายธารชำระ)", mana: 3, text: "ฟื้น HP 5 และล้าง CC กับ DOT ให้พวก 1 ตัวในระยะ 2 (รวมตัวเอง)", form: ally(2), heal: 5, cleanse: true },
  ],
  ultimate: { name: "Reviving Rain (ฝนชุบชีวิต)", mana: 4, ultCost: 5, ultMax: 5, text: "ทั้งทีมฟื้น HP 6", form: everyAlly, heal: 6 },
});

// ---- Jade (นักบวชหยก) ----
export const jade = defineHero({
  id: "jade",
  name: "Jade",
  icon: "🌿",
  role: "Support / Healer",
  origin: "new",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 18, atk: 2, def: 1, speed: 95, move: 1, breakBar: 12, aggroBar: 5 },
  passive: { name: "Morning Prayer (บทสวดยามเช้า)", text: "ต้นรอบใหญ่ ฟื้น HP 2 ให้พวกที่ยืนติดกัน" },
  hooks: {
    onEvent(api, e) {
      const { s, self } = api;
      if (e.type !== "RoundStarted" || self.dead || !self.pos) return;
      for (const u of s.units) if (!u.dead && u.pos && u.id !== self.id && u.owner === self.owner && chebyshev(u.pos, self.pos) === 1) healFrom(api.c, self, u, 2, api.events);
    },
  },
  normalAttack: { name: "Light Bolt (ยิงแสง)", mana: 2, text: "ยิงแสง 1 ตัวในระยะ 2 เวท ATK", form: pick(2), magic: ATK, break: 1 },
  skills: [{ name: "Jade Blessing (พรหยก)", mana: 3, text: "ฟื้น HP 6 ให้พวก 1 ตัวในระยะ 3 (รวมตัวเอง)", form: ally(3), heal: 6 }],
  ultimate: { name: "Jade Stream (สายธารหยก)", mana: 4, ultCost: 5, ultMax: 5, text: "ทั้งทีมฟื้น HP 5 และได้โล่ 4 นาน 4 Turns", form: everyAlly, heal: 5, shield: { mode: "add", amount: 4, turns: 4 } },
});

export const prototypeHeroes = [dante, ember, kage, misty, silas, morgan, wren, crystal, lyra, brooke, jade];
