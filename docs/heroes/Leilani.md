# Leilani

A young water mage named Leilani, who heals her team with the sea and calls a great whale.

- **ID**: Leilani
- **Role**: Support
- **Damage Type**: Magic
- **Combat Types**: Healer
- **Attack Type**: Ranged

## Base Stats
Max Hp      : 16
ATK         : 3
DEF         : 1
Speed       : 105
Move        : 1
Break Bar   : 14
Aggro Bar   : 5
Base Bounty : 400

## Combat Modifiers
Healing Bonus  : 2
Healing Power% : 125%

## Passive: Lifebuoy (ห่วงชูชีพ)
- Effect:
  - **Automatic Interject**: when an ally hero or unit within 2 tiles of Leilani (not Leilani herself) drops below 25% of its Max HP, she heals it for **2 + 25% Max HP** and gains 1 Ult Point.
    - Cooldown: 4 Turns of her team.
  - **Return to the stage**: if Leilani has not used her Own Turn for 3 Turns of her team in a row, her next normal attack, skill or ultimate gives +1 Ult Point.

## Normal Attack: Sea Spray (ละอองทะเล)
Leilani casts water magic at an enemy.
- Mana: 2
- Physical: 0
- Magic: 50% ATK
- Break: 120% ATK
- Ult Points gained: 1
- Hit form:
```
Target: 1 tile within 2 tiles | Hit: All | Lock-on

. . T . .
. T T T .
T T C T T
. T T T .
. . T . .
```

## Skill: Rolling Tide (คลื่นม้วน)
Leilani raises a wave around her that moves with her.
- Mana: 3
- Physical: 0
- Magic: 1 + 35% ATK
- Break: 1
- Ult Points gained: 2
- Tags: None
- Effect: The wave lasts 4 Turns of her team. It pulses right away when cast (this counts as Turn 1), then interjects once in each of the next 3 Turns of her team, using Leilani's Speed (`combat.md` "Action Order").
  - Each pulse heals Leilani and every ally within 2 tiles of her for **150% ATK**.
  - Each pulse deals the damage above to every enemy within 3 tiles of her.
  - The wave is centered on Leilani, wherever she is when it pulses.
- Hit form:
```
Fixed | Hit: All and Allies | No lock

Heal (h, includes C):   Damage (X):
. . h . .               . . . X . . .
. h h h .               . . X X X . .
h h C h h               . X X X X X .
. h h h .               X X X C X X X
. . h . .               . X X X X X .
                        . . X X X . .
                        . . . X . . .
```

## Ultimate: Whale Breach (วาฬกระเพื่อม)
Leilani calls a great whale that crashes down onto the board.
- Mana: 4
- Ult Point usage: 6
- Physical: 0
- Magic: 120% ATK
- Break: 220% ATK
- Tags: None
- Effect:
  - The player picks a landing tile (P) on the ring 3 tiles away from Leilani, then turns the area to face any of the 4 directions (N, E, S, W). The direction does not depend on where P is.
  - Every enemy in the area takes the damage above.
  - The ripple spreads across the whole board: every ally hero and unit, including Leilani, is healed for **150% ATK**. Objects (e.g. Zoran's Vigil Lantern, Falka's Scanner, Ribu's Volatile Core) are not.
- Hit form:
```
Target: 1 tile on the ring 3 tiles away | Hit: All | Lock-on

Landing tiles (T):     Area, facing N (P = landing tile, also hit):
T T T T T T T          X X X X X
T . . . . . T          X X X X X
T . . . . . T          X X X X X
T . . C . . T          X X X X X
T . . . . . T          X X P X X
T . . . . . T          X X X X X
T T T T T T T
```
