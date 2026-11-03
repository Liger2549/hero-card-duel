# Falka

A young sniper girl named Falka, who scouts with her kestrel, **Kestrel (เคสเตรล)**.

- **ID**: Falka
- **Role**: Damage
- **Damage Type**: Physical
- **Combat Types**: Single-target, Break
- **Attack Type**: Ranged

## Base Stats
Max Hp      : 15
ATK         : 5
DEF         : 0
Speed       : 100
Move        : 1
Break Bar   : 10
Aggro Bar   : 3
Base Bounty : 400

## Combat Modifiers
Break Boost   : 3
Break Power%  : 110%

## Passive: Exfil
- Effect: When Falka's HP is below 25%, she gains **2 free steps** (no mana). She can use them in her player's Turn (no one moves on the enemy's Turn). Unused free steps are kept until the end of that Round.
- Cooldown: 2 Rounds. The Round it triggers in counts as 1, the next Round as 2. It can trigger again from the Round after that.
  - Example: it triggers in round 3. Rounds 3 and 4 are its cooldown. It can trigger again from round 5.

## Normal Attack: Snap Shot
- Mana: 2
- Physical: ATK
- Magic: 0
- Break: 1 + ATK
- Ult Points gained: 1
- Hit form:
```
Rotating (8 directions) | Hit: First | No lock
2
1
C
```

## Skill: Shatter Round
- Mana: 3
- Physical: 50% ATK
- Magic: 0
- Break: 2 + 150% ATK
- Ult Points gained: 2
- Tags: Break
- Effect: If this hit breaks the target, the Break DMG it deals gets **+250% ATK** on top of the normal Break DMG.
- Hit form:
```
Rotating (8 directions) | Hit: First | No lock
3
2
1
C
```

## Skill: Kestrel's Eye
- Mana: 2
- Physical: 0
- Magic: 0
- Break: 0
- Ult Points gained: 1
- Tags: Free Action
- Effect: Kestrel sets up a **Scanner** on a tile within 3 tiles of Falka. The 3x3 area around the Scanner is the **Scan Field (เขตสแกน)**.
  - **Scanner**: HP = 25% of Falka's ATK. **Lock-on** skills cannot pick its tile as `T`, but any skill whose area covers it hits it for the same damage as a unit on that tile. It lasts 3 Turns of Falka's team. It does not block movement, and the enemy can see it.
  - Up to 2 Scanners at once. Setting up a third replaces the oldest.
  - **Longer shots**: when the next tile after the end of one of Falka's Hit: First lanes, in the same direction, is in the Scan Field, the lane goes on in a straight line to the far edge of the Scan Field. The bullet still hits the first enemy in the lane.
  - **Marked shots**: Falka's hits against enemies inside the Scan Field get **Break +30% ATK**.
- Hit form:
```
Target: 1 tile within 3 tiles of Falka (the Scanner) | Lock-on

Example: Snap Shot (T) with the Scan Field (s) right above its range.
The N lane goes on to the top row of s. The diagonal lanes do not reach s, so they stay 2 tiles.

. s s s .
. s s s .
. s s s .
T . T . T
. T T T .
T T C T T
. T T T .
T . T . T
```

## Ultimate: Vanishing Point
- Mana: 2
- Ult Point usage: 3
- Max Ult Points: 7
- Physical: 0
- Magic: 0
- Break: 0
- Tags: Free Action
- Effect: Falka gains **Stealth (ล่องหน)** (see `statuses.md`) and 2 free steps (no mana).
  - While Stealth is on, she pays 1 Ult Point at the start of each of her team's Turns. When she cannot pay, Stealth ends.
  - Her own attacks do not end her Stealth (her special training).
  - She can end Stealth herself at any time in her player's Turn. Ending it costs no mana and does not end the Turn.
- Hit form: None (self)
