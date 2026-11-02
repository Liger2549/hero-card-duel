import type { Pos } from "./board.ts";
import type { Seat } from "./config.ts";
import type { AbilityRef } from "./content.ts";

// What apply() reports. The client plays these one by one as animations and log lines.
export type GameEvent =
  // Movement
  | { type: "UnitStepped"; unitId: string; from: Pos; to: Pos; cost: number }
  | { type: "UnitsSwapped"; unitId: string; allyId: string; from: Pos; to: Pos; cost: number }
  | { type: "StepUndone"; unitId: string; to: Pos; refund: number }
  | { type: "UnitPrepMoved"; unitId: string; from: Pos; to: Pos }
  | { type: "UnitPushed"; unitId: string; from: Pos; to: Pos }
  // Turn and round flow
  | { type: "HeroPlaced"; unitId: string; to: Pos; random: boolean }
  | { type: "PlayerReady"; seat: Seat }
  | { type: "CombatStarted"; round: number; starter: Seat }
  | { type: "TurnStarted"; seat: Seat }
  | { type: "PlayerOut"; seat: Seat; stuck: boolean } // stuck = could do nothing
  | { type: "RoundEnded"; round: number; nextStarter: Seat }
  | { type: "RoundStarted"; round: number }
  | { type: "GameOver"; winner: Seat }
  // Combat
  | { type: "AbilityUsed"; unitId: string; ability: AbilityRef; name: string; tiles: Pos[]; mana: number }
  | { type: "ShieldAbsorbed"; unitId: string; amount: number }
  | { type: "Damaged"; unitId: string; amount: number; hp: number; sourceId: string | null }
  | { type: "Healed"; unitId: string; amount: number; hp: number }
  | { type: "ShieldGained"; unitId: string; amount: number; mode: "add" | "set" }
  | { type: "Broken"; unitId: string; damage: number }
  | { type: "BreakRestored"; unitId: string }
  | { type: "StatusApplied"; unitId: string; status: string }
  | { type: "StatusEnded"; unitId: string; status: string }
  | { type: "DotTick"; unitId: string; dot: string; damage: number }
  | { type: "UnitDied"; unitId: string; killerSeat: Seat | null; bounty: number }
  // Towers
  | { type: "TowerShieldBlocked"; seat: Seat; index: number; left: number }
  | { type: "TowerDamaged"; seat: Seat; index: number; amount: number; hp: number }
  | { type: "TowerDestroyed"; seat: Seat; index: number }
  // Draft
  | { type: "TimeOfDayChosen"; time: string }
  | { type: "HeroBanned"; seat: Seat; heroId: string | null } // null = left blank
  | { type: "HeroPicked"; seat: Seat; heroId: string; random: boolean }
  | { type: "DraftFinished" }
  // Cards and shop. Drawn card ids are left out: only the owner may see them.
  | { type: "CardsDrawn"; seat: Seat; count: number }
  | { type: "CardPlayed"; seat: Seat; cardId: string }
  | { type: "UnitSummoned"; unitId: string; defId: string; owner: Seat; to: Pos }
  | { type: "ManaGained"; seat: Seat; amount: number }
  | { type: "ItemBought"; unitId: string; itemId: string; replaced: string | null; gold: number }
  | { type: "ItemSold"; unitId: string; itemId: string; gold: number };
