// Which tiles and units an ability reaches (defs.ts "Targeting", board.md "Skill Areas" and "Range").
import { chebyshev, inBounds, manhattan, type Pos } from "../board.ts";
import type { Offset, Targeting } from "../defs.ts";
import { unitAt, type GameState, type Unit } from "../state.ts";

export type Dir = "N" | "E" | "S" | "W";
export const Dirs: readonly Dir[] = ["N", "E", "S", "W"];

// How the player aimed: a direction, or chosen tiles (one for most abilities, several for "tiles").
export interface Aim {
  dir?: Dir;
  tiles?: Pos[];
}

export interface Target {
  unit: Unit;
  index: number; // place in the area (0 = first tile / first sword)
}

export interface Area {
  tiles: Pos[];
  enemies: Target[]; // hit by damage and on-hit effects
  allies: Unit[]; // get heals, shields, buffs
}

// Shapes are drawn facing north (+y forward); turn them to face `dir`.
function rotate([x, y]: Offset, dir: Dir): Pos {
  switch (dir) {
    case "N":
      return { x, y };
    case "E":
      return { x: y, y: -x };
    case "S":
      return { x: -x, y: -y };
    case "W":
      return { x: -y, y: x };
  }
}

const forward = (dir: Dir) => rotate([0, 1], dir);

// Every aim worth trying for this targeting (used to list legal actions).
export function candidateAims(s: GameState, t: Targeting): Aim[] {
  switch (t.type) {
    case "shape":
    case "line":
    case "dash":
      return Dirs.map((dir) => ({ dir }));
    case "around":
    case "team":
    case "board":
      return [{}];
    case "tiles":
    case "adjacent":
    case "tile":
    case "enemy":
    case "ally":
    case "summon": {
      const aims: Aim[] = [];
      const count = t.type === "tiles" ? t.count : 1;
      // Normal attacks can also aim at the towers' off-board rows (rules.md "Tower").
      const towerRows = t.type === "adjacent" || t.type === "enemy";
      for (let y = towerRows ? -1 : 0; y < s.config.boardHeight + (towerRows ? 1 : 0); y++) {
        for (let x = 0; x < s.config.boardWidth; x++) aims.push({ tiles: Array.from({ length: count }, () => ({ x, y })) });
      }
      return aims;
    }
  }
}

// The area for this aim, or why the aim is not allowed.
export function resolveArea(s: GameState, user: Unit, t: Targeting, aim: Aim): Area | string {
  const at = user.pos!;
  const isEnemy = (u: Unit | undefined): u is Unit => !!u && !u.dead && u.owner !== user.owner;
  const isAlly = (u: Unit | undefined): u is Unit => !!u && !u.dead && u.owner === user.owner;
  const onBoard = (offsets: readonly Offset[], dir: Dir | null, from: Pos) =>
    offsets
      .map((o) => (dir ? rotate(o, dir) : { x: o[0], y: o[1] }))
      .map((o) => ({ x: from.x + o.x, y: from.y + o.y }))
      .filter((p) => inBounds(s.config, p));
  const hitTiles = (tiles: Pos[]): Area => ({
    tiles,
    enemies: tiles.flatMap((p, index) => {
      const u = unitAt(s, p);
      return isEnemy(u) ? [{ unit: u, index }] : [];
    }),
    allies: [],
  });
  const oneTile = (): Pos | string => {
    const p = aim.tiles?.[0];
    if (!p || !inBounds(s.config, p)) return "choose a tile";
    return p;
  };

  switch (t.type) {
    case "adjacent": {
      // One enemy on one of the 8 tiles around (prototype adj8: needs a target).
      const p = oneTile();
      if (typeof p === "string") return p;
      if (chebyshev(at, p) !== 1) return "out of range";
      return isEnemy(unitAt(s, p)) ? hitTiles([p]) : "choose an enemy";
    }
    case "shape":
      if (!aim.dir) return "choose a direction";
      return hitTiles(onBoard(t.shape, aim.dir, at));
    case "around":
      return hitTiles(onBoard(t.shape, null, at));
    case "line": {
      if (!aim.dir) return "choose a direction";
      const f = forward(aim.dir);
      const tiles: Pos[] = [];
      for (let i = 1; i <= t.length; i++) {
        const p = { x: at.x + f.x * i, y: at.y + f.y * i };
        if (!inBounds(s.config, p)) break;
        tiles.push(p);
      }
      if (t.pierce) return hitTiles(tiles);
      // board.md "Hit Types" First: passes through allies, hits only the first enemy.
      const first = tiles.findIndex((p) => isEnemy(unitAt(s, p)));
      return { tiles, enemies: first < 0 ? [] : [{ unit: unitAt(s, tiles[first]!)!, index: first }], allies: [] };
    }
    case "tile": {
      const p = oneTile();
      if (typeof p === "string") return p;
      const d = manhattan(at, p);
      return d >= 1 && d <= t.range ? hitTiles(onBoard(t.shape, null, p)) : "out of range";
    }
    case "tiles": {
      // Each tile is its own strike; the same tile may be chosen again (Valen's Sword of Justice).
      const tiles = aim.tiles ?? [];
      if (tiles.length !== t.count) return `choose ${t.count} tiles`;
      for (const p of tiles) {
        const d = manhattan(at, p);
        if (!inBounds(s.config, p) || d < 1 || d > t.range) return "out of range";
      }
      return hitTiles(tiles);
    }
    case "enemy": {
      const p = oneTile();
      if (typeof p === "string") return p;
      const u = unitAt(s, p);
      if (!isEnemy(u)) return "choose an enemy";
      if (t.blink) return "not available yet";
      return manhattan(at, p) <= t.range ? { tiles: [p], enemies: [{ unit: u, index: 0 }], allies: [] } : "out of range";
    }
    case "ally": {
      const p = oneTile();
      if (typeof p === "string") return p;
      const u = unitAt(s, p);
      if (!isAlly(u)) return "choose an ally";
      return manhattan(at, p) <= t.range ? { tiles: [p], enemies: [], allies: [u] } : "out of range";
    }
    case "team": {
      const allies = s.units.filter((u) => isAlly(u) && u.pos !== null);
      return { tiles: allies.map((u) => u.pos!), enemies: [], allies };
    }
    case "dash":
    case "summon":
    case "board":
      return "not available yet";
  }
}
