import { describe, expect, it } from "vitest";
import { apply, type Action } from "../src/actions.ts";
import type { AbilityRef } from "../src/content.ts";
import type { GameEvent } from "../src/events.ts";
import { manaCost } from "../src/rules/abilities.ts";
import { applyCc, giveShield, hitDamage, useShields } from "../src/rules/damage.ts";
import { endOfRoundDots, endOfTurn } from "../src/rules/status.ts";
import type { Aim } from "../src/rules/targeting.ts";
import { stat } from "../src/stats.ts";
import { fixtures } from "./fixtures.ts";
import { get, play, rejects, state, unit } from "./helpers.ts";

const use = (unitId: string, ability: AbilityRef, aim: Aim, seat: "A" | "B" = "A"): Action => ({
  type: "UseAbility",
  seat,
  unitId,
  ability,
  aim,
});
const at = (x: number, y: number): Aim => ({ tiles: [{ x, y }] });

// Knight: 20 HP, ATK 4, Armor 1. Archer: 16 HP, ATK 3, DEF 1. See fixtures.ts.
const duel = () => state([unit("a", "A", 4, 4), unit("b", "B", 4, 5), unit("far", "B", 0, 8)]);

describe("normal attack (combat.md Damage Resolution)", () => {
  it("deals Physical ATK − Armor − DEF, costs mana, gives 1 Ult Point and ends the Turn", () => {
    const s = play(duel(), use("a", "normal", at(4, 5)));
    expect(get(s, "b").hp).toBe(17); // 4 − Armor 1
    expect(s.players.A.mana).toBe(10);
    expect(get(s, "a").ult).toBe(1);
    expect(s.activeSeat).toBe("B");
  });

  it("rejects a target out of reach", () => {
    expect(rejects(duel(), use("a", "normal", at(4, 6)))).toBe("out of range");
  });

  it("needs an enemy on the tile (no swinging at empty air)", () => {
    expect(rejects(duel(), use("a", "normal", at(3, 4)))).toBe("choose an enemy");
  });

  it("preview: same result, and the state passed in does not change", () => {
    const before = duel();
    const r = apply(before, use("a", "normal", at(4, 5)), fixtures);
    expect(r.ok && r.events.find((e) => e.type === "Damaged")).toMatchObject({ unitId: "b", amount: 3 });
    expect(get(before, "b").hp).toBe(20);
  });
});

describe("shields (combat.md Shields)", () => {
  it("Physical 2 + Magic 6 against a 5 shield lets Magic 3 through", () => {
    const s = duel();
    giveShield(s, get(s, "b"), "add", 5, 2);
    const r = hitDamage(fixtures, get(s, "a"), get(s, "b"), 2, 6, 0);
    expect(r).toEqual({ damage: 3, absorbed: 5, through: true });
  });

  it("uses added shields oldest first and the set shield last", () => {
    const s = duel();
    const b = get(s, "b");
    giveShield(s, b, "set", 10, 2);
    giveShield(s, b, "add", 2, 2);
    giveShield(s, b, "add", 3, 2);
    useShields(b, 6);
    expect(b.shields).toMatchObject([{ mode: "set", amount: 9 }]);
  });

  it("a shield that holds the whole hit stops the Break Bar too", () => {
    let s = duel();
    giveShield(s, get(s, "b"), "add", 10, 2);
    s = play(s, use("a", "normal", at(4, 5)));
    expect(get(s, "b").hp).toBe(20);
    expect(get(s, "b").breakBar).toBe(10);
  });
});

describe("crowd control (combat.md Crowd Control)", () => {
  const turnsUntilFree = (tenacityItem: boolean) => {
    const s = duel();
    const b = get(s, "b");
    if (tenacityItem) b.items = ["charm"];
    applyCc(fixtures, b, "stun", 300, []);
    let turns = 0;
    while (b.cc.stun !== undefined) {
      endOfTurn(fixtures, s, []);
      turns++;
    }
    return turns;
  };

  it("Stun 300 at Speed 100 ends after 3 Turns; with Tenacity 100 after 2", () => {
    expect(turnsUntilFree(false)).toBe(3);
    expect(turnsUntilFree(true)).toBe(2);
  });

  it("Silence stops skills but not the normal attack", () => {
    const s = state([unit("a", "A", 4, 4, { cc: { silence: 300 } }), unit("b", "B", 4, 5)]);
    expect(rejects(s, use("a", 0, { dir: "N" }))).toBe("silenced");
    expect(get(play(s, use("a", "normal", at(4, 5))), "b").hp).toBe(17);
  });

  it("Stun stops actions and steps", () => {
    const s = state([unit("a", "A", 4, 4, { cc: { stun: 300 } }), unit("b", "B", 4, 5)]);
    expect(rejects(s, use("a", "normal", at(4, 5)))).toBe("stunned");
    expect(rejects(s, { type: "Step", seat: "A", unitId: "a", to: { x: 3, y: 4 } })).toBe("cannot move (CC)");
  });
});

