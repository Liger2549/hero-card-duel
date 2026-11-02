// Every rule value that a Custom room may change (rules.md "Match config").
// Normal mode always uses normalConfig.

export type Seat = "A" | "B";

// rules.md "Combat System and Others": cycles forward each round.
export const TimesOfDay = ["Morning", "Day", "Evening", "Dusk", "Night", "Late Night"] as const;
export type TimeOfDay = (typeof TimesOfDay)[number];

// combat.md "Max Value Changes"
export type MaxDrop = { type: "clamp" } | { type: "decay"; amount: number } | { type: "keep" };

// rules.md "Tower HP": a stage lasts from its round until the next stage starts.
export interface TowerStage {
  fromRound: number;
  maxHp: number;
  shieldByHits: number; // 0 = no shield that round
  maxDrop: MaxDrop;
}

export interface MatchConfig {
  mode: "normal" | "custom";

  // rules.md "Standard 1v1 Mode"
  boardWidth: number;
  boardHeight: number;
  zoneDepth: number;
  towersPerTeam: number; // each covers boardWidth / towersPerTeam columns
  towersToWin: number;
  heroesPerPlayer: Record<Seat, number>;

  // rules.md "Tower HP" / "Tower config"
  towerStages: TowerStage[];
  towerRegenPerRound: number;

  // rules.md "Before the Game Starts"
  bansPerPlayer: number; // banned at the same time
  pickOrder: Seat[];
  skipBans: boolean; // Custom room only
  defaultTimeOfDay: TimeOfDay;

  // rules.md "Combat Phase": later rounds start with whoever went out first.
  firstRoundStarter: Seat;

  // rules.md "Preparation Phase"
  manaPerRound: number;
  // rules.md "Shop and Items"
  startGold: number;
  goldPerRound: number;
  itemSlots: number;
  // rules.md "Cards"
  handLimit: number;
  deckSize: number;
  cardsFirstRound: number;
  cardsPerRound: number;
  tokensFirstRound: number;
  tokensPerRound: number;

  // Seconds. The server runs the clocks; the engine only gets the time-up actions.
  timers: {
    timeOfDay: number;
    banPhase: number;
    pick: number;
    firstPrep: number;
    majorPrep: number;
  };
}

const clamp: MaxDrop = { type: "clamp" };

export const normalConfig: MatchConfig = {
  mode: "normal",

  boardWidth: 9,
  boardHeight: 9,
  zoneDepth: 2,
  towersPerTeam: 3,
  towersToWin: 2,
  heroesPerPlayer: { A: 4, B: 4 },

  towerStages: [
    { fromRound: 1, maxHp: 30, shieldByHits: 5, maxDrop: clamp },
    { fromRound: 2, maxHp: 27, shieldByHits: 3, maxDrop: clamp },
    { fromRound: 3, maxHp: 25, shieldByHits: 0, maxDrop: clamp },
    { fromRound: 4, maxHp: 23, shieldByHits: 0, maxDrop: clamp },
    { fromRound: 5, maxHp: 21, shieldByHits: 0, maxDrop: clamp },
    { fromRound: 6, maxHp: 20, shieldByHits: 0, maxDrop: clamp },
  ],
  towerRegenPerRound: 1,

  bansPerPlayer: 2,
  pickOrder: ["A", "B", "B", "A", "A", "B", "A", "B"],
  skipBans: false,
  defaultTimeOfDay: "Morning",

  firstRoundStarter: "B",

  manaPerRound: 12,
  startGold: 800,
  goldPerRound: 300,
  itemSlots: 2,
  handLimit: 5,
  deckSize: 24,
  cardsFirstRound: 5,
  cardsPerRound: 2,
  tokensFirstRound: 500,
  tokensPerRound: 100,

  timers: {
    timeOfDay: 8,
    banPhase: 16, // 8 seconds per ban
    pick: 8,
    firstPrep: 45,
    majorPrep: 20,
  },
};

// Returns what is wrong with a config (empty = fine). Used to check Custom room settings.
export function checkConfig(c: MatchConfig): string[] {
  const errors: string[] = [];

  if (c.boardWidth % c.towersPerTeam !== 0) {
    errors.push(`board width ${c.boardWidth} does not split evenly into ${c.towersPerTeam} towers`);
  }
  if (c.zoneDepth * 2 > c.boardHeight) {
    errors.push(`two zones of depth ${c.zoneDepth} do not fit on a board of height ${c.boardHeight}`);
  }
  if (c.towersToWin < 1 || c.towersToWin > c.towersPerTeam) {
    errors.push(`towers to win must be between 1 and ${c.towersPerTeam}`);
  }
  if (c.towerStages[0]?.fromRound !== 1) {
    errors.push("the first tower stage must start at round 1");
  }

  // ideas.md "Draft": the pick order must give each seat exactly its number of heroes.
  for (const seat of ["A", "B"] as const) {
    const picks = c.pickOrder.filter((s) => s === seat).length;
    if (picks !== c.heroesPerPlayer[seat]) {
      errors.push(`draft gives ${seat} ${picks} picks but ${seat} needs ${c.heroesPerPlayer[seat]} heroes`);
    }
  }

  return errors;
}

// The tower stage in effect in this round.
export function towerStage(c: MatchConfig, round: number): TowerStage {
  return [...c.towerStages].reverse().find((st) => st.fromRound <= round) ?? c.towerStages[0]!;
}
