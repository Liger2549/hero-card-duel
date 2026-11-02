// rules.md "Tower" (attack rules from the prototype) and "Tower HP" (stages, regen, Shield by Hits).
import { towerOfColumn, type Pos } from "../board.ts";
import { towerStage, type MatchConfig, type Seat } from "../config.ts";
import type { AbilityDef } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { Seats, unitAt, type GameState, type Tower, type Unit } from "../state.ts";

// Each team's towers sit on the row just off its own edge: A below row 0, B above the top row.
export function towerRow(c: MatchConfig, seat: Seat): number {
  return seat === "A" ? -1 : c.boardHeight;
}

// The tower whose off-board tile this is, if any.
export function towerAt(s: GameState, p: Pos): { seat: Seat; index: number } | null {
  if (p.x < 0 || p.x >= s.config.boardWidth) return null;
  const seat = Seats.find((st) => towerRow(s.config, st) === p.y);
  return seat ? { seat, index: towerOfColumn(s.config, p.x) } : null;
}

export function newTowers(c: MatchConfig): Tower[] {
  const st = towerStage(c, 1);
  return Array.from({ length: c.towersPerTeam }, () => ({
    hp: st.maxHp,
    maxHp: st.maxHp,
    shieldByHits: st.shieldByHits,
    destroyed: false,
  }));
}

// Start of every round after the first: regen, then the stage's Max HP, then its Shield by Hits.
export function updateTowersForRound(s: GameState): void {
  const st = towerStage(s.config, s.round);
  for (const seat of Seats) {
    for (const t of s.towers[seat]) {
      if (t.destroyed) continue;
      if (t.hp < t.maxHp) t.hp = Math.min(t.hp + s.config.towerRegenPerRound, t.maxHp);
      t.maxHp = st.maxHp;
      if (st.maxDrop.type === "clamp") t.hp = Math.min(t.hp, t.maxHp);
      t.shieldByHits = st.shieldByHits; // set, replacing last round's
    }
  }
}

// combat.md "Max Value Changes" Decay N: lose N at the end of every Turn until back at the max.
export function decayTowers(s: GameState): void {
  const drop = towerStage(s.config, s.round).maxDrop;
  if (drop.type !== "decay") return;
  for (const seat of Seats) {
    for (const t of s.towers[seat]) if (!t.destroyed && t.hp > t.maxHp) t.hp = Math.max(t.hp - drop.amount, t.maxHp);
  }
}

// How far a normal attack reaches toward a tower.
function reach(ab: AbilityDef): number | null {
  if (ab.targeting.type === "adjacent") return 1;
  if (ab.targeting.type === "enemy") return ab.targeting.range;
  return null;
}

export function validateTowerAttack(s: GameState, u: Unit, ab: AbilityDef, p: Pos): string | null {
  const t = towerAt(s, p)!;
  if (t.seat === u.owner) return "that is your own tower";
  if (s.towers[t.seat][t.index]!.destroyed) return "that tower is destroyed";
  const r = reach(ab);
  if (r === null) return "this attack cannot hit towers";
  const at = u.pos!;
  if (towerOfColumn(s.config, at.x) !== t.index) return "stand in the tower's columns to attack it";
  const row = towerRow(s.config, t.seat);
  if (Math.abs(at.y - row) > r) return "out of range";
  for (let y = Math.min(at.y, row) + 1; y < Math.max(at.y, row); y++) {
    const blocker = unitAt(s, { x: at.x, y });
    if (blocker && blocker.owner === t.seat && !blocker.dead) return "a defender is in the way";
  }
  return null;
}

// Shield by Hits blocks the whole hit and uses 1. Otherwise the tower loses the damage (at least 1),
// or exactly 1 with HP by Hits.
export function hitTower(s: GameState, p: Pos, damage: number, events: GameEvent[]): void {
  const { seat, index } = towerAt(s, p)!;
  const t = s.towers[seat][index]!;
  if (t.shieldByHits > 0) {
    t.shieldByHits -= 1;
    events.push({ type: "TowerShieldBlocked", seat, index, left: t.shieldByHits });
    return;
  }
  const amount = s.config.towerHpType === "byHits" ? 1 : Math.max(damage, 1);
  t.hp = Math.max(t.hp - amount, 0);
  events.push({ type: "TowerDamaged", seat, index, amount, hp: t.hp });
  if (t.hp === 0) {
    t.destroyed = true;
    events.push({ type: "TowerDestroyed", seat, index });
  }
}
