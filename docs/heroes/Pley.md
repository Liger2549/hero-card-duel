# Pley

A hero with two forms. He starts as **Ribu**, a teenage boy in dark futuristic techwear. When Ribu dies, or gives up his body, **Pley** takes his place: a male demon in the shape of a woman in white, with white wings and goat horns, who fights with a long sword.

- **ID**: Pley
- **Role**: Damage
- **Damage Type**: Physical
- **Combat Types**: Interject, Rapid Strikes
- **Attack Type**: Mixed (gets the Melee free step)

## Passive (both forms): Out of Phase (คลาดเฟส)
- Effect:
  - **Speed dodge**: when an enemy hits him and his Speed is more than 1.5× the attacker's Speed, he takes half the damage. More than 2× the attacker's Speed, he takes no damage. Hits only (not DOT).
  - **Armor shift**: his DEF and Armor are always 0. All of it becomes Magic Armor: Magic Armor + DEF + Armor (including DEF and Armor from buffs and items).
  - **No Break, no Aggro**: he has no Break Bar and no Aggro Bar, so Break and Aggro do nothing to him. CC works on him as normal.
  - **Weak healing**: Healing Taken 25% (`combat.md` "Healing"). His own Life Steal is not reduced.

# Ribu Form

## Base Stats
Max Hp      : 8
ATK         : 3
DEF         : 0
Speed       : 140
Move        : 1
Break Bar   : -1 (none)
Aggro Bar   : -1 (none)
Base Bounty : 0

## Passive: Borrowed Time (เวลาที่ยืมมา)
- Effect:
  - **Close range**: Ribu's Physical damage against enemies in the 5x5 square around him is +30%.
  - **Paradox Gauge (เกจแห่งความย้อนแย้ง)**: max 7. Ribu gains Paradox points instead of Ult Points. Each point gives Pley **Speed +5** and **Life Steal +2**, for the rest of the game. It takes effect when Pley appears, using the points Ribu had at that moment (before the Ultimate spends them).
  - **Free step**: Ribu gets 1 free step (no mana) every Turn of his team.
  - **Ribu dies**: Pley appears on the tile where Ribu died, to avenge him, and strikes with Revenant's Cross (below) for **Physical 2**.
    - Pley appears fresh: Ribu's buffs and items are all gone. Only the Paradox bonuses carry over.
    - Ribu's Volatile Cores are removed.

## Normal Attack: Neon Spray (ห่ากระสุนนีออน)
Ribu fires his Uzi at an enemy.
- Mana: 2
- Physical: 2 + ATK
- Magic: 0
- Break: 1
- Paradox Points gained: 1
- Hit form:
```
Target: 1 tile in the 5x5 square around Ribu (cannot shoot over units) | Hit: All | Lock-on

T T T T T
T T T T T
T T C T T
T T T T T
T T T T T

Blocking: board.md "Blocked Shots".
```

## Skill: Core Drop (ทิ้งแกน)
- Mana: 2
- Physical: See Volatile Core
- Magic: 0
- Break: 0
- Paradox Points gained: 0 (+1 when a Volatile Core finishes)
- Tags: Free Action
- Effect: Ribu places a **Volatile Core (แกนปริลักษณ์)** on any tile in the 5x5 square around him. When placing it, he picks which corner it will grow toward (NE, SE, SW or NW).
  - Once per Turn. More than one Core can be out, even on the same tile.
  - A Core cannot be destroyed. It does not block movement.
  - **Next enemy Turn**: the Core interjects and explodes on its own tile (1x1) for **Physical 50% ATK**. Then it grows to 2x2: its tile plus the 3 tiles toward the chosen corner.
  - **The enemy Turn after that**: it interjects and explodes on the 2x2 area for **Physical ATK**, then disappears. Ribu gains +1 Paradox.
  - **Action order**: each Core has its own Speed (125% of Ribu's Speed) and its own Action Count (`combat.md` "Action Order"). With the same Speed, the Core placed first goes first.
  - If Ribu dies or uses his Ultimate, all his Cores are removed.
- Hit form:
```
Target: 1 tile in the 5x5 square around Ribu (can be placed over units) | Hit: All | Lock-on

Explosion, corner NE picked (K = Core):
1x1:  K        2x2:  X X
                     K X
```

## Ultimate: Paradox Shift (สลับปฏิทรรศน์)
- Mana: 0
- Paradox Point usage: 7
- Tags: Free Action
- Effect: Ribu ends his own life and becomes Pley. It works like Ribu dying, except:
  - Ribu's items are kept.
  - The Revenant's Cross strike deals **Physical ATK** (Pley's ATK) instead of 2.
