// Which tiles and units an ability reaches: board.md "Skill Areas", "Range" and "Blocked Shots".
// Hit forms are written in the docs' notation (defs.ts "HitForm") and read here.
import { chebyshev, inBounds, manhattan, samePos, type Pos } from "../board.ts";
import type { HitForm, Range } from "../defs.ts";
import { unitAt, type BoardObject, type GameState, type Unit } from "../state.ts";

export type Dir = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";
export const Dirs: readonly Dir[] = ["N", "E", "S", "W"];
export const Dirs8: readonly Dir[] = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];

// How the player aimed: a direction and/or picked tiles.
// For an area around the caster, a tile alone also works: it chooses the direction whose area holds it.
export interface Aim {
  dir?: Dir;
  tiles?: Pos[];
}

export interface Target {
  unit: Unit;
  index: number; // which picked tile (0 = first)
  zone: string | null; // board.md "Zones"
  step: number; // board.md "Falloff": 1 = full damage
}

export interface Area {
  dir?: Dir; // the direction the area was turned to, if it turns
  tiles: Pos[];
  enemies: Target[]; // hit by damage and on-hit effects
  allies: Unit[]; // get heals, shields, buffs
  objects: { object: BoardObject; zone: string | null; step: number }[]; // enemy board objects hit
}

export interface AreaOptions {
  extendLane?: (end: Pos, step: Pos) => Pos[]; // interject.ts "UnitHooks.extendLane"
}

// One marked tile of a grid: offset from the anchor (+y forward), its mark, and its lane for Hit: First.
export interface Cell {
  x: number;
  y: number;
  mark: string;
  lane: number;
}

// One grid row as cells: separated by spaces, or one character each.
export function gridRow(row: string): string[] {
  return row.trim().includes(" ") ? row.trim().split(/\s+/) : [...row.trim()];
}

// Reads a grid.
export function parseGrid(rows: readonly string[]): { anchor: "C" | "P"; cells: Cell[] } {
  const table = rows.map(gridRow);
  let ax = -1;
  let ay = -1;
  let anchor: "C" | "P" = "C";
  table.forEach((row, y) =>
    row.forEach((m, x) => {
      if (m === "C" || m === "P") [ax, ay, anchor] = [x, y, m];
    }),
  );
  if (ax < 0) throw new Error(`hit form has no C or P: ${rows.join(" / ")}`);
  const cells: Cell[] = [];
  table.forEach((row, cy) =>
    row.forEach((mark, cx) => {
      if (mark !== "." && mark !== "C") cells.push({ x: cx - ax, y: ay - cy, mark, lane: cx });
    }),
  );
  return { anchor, cells };
}

// Clockwise quarter turns: N → E → S → W (and NW → NE → SE → SW for the diagonal grid).
const quarters: Record<Dir, number> = { N: 0, E: 1, S: 2, W: 3, NW: 0, NE: 1, SE: 2, SW: 3 };
function turn(x: number, y: number, n: number): [number, number] {
  for (let i = 0; i < n; i++) [x, y] = [y, -x];
  return [x, y];
}

// A diagonal direction with no diagonal grid stretches the north shape: forward goes along the diagonal,
// right along the next diagonal clockwise (so a line of 2 becomes a diagonal line of 2).
const stretch: Partial<Record<Dir, { f: [number, number]; r: [number, number] }>> = {
  NE: { f: [1, 1], r: [1, -1] },
  SE: { f: [1, -1], r: [-1, -1] },
  SW: { f: [-1, -1], r: [-1, 1] },
  NW: { f: [-1, 1], r: [1, 1] },
};

// The form's cells turned to face `dir` (Fixed forms ignore it). `step` stays measured in the drawing.
function cellsFacing(form: HitForm, dir: Dir | undefined): (Cell & { step: number })[] {
  if (!form.grid) return [{ x: 0, y: 0, mark: "P", lane: 0, step: 1 }];
  const d = form.rotate === 0 || !dir ? "N" : dir;
  const diagonal = stretch[d] !== undefined;
  const grid = diagonal && form.diagonal ? form.diagonal : form.grid;
  return parseGrid(grid).cells.map((c) => {
    const step = Math.max(Math.abs(c.x), Math.abs(c.y), 1);
    if (diagonal && !form.diagonal) {
      const { f, r } = stretch[d]!;
      return { ...c, x: c.x * r[0] + c.y * f[0], y: c.x * r[1] + c.y * f[1], step };
    }
    const [x, y] = turn(c.x, c.y, quarters[d]);
    return { ...c, x, y, step };
  });
}

