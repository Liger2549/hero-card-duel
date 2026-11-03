import { describe, expect, it } from "vitest";
import { apply, type Action } from "../src/actions.ts";
import type { Content } from "../src/content.ts";
import type { AbilityDef, HeroDef, HitForm, Range } from "../src/defs.ts";
import { parseGrid, resolveArea, shotBlocked, type Area, type Aim } from "../src/rules/targeting.ts";
import { createUnit, type GameState, type Unit } from "../src/state.ts";
import { fixtures } from "./fixtures.ts";
import { get, state } from "./helpers.ts";

// A test hero whose skills are the hit forms under test. Magic only, against units with no Magic Armor or DEF.
const skill = (form: HitForm, extra: Partial<AbilityDef> = {}): AbilityDef => ({ name: "t", mana: 0, text: "", form, magic: 6, ...extra });
const tester = (skills: AbilityDef[]): HeroDef => ({ ...fixtures.heroes[0]!, id: "tester", skills });
const content = (skills: AbilityDef[]): Content => ({ ...fixtures, heroes: [...fixtures.heroes, tester(skills)] });
const at = (c: Content, id: string, defId: string, owner: "A" | "B", x: number, y: number): Unit => ({ ...createUnit(c, defId, owner, id), pos: { x, y } });
const dummy = (c: Content, id: string, x: number, y: number) => at(c, id, "archer", "B", x, y); // archer: DEF 1, so Magic 6 deals 5

const area = (s: GameState, form: HitForm, aim: Aim, user = "u"): Area => {
  const r = resolveArea(s, get(s, user), form, aim);
  if (typeof r === "string") throw new Error(r);
  return r;
};
const tiles = (a: Area) => a.tiles.map((p) => `${p.x},${p.y}`).sort();

describe("reading a grid (board.md Notation)", () => {
  it("offsets are from C or P, +y forward; spaces or single characters both work", () => {
    expect(parseGrid(["X X X", ". C ."]).cells.map((c) => [c.x, c.y])).toEqual([[-1, 1], [0, 1], [1, 1]]);
    expect(parseGrid(["b", "a", "C"]).cells.map((c) => [c.x, c.y, c.mark])).toEqual([[0, 2, "b"], [0, 1, "a"]]);
    expect(parseGrid(["X P X"]).anchor).toBe("P");
    expect(() => parseGrid(["X X"])).toThrow();
  });
});

describe("direction (board.md Direction)", () => {
  const c = content([]);
  const s = state([at(c, "u", "knight", "A", 4, 4)]);

  it("Rotating 4 turns the north drawing to E, S, W", () => {
    const f: HitForm = { rotate: 4, hit: "all", grid: ["X X X", ". C ."] };
    expect(tiles(area(s, f, { dir: "N" }))).toEqual(["3,5", "4,5", "5,5"]);
    expect(tiles(area(s, f, { dir: "E" }))).toEqual(["5,3", "5,4", "5,5"]);
    expect(tiles(area(s, f, { dir: "S" }))).toEqual(["3,3", "4,3", "5,3"]);
  });

  it("a diagonal direction with no diagonal grid stretches a line along the diagonal", () => {
    const f: HitForm = { rotate: 8, hit: "all", grid: ["X", "X", "C"] };
    expect(tiles(area(s, f, { dir: "NE" }))).toEqual(["5,5", "6,6"]);
    expect(tiles(area(s, f, { dir: "SW" }))).toEqual(["2,2", "3,3"]);
  });

  it("an 8-direction area with a second shape uses it for the diagonals, drawn facing NW (Karas's Wraithfire)", () => {
    const f: HitForm = {
      rotate: 8,
      hit: "all",
      grid: [". X .", "X X X", "X C X", "X . X"],
      diagonal: ["X X . .", "X X X .", ". X C X", ". . X ."],
    };
    expect(tiles(area(s, f, { dir: "NW" }))).toEqual(["2,6", "2,5", "3,6", "3,5", "4,5", "3,4", "5,4", "4,3"].sort());
    expect(tiles(area(s, f, { dir: "N" }))).toEqual(["4,6", "3,5", "4,5", "5,5", "3,4", "5,4", "3,3", "5,3"].sort());
  });

  it("a tile alone picks the direction whose area holds it", () => {
    const f: HitForm = { rotate: 8, hit: "all", grid: ["X", "C"] };
    expect(tiles(area(s, f, { tiles: [{ x: 3, y: 3 }] }))).toEqual(["3,3"]);
    expect(resolveArea(s, get(s, "u"), f, { tiles: [{ x: 4, y: 6 }] })).toBe("out of range");
  });
});

