/// <reference path="./globals.d.ts" />
import { samePos, type Pos } from "./board.ts";
import type { Seat, TimeOfDay } from "./config.ts";
import type { AbilityRef, Content } from "./content.ts";
import type { GameEvent } from "./events.ts";
import { abilityOf, unitDef } from "./content.ts";
import { applyUseAbility, validateUseAbility } from "./rules/abilities.ts";
import { applyPlayCard, validatePlayCard } from "./rules/cards.ts";
import {
  applyBan,
  applyChooseTimeOfDay,
  applyDraftTimeUp,
  applyPick,
  validateBan,
  validateChooseTimeOfDay,
  validatePick,
} from "./rules/draft.ts";
import { applyPrepMove, applyStep, applyUndo, validatePrepMove, validateStep, validateUndo } from "./rules/movement.ts";
import { applyBuyItem, applyMoveItem, applySellItem, validateBuyItem, validateMoveItem, validateSellItem } from "./rules/shop.ts";
import { hookApi, notify, resumeChoice } from "./rules/interject.ts";
import { checkWin } from "./rules/status.ts";
import type { Aim } from "./rules/targeting.ts";
import {
  applyEndRound,
  applyEndTurn,
  applyPlaceHero,
  applyPrepTimeUp,
  applyReady,
  endTurn,
  finishTurn,
  validateEndRound,
  validateEndTurn,
  validatePlaceHero,
  validateReady,
} from "./rules/turn.ts";
import { findUnit, type GameState } from "./state.ts";

// Everything that can change a match. `seat` is the player who sent it.
// The *TimeUp actions have no seat: only the server's clock sends them.
export type Action =
  // Draft
  | { type: "ChooseTimeOfDay"; seat: Seat; time: TimeOfDay }
  | { type: "Ban"; seat: Seat; heroId: string }
  | { type: "Pick"; seat: Seat; heroId: string }
  | { type: "DraftTimeUp" }
  // Preparation Phase
  | { type: "PlaceHero"; seat: Seat; unitId: string; to: Pos }
  | { type: "PrepMove"; seat: Seat; unitId: string; to: Pos }
  | { type: "BuyItem"; seat: Seat; unitId: string; itemId: string }
  | { type: "SellItem"; seat: Seat; unitId: string; itemId: string } // unitId "stash" = buy into / sell from the stash
  | { type: "MoveItem"; seat: Seat; itemId: string; from: string; to: string } // a hero's id or "stash"
  | { type: "Ready"; seat: Seat }
  | { type: "PrepTimeUp" }
  // Combat Phase (PlayCard also in the Preparation Phase, for unit cards)
  | { type: "Step"; seat: Seat; unitId: string; to: Pos }
  | { type: "Undo"; seat: Seat }
  | { type: "UseAbility"; seat: Seat; unitId: string; ability: AbilityRef; aim: Aim }
  | { type: "PlayCard"; seat: Seat; card: number; aim: Aim } // card = index in hand
  | { type: "EndTurn"; seat: Seat }
  | { type: "EndRound"; seat: Seat }
  // A hero's own extra command (interject.ts "UnitHooks.commands"), e.g. Falka ending her Stealth. Free; the Turn goes on.
  | { type: "UnitCommand"; seat: Seat; unitId: string; command: string }
  // combat.md "Interject": answer an interject that asked its player for a tile (GameState.choice).
  | { type: "Choose"; seat: Seat; tile: Pos }
  | { type: "ChoiceTimeUp" };

export type ActionOf<T extends Action["type"]> = Extract<Action, { type: T }>;

export type ApplyResult = { ok: true; state: GameState; events: GameEvent[] } | { ok: false; error: string };

