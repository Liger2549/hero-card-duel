# Valen

The yellow light men named Valen.

- **ID**: Valen
- **Role**: Damage
- **Damage Type**: Physical and Magic
- **Combat Types**: Penetration
- **Attack Type**: Mixed (gets the Melee free step)

## Base Stats
Max Hp      : 20
ATK         : 4
DEF         : 0
Speed       : 115
Move        : 1
Break Bar   : 12
Aggro Bar   : 5
Base Bounty : 400

## Combat Modifiers
Penetration : 2

## Passive: Let the light pierce the eternal darkness
- Effect: Once per hit, Valen deals bonus damage:

  Target Armor Average = (Armor + Magic Armor) / 2
  Bonus = max((Penetration − Target Armor Average) / 2, 0)

  (Each division is rounded to the nearest whole number, combat.md "General".)

- **Daylight**: while the time of day is Morning, Day or Evening (`rules.md`), Valen gets Penetration +2.

## Normal Attack: The Sword's Radiant Waltz
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

## Skill: Light of Vow
- Mana: 3
- Physical: See zones
- Magic: ATK
- Break: 2
- Ult Points gained: 2
- Tags: None
- Effect: None
- Hit form: 
```
Rotating (4 directions <N, E, S, W>) | Hit: All | No lock
Falloff Magic: -1

b
b
a
C

- a: Physical 2, Magic ATK
- b: Magic ATK
```

## Ultimate: Sword of Justice
- Mana: 4
- Ult Point usage: 4
- Physical: 1 per sword
- Magic: max(ATK − 2, 0) per sword
- Break: 1 per sword
- Tags: None
- Effect: Summons 3 swords. Each sword strikes one chosen tile. Penetration + 5 for this skill only.
- Hit form:

```
Targets: 3 (may repeat) | Hit: All | Lock-on

. . T . .
. T T T .
T T C T T
. T T T .
. . T . .
```