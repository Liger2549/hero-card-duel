// rules.md "Before the Game Starts": time of day, then bans and picks one at a time.
import type { ActionOf } from "../actions.ts";
import { TimesOfDay, type MatchConfig, type Seat } from "../config.ts";
import { draftable, type Content } from "../content.ts";
import type { GameEvent } from "../events.ts";
import { randInt } from "../rng.ts";
import { createUnit, Seats, type GameState } from "../state.ts";
import { baseState, startFirstRound } from "./turn.ts";

// A new match, at the start of the draft. Decks are lists of card ids (rules.md "Cards").
export function newMatch(config: MatchConfig, seed: number, decks: Record<Seat, string[]>): GameState {
  const s = baseState(config, seed);
  s.phase = "draft";
  s.draft = { stage: "timeOfDay", bans: { A: [], B: [] }, picks: { A: [], B: [] }, banIndex: 0, pickIndex: 0 };
  for (const seat of Seats) s.players[seat].deck = [...decks[seat]];
  return s;
}

const taken = (s: GameState, heroId: string) =>
  Seats.some((seat) => s.draft!.bans[seat].includes(heroId) || s.draft!.picks[seat].includes(heroId));

export function validateChooseTimeOfDay(s: GameState, a: ActionOf<"ChooseTimeOfDay">): string | null {
  if (s.draft?.stage !== "timeOfDay") return "not the time-of-day step";
  if (a.seat !== "A") return "A chooses the time of day";
  return TimesOfDay.includes(a.time) ? null : "no such time of day";
}

export function applyChooseTimeOfDay(s: GameState, a: ActionOf<"ChooseTimeOfDay">, events: GameEvent[]): void {
  s.timeOfDay = TimesOfDay.indexOf(a.time);
  events.push({ type: "TimeOfDayChosen", time: a.time });
  s.draft!.stage = s.config.skipBans ? "pick" : "ban";
}

export function validateBan(c: Content, s: GameState, a: ActionOf<"Ban">): string | null {
  if (s.draft?.stage !== "ban") return "not the ban phase";
  if (s.config.banOrder[s.draft.banIndex] !== a.seat) return "not your ban";
  if (!draftable(c).some((h) => h.id === a.heroId)) return "no such hero";
  return taken(s, a.heroId) ? "already banned" : null;
}

export function applyBan(s: GameState, a: ActionOf<"Ban">, events: GameEvent[]): void {
  s.draft!.bans[a.seat].push(a.heroId);
  events.push({ type: "HeroBanned", seat: a.seat, heroId: a.heroId });
  nextBan(s);
}

function nextBan(s: GameState): void {
  s.draft!.banIndex += 1;
  if (s.draft!.banIndex >= s.config.banOrder.length) s.draft!.stage = "pick";
}

export function validatePick(c: Content, s: GameState, a: ActionOf<"Pick">): string | null {
  if (s.draft?.stage !== "pick") return "not the pick phase";
  if (s.config.pickOrder[s.draft.pickIndex] !== a.seat) return "not your pick";
  if (!draftable(c).some((h) => h.id === a.heroId)) return "no such hero";
  return taken(s, a.heroId) ? "already banned or picked" : null;
}

export function applyPick(c: Content, s: GameState, a: ActionOf<"Pick">, events: GameEvent[], random = false): void {
  s.draft!.picks[a.seat].push(a.heroId);
  s.draft!.pickIndex += 1;
  events.push({ type: "HeroPicked", seat: a.seat, heroId: a.heroId, random });
  if (s.draft!.pickIndex >= s.config.pickOrder.length) finishDraft(c, s, events);
}

// The server's clock ran out on the current step: Morning, blank bans, or a random hero.
export function applyDraftTimeUp(c: Content, s: GameState, events: GameEvent[]): void {
  const d = s.draft!;
  if (d.stage === "timeOfDay") {
    applyChooseTimeOfDay(s, { type: "ChooseTimeOfDay", seat: "A", time: s.config.defaultTimeOfDay }, events);
  } else if (d.stage === "ban") {
    events.push({ type: "HeroBanned", seat: s.config.banOrder[d.banIndex]!, heroId: null });
    nextBan(s);
  } else {
    const free = draftable(c).map((h) => h.id).filter((id) => !taken(s, id));
    const seat = s.config.pickOrder[d.pickIndex]!;
    applyPick(c, s, { type: "Pick", seat, heroId: free[randInt(s, free.length)]! }, events, true);
  }
}

// Picked heroes join the match; decks are shuffled; round 1 begins.
function finishDraft(c: Content, s: GameState, events: GameEvent[]): void {
  for (const seat of Seats) {
    for (const heroId of s.draft!.picks[seat]) s.units.push(createUnit(c, heroId, seat, `${seat}-${heroId}`));
    shuffle(s, s.players[seat].deck);
  }
  events.push({ type: "DraftFinished" });
  startFirstRound(s, events);
}

function shuffle(s: GameState, list: string[]): void {
  for (let i = list.length - 1; i > 0; i--) {
    const j = randInt(s, i + 1);
    [list[i], list[j]] = [list[j]!, list[i]!];
  }
}
