import { apply, createUnit, hookApi, manhattan, newMatchWithUnits, normalConfig, stat, type Action, type Aim, type GameEvent, type GameState, type Unit } from "@hcd/engine";
import { describe, expect, it } from "vitest";
import { bianca } from "../src/heroes/bianca.ts";
import { linnet } from "../src/heroes/linnet.ts";
import { serie } from "../src/heroes/serie.ts";
import { valen } from "../src/heroes/valen.ts";
import { content } from "../src/index.ts";

// Real heroes through the real engine. Unit ids are defId + index.
function combat(units: { defId: string; owner: "A" | "B"; x: number; y: number }[]): GameState {
  const s = newMatchWithUnits(
    normalConfig,
    1,
    units.map((u, i) => createUnit(content, u.defId, u.owner, `${u.defId}${i}`, u.defId === "guard" ? 1 : null)),
  );
  units.forEach((u, i) => (s.units[i]!.pos = { x: u.x, y: u.y }));
  return { ...s, phase: "combat", activeSeat: "A", turn: 1 };
}
const get = (s: GameState, id: string): Unit => s.units.find((u) => u.id === id)!;
const run = (s: GameState, a: Action) => {
  const r = apply(s, a, content);
  if (!r.ok) throw new Error(r.error);
  return r;
};
const use = (seat: "A" | "B", unitId: string, ability: "normal" | "ultimate" | number, aim: Aim): Action => ({ type: "UseAbility", seat, unitId, ability, aim });

describe("Valen", () => {
  it("passive: bonus (Penetration − (Armor + Magic Armor) / 2) / 2 on each hit", () => {
    const s = combat([{ defId: "valen", owner: "A", x: 4, y: 4 }, { defId: "guard", owner: "B", x: 4, y: 5 }]);
    expect(get(run(s, use("A", "valen0", "normal", { dir: "N" })).state, "guard1").hp).toBe(6); // 4 − DEF 1 + bonus 1
  });

  it("Daylight: Penetration +2 in Morning, Day and Evening, set when the Combat Phase starts", () => {
    const s = combat([{ defId: "valen", owner: "A", x: 4, y: 4 }]);
    const v = get(s, "valen0");
    for (const [time, pen] of [[0, 4], [4, 2], [2, 4]] as const) {
      s.timeOfDay = time;
      valen.hooks!.onEvent!(hookApi(content, s, [], v), { type: "CombatStarted", round: 1, starter: "A" });
      expect(stat(content, v, "penetration")).toBe(pen);
    }
  });
});

describe("Bianca", () => {
  it("Bastione Bianco: DEF 0, Armor + 100% DEF, Magic Armor + 50% DEF", () => {
    const b = get(combat([{ defId: "bianca", owner: "A", x: 4, y: 4 }]), "bianca0");
    expect([stat(content, b, "def"), stat(content, b, "armor"), stat(content, b, "magicArmor")]).toEqual([0, 3, 2]);
  });

  it("Scudo d'Avorio: guards allies within 1; an enemy hit on them is countered when the Turn ends", () => {
    let s = combat([
      { defId: "bianca", owner: "A", x: 4, y: 4 },
      { defId: "valen", owner: "A", x: 4, y: 5 },
      { defId: "eira", owner: "B", x: 4, y: 6 },
    ]);
    s = run(s, use("A", "bianca0", 1, {})).state; // ends A's Turn
    expect(stat(content, get(s, "valen1"), "armor")).toBe(2);
    const r = run(s, use("B", "eira2", "normal", { dir: "S" })); // Eira hits Valen
    expect(get(r.state, "valen1").hp).toBe(18); // 4 − Armor 2
    expect(r.events.some((e) => e.type === "InterjectResolved")).toBe(true);
    expect(get(r.state, "eira2").hp).toBe(20); // counter: 1 + DEF 2 − DEF 1
    expect(get(r.state, "eira2").breakBar).toBe(11); // − 2
    expect(get(r.state, "bianca0").vars.counters).toBe(1);
  });

  it("a guarded ally that moves more than 1 tile away loses the guard", () => {
    const s = combat([{ defId: "bianca", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 4, y: 5 }]);
    const api = hookApi(content, s, [], get(s, "bianca0"));
    bianca.hooks!.specials!.oath!(api, { area: { tiles: [], enemies: [], allies: [] }, aim: {} });
    get(s, "valen1").pos = { x: 4, y: 7 };
    bianca.hooks!.onEvent!(api, { type: "UnitMoved", unitId: "valen1", from: { x: 4, y: 5 }, to: { x: 4, y: 7 } });
    expect(stat(content, get(s, "valen1"), "armor")).toBe(0);
    expect(stat(content, get(s, "bianca0"), "armor")).toBe(5); // still guarded: 3 + 2
  });
});

