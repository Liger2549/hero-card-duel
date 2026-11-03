# Linnet

A young singer named Linnet, whose song carries the voice of the silver birds of the sea.

- **ID**: Linnet
- **Role**: Support
- **Damage Type**: Magic
- **Combat Types**: Interject
- **Attack Type**: Ranged

## Base Stats
Max Hp      : 18
ATK         : 2
DEF         : 0
Speed       : 110
Move        : 1
Break Bar   : 15
Aggro Bar   : 6
Base Bounty : 400

## Passive: Tidal Chorus
- Effect: Each of Linnet's attacks that hits an enemy gives every ally in the 8 tiles around her (not Linnet herself) **Physical ATK +1% of Linnet's Speed** (`statuses.md`) for 2 Own Turns of that ally.
- Stacks up to 5 times. Each stack counts its own duration.

## Normal Attack: Silver Trill
- Mana: 2
- Physical: 0
- Magic: ATK
- Break: 1 + 150% ATK
- Ult Points gained: 1
- Hit form:
```
Target: 1 tile within 2 tiles (can shoot over units) | Hit: All | Lock-on

. . T . .
. T T T .
T T C T T
. T T T .
. . T . .
```

## Skill: Wings over the Waves
- Mana: 3
- Physical: 0
- Magic: 0
- Break: 0
- Ult Points gained: 2
- Tags: None
- Effect: Every ally within 2 tiles (not Linnet herself) gets **Physical ATK +50% ATK + 2.5% Speed** (Linnet's ATK and Speed) for 1 Own Turn of that ally. Then Linnet enters **Rising Chorus**.
  - Casting it again while in Rising Chorus gives +1 Echoes of the Elder Flock.
- Hit form:
```
Fixed | Hit: Allies | No lock

. . X . .
. X X X .
X X C X X
. X X X .
. . X . .
```

## Ultimate: Hymn of the Ancestral Waters
- Mana: 3
- Ult Point usage: 5
- Physical: 0
- Magic: 0
- Break: 0
- Tags: Cleanse
- Effect: One other ally within 2 tiles (not Linnet herself) gets **Physical ATK +2.5% of Linnet's Speed** for 1 Own Turn of that ally, and all CC on it is removed.
  - If Linnet is not in Rising Chorus, she enters it and gains +1 Echoes of the Elder Flock. If she is, she gains +2.
- Hit form:
```
Target: 1 other ally within 2 tiles | Hit: Allies | Lock-on

. . T . .
. T T T .
T T C T T
. T T T .
. . T . .
```

## Rising Chorus
A state Linnet enters through Wings over the Waves or Hymn of the Ancestral Waters. It lasts until Crescendo resolves.

- While in Rising Chorus, Linnet gains **Echoes of the Elder Flock (เสียงก้องแห่งบรรพปักษา)** points (max 3, extra points are lost) when Linnet or an ally within 2 tiles of her:
  - Kills a unit: +1.
  - Kills a hero: +2.
  - Brings an enemy hero below 50% HP: +1. An enemy hero already below 50% does not count.
  - These add up: one hit that takes an enemy hero from above 50% to dead gives +3.
- **Crescendo (เสียงทะยาน)**: when Linnet reaches 3 points, she interjects in that same Turn (Automatic Interject). Every ally within 2 tiles (not Linnet herself) gets **Physical ATK +5% of Linnet's Speed** for 1 Own Turn of that ally. Then Rising Chorus ends and the points reset to 0.
