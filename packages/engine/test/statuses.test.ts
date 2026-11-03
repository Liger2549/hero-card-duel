import { describe, expect, it } from "vitest";
import type { Action } from "../src/actions.ts";
import type { OnHit, StatName } from "../src/defs.ts";
import { heal, hitDamage } from "../src/rules/damage.ts";
import { addBuff, applyDot, applyWither, endOfRoundDots, endOfTurn } from "../src/rules/status.ts";
import type { GameState, Unit } from "../src/state.ts";
import { stat } from "../src/stats.ts";
import { fixtures } from "./fixtures.ts";
import { get, play, state, unit } from "./helpers.ts";

type DotSpec = Extract<OnHit, { type: "dot" }>;
const flame: DotSpec = { type: "dot", id: "nocturnalFlame", kind: "turn", damage: 2, duration: 2, breakPerTick: 1 };
const burn: DotSpec = { type: "dot", id: "burn", kind: "round", damage: 2, duration: 2 };

// Ends the Turn of `seat` (endOfTurn runs while the ending Turn's seat is active), then moves to the next Turn.
function endTurnOf(s: GameState, seat: "A" | "B"): void {
  s.activeSeat = seat;
  endOfTurn(fixtures, s, []);
  s.turn += 1;
}

const flat = (u: Unit, st: StatName, amount: number) => u.buffs.push({ stat: st, amount, kind: "flat", turnsLeft: -1, count: { per: "turn" }, appliedTurn: 0 });

describe("DOT kinds (combat.md Damage over Time)", () => {
  it("worked example: a Round DOT applied in round 3 for 2 Rounds ticks at the end of rounds 3 and 4", () => {
    const s = state([unit("a", "A", 4, 4), unit("b", "B", 4, 6)], { round: 3 });
    applyDot(fixtures, s, get(s, "a"), get(s, "b"), burn, 2, []);
    endOfTurnsWithoutTick(s);
    endOfRoundDots(fixtures, s, []); // end of round 3
    expect(get(s, "b").hp).toBe(18);
    endOfRoundDots(fixtures, s, []); // end of round 4
    expect(get(s, "b").hp).toBe(16);
    expect(get(s, "b").dots).toEqual([]);
  });

  it("worked example: a Turn DOT applied on A's Turn for 2 Turns ticks at the end of B's next two Turns", () => {
    const s = state([unit("karas", "A", 4, 4), unit("b", "B", 4, 6)]);
    applyDot(fixtures, s, get(s, "karas"), get(s, "b"), flame, 2, []);
    endTurnOf(s, "A"); // the Turn it was applied in: no tick
    expect(get(s, "b").hp).toBe(20);
    endTurnOf(s, "B");
    expect(get(s, "b").hp).toBe(18);
    endTurnOf(s, "A"); // the applier's team's Turns do not count
    expect(get(s, "b").hp).toBe(18);
    endTurnOf(s, "B");
    expect(get(s, "b").hp).toBe(16);
    expect(get(s, "b").dots).toEqual([]);
    endOfRoundDots(fixtures, s, []); // a Turn DOT never ticks at the end of the Round
    expect(get(s, "b").hp).toBe(16);
  });

  it("DOT Damage = (Damage + DOT Boost) × DOT Power%; Tick = max(DOT Damage × DOT Taken% − Fortitude, 1)", () => {
    const s = state([unit("a", "A", 4, 4), unit("b", "B", 4, 6)]);
    flat(get(s, "a"), "dotBoost", 1);
    flat(get(s, "a"), "dotPower", 50);
    flat(get(s, "b"), "dotTaken", -20);
    flat(get(s, "b"), "fortitude", 1);
    applyDot(fixtures, s, get(s, "a"), get(s, "b"), burn, 2, []);
    endOfRoundDots(fixtures, s, []);
    expect(get(s, "b").hp).toBe(17); // (2 + 1) × 150% = 4.5; 4.5 × 80% − 1 = 2.6 → 3
  });

  it("ignores DEF, Armor and shields", () => {
    const s = state([unit("a", "A", 4, 4), unit("b", "B", 4, 6)]);
    flat(get(s, "b"), "def", 5);
    get(s, "b").shields.push({ mode: "add", amount: 10, turnsLeft: -1, count: { per: "turn" }, appliedTurn: 0, seq: 0 });
    applyDot(fixtures, s, get(s, "a"), get(s, "b"), burn, 2, []);
    endOfRoundDots(fixtures, s, []);
    expect(get(s, "b").hp).toBe(18);
    expect(get(s, "b").shields[0]!.amount).toBe(10);
  });
});

