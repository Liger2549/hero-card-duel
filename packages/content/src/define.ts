import type { FormulaInput, HeroDef, HitForm, SummonDef } from "@hcd/engine";

// These only return what they are given; they let TypeScript check the sheet as you type.
export const defineHero = (h: HeroDef): HeroDef => h;
export const defineSummon = (u: SummonDef): SummonDef => u;

// Common formula: the user's ATK.
export const ATK = (f: FormulaInput) => f.atk;

// The most common hit form: "Rotating (8 directions) | Hit: All", X above C.
export const FRONT1: HitForm = { rotate: 8, hit: "all", grid: ["X", "C"] };
