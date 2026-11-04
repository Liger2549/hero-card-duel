// A simple AI player: picks sturdy heroes, places them up front, attacks whatever it can hit,
// otherwise walks toward the nearest enemy. Deterministic (no randomness), so its games replay exactly.
import { apply, type Action } from "./actions.ts";
import { chebyshev, inZone, type Pos } from "./board.ts";
import { TimesOfDay, type Seat } from "./config.ts";
import { abilityOf, abilityRefs, draftable, type Content } from "./content.ts";
import { candidateAims } from "./rules/targeting.ts";
import { towerRow } from "./rules/towers.ts";
import { destroyedTowers, otherSeat, unitAt, type GameState, type Unit } from "./state.ts";

const STEPS_PER_TURN = 4; // keep mana for attacks

// The next action for `seat`, or null if it is not that seat's move.
export function botAction(s: GameState, c: Content, seat: Seat): Action | null {
  // An interject waiting for this seat's choice: take the time-out pick.
  if (s.choice) return s.choice.seat === seat ? { type: "Choose", seat, tile: s.choice.fallback } : null;
  if (s.phase === "draft") return draftAction(s, c, seat);
  if (s.phase === "prep") return prepAction(s, seat);
  if (s.phase === "combat" && s.activeSeat === seat) return combatAction(s, c, seat);
  return null;
}

function draftAction(s: GameState, c: Content, seat: Seat): Action | null {
  const d = s.draft!;
  if (d.stage === "timeOfDay") return seat === "A" ? { type: "ChooseTimeOfDay", seat, time: TimesOfDay[0] } : null;
  const due = d.stage === "ban" ? s.config.banOrder[d.banIndex] : s.config.pickOrder[d.pickIndex];
  if (due !== seat) return null;
  const taken = new Set([...d.bans.A, ...d.bans.B, ...d.picks.A, ...d.picks.B]);
  // Strongest-looking heroes first: HP + 3 × ATK.
  const ranked = draftable(c).filter((h) => !taken.has(h.id)).sort((a, b) => b.stats.maxHp + 3 * b.stats.atk - (a.stats.maxHp + 3 * a.stats.atk));
  const heroId = ranked[0]!.id;
  return d.stage === "ban" ? { type: "Ban", seat, heroId } : { type: "Pick", seat, heroId };
}

// Place heroes on the front row of the zone, middle first; then Ready.
function prepAction(s: GameState, seat: Seat): Action | null {
  if (s.ready[seat]) return null;
  const unplaced = s.units.find((u) => u.owner === seat && u.kind === "hero" && !u.dead && !u.pos);
  if (unplaced) {
    const front = seat === "A" ? s.config.zoneDepth - 1 : s.config.boardHeight - s.config.zoneDepth;
    const mid = (s.config.boardWidth - 1) / 2;
    const tiles: Pos[] = [];
    for (let y = 0; y < s.config.boardHeight; y++) for (let x = 0; x < s.config.boardWidth; x++) tiles.push({ x, y });
    const free = tiles
      .filter((p) => inZone(s.config, seat, p, destroyedTowers(s, seat)) && !unitAt(s, p))
      .sort((p, q) => Math.abs(p.y - front) - Math.abs(q.y - front) || Math.abs(p.x - mid) - Math.abs(q.x - mid));
    if (free[0]) return { type: "PlaceHero", seat, unitId: unplaced.id, to: free[0] };
  }
  return { type: "Ready", seat };
}

function combatAction(s: GameState, c: Content, seat: Seat): Action {
  // 1. Anything that deals damage (ultimate first, then skills, then the normal attack).
  for (const u of mine(s, seat)) {
    for (const ability of abilityRefs(c, u.defId).reverse()) {
      const ab = abilityOf(c, u.defId, ability)!;
      for (const aim of candidateAims(s, u, ab.form, ability === "normal")) {
        const a: Action = { type: "UseAbility", seat, unitId: u.id, ability, aim };
        const r = apply(s, a, c);
        if (r.ok && r.events.some((e) => (e.type === "Damaged" && e.sourceId === u.id) || e.type.startsWith("Tower"))) return a;
      }
    }
  }
  // 2. Walk toward the nearest enemy unit or enemy tower.
  if (s.stepsThisTurn < STEPS_PER_TURN) {
    let best: { a: Action; gain: number } | null = null;
    for (const u of mine(s, seat)) {
      const before = distanceToEnemy(s, u.pos!, seat);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const to = { x: u.pos!.x + dx, y: u.pos!.y + dy };
          const a: Action = { type: "Step", seat, unitId: u.id, to };
          if ((dx || dy) && !unitAt(s, to) && apply(s, a, c).ok) {
            const gain = before - distanceToEnemy(s, to, seat);
            if (gain > 0 && (!best || gain > best.gain)) best = { a, gain };
          }
        }
      }
    }
    if (best) return best.a;
  }
  // 3. Short on mana: play a card that gives mana.
  const hand = s.players[seat].hand;
  for (let card = 0; card < hand.length; card++) {
    const a: Action = { type: "PlayCard", seat, card, aim: {} };
    if (s.players[seat].mana < 3 && c.cards.find((x) => x.id === hand[card])?.manaGain && apply(s, a, c).ok) return a;
  }
  // 4. Done: end the Turn after moving, or the Round if this Turn did nothing.
  if (s.stepsThisTurn > 0 && apply(s, { type: "EndTurn", seat }, c).ok) return { type: "EndTurn", seat };
  return { type: "EndRound", seat };
}

const mine = (s: GameState, seat: Seat): Unit[] => s.units.filter((u) => u.owner === seat && !u.dead && u.pos);

function distanceToEnemy(s: GameState, p: Pos, seat: Seat): number {
  const enemy = otherSeat(seat);
  let best = Infinity;
  for (const u of s.units) if (u.owner === enemy && !u.dead && u.pos) best = Math.min(best, chebyshev(p, u.pos));
  const row = towerRow(s.config, enemy);
  s.towers[enemy].forEach((t, i) => {
    if (t.destroyed) return;
    const cols = s.config.boardWidth / s.config.towersPerTeam;
    for (let x = i * cols; x < (i + 1) * cols; x++) best = Math.min(best, chebyshev(p, { x, y: row }));
  });
  return best;
}
