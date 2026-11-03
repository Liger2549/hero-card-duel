import { describe, expect, it } from "vitest";
import { apply, type Action } from "../src/actions.ts";
import type { Content } from "../src/content.ts";
import type { HeroDef } from "../src/defs.ts";
import type { GameEvent } from "../src/events.ts";
import { loseHp } from "../src/rules/damage.ts";
import { resolveInterjects, takeAction, type UnitHooks } from "../src/rules/interject.ts";
import type { Aim } from "../src/rules/targeting.ts";
import { createUnit, findUnit, type GameState, type Unit } from "../src/state.ts";
import { stat } from "../src/stats.ts";
import { fixtures } from "./fixtures.ts";
import { get, state } from "./helpers.ts";

const knight = fixtures.heroes[0]!;

// A guard that counters (1 damage) whenever an enemy hits one of its allies: a stand-in for Bianca's oath.
const counter: UnitHooks = {
  onEvent(api, e) {
    if (e.type !== "Damaged" || !e.sourceId) return;
    const hurt = findUnit(api.s, e.unitId);
    const source = findUnit(api.s, e.sourceId);
    if (hurt && source && hurt.owner === api.self.owner && source.owner !== api.self.owner && hurt.id !== api.self.id) {
      api.interject("Counter", "counter", { data: { target: source.id } });
    }
  },
  interjects: {
    counter(api, p) {
      const t = findUnit(api.s, String(p.data!.target))!;
      loseHp(api.c, api.s, t, 1, api.self, api.events);
    },
  },
};

const guard = (id: string, speed: number): HeroDef => ({ ...knight, id, stats: { ...knight.stats, speed }, hooks: counter });

const content: Content = {
  ...fixtures,
  heroes: [
    ...fixtures.heroes,
    guard("slowGuard", 100),
    guard("fastGuard", 150),
    // A Free Action attack: the Turn goes on after it.
    { ...knight, id: "quick", skills: [{ ...knight.normalAttack, name: "Jab", mana: 0, freeAction: true }] },
    // Manual interject: Magic 5 on a picked tile, 1 Turn later.
    { ...knight, id: "mortar", skills: [{ name: "Mortar", mana: 0, text: "", form: { rotate: 0, hit: "all", range: { manhattan: 3 } }, magic: 5, interject: { delay: 1 } }] },
    // A special run by its hook, and one with no hook.
    {
      ...knight,
      id: "caster",
      skills: [
        { name: "Mark", mana: 0, text: "", form: { rotate: 0, hit: "all", range: { manhattan: 3 } }, magic: 1, special: "mark" },
        { name: "Broken", mana: 0, text: "", form: { rotate: 0, hit: "all", range: { manhattan: 3 } }, magic: 1, special: "missing" },
      ],
      hooks: { specials: { mark: (api, area) => area.enemies.forEach((t) => api.events.push({ type: "StatusApplied", unitId: t.unit.id, status: "marked" })) } },
    },
    // Bianca-like passive: DEF is always 0 and becomes Armor; formulas still read DEF before the conversion.
    {
      ...knight,
      id: "bastion",
      stats: { ...knight.stats, def: 2 },
      normalAttack: { ...knight.normalAttack, physical: (f) => f.atk + f.def },
      hooks: { stat: (_u, name, value, raw) => (name === "def" ? 0 : name === "armor" ? value + raw("def") : value) },
    },
  ],
};

const at = (id: string, defId: string, owner: "A" | "B", x: number, y: number, extra: Partial<Unit> = {}): Unit => ({
  ...createUnit(content, defId, owner, id),
  pos: { x, y },
  ...extra,
});
const use = (unitId: string, ability: "normal" | number, aim: Aim, seat: "A" | "B" = "A"): Action => ({ type: "UseAbility", seat, unitId, ability, aim });
const run = (s: GameState, a: Action) => {
  const r = apply(s, a, content);
  if (!r.ok) throw new Error(r.error);
  return r;
};
const resolved = (events: GameEvent[]) => events.filter((e) => e.type === "InterjectResolved").map((e) => (e as { unitId: string }).unitId);

describe("Action Value (combat.md Action Order)", () => {
  it("Action Count × 10,000 / Speed, rounded up; counts reset at the end of the Turn", () => {
    const fast = at("f", "fastGuard", "A", 0, 0);
    expect(takeAction(content, fast)).toBe(67); // 10,000 / 150 = 66.7
    expect(takeAction(content, fast)).toBe(134); // 20,000 / 150 = 133.3
    const s = state([at("a", "knight", "A", 4, 4), at("b", "knight", "B", 4, 5)]);
    const after = run(s, use("a", "normal", { tiles: [{ x: 4, y: 5 }] })).state; // the attack ends the Turn
    expect(get(after, "a").actionCount).toBe(0);
  });
});

