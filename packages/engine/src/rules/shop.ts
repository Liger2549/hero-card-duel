// rules.md "Shop and Items": buy, upgrade and sell in the Preparation Phase (every round is a Major Phase for now).
import type { ActionOf } from "../actions.ts";
import { itemDef, itemValue, type Content } from "../content.ts";
import type { GameEvent } from "../events.ts";
import { findUnit, type GameState } from "../state.ts";
import { stat } from "../stats.ts";
import { heal } from "./damage.ts";

function ownLivingHero(s: GameState, seat: string, unitId: string) {
  const u = findUnit(s, unitId);
  return u && u.owner === seat && u.kind === "hero" && !u.dead ? u : null;
}

export function validateBuyItem(c: Content, s: GameState, a: ActionOf<"BuyItem">): string | null {
  if (s.phase !== "prep") return "only in the Preparation Phase";
  if (s.ready[a.seat]) return "already Ready";
  const u = ownLivingHero(s, a.seat, a.unitId);
  if (!u) return "choose your own living hero";
  const item = c.items.find((i) => i.id === a.itemId);
  if (!item) return "no such item";
  if (item.from) {
    if (!u.items.includes(item.from)) return `needs ${itemDef(c, item.from).name} first`;
  } else if (u.items.length >= s.config.itemSlots) {
    return "no free item slot";
  }
  return s.players[a.seat].gold < item.price ? "not enough gold" : null;
}

// An upgrade replaces the item it is built from and costs only its own price (the difference).
// Max HP gained from an item is also healed (prototype: "ฟื้นตอนใส่").
export function applyBuyItem(c: Content, s: GameState, a: ActionOf<"BuyItem">, events: GameEvent[]): void {
  const u = findUnit(s, a.unitId)!;
  const item = itemDef(c, a.itemId);
  const maxBefore = stat(c, u, "maxHp");
  s.players[a.seat].gold -= item.price;
  if (item.from) u.items[u.items.indexOf(item.from)] = item.id;
  else u.items.push(item.id);
  heal(c, u, stat(c, u, "maxHp") - maxBefore, events);
  events.push({ type: "ItemBought", unitId: u.id, itemId: item.id, replaced: item.from ?? null, gold: item.price });
}

export function validateSellItem(s: GameState, a: ActionOf<"SellItem">): string | null {
  if (s.phase !== "prep") return "only in the Preparation Phase";
  if (s.ready[a.seat]) return "already Ready";
  const u = ownLivingHero(s, a.seat, a.unitId);
  if (!u) return "choose your own living hero";
  return u.items.includes(a.itemId) ? null : "the hero does not hold that item";
}

// Selling gives back half of the item's total value. HP above the new Max HP is cut (Clamp).
export function applySellItem(c: Content, s: GameState, a: ActionOf<"SellItem">, events: GameEvent[]): void {
  const u = findUnit(s, a.unitId)!;
  u.items.splice(u.items.indexOf(a.itemId), 1);
  const gold = Math.floor(itemValue(c, a.itemId) / 2);
  s.players[a.seat].gold += gold;
  u.hp = Math.min(u.hp, stat(c, u, "maxHp"));
  events.push({ type: "ItemSold", unitId: u.id, itemId: a.itemId, gold });
}
