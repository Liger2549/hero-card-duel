import { expect } from "vitest";
import { apply, type Action } from "../src/actions.ts";
import { normalConfig, type Seat } from "../src/config.ts";
import { baseState } from "../src/rules/turn.ts";
import { createUnit, type GameState, type PlayerState, type Unit } from "../src/state.ts";
import { fixtures } from "./fixtures.ts";

// A fixture unit on the board. Knight (melee) by default.
export function unit(id: string, owner: Seat, x: number, y: number, extra: Partial<Unit> = {}): Unit {
  const u = createUnit(fixtures, extra.defId ?? "knight", owner, id);
  return { ...u, pos: { x, y }, ...extra };
}

// Combat Phase of round 2, A's Turn, both players with full mana, no gold and no cards.
export function state(units: Unit[], extra: Partial<GameState> = {}): GameState {
  const s = baseState(normalConfig, 1);
  for (const seat of ["A", "B"] as const) s.players[seat] = { mana: normalConfig.manaPerRound, gold: 0, deck: [], hand: [], stash: [], offField: [] };
  return { ...s, round: 2, turn: 1, phase: "combat", units, nextStarter: "A", activeSeat: "A", ...extra };
}

export const player = (mana: number, extra: Partial<PlayerState> = {}): PlayerState => ({ mana, gold: 0, deck: [], hand: [], stash: [], offField: [], ...extra });

// Applies actions in order and fails the test if any is rejected.
export function play(s: GameState, ...actions: Action[]): GameState {
  for (const a of actions) {
    const r = apply(s, a, fixtures);
    if (!r.ok) expect.fail(`${a.type} rejected: ${r.error}`);
    s = r.state;
  }
  return s;
}

export function rejects(s: GameState, a: Action): string {
  const r = apply(s, a, fixtures);
  if (r.ok) expect.fail(`${a.type} should have been rejected`);
  return r.error;
}

export function pos(s: GameState, id: string) {
  return s.units.find((u) => u.id === id)!.pos;
}

export function get(s: GameState, id: string): Unit {
  return s.units.find((u) => u.id === id)!;
}