- Hit form: None (self)

## Revenant's Cross (กางเขนผู้หวนคืน)
- Physical: 2 (when Ribu dies) or ATK (from Ribu's Ultimate)
- Hit form:
```
Fixed | Hit: All | No lock
A plus shape 3 tiles wide, centered on Pley, reaching the board edges in all 4 directions.

. . X X X . .
. . X X X . .
X X X X X X X
X X X C X X X
X X X X X X X
. . X X X . .
. . X X X . .
```

# Pley Form

## Base Stats
Max Hp      : 12
ATK         : 5
DEF         : 0
Speed       : 125 + 5 per Paradox point
Move        : 1
Break Bar   : -1 (none)
Aggro Bar   : -1 (none)
Base Bounty : 400

## Combat Modifiers
Life Steal : 1 + 2 per Paradox point

## Passive: Fallen Halo (รัศมีที่ร่วงหล่น)
- Effect:
  - **Hunger**: while Pley's HP is below 20% of his Max HP, Life Steal +2.
  - Each hit on an enemy applies **Wither 25% ATK** (`statuses.md`) for 1 Own Turn of that enemy, even when shields absorb the whole hit. When the enemy uses its Own Turn, it ends and its Max HP goes back to normal.
  - **Max HP cap**: Pley's own Max HP can go up to 250% of his Max HP before skills (base + items). Raising his Max HP never heals him; Life Steal does that.

## Normal Attack: Piercing Psalm (บทสวดทะลวง)
Pley thrusts forward.
- Mana: 3
- Physical: 120% ATK
- Magic: 0
- Break: 30% ATK
- Ult Points gained: 1
- Effect: Pley's Max HP +15% ATK for 2 Own Turns of Pley. Stacks.
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
X
C
```

## Skill: Severing Arc (เสี้ยวตัดขาด)
Pley sweeps forward.
- Mana: 3
- Physical: 75% ATK
- Magic: 0
- Break: 10% ATK
- Ult Points gained: 1
- Tags: None
- Effect: Pley's Max HP +40% ATK for 2 Own Turns of Pley. Stacks.
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Hit: All | No lock
X X X
. C .
```

## Ultimate: Falling Seraph (เทวทูตร่วงหล่น)
- Mana: 4
- Ult Point usage: 3
- Tags: Free Action, Interject
- Effect:
  - **Take off**: Pley flies up at once.
    - While in the air he takes no damage from hits. DOTs already on him stay and keep ticking.
    - He cannot do anything: no Actions, no steps, and no shopping if the Round ends.
    - No unit can step onto his tile. Skills can still target it.
  - **Dive**: on the enemy's next Turn he interjects (`combat.md` "Action Order"). His player picks the center tile within 2 tiles of where he took off. If the timer runs out, the game picks the tile that hits the most enemies for the most damage.
    - Center tile: **Physical 180% ATK**. The 8 tiles around it: **Physical 120% ATK**.
    - Pley's Max HP +90% ATK for 2 Own Turns of Pley.
    - Then he lands back on the tile he took off from.
  - **Animation note**: he flies up, slashes the target area from afar, dashes on past it, then returns to his tile. Rules-wise he only leaves and comes back to the same tile.
- Hit form:
```
Target: center tile within 2 tiles | Hit: All | Lock-on

Range (T):      Area:
. . T . .       b b b
. T T T .       b a b
T T C T T       b b b
. T T T .
. . T . .

- a: Physical 180% ATK
- b: Physical 120% ATK
```

## Death
- Ribu's death brings Pley (see Ribu's Passive). Ribu's Bounty is 0.
- Pley is the last form. When Pley dies, the hero is dead for good.