// Returns why the action is not allowed, or null if it is.
export function validate(s: GameState, a: Action, c: Content): string | null {
  if (s.phase === "over") return "the game is over";
  if (s.choice) {
    if (a.type === "ChoiceTimeUp") return null;
    if (a.type !== "Choose") return "waiting for a player's choice";
    if (a.seat !== s.choice.seat) return "not your choice";
    return s.choice.options.some((p) => samePos(p, a.tile)) ? null : "not one of the options";
  }
  if (a.type === "Choose" || a.type === "ChoiceTimeUp") return "nothing to choose";
  switch (a.type) {
    case "ChooseTimeOfDay":
      return validateChooseTimeOfDay(s, a);
    case "Ban":
      return validateBan(c, s, a);
    case "Pick":
      return validatePick(c, s, a);
    case "DraftTimeUp":
      return s.phase === "draft" ? null : "not in the draft";
    case "PlaceHero":
      return validatePlaceHero(s, a);
    case "PrepMove":
      return validatePrepMove(s, a);
    case "BuyItem":
      return validateBuyItem(c, s, a);
    case "SellItem":
      return validateSellItem(s, a);
    case "MoveItem":
      return validateMoveItem(c, s, a);
    case "Ready":
      return validateReady(s, a);
    case "PrepTimeUp":
      return s.phase === "prep" ? null : "only in the Preparation Phase";
    case "Step":
      return validateStep(s, a);
    case "Undo":
      return validateUndo(s, a);
    case "UseAbility":
      return validateUseAbility(c, s, a);
    case "PlayCard":
      return validatePlayCard(c, s, a);
    case "EndTurn":
      return validateEndTurn(s, a);
    case "EndRound":
      return validateEndRound(s, a);
    case "UnitCommand":
      return validateUnitCommand(s, a, c);
  }
}

function validateUnitCommand(s: GameState, a: ActionOf<"UnitCommand">, c: Content): string | null {
  if (s.phase !== "combat" || a.seat !== s.activeSeat) return "not your Turn";
  const u = findUnit(s, a.unitId);
  if (!u || u.owner !== a.seat || u.dead || !u.pos) return "not your unit";
  const cmd = unitDef(c, u.defId).hooks?.commands?.[a.command];
  if (!cmd) return "no such command";
  return cmd.check?.(hookApi(c, s, [], u)) ?? null;
}

// Checks the action, then returns the new state. The old state is never changed,
// so the UI can also call this to preview an action (see preview()).
export function apply(state: GameState, a: Action, c: Content): ApplyResult {
  const error = validate(state, a, c);
  if (error) return { ok: false, error };

  const s = structuredClone(state);
  const events: GameEvent[] = [];
  switch (a.type) {
    case "ChooseTimeOfDay":
      applyChooseTimeOfDay(s, a, events);
      break;
    case "Ban":
      applyBan(s, a, events);
      break;
    case "Pick":
      applyPick(c, s, a, events);
      break;
    case "DraftTimeUp":
      applyDraftTimeUp(c, s, events);
      break;
    case "PlaceHero":
      applyPlaceHero(s, a, events);
      break;
    case "PrepMove":
      applyPrepMove(s, a, events);
      break;
    case "BuyItem":
      applyBuyItem(c, s, a, events);
      break;
    case "SellItem":
      applySellItem(c, s, a, events);
      break;
    case "MoveItem":
      applyMoveItem(c, s, a, events);
      break;
    case "Ready":
      applyReady(c, s, a, events);
      break;
    case "PrepTimeUp":
      applyPrepTimeUp(c, s, events);
      break;
    case "Step":
      applyStep(c, s, a, events);
      break;
    case "Undo":
      applyUndo(s, events);
      break;
    case "UseAbility": {
      applyUseAbility(c, s, a, events);
      notify(c, s, events); // hooks may queue interjects; they resolve when the Turn ends
      const free = abilityOf(c, findUnit(s, a.unitId)!.defId, a.ability)!.freeAction;
      if (!checkWin(s, events) && !free) endTurn(c, s, events);
      break;
    }
    case "PlayCard":
      applyPlayCard(c, s, a, events);
      checkWin(s, events);
      break;
    case "EndTurn":
      applyEndTurn(c, s, events);
      break;
    case "EndRound":
      applyEndRound(c, s, events);
      break;
    case "Choose":
    case "ChoiceTimeUp":
      resumeChoice(c, s, a.type === "Choose" ? a.tile : s.choice!.fallback, events);
      finishTurn(c, s, events);
      break;
    case "UnitCommand":
      unitDef(c, findUnit(s, a.unitId)!.defId).hooks!.commands![a.command]!.run(hookApi(c, s, events, findUnit(s, a.unitId)!));
      break;
  }
  if (s.phase === "combat" || s.phase === "prep") notify(c, s, events);
  return { ok: true, state: s, events };
}

// What an action would do, without doing it: the events it would produce and the state after.
// ui.md "Damage preview" reads the Damaged / Healed events from this.
export const preview = apply;
