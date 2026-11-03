# Karas

A young crow man named Karas, who wields **Nocturnal Flame (เพลิงรัตติกาล)**, a black fire with a blue glow.

- **ID**: Karas
- **Role**: Damage
- **Damage Type**: Physical and Magic
- **Combat Types**: DOT, Interject, AoE
- **Attack Type**: Mixed (gets the Melee free step)

## Base Stats
Max Hp      : 22
ATK         : 4
DEF         : 1
Speed       : 120
Move        : 1
Break Bar   : 12
Aggro Bar   : 4
Base Bounty : 400

## Combat Modifiers
DOT Boost : 1

## Passive: Raven's Intercession
- Effect: Karas has the **Nightfall Raven Gauge (เกจอีการัตติกาล)**, max 3 points. It starts at 0 and is separate from Ult Points.
- **Automatic Interject**: when an ally within 2 tiles of Karas hits an enemy that is also within 2 tiles of Karas, Karas spends 1 point and sends a raven to that enemy. The raven explodes in Nocturnal Flame around the enemy.
  - Magic: 120% ATK
  - Break: 150% ATK
  - Applies **Nocturnal Flame** to every enemy hit for 1 Turn.
- Once per Turn. Cannot trigger with 0 points.
- The interject does not give Ult Points.
- Points are gained from Wraithfire (+2) and Ravenous Eclipse (+3).
- Hit form:
```
Fixed | Hit: All | Lock-on
P = the enemy the ally attacked

X X X
X P X
X X X
```

## Normal Attack: Cinder Shot
- Mana: 2
- Physical: 25% ATK
- Magic: 75% ATK
- Break: 50% ATK
- Ult Points gained: 1
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
C
```

## Skill: Wraithfire
- Mana: 3
- Physical: 75% ATK
- Magic: 2 + 150% ATK
- Break: 150% ATK
- Ult Points gained: 2
- Tags: DOT
- Effect: Applies **Nocturnal Flame** to every enemy hit for 2 Turns. Karas gains 2 Nightfall Raven points.
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
N, E, S, W use the straight shape. NE, SE, SW, NW use the diagonal shape.

Straight (facing N)    Diagonal (facing NW)
. X .                  X X . .
X X X                  X X X .
X C X                  . X C X
X . X                  . . X .
```

## Ultimate: Ravenous Eclipse
- Mana: 4
- Ult Point usage: 5
- Physical: See zones
- Magic: See zones
- Break: See zones
- Tags: DOT
- Effect: Karas gains 3 Nightfall Raven points.
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Hit: All | No lock

. . b . .
. b a b .
b a a a b
b a C a b
b b b b b

- a: Physical 120% ATK, Magic 250% ATK, Break 200% ATK. Applies Nocturnal Flame for 2 Turns.
- b: No damage, no Break. Applies Nocturnal Flame for 1 Turn.
```

## Nocturnal Flame (เพลิงรัตติกาล)
A Turn DOT, defined in `statuses.md` (damage 50% ATK and Break 1 per tick). Other heroes from the same origin (e.g. Zoran) can also apply it.
