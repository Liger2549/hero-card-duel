import type { Content } from "@hcd/engine";
import { cards } from "./cards.ts";
import { heroes } from "./heroes/index.ts";
import { items } from "./items.ts";
import { units } from "./units.ts";

export { cards, starterDeck } from "./cards.ts";
export * from "./define.ts";
export { heroes } from "./heroes/index.ts";
export { items, totalValue } from "./items.ts";
export { units } from "./units.ts";

// Everything at once, in the shape the engine reads.
export const content: Content = { heroes, summons: units, cards, items };
