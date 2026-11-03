import type { UnitHooks } from "./rules/interject.ts";

// What a hero or unit sheet says, as data (docs/heroes/README.md).
// The shape follows the prototype's hero list; it will move toward the docs' notation later.

export type AttackType = "melee" | "ranged" | "mixed";
export type DamageType = "physical" | "magic" | "mixed";
export type CcKind = "stun" | "silence" | "root" | "slow";

// combat.md "Combat Modifiers". Left out = 0.
export type ModifierStat =
  | "armor"
  | "magicArmor"
  | "penetration"
  | "healingBonus"
  | "healingReceived"
  | "lifeSteal"
  | "lifeStealResistance"
  | "breakBoost"
  | "breakDmgBonus"
  | "breakResistance"
  | "resonanceBoost"
  | "tenacity"
  | "fortitude"
  | "dotBoost"
  | "physicalAtk"; // statuses.md "Physical ATK +N": added to the Physical damage of each hit that has some

// combat.md "% Multipliers". Whole percents; left out = 100 (normal).
export type PercentStat =
  | "armorShred"
  | "breakPower"
  | "breakDmgPower"
  | "dotPower"
  | "resonancePower"
  | "healingPower"
  | "physicalTaken"
  | "magicTaken"
  | "damageTaken"
  | "breakTaken"
  | "dotTaken"
  | "drainTaken"
  | "healingTaken"
  | "ccTaken";

export type StatName = "maxHp" | "atk" | "def" | "speed" | ModifierStat | PercentStat;

// combat.md "Core Stats", plus any Combat Modifiers and % Multipliers the sheet lists.
export interface Stats extends Partial<Record<ModifierStat | PercentStat, number>> {
  maxHp: number;
  atk: number;
  def: number;
  speed: number;
  move: number;
  breakBar: number;
  aggroBar: number;
}

// What a formula may read: the user's current ATK and DEF (DEF before Bianca's conversion),
// the tile's place in the area (0 = first), and the unit being hit.
export interface FormulaInput {
  atk: number;
  def: number;
  stat: (name: StatName) => number; // any other stat of the user
  index: number;
  target: { hp: number; maxHp: number } | null;
}

// A value on the sheet: a fixed number, or worked out when the ability is used.
export type Formula = number | ((f: FormulaInput) => number);

// A tile offset: [x, y] with +y = forward (north).
export type Offset = readonly [number, number];

// board.md "Range": where a picked tile (P) may be. manhattan / square: within n tiles; ring: exactly n tiles (square).
export type Range = { manhattan: number } | { square: number } | { ring: number };

// board.md "Skill Areas", written in the docs' notation (a grid facing north, top row = forward).
//   C caster · P picked tile (also hit) · X hit · 1 2 3 lanes (Hit: First) · a b c zones · . not hit
// Without a range the area is around the caster (No lock). With a range the player picks P (Lock-on);
// a form with a range and no grid hits the picked tile only.
export interface HitForm {
  grid?: readonly string[];
  diagonal?: readonly string[]; // rotate 8 with a second shape for NE / SE / SW / NW, drawn facing NW
  rotate: 0 | 4 | 8; // 0 = Fixed
  hit: "all" | "first" | "allies" | "both";
  range?: Range;
  picks?: number; // several picked tiles, may repeat (e.g. Valen's swords); default 1
  blocked?: boolean; // cannot shoot over units (board.md "Blocked Shots")
  self?: boolean; // the caster's own tile is part of the area (e.g. a heal that includes the caster)
}

// board.md "Falloff". each: −N for every step after the first. steps: total reduction at step 2, 3, … (last repeats).
export type Falloff = { each: number } | { steps: readonly number[] };

// board.md "Zones": values a zone sets instead of the ability's main ones, and its own effects.
export interface ZoneDef {
  physical?: Formula;
  magic?: Formula;
  break?: Formula;
  onHit?: readonly OnHit[];
}

// Status put on each unit hit.
export type OnHit =
  | { type: "cc"; cc: CcKind; recovery: number }
  // combat.md "Damage over Time" / statuses.md. duration = number of ticks.
  | {
      type: "dot";
      id: string;
      kind: "round" | "turn";
      damage: Formula;
      duration: number;
      breakPerTick?: number;
      mods?: readonly { stat: StatName; amount: Formula }[]; // flat stat changes on the target while it lasts
    };

