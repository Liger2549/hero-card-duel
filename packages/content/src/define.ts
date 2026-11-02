import type { FormulaInput, HeroDef, Offset, SummonDef } from "@hcd/engine";

// These only return what they are given; they let TypeScript check the sheet as you type.
export const defineHero = (h: HeroDef): HeroDef => h;
export const defineSummon = (u: SummonDef): SummonDef => u;

// Common formula: the user's ATK.
export const ATK = (f: FormulaInput) => f.atk;

// Common shapes (offsets around the user or the target tile).
export const PLUS: readonly Offset[] = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
export const ADJ4: readonly Offset[] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export const RING8: readonly Offset[] = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
export const SQ3: readonly Offset[] = [[0, 0], ...RING8];
// Every tile 1–2 away (Manhattan).
export const R2: readonly Offset[] = [
  [0, -2], [-1, -1], [0, -1], [1, -1], [-2, 0], [-1, 0], [1, 0], [2, 0], [-1, 1], [0, 1], [1, 1], [0, 2],
];
