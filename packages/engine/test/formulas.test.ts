import { describe, expect, it } from "vitest";
import type { GameEvent } from "../src/events.ts";
import type { ModifierKind, StatName } from "../src/defs.ts";
import { divH, divRound, h, pctOf, roundH } from "../src/num.ts";
import { applyCc, healFrom, hitDamage, lifeStealOnHit, reduceBreakBar } from "../src/rules/damage.ts";
import { endOfTurn } from "../src/rules/status.ts";
import type { ActiveBuff, Unit } from "../src/state.ts";
import { stat } from "../src/stats.ts";
import { fixtures } from "./fixtures.ts";
import { get, state, unit } from "./helpers.ts";

const buff = (s: StatName, amount: number, kind: ModifierKind = "flat"): ActiveBuff => ({
  stat: s,
  amount,
  kind,
  turnsLeft: -1,
  count: { per: "turn" },
  appliedTurn: 0,
});
const withBuffs = (u: Unit, ...buffs: ActiveBuff[]): Unit => ({ ...u, buffs });

describe("rounding (combat.md General)", () => {
  it("rounds to the nearest whole number, .50 up, looking at 2 decimal places", () => {
    expect(pctOf(4, 120)).toBe(5); // 4.80
    expect(pctOf(3, 25)).toBe(1); // 0.75
    expect(pctOf(4, 30)).toBe(1); // 1.20
    expect(divRound(7, 2)).toBe(4); // 3.50
    expect(roundH(divH(h(2495), 1000))).toBe(2); // 2.495 is read as 2.49
  });
});

describe("stat modifiers (combat.md Stat Modifiers)", () => {
  it("100% + 20% − 10% = 110%", () => {
    const u = withBuffs(unit("a", "A", 0, 0), buff("atk", 20, "pct"), buff("atk", -10, "pct"));
    expect(stat(fixtures, u, "atk")).toBe(4); // knight ATK 4 × 110% = 4.4
    const v = withBuffs(unit("a", "A", 0, 0), buff("atk", 6), buff("atk", 20, "pct"), buff("atk", -10, "pct"));
    expect(stat(fixtures, v, "atk")).toBe(11); // (4 + 6) × 110%
  });

  it("a mult modifier multiplies the stat", () => {
    const u = withBuffs(unit("a", "A", 0, 0), buff("maxHp", 80, "mult"));
    expect(stat(fixtures, u, "maxHp")).toBe(16); // 20 × 80%
  });

  it("a % Multiplier starts at 100% and flat buffs move it by percentage points", () => {
    const u = unit("a", "A", 0, 0);
    expect(stat(fixtures, u, "physicalTaken")).toBe(100);
    expect(stat(fixtures, withBuffs(u, buff("physicalTaken", -20)), "physicalTaken")).toBe(80);
  });
});

describe("damage (combat.md Damage Resolution)", () => {
  it("worked example: Physical 10, Magic 4 against Armor 4, Magic Armor 2, DEF 1, Physical Taken 80% → 10", () => {
    // Attacker: Penetration 1, Armor Shred 50%. Knight has Armor 1, so +3 makes 4.
    const attacker = withBuffs(unit("a", "A", 0, 0), buff("penetration", 1), buff("armorShred", -50));
    const target = withBuffs(unit("b", "B", 0, 1), buff("armor", 3), buff("magicArmor", 2), buff("def", 1), buff("physicalTaken", -20));
    // Effective Armor 4 × 50% − 1 = 1; Physical part (10 − 1) × 80% = 7.2; Magic part 4; (7.2 + 4 − 1) = 10.2
    expect(hitDamage(fixtures, attacker, target, 10, 4, 0).damage).toBe(10);
  });

  it("Damage Taken% multiplies the total after DEF", () => {
    const target = withBuffs(unit("b", "B", 0, 1, { defId: "archer" }), buff("damageTaken", 50));
    // Archer: DEF 1. (5 − 1) × 150% = 6
    expect(hitDamage(fixtures, unit("a", "A", 0, 0), target, 0, 5, 0).damage).toBe(6);
  });
});

