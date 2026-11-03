import { apply, createUnit, newMatchWithUnits, normalConfig, type GameState } from "@hcd/engine";
import { describe, expect, it } from "vitest";
import { content } from "../src/index.ts";

// Real heroes through the real engine.
function combat(units: { defId: string; owner: "A" | "B"; x: number; y: number }[]): GameState {
  const s = newMatchWithUnits(
    normalConfig,
    1,
    units.map((u, i) => createUnit(content, u.defId, u.owner, `${u.defId}${i}`, u.defId === "guard" ? 1 : null)),
  );
  units.forEach((u, i) => (s.units[i]!.pos = { x: u.x, y: u.y }));
  return { ...s, phase: "combat", activeSeat: "A", turn: 1 };
}

describe("Valen (docs/heroes/Valen.md)", () => {
  it("Light of Vow: first tile Physical 2 + Magic ATK, then Magic falls off by 1", () => {
    const s = combat([
      { defId: "valen", owner: "A", x: 4, y: 1 },
      { defId: "guard", owner: "B", x: 4, y: 2 },
      { defId: "guard", owner: "B", x: 4, y: 3 },
      { defId: "guard", owner: "B", x: 4, y: 4 },
      { defId: "bianca", owner: "B", x: 0, y: 8 },
    ]);
    const r = apply(s, { type: "UseAbility", seat: "A", unitId: "valen0", ability: 0, aim: { dir: "N" } }, content);
    if (!r.ok) throw new Error(r.error);
    // Guards: 10 HP, DEF 1, no Armor. Passive bonus +1 per hit: (Penetration 2 − 0) / 2.
    expect(r.state.units.slice(1, 4).map((u) => u.hp)).toEqual([4, 7, 8]);
  });
});