describe("Serie", () => {
  it("Voidmark: a Turn DOT of 40% ATK + DOT Boost with Erosion; each damaging tick gives +1 Singularity", () => {
    let s = combat([{ defId: "serie", owner: "A", x: 4, y: 4 }, { defId: "eira", owner: "B", x: 4, y: 5 }, { defId: "valen", owner: "B", x: 0, y: 8 }]);
    s = run(s, use("A", "serie0", 0, { dir: "N" })).state;
    const e = get(s, "eira1");
    expect(e.dots[0]).toMatchObject({ id: "voidmark", kind: "turn", damageH: 300, ticksLeft: 2 }); // 40% of 3 = 1, + DOT Boost 2
    expect(stat(content, e, "def")).toBe(0); // DEF 1 − Erosion 1 (1 + 20% of 2 = 1.4 → 1)
    const hp = e.hp;
    s = run(s, { type: "EndRound", seat: "B" }).state; // B's Turn ends: the Voidmark ticks
    expect(get(s, "eira1").hp).toBe(hp - 3);
    expect(get(s, "serie0").ult).toBe(1);
  });

  it("Collapse: (tick damage × ticks left) + ATK by the DOT rules, then a new Voidmark for 1 Turn", () => {
    let s = combat([{ defId: "serie", owner: "A", x: 4, y: 4 }, { defId: "eira", owner: "B", x: 4, y: 5 }, { defId: "valen", owner: "B", x: 0, y: 8 }]);
    s = run(s, use("A", "serie0", 0, { dir: "N" })).state;
    const hp = get(s, "eira1").hp;
    const events: GameEvent[] = [];
    serie.hooks!.specials!.collapse!(hookApi(content, s, events, get(s, "serie0")), { area: { tiles: [], enemies: [], allies: [] }, aim: {} });
    expect(get(s, "eira1").hp).toBe(hp - 9); // 3 × 2 + ATK 3
    expect(get(s, "eira1").dots[0]).toMatchObject({ id: "voidmark", ticksLeft: 1 });
    expect(get(s, "serie0").ult).toBe(0); // a Collapse is not a tick
  });
});

describe("Rocco", () => {
  it("Bounce Carnival: every unit moves to its own tile or a free tile 1–2 away; Rocco heals 5", () => {
    const s = combat([
      { defId: "rocco", owner: "A", x: 4, y: 4 },
      { defId: "eira", owner: "B", x: 4, y: 6 },
      { defId: "valen", owner: "B", x: 2, y: 3 },
    ]);
    get(s, "rocco0").ult = 5;
    get(s, "rocco0").hp = 10;
    const before = new Map(s.units.map((u) => [u.id, u.pos!]));
    const after = run(s, use("A", "rocco0", "ultimate", {})).state;
    for (const u of after.units) expect(manhattan(before.get(u.id)!, u.pos!)).toBeLessThanOrEqual(2);
    expect(new Set(after.units.map((u) => `${u.pos!.x},${u.pos!.y}`)).size).toBe(3);
    expect(get(after, "rocco0").hp).toBe(15);
  });
});

