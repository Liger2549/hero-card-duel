# Ideas & Open Questions

Things to design or decide later. Not rules yet; move them into the rule docs when they are decided, and log the decision in `decisions.md`.

## Open questions (ask the owner before building these)

1. **Ultimate twice in one Turn**: `heroes/README.md` says a hero may cast their Ultimate more than once in the same Turn, but now an Ultimate ends the Turn. Is that only possible when the Ultimate is a Free Action?
2. **Preparation Phase move and swap**: can the free move in the Preparation Phase swap with an ally?
3. **Summoned units and the Melee free step**: do Melee summoned units also get the free step?
4. **Free Action and Own Turn**: confirm that a Free Action skill neither ends the Turn nor uses the hero's Own Turn.
5. **Shields and the new Durations rule**: confirm that a shield's duration also skips the Turn it was given in, like buffs.
6. **Bianca's counter**: once per enemy Action, or once per guarded unit hit by an AoE?
7. **Repeated skill use** (owner is designing it): using the same skill again costs more mana, or deals less damage. Still to decide: which one, how much, and whether the count is per Turn or per Round.
8. **Manual interject delay**: it resolves "N Turns" after being cast. Does that delay also skip the Turn it was cast in, like Durations?
9. **Stash** (from the UI design): a place for items that are not on a hero. How many slots? Can items move between the stash and heroes at any time, or only in the Preparation Phase? Does a hero's death clear only its own 2 slots?
10. **Team buff cards** (from the UI design): cards that buff the whole team and stay in play. How many can be active at once, how long do they last, and can the enemy remove them?
11. **Boost stats as %**: decided (2026-11-03) that Boost stats have a flat and a % version (Falka has Break Boost % 10%). Still to write: the formulas, e.g. `Break = (Break + Break Boost) × (1 + Break Boost %)`, and where the % goes in the Break Resistance step.
12. **Steps to %**: change skills written as steps ("+1 per N", e.g. Bianca, Leilani, Voidmark) to % of a stat? Keep steps until the owner decides.

## Board

- **Placement Range**: some heroes may place summons farther than 1 tile (8 directions) from themselves.
  - Make the range a hero value (default 1) when the first such hero is added.
  - Check: Chebyshev distance (max of x and y difference) ≤ that hero's Placement Range.
  - Decide: is it a fixed stat, or only while a skill/buff is active?
- **Pass through own units without swapping**: some heroes may step through tiles of their own units instead of swapping with them.
- **Teams with more than one player** (2v2 later; the engine must scale to it): zones and towers already belong to teams. Swapping and "placement next to own units" still use the owner seat. Decide whether a teammate's units count for those.
- **Swap and Action Count**: in a swap, does the ally's Action Count also increase, or only the moving unit's?

## Draft

- **Heroes per player is a config** (Normal: 4). The ban/pick order in `rules.md` is written for 4 heroes each; it must be generated from (or checked against) that number.

## Win conditions

- **Both teams losing at once**: there is no draw, but end-of-Round damage (DOT) could kill the last heroes of both teams. Until decided, the win goes to the active player's team.
- **Respawning heroes**: a dead hero that will respawn still counts as dead for "all heroes eliminated". Decide whether a pending respawn keeps the team in the game.
