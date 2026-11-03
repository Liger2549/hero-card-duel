# Rocco

A rubber boxer named Rocco, whose arms stretch like rubber. Adapted as is from the prototype hero นักมวยยาง (`docs/heroes/archive/prototype-heroes.md`).

- **ID**: Rocco
- **Role**: Damage
- **Damage Type**: Physical
- **Combat Types**: Single-target
- **Attack Type**: Ranged

## Base Stats
Max Hp      : 20
ATK         : 3
DEF         : 1
Speed       : 110
Move        : 1
Break Bar   : 14
Aggro Bar   : 5
Base Bounty : 400

## Passive: Elastic Reach (แขนยางยืด)
- Effect: Rocco's normal attack reaches 2 tiles (see Rubber Jab).

## Normal Attack: Rubber Jab (หมัดยาง)
- Mana: 2
- Physical: ATK
- Magic: 0
- Break: 1
- Ult Points gained: 1
- Hit form:
```
Target: 1 enemy within 2 tiles | Hit: All | Lock-on

. . T . .
. T T T .
T T C T T
. T T T .
. . T . .
```

## Skill: Slingshot Hook (หมัดยืด)
- Mana: 3
- Physical: ATK + 2
- Magic: 0
- Break: 3
- Ult Points gained: 2
- Tags: None
- Effect: The enemy hit is pushed 1 tile straight away from Rocco, if that tile is free.
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Hit: First | No lock
3
2
1
C
```

## Ultimate: Bounce Carnival (งานรื่นเริงยาง)
- Mana: 3
- Ult Point usage: 5
- Physical: 0
- Magic: 0
- Break: 0
- Tags: None
- Effect:
  - Every hero and unit on the board, of both teams, is moved at random. One by one in a random order, each goes to a random tile out of its own tile and the free tiles 1–2 tiles away from it. Towers do not move.
  - Then Rocco heals 5 (`combat.md` "Healing").
- Hit form: None (the whole board)
