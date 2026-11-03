import { normalConfig } from "@hcd/engine";
import { describe, expect, it } from "vitest";
import { cards, heroes, items, starterDeck, totalValue, units } from "../src/index.ts";

// Checks that catch typos the type checker cannot.
describe("content", () => {
  it("has unique ids", () => {
    const ids = [...heroes, ...units].map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // Skipped until the Normal draft question is answered (ideas.md "Normal draft needs 12 heroes").
  it.skip("has enough heroes for a Normal draft (bans + picks)", () => {
    const needed = normalConfig.banOrder.length + normalConfig.pickOrder.length;
    expect(heroes.length).toBeGreaterThanOrEqual(needed);
  });

  it("every summon names a unit that exists", () => {
    const unitIds = new Set(units.map((u) => u.id));
    for (const h of heroes) {
      for (const a of [h.normalAttack, ...h.skills, h.ultimate]) {
        if (a.targeting.type === "summon") expect(unitIds, `${h.id}: ${a.name}`).toContain(a.targeting.unit);
      }
    }
  });

  it("Ult Point usage is never more than Max Ult Points (heroes/README.md)", () => {
    for (const h of heroes) expect(h.ultimate.ultCost, h.id).toBeLessThanOrEqual(h.ultimate.ultMax);
  });

  it("only Mixed heroes state getsFreeStep", () => {
    for (const h of heroes) if (h.getsFreeStep !== undefined) expect(h.attackType, h.id).toBe("mixed");
  });
});

describe("cards (rules.md Cards)", () => {
  it("unit cards summon a unit that exists", () => {
    const unitIds = new Set(units.map((u) => u.id));
    for (const c of cards) if (c.kind === "unit") expect(unitIds, c.id).toContain(c.summon);
  });

  it("the starter deck has the deck size", () => {
    expect(starterDeck).toHaveLength(normalConfig.deckSize);
  });
});

describe("items (rules.md Shop and Items)", () => {
  it("each upgrade is built from an existing item one tier lower", () => {
    for (const i of items) {
      if (!i.from) {
        expect(i.tier, i.id).toBe(1);
        continue;
      }
      const lower = items.find((x) => x.id === i.from);
      expect(lower, `${i.id} from ${i.from}`).toBeDefined();
      expect(i.tier, i.id).toBeGreaterThan(lower!.tier);
    }
  });

  it("total value adds up the upgrade chain", () => {
    expect(totalValue("sword")).toBe(300);
    expect(totalValue("blade")).toBe(650);
    expect(totalValue("sunsword")).toBe(1350);
  });
});
