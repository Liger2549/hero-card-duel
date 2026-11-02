// Per-device settings kept in the browser: the player's name and deck. Storage can be missing or
// blocked (private windows), so every access falls back quietly.
import { checkDeck, normalConfig } from "@hcd/engine";
import { content, starterDeck } from "@hcd/content";

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* not saved; fine */
  }
}

export const loadName = () => get("hcd-name") ?? "";
export const saveName = (name: string) => set("hcd-name", name.slice(0, 20));

// The saved deck, or the starter deck if there is none or it is no longer valid.
export function loadDeck(): string[] {
  try {
    const deck = JSON.parse(get("hcd-deck") ?? "null") as unknown;
    if (Array.isArray(deck) && checkDeck(content, deck as string[], normalConfig.deckSize).length === 0) return deck as string[];
  } catch {
    /* fall through */
  }
  return [...starterDeck];
}
export const saveDeck = (deck: string[]) => set("hcd-deck", JSON.stringify(deck));
