// rules.md "Shop and Items": buy, upgrade and sell in the Preparation Phase (every round is a Major Phase for now).
import type { ActionOf } from "../actions.ts";
import { itemDef, itemValue, type Content } from "../content.ts";
import type { GameEvent } from "../events.ts";
import { divRound } from "../num.ts";
import type { Seat } from "../config.ts";
import { findUnit, type GameState, type Unit } from "../state.ts";
import { stat } from "../stats.ts";
import { heal } from "./damage.ts";

function ownLivingHero(s: GameState, seat: string, unitId: string) {
  const u = findUnit(s, unitId);
  return u && u.owner === seat && u.kind === "hero" && !u.dead ? u : null;
}

// Where an item goes: a living hero of the seat's 2 slots, or the stash (12 slots).
function holder(s: GameState, seat: Seat, id: string): { items: string[]; slots: number; unit: Unit | null } | null {
  if (id === "stash") return { items: s.players[seat].stash, slots: s.config.stashSlots, unit: null };
  const u = ownLivingHero(s, seat, id);
  return u ? { items: u.items, slots: s.config.itemSlots, unit: u } : null;
}

export function validateBuyItem(c: Content, s: GameState, a: ActionOf<"BuyItem">): string | null {
  if (s.phase !== "prep") return "only in the Preparation Phase";
  if (s.ready[a.seat]) return "already Ready";
  const h = holder(s, a.seat, a.unitId);
  if (!h) return "choose your own living hero or the stash";
  const item = c.items.find((i) => i.id === a.itemId);
  if (!item) return "no such item";
  if (item.from) {
    if (!h.items.includes(item.from)) return `needs ${itemDef(c, item.from).name} first`;
  } else if (h.items.length >= h.slots) {
    return "no free item slot";
  }
  return s.players[a.seat].gold < item.price ? "not enough gold" : null;
}

// Max HP an item gives is healed when it goes onto a hero, and HP above the new Max HP is cut when it leaves.
function putOn(c: Content, u: Unit, itemId: string, at: number, events: GameEvent[]): void {
  const maxBefore = stat(c, u, "maxHp");
  if (at >= 0) u.items[at] = itemId;
  else u.items.push(itemId);
  heal(c, u, stat(c, u, "maxHp") - maxBefore, events);
}
function takeOff(c: Content, u: Unit, itemId: string): void {
  u.items.splice(u.items.indexOf(itemId), 1);
  u.hp = Math.min(u.hp, stat(c, u, "maxHp"));
}

// rules.md "Shop and Items": items move between the stash and heroes only in the Preparation Phase.
export function validateMoveItem(c: Content, s: GameState, a: ActionOf<"MoveItem">): string | null {
  if (s.phase !== "prep") return "only in the Preparation Phase";
  if (s.ready[a.seat]) return "already Ready";
  if (a.from === a.to) return "choose a different place";
  const from = holder(s, a.seat, a.from);
  const to = holder(s, a.seat, a.to);
  if (!from || !to) return "choose your own living hero or the stash";
  if (!c.items.some((i) => i.id === a.itemId) || !from.items.includes(a.itemId)) return "that item is not there";
  return to.items.length >= to.slots ? "no free item slot" : null;
}

export function applyMoveItem(c: Content, s: GameState, a: ActionOf<"MoveItem">, events: GameEvent[]): void {
  const from = holder(s, a.seat, a.from)!;
  const to = holder(s, a.seat, a.to)!;
  if (from.unit) takeOff(c, from.unit, a.itemId);
  else from.items.splice(from.items.indexOf(a.itemId), 1);
  if (to.unit) putOn(c, to.unit, a.itemId, -1, events);
  else to.items.push(a.itemId);
  events.push({ type: "ItemMoved", seat: a.seat, itemId: a.itemId, from: a.from, to: a.to });
}

// An upgrade replaces the item it is built from and costs only its own price (the difference).
// Max HP gained from an item is also healed (prototype: "ฟื้นตอนใส่").
export function applyBuyItem(c: Content, s: GameState, a: ActionOf<"BuyItem">, events: GameEvent[]): void {
  const h = holder(s, a.seat, a.unitId)!;
  const item = itemDef(c, a.itemId);
  s.players[a.seat].gold -= item.price;
  const at = item.from ? h.items.indexOf(item.from) : -1;
  if (h.unit) putOn(c, h.unit, item.id, at, events);
  else if (at >= 0) h.items[at] = item.id;
  else h.items.push(item.id);
  events.push({ type: "ItemBought", unitId: a.unitId, itemId: item.id, replaced: item.from ?? null, gold: item.price });
}

export function validateSellItem(s: GameState, a: ActionOf<"SellItem">): string | null {
  if (s.phase !== "prep") return "only in the Preparation Phase";
  if (s.ready[a.seat]) return "already Ready";
  const h = holder(s, a.seat, a.unitId);
  if (!h) return "choose your own living hero or the stash";
  return h.items.includes(a.itemId) ? null : "that item is not there";
}

// Selling gives back half of the item's total value. HP above the new Max HP is cut (Clamp).
export function applySellItem(c: Content, s: GameState, a: ActionOf<"SellItem">, events: GameEvent[]): void {
  const h = holder(s, a.seat, a.unitId)!;
  if (h.unit) takeOff(c, h.unit, a.itemId);
  else h.items.splice(h.items.indexOf(a.itemId), 1);
  const gold = divRound(itemValue(c, a.itemId), 2);
  s.players[a.seat].gold += gold;
  events.push({ type: "ItemSold", unitId: a.unitId, itemId: a.itemId, gold });
}
