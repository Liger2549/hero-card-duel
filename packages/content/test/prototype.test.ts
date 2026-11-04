import { apply, createUnit, hiddenFrom, hookApi, newMatchWithUnits, normalConfig, stat, type Action, type Aim, type GameState, type Unit } from "@hcd/engine";
import { describe, expect, it } from "vitest";
import { jade, misty } from "../src/heroes/prototype.ts";
import { content } from "../src/index.ts";

// docs/heroes/prototype-set.md through the real engine. Unit ids are defId + index.
function combat(units: { defId: string; owner: "A" | "B"; x: number; y: number }[]): GameState {
  const s = newMatchWithUnits(normalConfig, 1, units.map((u, i) => createUnit(content, u.defId, u.owner, `${u.defId}${i}`, null)));
  units.forEach((u, i) => (s.units[i]!.pos = { x: u.x, y: u.y }));
  return { ...s, phase: "combat", activeSeat: "A", turn: 1 };
}
const get = (s: GameState, id: string): Unit => s.units.find((u) => u.id === id)!;
const run = (s: GameState, a: Action) => {
  const r = apply(s, a, content);
  if (!r.ok) throw new Error(r.error);
  return r;
};
const use = (unitId: string, ability: "normal" | "ultimate" | number, aim: Aim): Action => ({ type: "UseAbility", seat: "A", unitId, ability, aim });
const at = (x: number, y: number): Aim => ({ tiles: [{ x, y }] });

describe("Dante", () => {
  it("Blood Slash costs him 2 HP; Bloodline Cut takes 22% of the target's Max HP", () => {
    const s = combat([{ defId: "dante", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "B", x: 4, y: 5 }]);
    expect(get(run(s, use("dante0", "normal", { dir: "N" })).state, "dante0").hp).toBe(20);
    expect(get(run(s, use("dante0", 0, at(4, 5))).state, "valen1").hp).toBe(16); // 20 × 22% = 4.4 → 4
  });
});

describe("Kage", () => {
  it("Shadowstep: steps next to the target and stabs, +2 from Stealth, then is seen", () => {
    const s = combat([{ defId: "kage", owner: "A", x: 4, y: 1 }, { defId: "valen", owner: "B", x: 4, y: 4 }]);
    const plain = get(run(s, use("kage0", 0, at(4, 4))).state, "valen1").hp;
    get(s, "kage0").stealth = true;
    const r = run(s, use("kage0", 0, at(4, 4)));
    expect(get(r.state, "valen1").hp).toBe(plain - 2);
    expect(get(r.state, "kage0").pos).toEqual({ x: 4, y: 3 });
    expect(get(r.state, "kage0").stealth).toBe(false);
  });
});

describe("Misty", () => {
  it("Smoke Screen: enemy Lock-on cannot pick her team's units in the smoke", () => {
    let s = combat([{ defId: "misty", owner: "A", x: 4, y: 2 }, { defId: "valen", owner: "A", x: 4, y: 4 }, { defId: "wren", owner: "B", x: 4, y: 6 }]);
    s = run(s, use("misty0", 0, at(4, 4))).state;
    expect(s.objects.filter((o) => o.kind === "smoke")).toHaveLength(5);
    expect(apply(s, { type: "UseAbility", seat: "B", unitId: "wren2", ability: "normal", aim: at(4, 4) }, content)).toMatchObject({ ok: false });
  });

  it("Second Breath: rises with HP 8 when her team kills an enemy hero in the Round she died or the next", () => {
    const s = combat([{ defId: "misty", owner: "A", x: 4, y: 2 }, { defId: "valen", owner: "A", x: 0, y: 0 }, { defId: "eira", owner: "B", x: 8, y: 8 }]);
    const m = get(s, "misty0");
    const api = hookApi(content, s, [], m);
    Object.assign(m, { dead: true, pos: null });
    misty.hooks!.onEvent!(api, { type: "UnitDied", unitId: "misty0", killerSeat: "B", killerId: "eira2", bounty: 400, at: { x: 4, y: 2 }, ult: 0 });
    s.round = 2;
    get(s, "eira2").dead = true;
    misty.hooks!.onEvent!(api, { type: "UnitDied", unitId: "eira2", killerSeat: "A", killerId: "valen1", bounty: 400, at: { x: 8, y: 8 }, ult: 0 });
    expect(m).toMatchObject({ dead: false, hp: 8, pos: { x: 4, y: 2 } });
  });
});

describe("Morgan", () => {
  it("Raise Shade: a shade on a free tile next to him", () => {
    const r = run(combat([{ defId: "morgan", owner: "A", x: 4, y: 4 }]), use("morgan0", 0, at(5, 5)));
    expect(r.state.units.find((u) => u.defId === "shade")).toMatchObject({ owner: "A", pos: { x: 5, y: 5 } });
  });
});

describe("support heroes", () => {
  it("Crystal Ward: a set shield of 6, +2 on an ally below half HP", () => {
    const s = combat([{ defId: "crystal", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 4, y: 5 }]);
    get(s, "valen1").hp = 9; // below half of 20
    expect(get(run(s, use("crystal0", 0, at(4, 5))).state, "valen1").shields[0]).toMatchObject({ amount: 8 });
    expect(get(run(s, use("crystal0", 0, at(4, 4))).state, "crystal0").shields[0]).toMatchObject({ amount: 6 });
  });

  it("Brooke: her heals get + ATK / 2", () => {
    const s = combat([{ defId: "brooke", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 4, y: 5 }]);
    get(s, "valen1").hp = 10;
    expect(get(run(s, use("brooke0", 0, at(4, 5))).state, "valen1").hp).toBe(16); // 5 + 2 / 2
  });

  it("Lyra: allies next to her get ATK +1", () => {
    const s = combat([{ defId: "lyra", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 5, y: 5 }, { defId: "eira", owner: "A", x: 7, y: 7 }]);
    const r = run(s, { type: "Step", seat: "A", unitId: "eira2", to: { x: 6, y: 6 } });
    expect(stat(content, get(r.state, "valen1"), "atk")).toBe(stat(content, get(s, "valen1"), "atk") + 1);
    expect(stat(content, get(r.state, "eira2"), "atk")).toBe(stat(content, get(s, "eira2"), "atk"));
  });

  it("Jade: heals allies next to her 2 when a Round starts", () => {
    const s = combat([{ defId: "jade", owner: "A", x: 4, y: 4 }, { defId: "valen", owner: "A", x: 4, y: 5 }, { defId: "eira", owner: "A", x: 4, y: 7 }]);
    get(s, "valen1").hp = 10;
    get(s, "eira2").hp = 10;
    jade.hooks!.onEvent!(hookApi(content, s, [], get(s, "jade0")), { type: "RoundStarted", round: 2 });
    expect([get(s, "valen1").hp, get(s, "eira2").hp]).toEqual([12, 10]);
  });
});

describe("Kage's Stealth from the start of combat", () => {
  it("is hidden from the enemy whose Turn comes first (the view is fixed after the hooks run)", () => {
    let s = combat([{ defId: "kage", owner: "A", x: 4, y: 1 }, { defId: "valen", owner: "B", x: 4, y: 7 }]);
    s = { ...s, phase: "prep", turn: 0, nextStarter: "B" };
    s = run(s, { type: "Ready", seat: "A" }).state;
    s = run(s, { type: "Ready", seat: "B" }).state;
    expect([s.phase, s.activeSeat]).toEqual(["combat", "B"]);
    expect(hiddenFrom(s, get(s, "kage0"), "B")).toBe(true);
  });
});
