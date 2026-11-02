import { describe, expect, it } from "vitest";
import { normalConfig } from "../src/config.ts";
import { play, player, pos, rejects, state, unit } from "./helpers.ts";

const step = (unitId: string, x: number, y: number, seat: "A" | "B" = "A") =>
  ({ type: "Step", seat, unitId, to: { x, y } }) as const;
const endTurn = (seat: "A" | "B") => ({ type: "EndTurn", seat }) as const;
const undo = { type: "Undo", seat: "A" } as const;

describe("steps (board.md Movement)", () => {
  it("steps 1 tile in any of 8 directions", () => {
    const s = play(state([unit("v", "A", 4, 4)]), step("v", 5, 5));
    expect(pos(s, "v")).toEqual({ x: 5, y: 5 });
  });

  it("cannot step 2 tiles or off the board", () => {
    expect(rejects(state([unit("v", "A", 4, 4)]), step("v", 6, 4))).toBe("a step moves exactly 1 tile");
    expect(rejects(state([unit("v", "A", 0, 0)]), step("v", -1, 0))).toBe("off the board");
  });

  it("steps as many times as mana allows (stepLimit none, as in the prototype)", () => {
    const s = play(state([unit("v", "A", 4, 4), unit("e", "B", 0, 8)]), step("v", 4, 5), step("v", 4, 6), step("v", 5, 7));
    expect(s.players.A.mana).toBe(10); // free, 1, 1
  });

  it("with stepLimit move: only Move steps per Turn, refilled next Turn", () => {
    const limited = { config: { ...normalConfig, stepLimit: "move" as const } };
    let s = play(state([unit("v", "A", 4, 4), unit("e", "B", 4, 8)], limited), step("v", 4, 5));
    expect(rejects(s, step("v", 4, 6))).toBe("no Move left");
    s = play(s, endTurn("A"));
    expect(s.units[0]!.remainingMove).toBe(1);
  });

  it("cannot step onto an enemy", () => {
    const s = state([unit("v", "A", 4, 4), unit("e", "B", 4, 5)]);
    expect(rejects(s, step("v", 4, 5))).toBe("tile is taken by an enemy");
  });

  it("only moves on its own Turn", () => {
    expect(rejects(state([unit("e", "B", 4, 4)]), step("e", 4, 3, "B"))).toBe("not your Turn");
  });
});

describe("step cost (board.md Step Cost)", () => {
  it("Melee: first step of the Round is free, later steps cost Step Cost", () => {
    let s = play(state([unit("v", "A", 4, 4)]), step("v", 4, 5));
    expect(s.players.A.mana).toBe(12);
    s.units[0]!.remainingMove = 1; // as if a later Turn in the same Round
    s = play(s, step("v", 4, 6));
    expect(s.players.A.mana).toBe(11);
  });

  it("Ranged: always pays", () => {
    const s = play(state([unit("l", "A", 4, 4, { getsFreeStep: false })]), step("l", 4, 5));
    expect(s.players.A.mana).toBe(11);
  });

  it("several units can move in one Turn, each paying its own cost", () => {
    const s = play(
      state([unit("v", "A", 1, 1), unit("b", "A", 3, 1), unit("l", "A", 5, 1, { getsFreeStep: false })]),
      step("v", 1, 2),
      step("b", 3, 2),
      step("l", 5, 2),
    );
    expect(s.players.A.mana).toBe(11); // 0 + 0 + 1
  });

  it("uses the unit's own Step Cost", () => {
    const s = play(state([unit("l", "A", 4, 4, { getsFreeStep: false, stepCost: 2 })]), step("l", 4, 5));
    expect(s.players.A.mana).toBe(10);
  });

  it("rejects a step the player cannot pay for", () => {
    const s = state([unit("l", "A", 4, 4, { getsFreeStep: false })], { players: { A: player(0), B: player(12) } });
    expect(rejects(s, step("l", 4, 5))).toBe("not enough mana");
  });
});

