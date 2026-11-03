import { h, mulPct, roundH, type FormulaInput, type HeroDef, type HitForm, type SummonDef } from "@hcd/engine";

// These only return what they are given; they let TypeScript check the sheet as you type.
export const defineHero = (h: HeroDef): HeroDef => h;
export const defineSummon = (u: SummonDef): SummonDef => u;

// Common formula: the user's ATK.
export const ATK = (f: FormulaInput) => f.atk;

// The most common hit form: "Rotating (8 directions) | Hit: All", X above C.
export const FRONT1: HitForm = { rotate: 8, hit: "all", grid: ["X", "C"] };

// "2 + 150% ATK" style values: a sum of [value, percent] parts, rounded once at the end (combat.md "Rounding").
export const pctSum = (...parts: [number, number][]) => roundH(parts.reduce((sum, [v, p]) => sum + mulPct(h(v), p), 0));