describe("Hit: First lanes (board.md Hit Types)", () => {
  it("3 lanes: each stops at its first enemy and passes allies", () => {
    const c = content([]);
    const s = state([
      at(c, "u", "knight", "A", 4, 1),
      at(c, "ally", "knight", "A", 3, 2),
      dummy(c, "e1", 3, 3), // left lane: behind the ally, still hit
      dummy(c, "e2", 4, 4), // middle lane: the 3rd tile
      dummy(c, "e3", 5, 2), // right lane: the 1st tile
      dummy(c, "e4", 5, 4), // right lane: behind e3, not hit
    ]);
    const f: HitForm = { rotate: 4, hit: "first", grid: ["3 3 3", "2 2 2", "1 1 1", ". C ."] };
    const hit = area(s, f, { dir: "N" }).enemies.map((t) => [t.unit.id, t.step]);
    expect(hit.sort()).toEqual([["e1", 2], ["e2", 3], ["e3", 1]]);
  });
});

describe("picked tile, range and Blocked Shots (board.md Anchor, Range)", () => {
  const c = content([]);

  it("a P area is placed on the picked tile; P is hit too", () => {
    const s = state([at(c, "u", "knight", "A", 4, 4)]);
    const f: HitForm = { rotate: 0, hit: "all", range: { manhattan: 3 }, grid: ["X X X", "X P X", "X X X"] };
    expect(tiles(area(s, f, { tiles: [{ x: 4, y: 7 }] }))).toEqual(["3,6", "3,7", "3,8", "4,6", "4,7", "4,8", "5,6", "5,7", "5,8"]);
  });

  it("manhattan, square and ring ranges", () => {
    const s = state([at(c, "u", "knight", "A", 4, 4)]);
    const pick = (range: Range, x: number, y: number) => resolveArea(s, get(s, "u"), { rotate: 0, hit: "all", range }, { tiles: [{ x, y }] });
    expect(pick({ manhattan: 2 }, 5, 5)).not.toBe("out of range");
    expect(pick({ manhattan: 2 }, 6, 5)).toBe("out of range");
    expect(pick({ square: 2 }, 6, 6)).not.toBe("out of range");
    expect(pick({ ring: 3 }, 7, 5)).not.toBe("out of range");
    expect(pick({ ring: 3 }, 6, 5)).toBe("out of range");
    expect(pick({ manhattan: 2 }, 4, 4)).toBe("out of range"); // never the caster's own tile
  });

  it("Blocked Shots: straight, diagonal and knight-move tiles in ring 2", () => {
    const s = state([at(c, "u", "knight", "A", 4, 4), at(c, "w", "knight", "B", 4, 5)]);
    const from = { x: 4, y: 4 };
    expect(shotBlocked(s, from, { x: 4, y: 6 })).toBe(true); // straight, blocked by 4,5
    expect(shotBlocked(s, from, { x: 5, y: 6 })).toBe(true); // knight-move, 4,5 is on the way
    expect(shotBlocked(s, from, { x: 6, y: 6 })).toBe(false); // diagonal, 5,5 is free
    expect(shotBlocked(s, from, { x: 4, y: 5 })).toBe(false); // ring 1 is never blocked
  });

  it("several picks may repeat: each is its own hit (Valen's swords)", () => {
    const c2 = content([skill({ rotate: 0, hit: "all", range: { manhattan: 2 }, picks: 3 }, { magic: 2 })]);
    const s = state([at(c2, "u", "tester", "A", 4, 4), dummy(c2, "e", 4, 6)]);
    const a: Action = { type: "UseAbility", seat: "A", unitId: "u", ability: 0, aim: { tiles: [{ x: 4, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 6 }] } };
    const r = apply(s, a, c2);
    expect(r.ok && get(r.state, "e").hp).toBe(13); // 3 × (2 − DEF 1)
  });
});