describe("Break (combat.md Break)", () => {
  it("at 0 the unit takes Break DMG (Max Break Bar / 5) and Stun 500", () => {
    const s = play(
      state([unit("a", "A", 4, 4), unit("b", "B", 4, 5, { defId: "archer", hp: 16, breakBar: 1 }), unit("far", "B", 0, 8)]),
      use("a", "normal", at(4, 5)),
    );
    const b = get(s, "b");
    expect(b.broken).toBe(true);
    expect(b.hp).toBe(11); // 16 − (4 − DEF 1) − Break DMG 2 (Max Break Bar 8 / 5 = 1.6 → 2)
    expect(b.cc.stun).toBe(400); // 500, then one end of Turn
  });

  it("the Break Bar refills when the Break Stun ends", () => {
    const s = duel();
    Object.assign(get(s, "b"), { broken: true, breakBar: 0, cc: { stun: 100 } });
    endOfTurn(fixtures, s, []);
    expect(get(s, "b")).toMatchObject({ broken: false, breakBar: 10 });
  });
});

describe("death and winning (heroes/README.md Death, rules.md Win Conditions)", () => {
  it("a kill pays the bounty, and killing the last hero wins", () => {
    const s = play(state([unit("a", "A", 4, 4), unit("b", "B", 4, 5, { hp: 3 })]), use("a", "normal", at(4, 5)));
    expect(get(s, "b").dead).toBe(true);
    expect(s.players.A.gold).toBe(400);
    expect(s.phase).toBe("over");
    expect(s.winner).toBe("A");
    expect(rejects(s, { type: "EndTurn", seat: "B" })).toBe("the game is over");
  });
});

describe("skills and ultimates", () => {
  it("Hit: First passes through allies and stops at the first enemy", () => {
    const s = play(
      state([unit("a", "A", 4, 1), unit("ally", "A", 4, 2), unit("b", "B", 4, 3), unit("c", "B", 4, 4)]),
      use("a", 0, { dir: "N" }),
    );
    expect(get(s, "ally").hp).toBe(20);
    expect(get(s, "b").hp).toBe(16); // ATK + 1 − Armor 1
    expect(get(s, "c").hp).toBe(20);
    expect(get(s, "a").ult).toBe(2);
  });

  it("an ultimate needs and spends Ult Points", () => {
    const s = state([unit("a", "A", 4, 4), unit("b", "B", 4, 5)]);
    expect(rejects(s, use("a", "ultimate", {}))).toBe("not enough Ult Points");
    get(s, "a").ult = 3;
    const after = play(s, use("a", "ultimate", {}));
    expect(get(after, "a").ult).toBe(1);
    expect(get(after, "b").hp).toBe(16); // 5 − Armor 1
  });

  it("heals never go above Max HP", () => {
    const s = play(
      state([unit("h", "A", 4, 4, { defId: "archer", hp: 14 }), unit("e", "B", 0, 8)]),
      use("h", 0, at(4, 4)),
    );
    expect(get(s, "h").hp).toBe(16);
  });

  it("a Free Action does not end the Turn", () => {
    const s = play(
      state([unit("h", "A", 4, 4, { defId: "archer" }), unit("k", "A", 4, 5), unit("e", "B", 0, 8)]),
      use("h", 2, at(4, 5)),
    );
    expect(s.activeSeat).toBe("A");
    expect(stat(fixtures, get(s, "k"), "armor")).toBe(3);
  });
});

describe("durations (combat.md Durations)", () => {
  it("a 2-Turn buff skips the Turn it was given in, then lasts 2 Turns", () => {
    const s = play(
      state([unit("h", "A", 4, 4, { defId: "archer" }), unit("k", "A", 4, 5), unit("e", "B", 0, 8)]),
      use("h", 2, at(4, 5)),
    );
    const k = get(s, "k");
    endOfTurn(fixtures, s, []);
    expect(k.buffs[0]?.turnsLeft).toBe(2);
    s.turn += 1;
    endOfTurn(fixtures, s, []);
    expect(k.buffs[0]?.turnsLeft).toBe(1);
    s.turn += 1;
    endOfTurn(fixtures, s, []);
    expect(k.buffs).toEqual([]);
  });
});

describe("DOT (combat.md Damage over Time)", () => {
  it("a Round DOT ticks at the end of each Round for its duration", () => {
    const s = play(
      state([unit("h", "A", 4, 4, { defId: "archer" }), unit("k", "B", 4, 6), unit("far", "B", 0, 8)]),
      use("h", 1, at(4, 6)),
    );
    const events: GameEvent[] = [];
    endOfRoundDots(fixtures, s, events);
    expect(get(s, "k").hp).toBe(18); // Magic 2 − DEF 0
    endOfRoundDots(fixtures, s, events);
    expect(get(s, "k").hp).toBe(16);
    expect(get(s, "k").dots).toEqual([]);
  });
});

describe("summoned units' first attack (rules.md Cards)", () => {
  it("free in the summon Round, then 1 for the first attack of later Rounds; others full price", () => {
    const s = duel();
    const pup = unit("p", "A", 4, 3, { defId: "pup", summonedRound: 2 });
    const bite = fixtures.summons[0]!.normalAttack;
    expect(manaCost(fixtures, s, pup, "normal", bite)).toBe(0);
    pup.attacksThisRound = 1;
    expect(manaCost(fixtures, s, pup, "normal", bite)).toBe(2);
    Object.assign(pup, { summonedRound: 1, attacksThisRound: 0 });
    expect(manaCost(fixtures, s, pup, "normal", bite)).toBe(1);
  });
});