export function allowedDirs(form: HitForm): readonly Dir[] {
  return form.rotate === 8 ? Dirs8 : form.rotate === 4 ? Dirs : [];
}

export function inRange(r: Range, from: Pos, p: Pos): boolean {
  if ("manhattan" in r) return manhattan(from, p) >= 1 && manhattan(from, p) <= r.manhattan;
  if ("square" in r) return chebyshev(from, p) >= 1 && chebyshev(from, p) <= r.square;
  return chebyshev(from, p) === r.ring;
}

// The farthest a form reaches from the caster (used for towers).
export function reach(form: HitForm): number {
  if (form.range) return "manhattan" in form.range ? form.range.manhattan : "square" in form.range ? form.range.square : form.range.ring;
  return Math.max(0, ...cellsFacing(form, undefined).map((c) => c.step));
}

// board.md "Blocked Shots": a ring 2 tile is blocked by any unit on the ring 1 tile on the way
// (either of the two for a knight-move tile). Ring 1 is never blocked.
export function shotBlocked(s: GameState, from: Pos, p: Pos): boolean {
  const dx = p.x - from.x;
  const dy = p.y - from.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) !== 2) return false;
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const ways: [number, number][] =
    Math.abs(dx) === 1 ? [[0, sy], [sx, sy]] : Math.abs(dy) === 1 ? [[sx, 0], [sx, sy]] : [[sx, sy]];
  return ways.some(([x, y]) => unitAt(s, { x: from.x + x, y: from.y + y }) !== undefined);
}

// Every aim worth trying (used to list legal actions). With towers, also the towers' off-board rows.
export function candidateAims(s: GameState, user: Unit, form: HitForm, towers = false): Aim[] {
  const dirs: (Dir | undefined)[] = allowedDirs(form).length ? [...allowedDirs(form)] : [undefined];
  const withDir = (aim: Aim, dir: Dir | undefined): Aim => (dir ? { ...aim, dir } : aim);
  if (!form.range) {
    const aims = dirs.map((dir) => withDir({}, dir));
    if (!towers) return aims;
    const p = user.pos;
    return p ? [...aims, ...[-1, s.config.boardHeight].map((y) => ({ tiles: [{ x: p.x, y }] }))] : aims;
  }
  const aims: Aim[] = [];
  const from = user.pos;
  if (!from) return aims;
  for (let y = towers ? -1 : 0; y < s.config.boardHeight + (towers ? 1 : 0); y++) {
    for (let x = 0; x < s.config.boardWidth; x++) {
      const onBoard = y >= 0 && y < s.config.boardHeight;
      const own = form.pickSelf && x === from.x && y === from.y;
      if (onBoard && !own && !inRange(form.range, from, { x, y })) continue;
      const tiles = Array.from({ length: form.picks ?? 1 }, () => ({ x, y }));
      for (const dir of dirs) aims.push(withDir({ tiles }, dir));
    }
  }
  return aims;
}