describe("zones and falloff (board.md Zones, Falloff)", () => {
  it("Valen's Light of Vow: zone a Physical 2 + Magic, zone b Magic, Magic falloff −1", () => {
    const light = skill({ rotate: 4, hit: "all", grid: ["b", "b", "a", "C"] }, { magic: 4, zones: { a: { physical: 2 } }, falloff: { magic: { each: 1 } } });
    const c = content([light]);
    const s = state([at(c, "u", "tester", "A", 4, 1), dummy(c, "e1", 4, 2), dummy(c, "e2", 4, 3), dummy(c, "e3", 4, 4)]);
    const r = apply(s, { type: "UseAbility", seat: "A", unitId: "u", ability: 0, aim: { dir: "N" } }, c);
    if (!r.ok) throw new Error(r.error);
    // archer: DEF 1, no Armor. e1: 2 + 4 − 1 = 5; e2: 3 − 1 = 2; e3: 2 − 1 = 1
    expect(["e1", "e2", "e3"].map((id) => 16 - get(r.state, id).hp)).toEqual([5, 2, 1]);
  });

  it("worked example: Physical 6, Falloff −1, −4 → 6, 5, 2", () => {
    const f: AbilityDef = { name: "t", mana: 0, text: "", form: { rotate: 4, hit: "all", grid: ["X", "X", "X", "C"] }, physical: 6, falloff: { physical: { steps: [1, 4] } } };
    const c = content([f]);
    const s = state([at(c, "u", "tester", "A", 4, 1), at(c, "e1", "knight", "B", 4, 2), at(c, "e2", "knight", "B", 4, 3), at(c, "e3", "knight", "B", 4, 4)]);
    const r = apply(s, { type: "UseAbility", seat: "A", unitId: "u", ability: 0, aim: { dir: "N" } }, c);
    if (!r.ok) throw new Error(r.error);
    // knight: Armor 1
    expect(["e1", "e2", "e3"].map((id) => 20 - get(r.state, id).hp)).toEqual([5, 4, 1]);
  });

  it("a zone can have its own effects and no damage (Karas's Ravenous Eclipse)", () => {
    const flame = (duration: number) => ({ type: "dot" as const, id: "flame", kind: "turn" as const, damage: 2, duration });
    const eclipse = skill({ rotate: 0, hit: "all", grid: ["b", "a", "C"] }, { zones: { a: { onHit: [flame(2)] }, b: { magic: 0, onHit: [flame(1)] } } });
    const c = content([eclipse]);
    const s = state([at(c, "u", "tester", "A", 4, 1), dummy(c, "near", 4, 2), dummy(c, "far", 4, 3)]);
    const r = apply(s, { type: "UseAbility", seat: "A", unitId: "u", ability: 0, aim: {} }, c);
    if (!r.ok) throw new Error(r.error);
    expect(get(r.state, "near")).toMatchObject({ hp: 11 });
    expect(get(r.state, "near").dots[0]?.ticksLeft).toBe(2);
    expect(get(r.state, "far")).toMatchObject({ hp: 16 });
    expect(get(r.state, "far").dots[0]?.ticksLeft).toBe(1);
  });
});
