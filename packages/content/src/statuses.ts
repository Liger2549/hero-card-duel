import { pctOf, type FormulaInput, type OnHit } from "@hcd/engine";

// docs/statuses.md: statuses more than one hero applies.

// Nocturnal Flame (เพลิงรัตติกาล): a Turn DOT of 50% ATK with Break 1 per tick (Karas, Zoran).
export const nocturnalFlame = (turns: number): Extract<OnHit, { type: "dot" }> => ({
  type: "dot",
  id: "nocturnalFlame",
  kind: "turn",
  damage: (f: FormulaInput) => pctOf(f.atk, 50),
  duration: turns,
  breakPerTick: 1,
});