describe("Konrad", () => {
  it("Rally Banner: allies next to him in the 4 directions get DEF +1", () => {
    let s = combat([{ defId: "konrad", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 5, y: 4 }, { defId: "eira", owner: "A", x: 5, y: 5 }, { defId: "serie", owner: "B", x: 0, y: 8 }]);
    s = run(s, { type: "Step", seat: "A", unitId: "konrad0", to: { x: 4, y: 5 } }).state; // now Eira is E of him, Valen is not
    expect(stat(content, get(s, "eira2"), "def")).toBe(2);
    expect(stat(content, get(s, "valen1"), "def")).toBe(0);
  });

  it("Vanguard Charge: up to 2 tiles straight, stopping before a unit", () => {
    const s = combat([{ defId: "konrad", owner: "A", x: 4, y: 1 }, { defId: "eira", owner: "B", x: 4, y: 4 }]);
    expect(get(run(s, use("A", "konrad0", 1, { dir: "N" })).state, "konrad0").pos).toEqual({ x: 4, y: 3 });
    get(s, "eira1").pos = { x: 4, y: 3 };
    expect(get(run(s, use("A", "konrad0", 1, { dir: "N" })).state, "konrad0").pos).toEqual({ x: 4, y: 2 });
    get(s, "eira1").pos = { x: 4, y: 2 };
    expect(apply(s, use("A", "konrad0", 1, { dir: "N" }), content)).toMatchObject({ ok: false, error: "the way is blocked" });
  });

  it("Call to Arms: 2 Footmen, on the picked free tile and another free tile around him", () => {
    const s = combat([{ defId: "konrad", owner: "A", x: 4, y: 4 }, { defId: "eira", owner: "B", x: 0, y: 8 }]);
    get(s, "konrad0").ult = 4;
    const after = run(s, use("A", "konrad0", "ultimate", { tiles: [{ x: 4, y: 5 }] })).state;
    const footmen = after.units.filter((u) => u.defId === "footman");
    expect(footmen).toHaveLength(2);
    expect(footmen[0]!.pos).toEqual({ x: 4, y: 5 });
    expect(footmen.every((f) => f.owner === "A")).toBe(true);
  });
});

describe("Eira", () => {
  it("Thin Ice: Physical +2 on an enemy with Slow", () => {
    const s = combat([{ defId: "eira", owner: "A", x: 4, y: 4 }, { defId: "guard", owner: "B", x: 4, y: 5 }, { defId: "guard", owner: "B", x: 3, y: 3 }]);
    get(s, "guard1").cc = { slow: 300 };
    const after = run(s, use("A", "eira0", "normal", { dir: "N" })).state;
    expect(get(after, "guard1").hp).toBe(5); // 4 + 2 − DEF 1
  });
});

describe("Karas", () => {
  it("Raven's Intercession: an ally near him hits an enemy near him → a raven explodes when the Turn ends", () => {
    const s = combat([
      { defId: "karas", owner: "A", x: 3, y: 5 },
      { defId: "valen", owner: "A", x: 4, y: 5 },
      { defId: "eira", owner: "B", x: 4, y: 6 },
    ]);
    get(s, "karas0").vars.ravens = 1;
    const r = run(s, use("A", "valen1", "normal", { dir: "N" }));
    const eira = get(r.state, "eira2");
    expect(eira.hp).toBe(14); // Valen 4 − DEF 1 + bonus 1 = 4; raven Magic 120% of 4 = 5 − DEF 1 = 4
    expect(eira.dots).toMatchObject([{ id: "nocturnalFlame", sourceId: "karas0", ticksLeft: 1, breakPerTick: 1 }]);
    expect(get(r.state, "karas0").vars.ravens).toBe(0);
  });

  it("Wraithfire gives 2 ravens and Nocturnal Flame for 2 Turns", () => {
    const s = combat([{ defId: "karas", owner: "A", x: 4, y: 4 }, { defId: "eira", owner: "B", x: 4, y: 5 }]);
    const after = run(s, use("A", "karas0", 0, { dir: "N" })).state;
    expect(get(after, "karas0").vars.ravens).toBe(2);
    expect(get(after, "eira1").dots[0]).toMatchObject({ id: "nocturnalFlame", ticksLeft: 2, damageH: 300 }); // 50% of 4 + DOT Boost 1
  });
});

