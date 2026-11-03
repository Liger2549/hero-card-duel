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
  | "dotBoost";

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
  index: number;
  target: { hp: number; maxHp: number } | null;
}

// A value on the sheet: a fixed number, or worked out when the ability is used.
export type Formula = number | ((f: FormulaInput) => number);

// A tile offset, drawn facing north: [x, y] with +y = forward. Turned to the chosen direction.
export type Offset = readonly [number, number];

// Which tiles or units an ability reaches (the prototype's "kind").
export type Targeting =
  | { type: "adjacent" } // one of the 8 tiles around the user
  | { type: "shape"; shape: readonly Offset[] } // around the user, turned to 1 of 4 directions
  | { type: "around"; shape: readonly Offset[] } // around the user, no direction
  | { type: "line"; length: number; pierce: boolean } // 4 directions; without pierce, stops at the first unit
  | { type: "tile"; range: number; shape: readonly Offset[] } // a tile within range, shape around it
  | { type: "tiles"; range: number; count: number } // several tiles within range, may repeat
  | { type: "enemy"; range: number; blink?: boolean } // one enemy within range; blink = move next to it first
  | { type: "ally"; range: number } // one ally within range
  | { type: "team" } // every ally
  | { type: "dash"; length: number } // move straight up to `length` tiles
  | { type: "summon"; unit: string; count: number } // empty tiles around the user
  | { type: "board" }; // every unit on the board

// Status put on each unit hit.
export type OnHit =
  | { type: "cc"; cc: CcKind; recovery: number }
  | { type: "dot"; id: string; physical?: Formula; magic?: Formula; rounds: number };

export type BuffStat = StatName;

// combat.md "Stat Modifiers". flat: + amount (on a % Multiplier this moves it by percentage points).
// pct: + amount percentage points of the stat (+20 → 120%). mult: × amount% (80 → × 80%).
export type ModifierKind = "flat" | "pct" | "mult";

export interface Buff {
  stat: BuffStat;
  amount: number;
  turns: number;
  kind?: ModifierKind; // default flat
}

export interface AbilityDef {
  name: string;
  mana: number;
  text: string; // shown in the hero viewer
  targeting: Targeting;

  // Damage to each enemy hit
  physical?: Formula;
  magic?: Formula;
  trueDamage?: Formula; // ignores shields, Armor, Magic Armor and DEF
  penetration?: number; // extra, this ability only
  break?: number;
  breakPerHit?: boolean; // Break on every hit instead of once per action
  onHit?: readonly OnHit[];
  knockback?: boolean; // push each unit hit 1 tile away

  // On allies (ally / team targeting)
  heal?: number;
  shield?: { mode: "add" | "set"; amount: number; turns: number };
  buffs?: readonly Buff[];
  cleanse?: boolean;

  // On the user
  ultGain?: number; // default: normal attack 1, skill 2, ultimate 0
  hpCost?: number;
  lifeSteal?: "half"; // heals the user for half the damage dealt
  selfHeal?: number;
  selfBuff?: Buff;

  freeAction?: boolean; // combat.md "Turn Flow": does not end the Turn
  zone?: { turns: number }; // leaves a zone on the area's tiles
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
