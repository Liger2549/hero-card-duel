# Konrad

An iron flag bearer named Konrad, who holds the line and calls in footmen. Adapted as is from the prototype hero ผู้ถือธงเหล็ก (`docs/heroes/archive/prototype-heroes.md`).

- **ID**: Konrad
- **Role**: Tank / Control
- **Damage Type**: Physical
- **Combat Types**: AoE
- **Attack Type**: Melee

## Base Stats
Max Hp      : 22
ATK         : 3
DEF         : 1
Speed       : 85
Move        : 1
Break Bar   : 16
Aggro Bar   : 5
Base Bounty : 400

## Combat Modifiers
Armor : 1

## Passive: Rally Banner (ธงรวมพล)
- Effect: Allies (heroes and units) standing next to Konrad in the 4 directions (N, E, S, W) get DEF +1 while they stay there.

## Normal Attack: Banner Strike (ฟาด)
- Mana: 2
- Physical: ATK
- Magic: 0
- Break: 2
- Ult Points gained: 1
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
C
```

## Skill: Challenge Flag (ปักธงท้าทาย)
- Mana: 3
- Physical: 2
- Magic: 0
- Break: 2
- Ult Points gained: 2
- Tags: None
- Effect: Every enemy hit gets **Root 300**.
- Hit form:
```
Fixed | Hit: All | No lock
. X .
X C X
. X .
```

## Skill: Vanguard Charge (บุกนำทัพ)
- Mana: 2
- Physical: 0
- Magic: 0
- Break: 0
- Ult Points gained: 1
- Tags: None
- Effect: Konrad moves straight up to 2 tiles in one of the 4 directions. He stops before a unit or the board edge. Movement only, no damage.
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Move | No lock
2
1
C
```

## Ultimate: Call to Arms (เรียกพลทหาร)
- Mana: 3
- Ult Point usage: 4
- Physical: 0
- Magic: 0
- Break: 0
- Tags: None
- Effect: Summons 2 **Footmen** on free tiles among the 8 around Konrad. The player picks the first tile; the second Footman goes on another free tile around him.
- Hit form:
```
Target: 1 free tile next to Konrad | Summon | Lock-on
T T T
T C T
T T T
```

## Footman (พลทหาร)
A unit summoned by Call to Arms (`rules.md` "Cards" for summoned units).

- **Attack Type**: Melee
- **Damage Type**: Physical

Max Hp      : 8
ATK         : 2
DEF         : 1
Speed       : 70
Move        : 1
Break Bar   : 5
Aggro Bar   : 5
Base Bounty : 100

- First attack mana: free in the Round it was summoned, 1 in later Rounds. Other attacks: 2.

### Normal Attack: Thrust (แทง)
- Mana: 2
- Physical: ATK
- Magic: 0
- Break: 1
- Ult Points gained: 0
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
C
```
