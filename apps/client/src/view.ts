// What one player may see (rules.md "Preparation Phase"): while it lasts, the other team is shown as it was when
// the phase started. Its placements, moves, summons and buys show when the Combat Phase starts.
import { hiddenFrom, type GameEvent, type GameState, type Seat } from "@hcd/engine";

// The state when the current Preparation Phase started, and where its events start in the log (Snapshot.logTotal).
export interface PrepBase {
  round: number;
  state: GameState;
  logAt: number;
}

const hiding = (s: GameState, base: PrepBase | null): base is PrepBase => s.phase === "prep" && base !== null && base.round === s.round;

export function shownState(s: GameState, base: PrepBase | null, me: Seat): GameState {
  if (!hiding(s, base)) return s;
  const other: Seat = me === "A" ? "B" : "A";
  return {
    ...s,
    units: [...s.units.filter((u) => u.owner === me), ...base.state.units.filter((u) => u.owner === other)],
    players: { ...s.players, [other]: base.state.players[other] },
  };
}

// statuses.md "Stealth": an enemy hidden from this player is taken off the board (pos null, still alive for the
// hero counts), and its moves are left out of the log, so neither gives its tile away.
export function hideStealthed(s: GameState, me: Seat): { state: GameState; hidden: Set<string> } {
  const hidden = new Set(s.units.filter((u) => hiddenFrom(s, u, me)).map((u) => u.id));
  if (hidden.size === 0) return { state: s, hidden };
  return { state: { ...s, units: s.units.map((u) => (hidden.has(u.id) ? { ...u, pos: null } : u)) }, hidden };
}

const MOVES = new Set<GameEvent["type"]>(["UnitStepped", "UnitsSwapped", "StepUndone", "UnitMoved", "UnitPushed"]);

// The log without the other team's Preparation Phase events, nor the moves of units hidden from this player.
// `first` is the log index of history[0].
export function shownLog(s: GameState, base: PrepBase | null, me: Seat, history: GameEvent[], first: number, hidden: Set<string>): GameEvent[] {
  const ownerOf = (e: GameEvent): Seat | undefined =>
    "seat" in e ? e.seat : "owner" in e ? e.owner : "unitId" in e ? s.units.find((u) => u.id === e.unitId)?.owner : undefined;
  // The Preparation Phase filter counts log positions, so it runs before anything is removed.
  const prep = hiding(s, base) ? history.filter((e, i) => first + i < base.logAt || ownerOf(e) !== (me === "A" ? "B" : "A")) : history;
  return hidden.size ? prep.filter((e) => !(MOVES.has(e.type) && "unitId" in e && hidden.has(e.unitId))) : prep;
}