describe("swap (board.md Occupancy)", () => {
  it("swaps with an ally; each pays its own cost and uses 1 Move", () => {
    const s = play(state([unit("v", "A", 4, 4), unit("l", "A", 4, 5, { getsFreeStep: false })]), step("v", 4, 5));
    expect(pos(s, "v")).toEqual({ x: 4, y: 5 });
    expect(pos(s, "l")).toEqual({ x: 4, y: 4 });
    expect(s.players.A.mana).toBe(11); // Valen free + ranged ally 1
    expect(s.units.every((u) => u.remainingMove === 0)).toBe(true);
  });

  it("a Melee ally with its free step pays 0 and uses up its free step", () => {
    const s = play(state([unit("v", "A", 4, 4), unit("b", "A", 4, 5)]), step("v", 4, 5));
    expect(s.players.A.mana).toBe(12);
    expect(s.units.every((u) => u.freeStepUsed)).toBe(true);
  });

  it("with stepLimit move: cannot swap with an ally that has no Move left", () => {
    const limited = { config: { ...normalConfig, stepLimit: "move" as const } };
    const s = play(state([unit("v", "A", 4, 4), unit("b", "A", 5, 5)], limited), step("b", 4, 5));
    expect(rejects(s, step("v", 4, 5))).toBe("ally has no Move left to swap");
  });
});

describe("undo (board.md Undo)", () => {
  it("undoes newest first, giving back Move, mana and the free step", () => {
    let s = play(state([unit("v", "A", 4, 4), unit("l", "A", 6, 4, { getsFreeStep: false })]), step("v", 4, 5), step("l", 6, 5));
    s = play(s, undo);
    expect(pos(s, "l")).toEqual({ x: 6, y: 4 });
    expect(s.players.A.mana).toBe(12);
    s = play(s, undo);
    expect(pos(s, "v")).toEqual({ x: 4, y: 4 });
    expect(s.units[0]!.freeStepUsed).toBe(false);
    expect(s.units[0]!.remainingMove).toBe(1);
  });

  it("undoes a swap for both units", () => {
    let s = play(state([unit("v", "A", 4, 4), unit("l", "A", 4, 5, { getsFreeStep: false })]), step("v", 4, 5));
    s = play(s, undo);
    expect(pos(s, "v")).toEqual({ x: 4, y: 4 });
    expect(pos(s, "l")).toEqual({ x: 4, y: 5 });
    expect(s.players.A.mana).toBe(12);
  });

  it("cannot undo after the Turn ends", () => {
    const s = play(state([unit("v", "A", 4, 4), unit("e", "B", 4, 8)]), step("v", 4, 5), endTurn("A"));
    expect(s.undoSteps).toEqual([]);
    expect(rejects(s, undo)).toBe("not your Turn");
  });
});

describe("Preparation Phase move (board.md Preparation Phase Steps)", () => {
  const prep = (unitId: string, x: number, y: number, seat: "A" | "B" = "A") =>
    ({ type: "PrepMove", seat, unitId, to: { x, y } }) as const;
  const prepState = (...units: ReturnType<typeof unit>[]) => state(units, { phase: "prep" });

  it("moves once, anywhere in its own zone, for free, keeping the free step", () => {
    const s = play(prepState(unit("v", "A", 0, 0)), prep("v", 8, 1));
    expect(pos(s, "v")).toEqual({ x: 8, y: 1 });
    expect(s.players.A.mana).toBe(12);
    expect(s.units[0]!.freeStepUsed).toBe(false);
    expect(rejects(s, prep("v", 7, 1))).toBe("already moved this Preparation Phase");
  });

  it("B's zone is the top 2 rows", () => {
    const s = play(prepState(unit("e", "B", 0, 8)), prep("e", 4, 7, "B"));
    expect(pos(s, "e")).toEqual({ x: 4, y: 7 });
  });

  it("cannot leave the zone, and a unit outside its zone cannot move", () => {
    expect(rejects(prepState(unit("v", "A", 0, 0)), prep("v", 0, 2))).toBe("target is outside the zone");
    expect(rejects(prepState(unit("v", "A", 4, 4)), prep("v", 0, 0))).toBe("unit is outside its zone");
  });

  it("cannot move onto the zone part of a destroyed tower", () => {
    const s = state([unit("v", "A", 0, 0)], { phase: "prep" });
    s.towers.A[2]!.destroyed = true;
    expect(rejects(s, prep("v", 6, 0))).toBe("target is outside the zone");
    expect(play(s, prep("v", 5, 0)).units[0]!.pos).toEqual({ x: 5, y: 0 });
  });

  it("is not allowed in round 1, where heroes are placed instead", () => {
    const s = state([unit("v", "A", 0, 0)], { phase: "prep", round: 1 });
    expect(rejects(s, prep("v", 1, 0))).toBe("round 1 places heroes instead");
  });
});
