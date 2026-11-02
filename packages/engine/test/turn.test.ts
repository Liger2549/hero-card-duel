import { describe, expect, it } from "vitest";
import { normalConfig, type Seat } from "../src/config.ts";
import { endTurn as finishTurn, newMatchWithUnits } from "../src/rules/turn.ts";
import { fixtures } from "./fixtures.ts";
import { inZone } from "../src/board.ts";
import { play, player, rejects, state, unit } from "./helpers.ts";

const place = (seat: Seat, unitId: string, x: number, y: number) =>
  ({ type: "PlaceHero", seat, unitId, to: { x, y } }) as const;
const ready = (seat: Seat) => ({ type: "Ready", seat }) as const;
const step = (seat: Seat, unitId: string, x: number, y: number) =>
  ({ type: "Step", seat, unitId, to: { x, y } }) as const;
const endTurn = (seat: Seat) => ({ type: "EndTurn", seat }) as const;

const match = (seed = 7) =>
  newMatchWithUnits(normalConfig, seed, [unit("v", "A", 0, 0), unit("s", "A", 0, 0), unit("b", "B", 0, 0), unit("e", "B", 0, 0)]);

describe("round 1 Preparation Phase (rules.md)", () => {
  it("starts with no hero placed and full mana", () => {
    const s = match();
    expect(s.phase).toBe("prep");
    expect(s.units.every((u) => u.pos === null)).toBe(true);
    expect(s.players.A.mana).toBe(12);
  });

  it("places heroes anywhere in the own zone, and can place them again", () => {
    let s = play(match(), place("A", "v", 8, 1), place("A", "v", 3, 0));
    expect(s.units[0]!.pos).toEqual({ x: 3, y: 0 });
    expect(rejects(s, place("A", "s", 3, 2))).toBe("target is outside the zone");
    expect(rejects(s, place("A", "s", 3, 0))).toBe("tile is taken");
    expect(rejects(s, place("B", "b", 3, 0))).toBe("target is outside the zone");
    s = play(s, place("B", "b", 3, 8));
    expect(s.units[2]!.pos).toEqual({ x: 3, y: 8 });
  });

  it("starts the Combat Phase when both are Ready; B starts round 1", () => {
    const s = play(match(), ready("A"), ready("B"));
    expect(s.phase).toBe("combat");
    expect(s.activeSeat).toBe("B");
  });

  it("places unplaced heroes at random in their zone, the same way for the same seed", () => {
    const a = play(match(42), place("A", "v", 4, 0), ready("A"), ready("B"));
    const b = play(match(42), place("A", "v", 4, 0), ready("A"), ready("B"));
    for (const u of a.units) expect(inZone(normalConfig, u.owner, u.pos!, [false, false, false])).toBe(true);
    expect(a.units[0]!.pos).toEqual({ x: 4, y: 0 });
    expect(a.units.map((u) => u.pos)).toEqual(b.units.map((u) => u.pos));
  });

  it("also starts the Combat Phase when the time runs out", () => {
    const s = play(match(), { type: "PrepTimeUp" });
    expect(s.phase).toBe("combat");
    expect(s.units.every((u) => u.pos !== null)).toBe(true);
  });
});

describe("End Turn and round end (combat.md Turn Flow, rules.md Combat Phase)", () => {
  const twoUnits = () => state([unit("v", "A", 4, 4), unit("e", "B", 4, 8)]);

  it("needs at least 1 step before End Turn", () => {
    expect(rejects(twoUnits(), endTurn("A"))).toBe("move at least 1 unit before ending the Turn");
  });

  it("an undone step does not count", () => {
    const s = play(twoUnits(), step("A", "v", 4, 5), { type: "Undo", seat: "A" });
    expect(rejects(s, endTurn("A"))).toBe("move at least 1 unit before ending the Turn");
  });

  it("allows End Turn without a step when no unit can step", () => {
    const s = state([unit("l", "A", 4, 4, { getsFreeStep: false }), unit("e", "B", 4, 8)], {
      players: { A: player(0), B: player(12) },
    });
    expect(play(s, endTurn("A")).activeSeat).toBe("B");
  });

  it("End Turn takes the player out; the other keeps taking Turns alone", () => {
    const s = play(twoUnits(), step("A", "v", 4, 5), endTurn("A"));
    expect(s.outOfRound).toEqual(["A"]);
    expect(s.activeSeat).toBe("B");
    const next = structuredClone(s);
    finishTurn(fixtures, next, []); // a Turn ended by an Action
    expect(next.activeSeat).toBe("B");
  });

  it("ends the Round when both are out; the first out starts next round", () => {
    const s = play(twoUnits(), step("A", "v", 4, 5), endTurn("A"), step("B", "e", 4, 7), endTurn("B"));
    expect(s.round).toBe(3);
    expect(s.phase).toBe("prep");
    expect(s.nextStarter).toBe("A");
    expect(play(s, ready("A"), ready("B")).activeSeat).toBe("A");
  });

  it("a player who can do nothing goes out by itself", () => {
    // A's only unit is stunned: it can neither step nor act.
    const units = [unit("v", "A", 0, 0, { cc: { stun: 500 } }), unit("e", "B", 4, 8)];
    const s = play(state(units, { phase: "prep", nextStarter: "A" }), ready("A"), ready("B"));
    expect(s.outOfRound).toEqual(["A"]);
    expect(s.activeSeat).toBe("B");
  });

  it("a new Round resets mana and the Melee free step", () => {
    let s = play(twoUnits(), step("A", "v", 4, 5));
    s.units[0]!.remainingMove = 1;
    s = play(s, step("A", "v", 4, 6), endTurn("A"), step("B", "e", 4, 7), endTurn("B"));
    expect(s.players.A.mana).toBe(12);
    expect(s.units[0]!.freeStepUsed).toBe(false);
  });
});
