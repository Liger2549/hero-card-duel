import type { Content } from "../src/content.ts";
import type { HeroDef, HitForm, SummonDef } from "../src/defs.ts";

// Hit forms in the docs' notation (board.md "Skill Areas").
const adjacent: HitForm = { rotate: 8, hit: "all", grid: ["X", "C"] };
const lane3: HitForm = { rotate: 4, hit: "first", grid: ["3", "2", "1", "C"] };
const ring8: HitForm = { rotate: 0, hit: "all", grid: ["X X X", "X C X", "X X X"] };
const pick = (n: number, hit: HitForm["hit"] = "all"): HitForm => ({ rotate: 0, hit, range: { manhattan: n } });

// Test-only units with round numbers, so expected values are easy to work out by hand.
const knight: HeroDef = {
  id: "knight",
  name: "Knight",
  icon: "K",
  role: "test",
  origin: "new",
  attackType: "melee",
  damageType: "physical",
  bounty: 400,
  stats: { maxHp: 20, atk: 4, def: 0, speed: 100, move: 1, breakBar: 10, aggroBar: 5, armor: 1 },
  passive: { text: "" },
  normalAttack: { name: "Slash", mana: 2, text: "", form: adjacent, physical: (f) => f.atk, break: 1 },
  skills: [
    { name: "Lunge", mana: 3, text: "", form: lane3, physical: (f) => f.atk + 1, break: 3 },
    { name: "Stun", mana: 3, text: "", form: adjacent, break: 0, onHit: [{ type: "cc", cc: "stun", recovery: 300 }] },
  ],
  ultimate: { name: "Whirl", mana: 4, ultCost: 2, ultMax: 4, text: "", form: ring8, physical: 5, break: 5 },
};

const archer: HeroDef = {
  id: "archer",
  name: "Archer",
  icon: "A",
  role: "test",
  origin: "new",
  attackType: "ranged",
  damageType: "magic",
  bounty: 400,
  stats: { maxHp: 16, atk: 3, def: 1, speed: 100, move: 1, breakBar: 8, aggroBar: 5 },
  passive: { text: "" },
  normalAttack: { name: "Shoot", mana: 2, text: "", form: pick(2), magic: (f) => f.atk, break: 1 },
  skills: [
    { name: "Mend", mana: 3, text: "", form: pick(2, "allies"), heal: 5 },
    { name: "Burn", mana: 3, text: "", form: pick(3), onHit: [{ type: "dot", id: "burn", kind: "round", damage: 2, duration: 2 }] },
    { name: "Ward", mana: 1, text: "", form: pick(2, "allies"), buffs: [{ stat: "armor", amount: 2, turns: 2 }], freeAction: true },
  ],
  ultimate: { name: "Aegis", mana: 4, ultCost: 3, ultMax: 3, text: "", form: { rotate: 0, hit: "allies", self: true, grid: ["X X X", "X C X", "X X X"] }, shield: { mode: "add", amount: 3, turns: 2 } },
};

const pup: SummonDef = {
  id: "pup",
  name: "Pup",
  icon: "P",
  attackType: "melee",
  damageType: "physical",
  bounty: 100,
  stats: { maxHp: 6, atk: 2, def: 0, speed: 100, move: 1, breakBar: 4, aggroBar: 5 },
  firstAttackMana: { summonRound: 0, laterRounds: 1 },
  normalAttack: { name: "Bite", mana: 2, text: "", form: adjacent, physical: (f) => f.atk, break: 1 },
};

export const fixtures: Content = {
  heroes: [knight, archer],
  summons: [pup],
  cards: [
    { id: "pupCard", name: "Pup", icon: "P", text: "", kind: "unit", mana: 3, maxCopies: 4, target: "tile", summon: "pup" },
    { id: "potion", name: "Potion", icon: "H", text: "", kind: "spell", mana: 1, maxCopies: 2, target: "ally", heal: 6 },
    { id: "orb", name: "Orb", icon: "O", text: "", kind: "spell", mana: 0, maxCopies: 4, target: "none", manaGain: 2 },
  ],
  items: [
    { id: "charm", name: "Charm", icon: "C", text: "", price: 300, tier: 1, mods: { tenacity: 100 } },
    { id: "sword", name: "Sword", icon: "S", text: "", price: 300, tier: 1, mods: { atk: 1 } },
    { id: "blade", name: "Blade", icon: "B", text: "", price: 350, tier: 2, from: "sword", mods: { atk: 2 } },
    { id: "heart", name: "Heart", icon: "H", text: "", price: 400, tier: 1, mods: { maxHp: 4 } },
  ],
};

// 12 copies of the knight, enough for a full draft (4 bans + 8 picks).
export const draftFixtures: Content = {
  ...fixtures,
  heroes: Array.from({ length: 12 }, (_, i) => ({ ...knight, id: `h${i}` })),
};
