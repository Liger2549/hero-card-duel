// board.md "Movement", "Occupancy", "Step Cost", "Undo" and "Preparation Phase Steps".
import type { ActionOf } from "../actions.ts";
import { chebyshev, inBounds, inZone, samePos, type Pos } from "../board.ts";
import type { Seat } from "../config.ts";
import type { GameEvent } from "../events.ts";
import type { Content } from "../content.ts";
import { pctOf } from "../num.ts";
import { destroyedTowers, enemyHidden, findUnit, hiddenFrom, stepCostOf, unitAt, type GameState, type Unit } from "../state.ts";
import { stat } from "../stats.ts";
import { strike } from "./abilities.ts";
import { endStealth } from "./status.ts";

const Directions8: readonly Pos[] = [
  { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 }, { x: 1, y: -1 },
  { x: 0, y: -1 }, { x: -1, y: -1 }, { x: -1, y: 0 }, { x: -1, y: 1 },
];

export function validateStep(s: GameState, a: ActionOf<"Step">): string | null {
  if (s.phase !== "combat" || a.seat !== s.activeSeat) return "not your Turn";
  const u = findUnit(s, a.unitId);
  if (!u || u.owner !== a.seat) return "not your unit";
  if (!u.pos) return "unit is not on the board";
  if (!inBounds(s.config, a.to)) return "off the board";
  if (chebyshev(u.pos, a.to) !== 1) return "a step moves exactly 1 tile";
  const limited = s.config.stepLimit === "move";
  if (limited && u.remainingMove < 1) return "no Move left";
  // CC effects as in the prototype: Stun and Root stop movement.
  if (u.cc.stun !== undefined || u.cc.root !== undefined) return "cannot move (CC)";
  if (u.lockedOut) return "cannot move right now";

  let cost = stepCostOf(u);
  const other = unitAt(s, a.to);
  if (other) {
    // statuses.md "Stealth": a hidden enemy cannot be seen, so the step is allowed (and bumps into it).
    if (other.owner !== u.owner) return hiddenFrom(s, other, a.seat) ? (s.players[a.seat].mana < cost ? "not enough mana" : null) : "tile is taken by an enemy";
    if (other.lockedOut) return "ally cannot move right now";
    if (limited && other.remainingMove < 1) return "ally has no Move left to swap";
    if (other.cc.stun !== undefined || other.cc.root !== undefined) return "ally cannot move (CC)";
    cost += stepCostOf(other);
  }
  if (s.players[a.seat].mana < cost) return "not enough mana";
  return null;
}

export function applyStep(c: Content, s: GameState, a: ActionOf<"Step">, events: GameEvent[]): void {
  const u = findUnit(s, a.unitId)!;
  const from = u.pos!;
  const cost = stepCostOf(u);
  const usedFreeStep = u.getsFreeStep && !u.freeStepUsed;
  const usedSkillStep = !usedFreeStep && u.freeSteps > 0;
  const other = unitAt(s, a.to);
  const ally = other && other.owner === u.owner ? other : undefined;

  u.remainingMove -= 1;
  if (usedFreeStep) u.freeStepUsed = true;
  if (usedSkillStep) u.freeSteps -= 1;
  s.stepsThisTurn += 1;

  // statuses.md "Stealth": stepping onto a hidden enemy. Pushed back, Physical 130% of its ATK (no Break),
  // not an Action; its Stealth ends. The step is still paid for.
  if (other && other.owner !== u.owner) {
    s.players[a.seat].mana -= cost;
    events.push({ type: "BumpedIntoHidden", unitId: u.id, hiddenId: other.id, at: a.to });
    endStealth(other, events);
    strike(c, s, other, u, pctOf(stat(c, other, "atk"), 130), 0, 0, events);
    s.undoSteps = [];
    return;
  }
  u.pos = a.to;

  if (ally) {
    // A swap is a step for both units, and each pays its own cost.
    const allyCost = stepCostOf(ally);
    const allyUsedFreeStep = ally.getsFreeStep && !ally.freeStepUsed;
    const allyUsedSkillStep = !allyUsedFreeStep && ally.freeSteps > 0;
    ally.pos = from;
    ally.remainingMove -= 1;
    if (allyUsedFreeStep) ally.freeStepUsed = true;
    if (allyUsedSkillStep) ally.freeSteps -= 1;
    s.players[a.seat].mana -= cost + allyCost;
    s.undoSteps.push({
      unitId: u.id,
      from,
      cost,
      usedFreeStep,
      usedSkillStep,
      swappedWith: { unitId: ally.id, cost: allyCost, usedFreeStep: allyUsedFreeStep, usedSkillStep: allyUsedSkillStep },
    });
    events.push({ type: "UnitsSwapped", unitId: u.id, allyId: ally.id, from, to: a.to, cost: cost + allyCost });
  } else {
    s.players[a.seat].mana -= cost;
    s.undoSteps.push({ unitId: u.id, from, cost, usedFreeStep, usedSkillStep });
    events.push({ type: "UnitStepped", unitId: u.id, from, to: a.to, cost });
  }
  if (enemyHidden(s, a.seat)) s.undoSteps = []; // board.md "Undo"
}

