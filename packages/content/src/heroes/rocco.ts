import { inBounds, manhattan, moveUnit, randInt, unitAt, type HookApi, type Pos } from "@hcd/engine";
import { ATK, defineHero } from "../define.ts";

// Bounce Carnival: every hero and unit on the board, one by one in a random order, goes to a random tile out of
// its own tile and the free tiles 1–2 tiles away from it. Towers do not move.
function carnival(api: HookApi): void {
  const { s, events } = api;
  const onBoard = s.units.filter((u) => !u.dead && u.pos);
  for (let i = onBoard.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [onBoard[i], onBoard[j]] = [onBoard[j]!, onBoard[i]!];
  }
  for (const u of onBoard) {
    const from = u.pos!;
    const spots: Pos[] = [from];
    for (let y = 0; y < s.config.boardHeight; y++) {
      for (let x = 0; x < s.config.boardWidth; x++) {
        const p = { x, y };
        const d = manhattan(from, p);
        if (d >= 1 && d <= 2 && inBounds(s.config, p) && !unitAt(s, p)) spots.push(p);
      }
    }
    const to = spots[randInt(s, spots.length)]!;
    if (to !== from) moveUnit(u, to, events);
  }
}

// docs/heroes/Rocco.md (the prototype's rubber boxer, as is)
export const rocco = defineHero({
  id: "rocco",
  name: "Rocco",
  icon: "🥊",
  role: "Damage",
  origin: "idea",
  attackType: "ranged",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 20, atk: 3, def: 1, speed: 110, move: 1, breakBar: 14, aggroBar: 5 },
  passive: { name: "Elastic Reach (แขนยางยืด)", text: "ต่อยปกติได้ไกล 2 ช่อง" },
  hooks: { specials: { carnival } },
  normalAttack: {
    name: "Rubber Jab (หมัดยาง)",
    mana: 2,
    text: "ต่อยศัตรู 1 ตัวในระยะ 2 กายภาพ ATK",
    form: { rotate: 0, hit: "all", range: { manhattan: 2 } },
    physical: ATK,
    break: 1,
  },
  skills: [
    {
      name: "Slingshot Hook (หมัดยืด)",
      mana: 3,
      text: "ต่อยเส้นตรง 3 ช่อง โดนตัวแรก กายภาพ ATK + 2 แล้วผลักถอย 1 ช่อง",
      form: { rotate: 4, hit: "first", grid: ["3", "2", "1", "C"] },
      physical: (f) => f.atk + 2,
      break: 3,
      knockback: true,
    },
  ],
  ultimate: {
    name: "Bounce Carnival (งานรื่นเริงยาง)",
    mana: 3,
    ultCost: 5,
    ultMax: 5,
    text: "สุ่มย้ายยูนิตทุกตัวบนกระดานไม่เกิน 2 ช่อง (หอคอยไม่ขยับ) แล้วฟื้น HP ตัวเอง 5",
    form: { rotate: 0, hit: "allies", self: true, grid: ["C"] },
    selfHeal: 5,
    special: "carnival",
  },
});
