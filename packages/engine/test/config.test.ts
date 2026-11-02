import { describe, expect, it } from "vitest";
import { checkConfig, normalConfig, type MatchConfig } from "../src/config.ts";

describe("checkConfig", () => {
  it("accepts the Normal mode config", () => {
    expect(checkConfig(normalConfig)).toEqual([]);
  });

  it("rejects a board that does not split evenly between the towers", () => {
    const c: MatchConfig = { ...normalConfig, boardWidth: 10 };
    expect(checkConfig(c)).toHaveLength(1);
  });

  it("rejects a draft order that does not match the hero count", () => {
    const c: MatchConfig = { ...normalConfig, heroesPerPlayer: { A: 5, B: 4 } };
    expect(checkConfig(c)).toHaveLength(1);
  });
});
