# Serie

A young girl named Serie who wields a sword and the power of the Void.

- **ID**: Serie
- **Role**: Damage
- **Damage Type**: Physical and Magic
- **Combat Types**: DOT, AoE
- **Attack Type**: (not set yet: Melee / Ranged / Mixed)

## Base Stats
Max Hp      : 18
ATK         : 3
DEF         : 0
Speed       : 125
Move        : 1
Break Bar   : 10
Aggro Bar   : 4
Base Bounty : 400

## Combat Modifiers
DOT Boost : 2

## Passive: The Abyss Hungers
- Effect: Serie does not gain Ult Points. Instead she fills the **Singularity** gauge (max 8).
- Each time a **Voidmark** tick deals damage to an enemy, Serie gains +1 Singularity. Each enemy counts separately (2 enemies ticking at the same Round end = +2).

## Normal Attack: Hollow Edge
- Mana: 2
- Physical: ATK − 1
- Magic: 1
- Break: 1
- Singularity gained: 0
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
C
```

## Skill: Voidrend Crescent
- Mana: 3
- Physical: 2
- Magic: ATK
- Break: 2
- Singularity gained: 0
- Tags: DOT
- Effect: Applies **Voidmark** to every enemy hit for 2 Rounds.
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Hit: All | No lock

X X X
. C .
```

## Ultimate: Event Horizon
- Mana: 3
- Singularity usage: 8
- Physical: 1
- Magic: 1
- Break: 1
- Tags: DOT
- Effect: Deals damage to the enemies in the hit form, then **collapses** every Voidmark on the board.
  - **Collapse**: every enemy with Voidmark, anywhere on the board, instantly takes:
    ```
    Collapse Damage = (Voidmark tick damage × remaining ticks) + ATK
    ```
    Collapse Damage follows the DOT rules (ignores shields, DEF, Armor and Magic Armor; reduced only by Fortitude). It is not a Voidmark tick, so it does not give Singularity.
  - After the collapse, that enemy's Voidmark is removed and a new Voidmark is applied for 1 Round.
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Hit: All | No lock

X X X
. C .
```

## Voidmark
A Round DOT, defined in `statuses.md` (damage per tick, Erosion).

- Each tick that deals damage gives Serie +1 Singularity (see Passive).