describe("automatic interjects (combat.md Interject, Resolution Order)", () => {
  it("trigger on the event, resolve when the Turn ends, lower Action Value first", () => {
    const s = state([
      at("slow", "slowGuard", "B", 3, 5),
      at("fast", "fastGuard", "B", 5, 5),
      at("ally", "knight", "B", 4, 5),
      at("a", "knight", "A", 4, 4),
    ]);
    const r = run(s, use("a", "normal", { tiles: [{ x: 4, y: 5 }] }));
    expect(resolved(r.events)).toEqual(["fast", "slow"]); // AV 67 before AV 100
    expect(get(r.state, "a").hp).toBe(18);
    const turnEnded = r.events.findIndex((e) => e.type === "TurnEnded" || e.type === "TurnStarted");
    expect(r.events.findIndex((e) => e.type === "InterjectResolved")).toBeLessThan(turnEnded);
  });

  it("one triggered by a Free Action waits until the Turn ends", () => {
    const s = state([at("g", "slowGuard", "B", 3, 5), at("ally", "knight", "B", 4, 5), at("a", "quick", "A", 4, 4)]);
    let r = run(s, use("a", 0, { tiles: [{ x: 4, y: 5 }] }));
    expect(resolved(r.events)).toEqual([]);
    expect(r.state.pending).toHaveLength(1);
    r = run(r.state, { type: "EndRound", seat: "A" });
    expect(resolved(r.events)).toEqual(["g"]);
    expect(get(r.state, "a").hp).toBe(19);
  });

  it("at the end of a Turn interjects resolve first and Turn DOTs tick last", () => {
    const s = state([at("g", "slowGuard", "B", 3, 5), at("ally", "knight", "B", 4, 5), at("a", "quick", "A", 4, 4)]);
    get(s, "a").dots.push({ id: "flame", kind: "turn", damageH: 200, breakPerTick: 0, ticksLeft: 2, appliedTurn: 0, sourceId: "g" });
    let r = run(s, use("a", 0, { tiles: [{ x: 4, y: 5 }] }));
    r = run(r.state, { type: "EndRound", seat: "A" });
    const kinds = r.events.map((e) => e.type);
    expect(kinds.indexOf("InterjectResolved")).toBeLessThan(kinds.indexOf("DotTick"));
  });

  it("equal Action Values: the one triggered first resolves first", () => {
    const s = state([at("g1", "slowGuard", "B", 3, 5), at("g2", "slowGuard", "B", 5, 5), at("ally", "knight", "B", 4, 5), at("a", "knight", "A", 4, 4)]);
    expect(resolved(run(s, use("a", "normal", { tiles: [{ x: 4, y: 5 }] })).events)).toEqual(["g1", "g2"]);
  });

  it("a crowd-controlled unit cannot trigger one", () => {
    const s = state([at("g", "slowGuard", "B", 3, 5, { cc: { root: 300 } }), at("ally", "knight", "B", 4, 5), at("a", "knight", "A", 4, 4)]);
    const r = run(s, use("a", "normal", { tiles: [{ x: 4, y: 5 }] }));
    expect(resolved(r.events)).toEqual([]);
    expect(get(r.state, "a").hp).toBe(20);
  });

  it("fizzles if the caster is killed or crowd-controlled before it resolves", () => {
    const s = state([at("g", "slowGuard", "B", 3, 5), at("a", "knight", "A", 4, 4)]);
    s.pending.push({ id: 1, unitId: "g", name: "Counter", actionValue: 100, key: "counter", turnsLeft: 0, count: { per: "turn" }, appliedTurn: 0, data: { target: "a" } });
    get(s, "g").cc = { stun: 300 };
    const events: GameEvent[] = [];
    resolveInterjects(content, s, events);
    expect(events).toContainEqual({ type: "InterjectFizzled", id: 1, unitId: "g", name: "Counter" });
    expect(get(s, "a").hp).toBe(20);
  });
});

describe("manual interjects (combat.md Manual Interject)", () => {
  const board = (enemyAt: { x: number; y: number }) => state([at("m", "mortar", "A", 4, 2), at("e", "knight", "B", enemyAt.x, enemyAt.y), at("far", "knight", "B", 0, 8)]);
  const cast = (s: GameState) => run(s, use("m", 0, { tiles: [{ x: 4, y: 4 }] })).state;
  const endTurn = (s: GameState, seat: "A" | "B") => run(s, { type: "EndRound", seat });

  it("locks onto a tile and resolves after its delay (the Turn it was cast in does not count)", () => {
    let s = cast(board({ x: 4, y: 4 }));
    expect(s.pending).toHaveLength(1);
    expect(get(s, "e").hp).toBe(20); // not yet
    const r = endTurn(s, "B"); // B's Turn ends: 1 Turn has passed
    s = r.state;
    expect(resolved(r.events)).toEqual(["m"]);
    expect(get(s, "e").hp).toBe(15); // Magic 5; the knight has no Magic Armor or DEF
  });

  it("misses a unit that moved off the tile", () => {
    let s = cast(board({ x: 4, y: 4 }));
    get(s, "e").pos = { x: 6, y: 6 };
    s = endTurn(s, "B").state;
    expect(get(s, "e").hp).toBe(20);
  });
});

describe("hooks (CLAUDE.md Engine rules: unusual mechanics are hero hooks)", () => {
  it("an ability's special runs its hero's hook; a special with no hook cannot be used", () => {
    const s = state([at("c", "caster", "A", 4, 4), at("e", "knight", "B", 4, 6)]);
    const r = run(s, use("c", 0, { tiles: [{ x: 4, y: 6 }] }));
    expect(r.events).toContainEqual({ type: "StatusApplied", unitId: "e", status: "marked" });
    const bad = apply(s, use("c", 1, { tiles: [{ x: 4, y: 6 }] }), content);
    expect(!bad.ok && bad.error).toBe("not available yet");
  });

  it("a stat hook changes the final stat; formulas read DEF before it", () => {
    const b = at("b", "bastion", "A", 4, 4);
    expect(stat(content, b, "def")).toBe(0);
    expect(stat(content, b, "armor")).toBe(3); // Armor 1 + DEF 2
    const s = state([b, at("e", "knight", "B", 4, 5)]);
    expect(get(run(s, use("b", "normal", { tiles: [{ x: 4, y: 5 }] })).state, "e").hp).toBe(15); // ATK 4 + DEF 2 − Armor 1
  });
});