export type BuffStat = StatName;

// combat.md "Stat Modifiers". flat: + amount (on a % Multiplier this moves it by percentage points).
// pct: + amount percentage points of the stat (+20 → 120%). mult: × amount% (80 → × 80%).
export type ModifierKind = "flat" | "pct" | "mult";

export interface Buff {
  stat: BuffStat;
  amount: number;
  turns: number;
  kind?: ModifierKind; // default flat
  per?: Per; // default turn
  name?: string; // a named status (e.g. "daylight"), so a hook can find or remove it
}

// combat.md "Durations": turn = every Turn; team = the caster's team's Turns; own = the holder's Own Turns.
export type Per = "turn" | "team" | "own";

export interface AbilityDef {
  name: string;
  mana: number;
  text: string; // shown in the hero viewer
  form: HitForm;

  // Damage to each enemy hit (zones may change these)
  physical?: Formula;
  magic?: Formula;
  penetration?: number; // extra, this ability only
  break?: Formula;
  breakPerHit?: boolean; // Break on every hit instead of once per action
  falloff?: { physical?: Falloff; magic?: Falloff };
  zones?: Readonly<Record<string, ZoneDef>>;
  onHit?: readonly OnHit[];
  knockback?: boolean; // push each unit hit 1 tile straight away from the user, if free

  // On allies in the area (hit: "allies" / "both")
  heal?: Formula;
  shield?: { mode: "add" | "set"; amount: Formula; turns: number; per?: Per };
  buffs?: readonly Buff[];
  cleanse?: boolean;

  // On the user
  ultGain?: number; // default: normal attack 1, skill 2, ultimate 0
  selfHeal?: Formula;
  selfBuff?: Buff;

  freeAction?: boolean; // combat.md "Turn Flow": does not end the Turn
  interject?: { delay: number }; // combat.md "Manual Interject": resolves `delay` Turns after it is cast
  special?: string; // hero-specific effect, run by that hero's hooks
}

export interface UltimateDef extends AbilityDef {
  ultCost: number; // "Ult Point usage"
  ultMax: number; // "Max Ult Points"
  gaugeName?: string; // e.g. Serie's Singularity
}

export interface UnitDef {
  id: string;
  name: string;
  icon: string;
  attackType: AttackType;
  damageType: DamageType;
  stats: Stats;
  normalAttack: AbilityDef;
  hooks?: UnitHooks; // its own mechanics, in its own file (rules/interject.ts)
}

// rules.md "Cards"
export interface CardDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  kind: "unit" | "spell";
  mana: number;
  maxCopies: number; // how many of this card one deck may hold
  target: "none" | "tile" | "allyHero" | "ally"; // tile = placement (board.md "Placement")
  summon?: string; // unit cards: the unit's id
  heal?: number;
  buffs?: readonly Buff[];
  manaGain?: number;
}

export type ItemStat =
  | "atk"
  | "maxHp"
  | "speed"
  | "armor"
  | "magicArmor"
  | "penetration"
  | "breakBoost"
  | "breakDmgBonus"
  | "lifeSteal"
  | "tenacity"
  | "fortitude"
  | "dotBoost";

// rules.md "Shop and Items"
export interface ItemDef {
  id: string;
  name: string;
  icon: string;
  text: string;
  price: number; // for an upgrade, the price on top of the item it is built from
  tier: 1 | 2 | 3;
  from?: string; // the lower item this one upgrades
  mods: Partial<Record<ItemStat, number>>;
}

// A summoned unit (from a card or a hero skill).
export interface SummonDef extends UnitDef {
  bounty: number;
  // rules.md "Cards": mana of the first attack each Round; later attacks cost normalAttack.mana.
  firstAttackMana: { summonRound: number; laterRounds: number };
}

export interface HeroDef extends UnitDef {
  role: string;
  origin: "own" | "idea" | "new"; // prototype: the owner's sheet, from the owner's idea, or new
  bounty: number;
  passive: { name?: string; text: string };
  skills: readonly AbilityDef[];
  ultimate: UltimateDef;
  getsFreeStep?: boolean; // Mixed heroes only (board.md "Step Cost")
}
