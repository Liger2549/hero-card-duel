# Zoran

A young man in black named Zoran, who carries a lantern lit with **Nocturnal Flame (เพลิงรัตติกาล)**. He comes from the same land as Karas.

- **ID**: Zoran
- **Role**: Support / Damage
- **Damage Type**: Magic
- **Combat Types**: DOT, Healer, Counter-based
- **Attack Type**: Ranged

## Base Stats
Max Hp      : 20
ATK         : 2
DEF         : 1
Speed       : 105
Move        : 1
Break Bar   : 14
Aggro Bar   : 5
Base Bounty : 400

## Combat Modifiers
Fortitude : 2

"Max HP" in Zoran's formulas is Zoran's own Max HP.

## Passive: Guiding Light
- Effect: Zoran has **Wicks (ไส้ตะเกียง)**, max 2. He starts with 1 and gains 1 at the start of every Round.
- **Automatic Interject**: when an ally within 2 tiles of Zoran (not Zoran himself) drops to 20% HP or lower, Zoran spends 1 Wick and gives that ally an added shield of **2 + 25% Max HP** for 1 Own Turn of that ally.
  - These shields stack with no limit (Add shield, `combat.md` "Shields").
  - Each ally can get this shield once per Turn.
  - If more than one ally drops to 20% or lower at the same time, one interject shields all of them, 1 Wick per ally.
- Cannot trigger with 0 Wicks.

## Normal Attack: Lanternlight
- Mana: 2
- Physical: 0
- Magic: ATK + 5% Max HP
- Break: 20% Max HP
- Ult Points gained: 1
- Tags: DOT
- Effect: Applies **Nocturnal Flame** (`statuses.md`) for 1 Turn.
- Hit form:
```
Target: 1 tile within 2 tiles (cannot shoot over units) | Hit: All | Lock-on

. . T . .
. T T T .
T T C T T
. T T T .
. . T . .

Blocking: board.md "Blocked Shots". In this diamond only the 4 tiles 2 tiles away in a
straight line (N, E, S, W) are in ring 2, so only they can be blocked (by the tile between).
```

## Skill: Veil of Nightflame
- Mana: 3
- Physical: 0
- Magic: 150% ATK + 10% Max HP
- Break: 50% Max HP
- Ult Points gained: 2
- Tags: DOT
- Effect: Zoran sends Nocturnal Flame forward.
  - Every enemy hit gets **Nocturnal Flame** for 1 Turn.
  - Zoran and every ally within 2 tiles of him get a set shield of **25% Max HP** for 2 Own Turns of each unit. It replaces their set shield and does not stack (Set shield, `combat.md` "Shields").
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
X
C
```

## Ultimate: Lantern of the Long Night
- Mana: 3
- Ult Point usage: 4
- Physical: 0
- Magic: 0
- Break: 0
- Tags: DOT
- Effect: Zoran summons a **Vigil Lantern (ตะเกียงเฝ้ายาม)** lit with Nocturnal Flame on a tile in the 5x5 square around him. Only 1 Vigil Lantern at a time: summoning a new one removes the old one.
  - The lantern is a zone, not a unit. It does not block movement and can be placed on any tile, even one with a unit on it.
  - **Lantern pulse**: every unit in the 3x3 area around the lantern is affected:
    - Allies get an added shield of **15% Max HP** and are healed for **10% Max HP**.
    - Enemies get **Nocturnal Flame** for 1 Turn.
  - The lantern lasts 4 Turns of Zoran's team. It pulses right away when summoned (this counts as Turn 1), then interjects once in each of the next 3 Turns of Zoran's team.
  - **Action order**: the lantern has its own Speed (50% of Zoran's Speed) and its own Action Count, separate from Zoran's (`combat.md` "Action Order"). Its pulses do not count as Zoran's Actions.
  - **Lantern shields**: they do not run out while the lantern is up. They add up with every pulse, and all of them end together 2 Turns of Zoran's team after the lantern is gone.
  - The lantern cannot be hit. If Zoran dies, the lantern is gone at once.
- Hit form:
```
Target: 1 tile in the 5x5 square around Zoran | Hit: All and Allies | Lock-on

Lantern placement (T):    Lantern area (P = lantern):
T T T T T                 X X X
T T T T T                 X P X
T T C T T                 X X X
T T T T T
T T T T T
```