// The area for this aim, or why the aim is not allowed.
export function resolveArea(s: GameState, user: Unit, form: HitForm, aim: Aim, opts: AreaOptions = {}): Area | string {
  const at = user.pos!;
  const dirs = allowedDirs(form);
  let dir = form.rotate === 0 ? undefined : aim.dir;
  if (dir && !dirs.includes(dir)) return "choose a direction";
  const area: Area = { tiles: [], enemies: [], allies: [], objects: [] };

  // The whole board.
  if (form.board) {
    const cells: (Cell & { step: number })[] = [];
    for (let y = 0; y < s.config.boardHeight; y++) for (let x = 0; x < s.config.boardWidth; x++) cells.push({ x: x - at.x, y: y - at.y, mark: "X", lane: 0, step: 1 });
    collect(s, user, { ...form, grid: ["C"] }, at, cells, 0, area, opts);
    if (form.hit === "allies" || form.hit === "both") if (!area.allies.includes(user)) area.allies.push(user);
    return area;
  }

  if (form.range) {
    const n = form.picks ?? 1;
    const picks = aim.tiles ?? [];
    if (picks.length !== n) return n > 1 ? `choose ${n} tiles` : "choose a tile";
    if (dirs.length && !dir) return "choose a direction";
    for (const p of picks) {
      if (!inBounds(s.config, p)) return "choose a tile";
      if (!(form.pickSelf && samePos(p, at)) && !inRange(form.range, at, p)) return "out of range";
      if (form.blocked && shotBlocked(s, at, p)) return "a unit is in the way";
      // Lock-on cannot pick an enemy in Stealth (statuses.md), or a tile that only holds an enemy object (e.g. a Scanner).
      const there = unitAt(s, p);
      if (there && there.stealth && there.owner !== user.owner) return "cannot target a unit in Stealth";
      if (!there && s.objects.some((o) => o.hp !== null && o.owner !== user.owner && samePos(o.pos, p))) return "cannot target that";
      // An object with vars.shroud (e.g. a smoke screen) keeps its team's units on that tile from enemy Lock-on.
      if (there && there.owner !== user.owner && s.objects.some((o) => o.vars.shroud === 1 && o.owner === there.owner && samePos(o.pos, p))) return "that unit is hidden in smoke";
    }
    picks.forEach((p, index) => collect(s, user, form, p, cellsFacing(form, dir), index, area, opts));
  } else {
    if (dirs.length && !dir) {
      const p = aim.tiles?.[0];
      if (!p) return "choose a direction";
      dir = dirs.find((d) => cellsFacing(form, d).some((c) => at.x + c.x === p.x && at.y + c.y === p.y));
      if (!dir) return "out of range";
    }
    collect(s, user, form, at, cellsFacing(form, dir), 0, area, opts);
  }

  if (form.self && (form.hit === "allies" || form.hit === "both") && !area.allies.includes(user)) area.allies.push(user);
  if (dir) area.dir = dir;
  return area;
}

// Adds the tiles and units one placed copy of the form reaches.
function collect(s: GameState, user: Unit, form: HitForm, origin: Pos, cells: (Cell & { step: number })[], index: number, area: Area, opts: AreaOptions): void {
  const isEnemy = (u: Unit | undefined): u is Unit => !!u && !u.dead && u.owner !== user.owner;
  const isAlly = (u: Unit | undefined): u is Unit => !!u && !u.dead && u.owner === user.owner;
  const zoneOf = (mark: string) => (/^[a-z]$/.test(mark) ? mark : null);

  if (form.hit === "first") {
    // board.md "Hit Types": each lane is a projectile that passes allies and stops at the first enemy.
    const lanes = new Map<number, (Cell & { step: number })[]>();
    for (const c of cells) if (/^\d+$/.test(c.mark)) lanes.set(c.lane, [...(lanes.get(c.lane) ?? []), c]);
    for (const lane of lanes.values()) {
      const path = lane.sort((a, b) => Number(a.mark) - Number(b.mark)).map((c) => ({ x: origin.x + c.x, y: origin.y + c.y }));
      // A hook may carry the lane on past its last tile (e.g. Falka's Scan Field).
      if (opts.extendLane && path.length) {
        const end = path[path.length - 1]!;
        const before = path[path.length - 2] ?? origin;
        path.push(...opts.extendLane(end, { x: Math.sign(end.x - before.x), y: Math.sign(end.y - before.y) }));
      }
      for (const [i, p] of path.entries()) {
        if (!inBounds(s.config, p)) break;
        area.tiles.push(p);
        const u = unitAt(s, p);
        if (isEnemy(u)) {
          area.enemies.push({ unit: u, index, zone: null, step: i + 1 });
          break;
        }
      }
    }
    return;
  }

  for (const c of cells) {
    const p = { x: origin.x + c.x, y: origin.y + c.y };
    if (!inBounds(s.config, p)) continue; // board.md "General": tiles outside the board are ignored
    area.tiles.push(p);
    const u = unitAt(s, p);
    if ((form.hit === "all" || form.hit === "both") && isEnemy(u)) area.enemies.push({ unit: u, index, zone: zoneOf(c.mark), step: c.step });
    if ((form.hit === "allies" || form.hit === "both") && isAlly(u) && !area.allies.includes(u)) area.allies.push(u);
    // Enemy board objects that can be hit take the same damage as a unit on that tile (e.g. Falka's Scanner).
    if (form.hit === "all" || form.hit === "both") {
      for (const o of s.objects) if (o.hp !== null && o.owner !== user.owner && samePos(o.pos, p)) area.objects.push({ object: o, zone: zoneOf(c.mark), step: c.step });
    }
  }
}