describe("DOT stacking per applier (combat.md Damage over Time)", () => {
  it("worked example: Karas's (2) and Zoran's (1) copies on Fortitude 1 deal 1 + 1 each tick", () => {
    const s = state([unit("karas", "A", 4, 4), unit("zoran", "A", 3, 4), unit("b", "B", 4, 6)]);
    flat(get(s, "b"), "fortitude", 1);
    applyDot(fixtures, s, get(s, "karas"), get(s, "b"), flame, 2, []);
    applyDot(fixtures, s, get(s, "zoran"), get(s, "b"), flame, 1, []);
    expect(get(s, "b").dots).toHaveLength(2);
    endTurnOf(s, "A");
    endTurnOf(s, "B");
    expect(get(s, "b").hp).toBe(18);
  });

  it("the same applier replaces its own copy (new damage, full duration)", () => {
    const s = state([unit("karas", "A", 4, 4), unit("b", "B", 4, 6)]);
    applyDot(fixtures, s, get(s, "karas"), get(s, "b"), burn, 2, []);
    get(s, "b").dots[0]!.ticksLeft = 1;
    applyDot(fixtures, s, get(s, "karas"), get(s, "b"), burn, 5, []);
    expect(get(s, "b").dots).toHaveLength(1);
    expect(get(s, "b").dots[0]).toMatchObject({ damageH: 500, ticksLeft: 2 });
  });

  it("Break per tick (Nocturnal Flame) never lowers the Break Bar below 1", () => {
    const s = state([unit("karas", "A", 4, 4), unit("b", "B", 4, 6, { breakBar: 2 })]);
    applyDot(fixtures, s, get(s, "karas"), get(s, "b"), { ...flame, duration: 3 }, 2, []);
    endTurnOf(s, "A");
    endTurnOf(s, "B");
    expect(get(s, "b").breakBar).toBe(1);
    endTurnOf(s, "A");
    endTurnOf(s, "B");
    expect(get(s, "b").breakBar).toBe(1);
    expect(get(s, "b").broken).toBe(false);
  });
});

describe("countdowns (combat.md Durations)", () => {
  it("Team Turns: only the caster's team's Turns count, not the one it was given in", () => {
    const s = state([unit("a", "A", 4, 4), unit("b", "A", 4, 5)]);
    addBuff(s, get(s, "a"), get(s, "b"), { stat: "atk", amount: 1, turns: 2, per: "team" }, []);
    endTurnOf(s, "A"); // given in this Turn
    endTurnOf(s, "B");
    expect(get(s, "b").buffs[0]!.turnsLeft).toBe(2);
    endTurnOf(s, "A");
    expect(get(s, "b").buffs[0]!.turnsLeft).toBe(1);
    endTurnOf(s, "B");
    endTurnOf(s, "A");
    expect(get(s, "b").buffs).toEqual([]);
  });

  it("Own Turns: a Free Action does not use it, an attack does", () => {
    const use = (unitId: string, ability: 0 | 1 | 2 | "normal", x: number, y: number): Action => ({
      type: "UseAbility",
      seat: "A",
      unitId,
      ability,
      aim: { tiles: [{ x, y }] },
    });
    let s = state([unit("h", "A", 4, 4, { defId: "archer" }), unit("k", "A", 3, 4), unit("e", "B", 4, 6)]);
    addBuff(s, null, get(s, "h"), { stat: "atk", amount: 1, turns: 1, per: "own" }, []);
    s.turn += 1;
    s = play(s, use("h", 2, 3, 4)); // Ward on an ally: Free Action, the Turn goes on
    expect(get(s, "h").usedOwnTurn).toBe(false);
    s = play(s, use("h", "normal", 4, 6)); // the normal attack ends the Turn and uses her Own Turn
    expect(get(s, "h").buffs.filter((b) => b.stat === "atk")).toEqual([]);
  });
});

describe("Wither N (statuses.md)", () => {
  it("lowers Max HP, keeps HP above it, stacks, never below 1, and gives Max HP back (not HP) when it ends", () => {
    const s = state([unit("p", "A", 4, 4), unit("b", "B", 4, 5)]);
    const b = get(s, "b");
    applyWither(s, get(s, "p"), b, 3, 1, "own", []);
    expect(stat(fixtures, b, "maxHp")).toBe(17);
    expect(b.hp).toBe(20); // Keep
    heal(fixtures, b, 5, []);
    expect(b.hp).toBe(20); // healing does nothing while HP is above the max
    applyWither(s, get(s, "p"), b, 30, 1, "own", []);
    expect(stat(fixtures, b, "maxHp")).toBe(1);
    b.hp = 12;
    s.turn += 1; // a later Turn (the one it was applied in never counts)
    b.usedOwnTurn = true; // the enemy uses its Own Turn: both stacks end
    endTurnOf(s, "B");
    expect(stat(fixtures, b, "maxHp")).toBe(20);
    expect(b.hp).toBe(12);
  });
});

describe("Physical ATK +N (statuses.md)", () => {
  it("adds N to the Physical damage of a hit that has some, and nothing to a Magic-only hit", () => {
    const a = unit("a", "A", 4, 4);
    flat(a, "physicalAtk", 2);
    const archer = unit("b", "B", 4, 5, { defId: "archer" }); // DEF 1, no Armor
    expect(hitDamage(fixtures, a, archer, 4, 0, 0).damage).toBe(5); // 4 + 2 − DEF 1
    expect(hitDamage(fixtures, a, archer, 0, 4, 0).damage).toBe(3); // 4 − DEF 1
  });
});

// A Round DOT is not touched by the end of a Turn.
function endOfTurnsWithoutTick(s: GameState): void {
  const hp = get(s, "b").hp;
  endTurnOf(s, "A");
  endTurnOf(s, "B");
  expect(get(s, "b").hp).toBe(hp);
}