describe("Linnet", () => {
  it("Tidal Chorus: an attack that hits gives allies in the 8 tiles around her Physical ATK +1% Speed", () => {
    const s = combat([{ defId: "linnet", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 3, y: 3 }, { defId: "eira", owner: "B", x: 4, y: 6 }]);
    const after = run(s, use("A", "linnet0", "normal", { tiles: [{ x: 4, y: 6 }] })).state;
    expect(stat(content, get(after, "valen1"), "physicalAtk")).toBe(1); // 1% of 110
  });

  it("Rising Chorus: echoes add up (above 50% to dead = +3) and Crescendo is queued at 3", () => {
    const s = combat([{ defId: "linnet", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 4, y: 5 }, { defId: "eira", owner: "B", x: 4, y: 6 }]);
    const after = run(s, use("A", "linnet0", 0, {})).state; // Wings over the Waves: enters Rising Chorus
    expect(get(after, "linnet0").vars).toMatchObject({ chorus: 1, echoes: 0 });
    const api = hookApi(content, after, [], get(after, "linnet0"));
    linnet.hooks!.onEvent!(api, { type: "Damaged", unitId: "eira2", amount: 22, hp: 0, sourceId: "valen1" });
    linnet.hooks!.onEvent!(api, { type: "UnitDied", unitId: "eira2", killerSeat: "A", killerId: "valen1", bounty: 400 });
    expect(get(after, "linnet0").vars.echoes).toBe(3);
    expect(after.pending.map((p) => p.key)).toEqual(["crescendo"]);
  });
});

describe("Zoran", () => {
  it("Guiding Light: an ally near him drops to 20% or lower → shield 2 + 25% Max HP when the Turn ends", () => {
    const s = combat([{ defId: "zoran", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 4, y: 5, }, { defId: "eira", owner: "B", x: 4, y: 6 }]);
    s.activeSeat = "B";
    get(s, "valen1").hp = 5;
    const after = run(s, use("B", "eira2", "normal", { dir: "S" })).state;
    expect(get(after, "valen1").hp).toBe(1);
    expect(get(after, "valen1").shields).toMatchObject([{ mode: "add", amount: 7 }]); // 2 + 25% of 20
    expect(get(after, "zoran0").vars.wicks).toBe(0);
  });

  it("Vigil Lantern: allies in its 3x3 get a kept shield and a heal, enemies Nocturnal Flame; 3 pulses left", () => {
    const s = combat([{ defId: "zoran", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 5, y: 6 }, { defId: "eira", owner: "B", x: 4, y: 7 }]);
    get(s, "zoran0").ult = 4;
    get(s, "valen1").hp = 10;
    const after = run(s, use("A", "zoran0", "ultimate", { tiles: [{ x: 4, y: 6 }] })).state;
    expect(get(after, "valen1").shields).toMatchObject([{ amount: 3, turnsLeft: -1, name: "lantern:zoran0" }]); // 15% of 20
    expect(get(after, "valen1").hp).toBe(12); // 10% of 20
    expect(get(after, "eira2").dots[0]).toMatchObject({ id: "nocturnalFlame", sourceId: "zoran0" });
    expect(get(after, "zoran0").vars.lanternPulses).toBe(3);
  });
});

describe("Leilani", () => {
  it("Lifebuoy: an ally near her drops below 25% → heal 2 + 25% Max HP (+ Healing Bonus, × 125%) and +1 Ult Point", () => {
    const s = combat([{ defId: "leilani", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 4, y: 5 }, { defId: "eira", owner: "B", x: 4, y: 6 }]);
    s.activeSeat = "B";
    get(s, "valen1").hp = 6;
    const after = run(s, use("B", "eira2", "normal", { dir: "S" })).state;
    expect(get(after, "valen1").hp).toBe(12); // 2 HP left, then (2 + 4 + 2) × 125% = 10
    expect(get(after, "leilani0").ult).toBe(1);
  });

  it("Rolling Tide: the first pulse heals allies within 2 and hits enemies within 3 when the Turn ends", () => {
    const s = combat([
      { defId: "leilani", owner: "A", x: 4, y: 4 },
      { defId: "valen", owner: "A", x: 4, y: 5 },
      { defId: "guard", owner: "B", x: 4, y: 7 },
      { defId: "eira", owner: "B", x: 0, y: 8 }, // so B still has a hero
    ]);
    get(s, "valen1").hp = 10;
    const after = run(s, use("A", "leilani0", 0, {})).state;
    expect(get(after, "valen1").hp).toBe(19); // 150% of 3 = 4.5 → 5 (a skill value is rounded first); (5 + 2) × 125% = 8.75 → 9
    expect(get(after, "guard2").hp).toBe(9); // Magic 1 + 35% of 3 = 2 − DEF 1
    expect(get(after, "leilani0").vars.tide).toBe(3);
  });
});
