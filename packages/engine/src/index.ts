export * from "./actions.ts";
export * from "./board.ts";
export { botAction } from "./bot.ts";
export * from "./config.ts";
export * from "./content.ts";
export * from "./defs.ts";
export * from "./events.ts";
export { manaCost } from "./rules/abilities.ts";
export { allowedDirs, candidateAims, gridRow, inRange, parseGrid, reach, resolveArea, Dirs, Dirs8, type Aim, type Area, type Cell, type Dir } from "./rules/targeting.ts";
export { newMatch } from "./rules/draft.ts";
export { towerAt, towerRow } from "./rules/towers.ts";
export { newMatchWithUnits } from "./rules/turn.ts";
export * from "./num.ts";
export * from "./state.ts";
export { stat, statBeforeHooks, type StatName } from "./stats.ts";
export { hookApi, type HookApi, type InterjectOptions, type SpecialContext, type UnitHooks } from "./rules/interject.ts";

// For hero hooks in the content package (rules/interject.ts "UnitHooks").
export { resolveAbility, strike } from "./rules/abilities.ts";
export { placeSummon } from "./rules/cards.ts";
export { applyCc, giveShield, heal, healFrom, hitDamage, loseHp, reduceBreakBar, shieldTotal } from "./rules/damage.ts";
export { moveUnit } from "./rules/movement.ts";
export { addBuff, applyDot, applyWither, dotDamage } from "./rules/status.ts";
export { randInt } from "./rng.ts";
