import type { MatchConfig, Seat } from "./config.ts";

// board.md "Coordinates": (0, 0) is bottom-left, x grows east, y grows north.
export interface Pos {
  readonly x: number;
  readonly y: number;
}

export function samePos(a: Pos, b: Pos): boolean {
  return a.x === b.x && a.y === b.y;
}

export function inBounds(c: MatchConfig, p: Pos): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < c.boardWidth && p.y < c.boardHeight;
}

// board.md "Range": attack and skill range.
export function manhattan(a: Pos, b: Pos): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

// Steps and "adjacent (8 directions)".
export function chebyshev(a: Pos, b: Pos): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

// rules.md "Standard 1v1 Mode": A owns the bottom rows, B the top rows.
export function inZoneRows(c: MatchConfig, seat: Seat, p: Pos): boolean {
  return seat === "A" ? p.y < c.zoneDepth : p.y >= c.boardHeight - c.zoneDepth;
}

// Which of a team's towers covers column x.
export function towerOfColumn(c: MatchConfig, x: number): number {
  return Math.floor(x / (c.boardWidth / c.towersPerTeam));
}

// rules.md "Destroyed tower": the zone in front of a destroyed tower disappears.
export function inZone(c: MatchConfig, seat: Seat, p: Pos, towersDestroyed: readonly boolean[]): boolean {
  return inBounds(c, p) && inZoneRows(c, seat, p) && !towersDestroyed[towerOfColumn(c, p.x)];
}
