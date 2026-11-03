import type { AbilityDef, CardDef, Formula, FormulaInput, HeroDef, ItemDef, SummonDef, UnitDef } from "./defs.ts";

// Everything the engine reads from the content package. Kept out of GameState
// because formulas are functions and the state must stay plain data.
export interface Content {
  heroes: readonly HeroDef[];
  summons: readonly SummonDef[];
  cards: readonly CardDef[];
  items: readonly ItemDef[];
}

export function unitDef(c: Content, defId: string): UnitDef {
  const d = c.heroes.find((h) => h.id === defId) ?? c.summons.find((u) => u.id === defId);
  if (!d) throw new Error(`unknown unit ${defId}`);
  return d;
}

export function heroDef(c: Content, defId: string): HeroDef | undefined {
  return c.heroes.find((h) => h.id === defId);
}

export function itemDef(c: Content, id: string): ItemDef {
  const i = c.items.find((x) => x.id === id);
  if (!i) throw new Error(`unknown item ${id}`);
  return i;
}

// rules.md "Shop and Items": price plus the total value of the item it is built from.
export function itemValue(c: Content, id: string): number {
  const i = itemDef(c, id);
  return i.price + (i.from ? itemValue(c, i.from) : 0);
}

// What is wrong with a deck (empty = fine): its size, unknown cards, and each card's copy limit.
export function checkDeck(c: Content, deck: readonly string[], size: number): string[] {
  const errors: string[] = [];
  if (deck.length !== size) errors.push(`a deck has ${size} cards (this one has ${deck.length})`);
  for (const id of new Set(deck)) {
    const card = c.cards.find((x) => x.id === id);
    if (!card) errors.push(`unknown card ${id}`);
    else if (deck.filter((x) => x === id).length > card.maxCopies) errors.push(`${card.name}: at most ${card.maxCopies}`);
  }
  return errors;
}

// Which ability an action means.
export type AbilityRef = "normal" | "ultimate" | number; // number = index in skills

// Every ability of a unit: normal attack, skills, then ultimate (a summon has only its normal attack).
export function abilityRefs(c: Content, defId: string): AbilityRef[] {
  const h = heroDef(c, defId);
  return h ? ["normal", ...h.skills.map((_, i) => i), "ultimate"] : ["normal"];
}

// A sheet value: a number, or a formula worked out now (defs.ts "Formula"). Missing = 0.
export function evalFormula(f: Formula | undefined, input: FormulaInput): number {
  return f === undefined ? 0 : typeof f === "number" ? f : f(input);
}

export function abilityOf(c: Content, defId: string, ref: AbilityRef): AbilityDef | undefined {
  const d = unitDef(c, defId);
  if (ref === "normal") return d.normalAttack;
  const h = heroDef(c, defId);
  if (!h) return undefined;
  return ref === "ultimate" ? h.ultimate : h.skills[ref];
}
