import { describe, expect, it } from "vitest";
import { apply } from "../src/actions.ts";
import { botAction } from "../src/bot.ts";
import { alternatingOrder, normalConfig } from "../src/config.ts";
import { checkDeck } from "../src/content.ts";
import { newMatch } from "../src/rules/draft.ts";
import { draftFixtures, fixtures } from "./fixtures.ts";

describe("bot", () => {
  it("plays both sides from the draft to the end of the game", () => {
    let s = newMatch(normalConfig, 3, { A: [], B: [] });
    for (let n = 0; n < 5000 && s.phase !== "over"; n++) {
      const a = botAction(s, draftFixtures, "A") ?? botAction(s, draftFixtures, "B");
      if (!a) throw new Error(`no move in phase ${s.phase}`);
      const r = apply(s, a, draftFixtures);
      if (!r.ok) throw new Error(`${a.type}: ${r.error}`);
      s = r.state;
    }
    expect(s.phase).toBe("over");
  });
});

describe("helpers", () => {
  it("alternatingOrder: A B A B, then the rest", () => {
    expect(alternatingOrder(2, 4)).toEqual(["A", "B", "A", "B", "B", "B"]);
  });

  it("checkDeck: size and each card's copy limit", () => {
    expect(checkDeck(fixtures, Array.from({ length: 24 }, () => "orb"), 24)).toEqual(["Orb: at most 4"]);
    expect(checkDeck(fixtures, ["orb"], 24)).toHaveLength(1);
  });
});
