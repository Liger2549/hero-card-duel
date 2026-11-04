import { chebyshev, endStealth, pctOf, placeObject, removeObject, stat, type HookApi, type Pos } from "@hcd/engine";
import { ATK, defineHero, pctSum } from "../define.ts";

// Kestrel's Eye: Falka's Scanners and their 3x3 Scan Fields.
const scanners = (api: HookApi) => api.s.objects.filter((o) => o.kind === "scanner" && o.ownerId === api.self.id);
const inScanField = (api: HookApi, p: Pos) => scanners(api).some((o) => chebyshev(o.pos, p) <= 1);

// docs/heroes/Falka.md
export const falka = defineHero({
  id: "falka",
  name: "Falka",
  icon: "🔭",
  role: "Damage",
  origin: "own",
  attackType: "ranged",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 15, atk: 5, def: 0, speed: 100, move: 1, breakBar: 10, aggroBar: 3, breakBoost: 3, breakPower: 110 },
  passive: {
    name: "Exfil",
    text: "เลือดต่ำกว่า 25% → เดินฟรี 2 ครั้ง (เก็บไว้ได้ถึงจบรอบ) คูลดาวน์ 2 รอบ",
  },
  hooks: {
    onEvent(api, e) {
      const { s, self } = api;
      // Exfil: HP drops below 25% → 2 free steps. Cooldown: this Round and the next.
      if (e.type === "Damaged" && e.unitId === self.id && !self.dead) {
        const max = stat(api.c, self, "maxHp");
        if (e.hp * 4 < max && (e.hp + e.amount) * 4 >= max && (self.vars.exfilFrom ?? 0) <= s.round) {
          self.freeSteps += 2;
          self.vars.exfilFrom = s.round + 2;
        }
      }
      // Vanishing Point: 1 Ult Point at the start of each of her team's Turns; Stealth ends when she cannot pay.
      if (e.type === "TurnStarted" && e.seat === self.owner && self.stealth) {
        if (self.ult >= 1) self.ult -= 1;
        else endStealth(self, api.events);
      }
    },
    // Longer shots: a lane whose next tile is in a Scan Field goes on, straight, to the field's far edge.
    extendLane(api, end, step) {
      const more: Pos[] = [];
      for (let p = { x: end.x + step.x, y: end.y + step.y }; inScanField(api, p); p = { x: p.x + step.x, y: p.y + step.y }) more.push(p);
      return more;
    },
    // Marked shots: Break +30% ATK against an enemy inside a Scan Field.
    hitBreak: (api, target, brk) => (target.pos && inScanField(api, target.pos) ? brk + pctOf(stat(api.c, api.self, "atk"), 30) : brk),
    specials: {
      // A Scanner on the picked tile: HP 25% ATK, 3 Turns of her team, at most 2 (a third replaces the oldest).
      kestrel(api, { aim }) {
        const mine = scanners(api);
        if (mine.length >= 2) removeObject(api.s, mine[0]!, api.events);
        const hp = Math.max(pctOf(stat(api.c, api.self, "atk"), 25), 1);
        placeObject(api.s, api.self, "scanner", aim.tiles![0]!, hp, 3, { per: "team", seat: api.self.owner }, api.events);
      },
      vanish(api) {
        api.self.stealth = true;
        api.self.freeSteps += 2;
        api.events.push({ type: "StatusApplied", unitId: api.self.id, status: "stealth" });
      },
    },
    // She can end her Stealth at any time in her Turn, for free.
    commands: {
      endStealth: {
        check: (api) => (api.self.stealth ? null : "not in Stealth"),
        run: (api) => endStealth(api.self, api.events),
      },
    },
  },
  normalAttack: {
    name: "Snap Shot",
    mana: 2,
    text: "ยิงเส้นตรง 2 ช่อง 8 ทิศ โดนตัวแรก กายภาพ ATK Break 1 + ATK",
    form: { rotate: 8, hit: "first", grid: ["2", "1", "C"] },
    physical: ATK,
    break: (f) => 1 + f.atk,
  },
  skills: [
    {
      name: "Shatter Round",
      mana: 3,
      text: "ยิงเส้นตรง 3 ช่อง 8 ทิศ โดนตัวแรก กายภาพ 50% ATK Break 2 + 150% ATK ถ้าทำให้ติด Break ได้ Break DMG +250% ATK",
      form: { rotate: 8, hit: "first", grid: ["3", "2", "1", "C"] },
      physical: (f) => pctOf(f.atk, 50),
      break: (f) => pctSum([2, 100], [f.atk, 150]),
      breakDmgBonus: (f) => pctOf(f.atk, 250),
    },
    {
      name: "Kestrel's Eye",
      mana: 2,
      text: "วางเครื่องสแกนในระยะ 3 (เขต 3x3 อยู่ 3 เทิร์นฝั่งเรา มีได้ 2 เครื่อง) เส้นยิงที่ต่อกับเขตยิงทะลุไปสุดเขต และ Break +30% ATK กับศัตรูในเขต",
      form: { rotate: 0, hit: "allies", range: { manhattan: 3 } },
      ultGain: 1,
      freeAction: true,
      special: "kestrel",
    },
  ],
  ultimate: {
    name: "Vanishing Point",
    mana: 2,
    ultCost: 3,
    ultMax: 7,
    text: "ล่องหน + เดินฟรี 2 ครั้ง · จ่ายอัลติ 1 ต่อเทิร์นฝั่งเรา · ตีแล้วไม่หลุดล่องหน · ปิดเองได้ฟรี",
    form: { rotate: 0, hit: "allies", self: true, grid: ["C"] },
    freeAction: true,
    special: "vanish",
  },
});
