// Plays one action's events in steps, STEP_MS apart, so the end of a Turn can be followed: the action itself
// first, then each interject as it resolves, then the DOT ticks (combat.md "Interject"). The board shows the
// state before the action with the played steps' HP, moves, deaths, summons, towers and objects patched in.
import type { GameEvent, GameState, Pending } from "@hcd/engine";

export const STEP_MS = 2000;

export function splitSteps(events: GameEvent[]): GameEvent[][] {
  const steps: GameEvent[][] = [[]];
  let inDot = false;
  for (const e of events) {
    const interject = e.type === "InterjectResolved" || e.type === "InterjectFizzled";
    if ((interject || (e.type === "DotTick" && !inDot)) && steps[steps.length - 1]!.length) steps.push([]);
    if (interject) inDot = false;
    if (e.type === "DotTick") inDot = true;
    steps[steps.length - 1]!.push(e);
  }
  return steps;
}

// combat.md "Resolution Order": this Turn's interjects first, then by Action Value, then the order they were cast in.
export const actionOrder = (pending: readonly Pending[]) =>
  [...pending].sort((a, b) => a.turnsLeft - b.turnsLeft || a.actionValue - b.actionValue || a.id - b.id);

export function stateAt(base: GameState, final: GameState, played: GameEvent[]): GameState {
  const units = base.units.map((u) => ({ ...u }));
  const find = (id: string) => units.find((u) => u.id === id);
  const towers = { A: base.towers.A.map((t) => ({ ...t })), B: base.towers.B.map((t) => ({ ...t })) };
  let objects = [...base.objects];
  for (const e of played) {
    switch (e.type) {
      case "Damaged":
      case "Healed": {
        const u = find(e.unitId);
        if (u) u.hp = e.hp;
        break;
      }
      case "UnitStepped":
      case "UnitMoved":
      case "UnitPushed":
      case "UnitPrepMoved":
      case "StepUndone": {
        const u = find(e.unitId);
        if (u) u.pos = e.to;
        break;
      }
      case "UnitsSwapped": {
        const [u, ally] = [find(e.unitId), find(e.allyId)];
        if (u) u.pos = e.to;
        if (ally) ally.pos = e.from;
        break;
      }
      case "UnitDied": {
        const u = find(e.unitId);
        if (u) Object.assign(u, { dead: true, pos: null });
        break;
      }
      case "UnitSummoned": {
        // A new unit, or the same one in a new form (Ribu becoming Pley).
        const f = final.units.find((u) => u.id === e.unitId);
        if (!f) break;
        const i = units.findIndex((u) => u.id === e.unitId);
        if (i >= 0) units[i] = { ...f, pos: e.to };
        else units.push({ ...f, pos: e.to });
        break;
      }
      case "TowerDamaged":
        towers[e.seat][e.index]!.hp = e.hp;
        break;
      case "TowerDestroyed":
        towers[e.seat][e.index]!.destroyed = true;
        break;
      case "ObjectPlaced": {
        const o = final.objects.find((x) => x.id === e.id);
        if (o) objects.push(o);
        break;
      }
      case "ObjectRemoved":
        objects = objects.filter((o) => o.id !== e.id);
        break;
    }
  }
  return { ...base, units, towers, objects };
}
