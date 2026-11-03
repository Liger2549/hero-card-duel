# Eira

A frost hunter named Eira, who fights with an icy spear. Adapted as is from the prototype hero นักล่าน้ำแข็ง (`docs/heroes/archive/prototype-heroes.md`).

- **ID**: Eira
- **Role**: Damage / Control
- **Damage Type**: Physical
- **Combat Types**: Single-target, AoE
- **Attack Type**: Melee

## Base Stats
Max Hp      : 22
ATK         : 4
DEF         : 1
Speed       : 105
Move        : 1
Break Bar   : 13
Aggro Bar   : 5
Base Bounty : 400

## Passive: Thin Ice (น้ำแข็งบาง)
- Effect: Eira's hits on an enemy with **Slow** deal Physical +2.

## Normal Attack: Frost Jab (แทง)
- Mana: 2
- Physical: ATK
- Magic: 0
- Break: 1
- Ult Points gained: 1
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
C
```

## Skill: Glacial Spear (หอกเยือกแข็ง)
- Mana: 3
- Physical: ATK
- Magic: 0
- Break: 2
- Ult Points gained: 2
- Tags: None
- Effect: Every enemy hit gets **Slow 300** (each step costs 1 more mana, `combat.md` "Crowd Control").
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Hit: All | No lock
X
X
C
```

## Ultimate: Whiteout (พายุหิมะ)
- Mana: 4
- Ult Point usage: 5
- Physical: 2
- Magic: 0
- Break: 3
- Tags: None
- Effect: Every enemy hit gets **Stun 300**.
- Hit form:
```
Fixed | Hit: All | No lock
. . X . .
. X X X .
X X C X X
. X X X .
. . X . .
```
