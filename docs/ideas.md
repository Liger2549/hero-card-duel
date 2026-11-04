# Ideas & Open Questions

Things to design or decide later. Not rules yet; move them into the rule docs when they are decided, and log the decision in `decisions.md`.

## Open questions (ask the owner before building these)

1. **Repeated skill use** (owner is designing it): a cooldown, or more mana for each repeat. Still to decide: which one, how much, and whether the count is per Turn or per Round.
2. **Manual interjects are not designed yet** (2026-11-04): `combat.md` "Manual Interject" comes from the C++ docs; the owner has not thought it through and no hero uses it. For now it fires at its locked tile even if the target walked away. Revisit when a hero needs it.
3. **Prototype heroes were not designed by the owner**: Rocco, Konrad and Eira, and the 11 heroes of `heroes/prototype-set.md`, were taken as is from the prototype to fill the draft. Their details (and the Footman and Shade) may change or be removed when the owner looks at them.

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
