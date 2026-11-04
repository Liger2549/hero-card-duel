import { describe, expect, it } from "vitest";
import type { Action } from "../src/actions.ts";
import { endOfTurn } from "../src/rules/status.ts";
import { stat } from "../src/stats.ts";
import { fixtures } from "./fixtures.ts";
import { get, play, rejects, state, unit } from "./helpers.ts";

// Preparation Phase of round 2, both players with 1000 gold.
const prep = (units = [unit("k", "A", 4, 0), unit("k2", "A", 5, 0), unit("e", "B", 4, 8)]) => {
  const s = state(units, { phase: "prep", round: 2 });
  s.players.A.gold = 1000;
  return s;
};

describe("stash (rules.md Shop and Items)", () => {
  it("buy into the stash, move to a hero (Max HP healed) and back (HP cut), sell from it for half", () => {
    let s = play(prep(), { type: "BuyItem", seat: "A", unitId: "stash", itemId: "heart" });
    expect(s.players.A.stash).toEqual(["heart"]);
    s = play(s, { type: "MoveItem", seat: "A", itemId: "heart", from: "stash", to: "k" });
    expect(get(s, "k").items).toEqual(["heart"]);
    expect([get(s, "k").hp, stat(fixtures, get(s, "k"), "maxHp")]).toEqual([24, 24]);
    s = play(s, { type: "MoveItem", seat: "A", itemId: "heart", from: "k", to: "stash" });
    expect([get(s, "k").hp, s.players.A.stash]).toEqual([20, ["heart"]]);
    const gold = s.players.A.gold;
    s = play(s, { type: "SellItem", seat: "A", unitId: "stash", itemId: "heart" });
    expect(s.players.A.gold).toBe(gold + 200);
  });

  it("12 slots; items move only in the Preparation Phase", () => {
    const s = prep();
    s.players.A.stash = Array.from({ length: 12 }, () => "sword");
    expect(rejects(s, { type: "BuyItem", seat: "A", unitId: "stash", itemId: "heart" })).toBe("no free item slot");
    const combat = state([unit("k", "A", 4, 0), unit("e", "B", 4, 8)]);
    combat.players.A.stash = ["sword"];
    expect(rejects(combat, { type: "MoveItem", seat: "A", itemId: "sword", from: "stash", to: "k" })).toBe("only in the Preparation Phase");
  });

  it("a hero's death clears its own items, not the stash", () => {
    const s = state([unit("a", "A", 4, 4), unit("b", "B", 4, 5, { hp: 1, items: ["sword"] })]);
    s.players.B.stash = ["heart"];
    const after = play(s, { type: "UseAbility", seat: "A", unitId: "a", ability: "normal", aim: { dir: "N" } });
    expect(get(after, "b").items).toEqual([]);
    expect(after.players.B.stash).toEqual(["heart"]);
  });
});

describe("off-field cards (rules.md Cards)", () => {
  const withBanners = (n: number) => {
    const s = state([unit("k", "A", 4, 4), unit("k2", "A", 2, 2), unit("e", "B", 0, 8)]);
    s.players.A.hand = Array.from({ length: n }, () => "banner");
    return s;
  };
  const playBanner: Action = { type: "PlayCard", seat: "A", card: 0, aim: {} };

  it("buffs the whole team while in play and leaves when its Turns run out", () => {
    const s = play(withBanners(1), playBanner);
    expect(s.players.A.offField).toHaveLength(1);
    expect([stat(fixtures, get(s, "k"), "atk"), stat(fixtures, get(s, "k2"), "atk")]).toEqual([5, 5]);
    // The Turn it was played in does not count; then 2 Turns.
    for (const seat of ["A", "B", "A"] as const) {
      s.activeSeat = seat;
      endOfTurn(fixtures, s, []);
      s.turn += 1;
    }
    expect(s.players.A.offField).toEqual([]);
    expect(stat(fixtures, get(s, "k"), "atk")).toBe(4);
  });

  it("at most 4 in play at once", () => {
    const s = play(withBanners(5), playBanner, playBanner, playBanner, playBanner);
    expect(rejects(s, playBanner)).toBe("too many off-field cards in play");
  });
});

describe("Preparation Phase move (board.md Preparation Phase Steps)", () => {
  it("may swap with an ally in the zone; that counts as the ally's move too", () => {
    const s = play(prep(), { type: "PrepMove", seat: "A", unitId: "k", to: { x: 5, y: 0 } });
    expect([get(s, "k").pos, get(s, "k2").pos]).toEqual([{ x: 5, y: 0 }, { x: 4, y: 0 }]);
    expect(get(s, "k2").prepMoved).toBe(true);
    expect(rejects(s, { type: "PrepMove", seat: "A", unitId: "k2", to: { x: 3, y: 0 } })).toBe("already moved this Preparation Phase");
  });
});