describe("Break (combat.md Break)", () => {
  it("(Break + Break Boost) × Break Power% × Break Taken% − Break Resistance, at least 1", () => {
    const s = state([
      withBuffs(unit("a", "A", 4, 4), buff("breakBoost", 3), buff("breakPower", 10)),
      withBuffs(unit("b", "B", 4, 5, { breakBar: 20 }), buff("breakResistance", 1)),
    ]);
    reduceBreakBar(fixtures, s, get(s, "a"), get(s, "b"), 10, []);
    expect(get(s, "b").breakBar).toBe(7); // (10 + 3) × 110% − 1 = 13.3 → 13
  });

  it("Break DMG = (max(Max Break Bar / 5, 1) + Break DMG Bonus) × Break DMG Power%", () => {
    const s = state([
      withBuffs(unit("a", "A", 4, 4), buff("breakDmgBonus", 1), buff("breakDmgPower", 50)),
      unit("b", "B", 4, 5, { defId: "archer", breakBar: 1 }),
    ]);
    const events: GameEvent[] = [];
    reduceBreakBar(fixtures, s, get(s, "a"), get(s, "b"), 1, events);
    expect(events).toContainEqual({ type: "Broken", unitId: "b", damage: 4 }); // (8 / 5 + 1) × 150% = 3.9 → 4
  });
});

describe("crowd control (combat.md Crowd Control)", () => {
  it("CC Taken 80%: Stun 300 becomes 240 and ends after 2 Turns at Speed 100", () => {
    const s = state([withBuffs(unit("b", "B", 4, 5), buff("ccTaken", -20))]);
    applyCc(fixtures, get(s, "b"), "stun", 300, []);
    expect(get(s, "b").cc.stun).toBe(240);
    endOfTurn(fixtures, s, []);
    expect(get(s, "b").cc.stun).toBe(140);
    endOfTurn(fixtures, s, []);
    expect(get(s, "b").cc.stun).toBeUndefined();
  });
});

describe("healing (combat.md Healing)", () => {
  it("Life Steal 15 heals no more than the HP the hit took: 3 → 3, 9 → 9, 20 → 15", () => {
    for (const [damage, healed] of [
      [3, 3],
      [9, 9],
      [20, 15],
    ] as const) {
      const attacker = withBuffs(unit("a", "A", 0, 0, { hp: 1 }), buff("lifeSteal", 15));
      lifeStealOnHit(fixtures, attacker, unit("b", "B", 0, 1), damage, []);
      expect(attacker.hp).toBe(1 + healed);
    }
  });

  it("Life Steal: Drain Taken% and Life Steal Resistance are the target's; 0 damage heals nothing", () => {
    const attacker = withBuffs(unit("a", "A", 0, 0, { hp: 1 }), buff("lifeSteal", 10));
    const target = withBuffs(unit("b", "B", 0, 1), buff("drainTaken", -50), buff("lifeStealResistance", 2));
    lifeStealOnHit(fixtures, attacker, target, 9, []);
    expect(attacker.hp).toBe(4); // 10 × 50% − 2 = 3
    lifeStealOnHit(fixtures, attacker, target, 0, []);
    expect(attacker.hp).toBe(4);
  });

  it("worked example: a heal of 2 on a unit with Healing Taken 25% heals 1", () => {
    const target = withBuffs(unit("p", "A", 0, 0, { hp: 5 }), buff("healingTaken", -75));
    healFrom(fixtures, unit("z", "A", 0, 1), target, 2, []);
    expect(target.hp).toBe(6); // 2 × 25% = 0.5 → 1
  });

  it("Heal = ((Base + Healing Bonus) × Healing Power% + Healing Received) × Healing Taken%", () => {
    const healer = withBuffs(unit("l", "A", 0, 0), buff("healingBonus", 2), buff("healingPower", 25));
    const target = withBuffs(unit("t", "A", 0, 1, { hp: 1 }), buff("healingReceived", 1));
    healFrom(fixtures, healer, target, 4, []);
    expect(target.hp).toBe(10); // (4 + 2) × 125% + 1 = 8.5 → 9
  });
});
