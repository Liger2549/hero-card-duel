// Things that count down: CC (combat.md "Crowd Control"), buffs and shields ("Durations"),
// DOT ("Damage over Time"), and the win check (rules.md "Win Conditions").
import type { Seat } from "../config.ts";
import { unitDef, type Content } from "../content.ts";
import type { CcKind } from "../defs.ts";
import type { GameEvent } from "../events.ts";
import { findUnit, Seats, type GameState } from "../state.ts";
import { stat } from "../stats.ts";
import { loseHp } from "./damage.ts";

export function endOfTurn(c: Content, s: GameState, events: GameEvent[]): void {
  for (const u of s.units) {
    if (u.dead) continue;

    // Remaining Recovery − Speed; the CC ends when it drops below Speed.
    const speed = stat(c, u, "speed");
    for (const kind of Object.keys(u.cc) as CcKind[]) {
      const left = u.cc[kind]! - speed;
      if (left >= speed) {
        u.cc[kind] = left;
        continue;
      }
      delete u.cc[kind];
      events.push({ type: "StatusEnded", unitId: u.id, status: kind });
      if (kind === "stun" && u.broken) {
        u.broken = false;
        u.breakBar = unitDef(c, u.defId).stats.breakBar;
        events.push({ type: "BreakRestored", unitId: u.id });
      }
    }

    // The Turn an effect was applied in is not counted. -1 = permanent.
    for (const b of u.buffs) if (b.appliedTurn < s.turn) b.turnsLeft -= 1;
    for (const b of u.buffs.filter((x) => x.turnsLeft === 0)) {
      events.push({ type: "StatusEnded", unitId: u.id, status: `${b.stat} +${b.amount}` });
    }
    u.buffs = u.buffs.filter((b) => b.turnsLeft !== 0);
    for (const sh of u.shields) if (sh.turnsLeft > 0 && sh.appliedTurn < s.turn) sh.turnsLeft -= 1;
    u.shields = u.shields.filter((sh) => sh.turnsLeft !== 0);
  }
}

// Tick = max(Physical + Boost + Magic + Boost − DEF − Fortitude, 1). Boost only on types the DOT has.
export function endOfRoundDots(c: Content, s: GameState, events: GameEvent[]): void {
  for (const u of s.units) {
    if (u.dead) continue;
    for (const d of [...u.dots]) {
      if (u.dead) break;
      const raw = (d.physical > 0 ? d.physical + d.boost : 0) + (d.magic > 0 ? d.magic + d.boost : 0);
      const damage = Math.max(raw - stat(c, u, "def") - stat(c, u, "fortitude"), 1);
      events.push({ type: "DotTick", unitId: u.id, dot: d.id, damage });
      loseHp(c, s, u, damage, findUnit(s, d.sourceId) ?? null, events);
      d.roundsLeft -= 1;
    }
    for (const d of u.dots.filter((x) => x.roundsLeft <= 0)) events.push({ type: "StatusEnded", unitId: u.id, status: d.id });
    u.dots = u.dots.filter((d) => d.roundsLeft > 0);
  }
}

// A team with no living hero, or with towersToWin of its towers destroyed, loses.
// No draw: if both lose at once, the active player wins (ideas.md).
export function checkWin(s: GameState, events: GameEvent[]): boolean {
  if (s.phase === "over") return true;
  const lost = (seat: Seat) =>
    !s.units.some((u) => u.kind === "hero" && u.owner === seat && !u.dead) ||
    s.towers[seat].filter((t) => t.destroyed).length >= s.config.towersToWin;
  const losers = Seats.filter(lost);
  if (losers.length === 0) return false;
  const winner = losers.length === 2 ? s.activeSeat : losers[0] === "A" ? "B" : "A";
  s.phase = "over";
  s.winner = winner;
  events.push({ type: "GameOver", winner });
  return true;
}
