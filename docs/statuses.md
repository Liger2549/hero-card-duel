# Statuses

Statuses that more than one hero (or a card or item) can apply. A hero file links here instead of defining them itself. Every DOT lives here so new heroes can reuse it.

DOT rules (kinds, formula, stacking): `combat.md` "Damage over Time".

## DOT

### Nocturnal Flame (เพลิงรัตติกาล)
- **Kind**: Turn DOT
- **Damage per tick**: 2
- **Break per tick**: 1 (only this DOT reduces the Break Bar)
  - Break Boost and Break Resistance do not change it.
  - It cannot lower the Break Bar below 1, so it never breaks a unit by itself.
- **Used by**: Karas, h4

### Voidmark
- **Kind**: Round DOT
- **Damage per tick**: 1 per 2 ATK
- **Erosion**: while Voidmark is active, the enemy's DEF is reduced by 1 + 1 per 3 DOT Boost (DEF cannot go below 0).
- **Used by**: Serie (each tick that deals damage gives her +1 Singularity, see her Passive).

## Other Statuses

### Stealth (ล่องหน)
- **Hidden**: while no enemy hero/unit is in the 8 tiles around the stealthed unit, the enemy player cannot see where it is.
- **Shown**: while an enemy is in one of those 8 tiles, the unit is shown.
- Hidden or shown, **Lock-on** skills and effects (e.g. counter-attacks) cannot target it: they cannot pick its tile as `T`. It is still hit when it stands in the area of any skill, Lock-on or No lock (`board.md` "Anchor").
- When the unit is hit, Stealth ends.
- Whether the unit's own attacks end Stealth is stated by the skill that gives it.
- **Stepping onto a hidden unit**: the game shows nothing while the enemy moves (that would give the position away), and the enemy cannot undo steps that Turn (`board.md` "Undo"). If an enemy steps onto the hidden unit's tile:
  - The enemy is pushed back to the tile it came from and takes **Physical 130% ATK** (the stealthed unit's ATK). It does not reduce the Break Bar.
  - This damage is not an Action. The enemy's Turn goes on as if no Action had started (they can still move and act).
  - Stealth ends.
- **Used by**: Falka (Vanishing Point)