// Can this seat take any step right now? (combat.md "Turn Flow": End Turn without a step.)
export function canStepAny(s: GameState, seat: Seat): boolean {
  return s.units.some(
    (u) =>
      u.owner === seat &&
      u.pos !== null &&
      Directions8.some((d) => {
        const to = { x: u.pos!.x + d.x, y: u.pos!.y + d.y };
        return validateStep(s, { type: "Step", seat, unitId: u.id, to }) === null;
      }),
  );
}

export function validateUndo(s: GameState, a: ActionOf<"Undo">): string | null {
  if (s.phase !== "combat" || a.seat !== s.activeSeat) return "not your Turn";
  if (enemyHidden(s, a.seat)) return "cannot undo while an enemy is hidden";
  return s.undoSteps.length === 0 ? "nothing to undo" : null;
}

// Newest step first; gives back Move, mana and the free step.
export function applyUndo(s: GameState, events: GameEvent[]): void {
  const step = s.undoSteps.pop()!;
  const u = findUnit(s, step.unitId)!;
  const to = u.pos!;
  let refund = step.cost;

  u.pos = step.from;
  u.remainingMove += 1;
  if (step.usedFreeStep) u.freeStepUsed = false;
  if (step.usedSkillStep) u.freeSteps += 1;
  s.stepsThisTurn -= 1;

  if (step.swappedWith) {
    const ally = findUnit(s, step.swappedWith.unitId)!;
    ally.pos = to;
    ally.remainingMove += 1;
    if (step.swappedWith.usedFreeStep) ally.freeStepUsed = false;
    if (step.swappedWith.usedSkillStep) ally.freeSteps += 1;
    refund += step.swappedWith.cost;
  }
  s.players[s.activeSeat].mana += refund;
  events.push({ type: "StepUndone", unitId: u.id, to: step.from, refund });
}

// From round 2: once per unit, free, anywhere in its own zone.
export function validatePrepMove(s: GameState, a: ActionOf<"PrepMove">): string | null {
  if (s.phase !== "prep") return "only in the Preparation Phase";
  if (s.round < 2) return "round 1 places heroes instead";
  if (s.ready[a.seat]) return "already Ready";
  const u = findUnit(s, a.unitId);
  if (!u || u.owner !== a.seat) return "not your unit";
  if (!u.pos) return "unit is not on the board";
  if (u.prepMoved) return "already moved this Preparation Phase";
  const destroyed = destroyedTowers(s, a.seat);
  if (!inZone(s.config, a.seat, u.pos, destroyed)) return "unit is outside its zone";
  if (!inZone(s.config, a.seat, a.to, destroyed)) return "target is outside the zone";
  if (samePos(u.pos, a.to)) return "already on that tile";
  const other = unitAt(s, a.to);
  if (other && (other.owner !== a.seat || other.prepMoved)) return "tile is taken";
  return null;
}

export function applyPrepMove(s: GameState, a: ActionOf<"PrepMove">, events: GameEvent[]): void {
  const u = findUnit(s, a.unitId)!;
  const from = u.pos!;
  const ally = unitAt(s, a.to);
  u.pos = a.to;
  u.prepMoved = true;
  events.push({ type: "UnitPrepMoved", unitId: u.id, from, to: a.to });
  // board.md "Preparation Phase Steps": a swap with an ally in the zone is that ally's Preparation move too.
  if (ally) {
    ally.pos = from;
    ally.prepMoved = true;
    events.push({ type: "UnitPrepMoved", unitId: ally.id, from: a.to, to: from });
  }
}

// A unit moved by a skill, not a step: no mana, no Remaining Move, no undo.
export function moveUnit(u: Unit, to: Pos, events: GameEvent[]): void {
  const from = u.pos!;
  u.pos = to;
  events.push({ type: "UnitMoved", unitId: u.id, from, to });
}
