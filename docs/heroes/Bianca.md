# Bianca

An Italian armored girl named Bianca, whose left gauntlet can turn into a shield.

- **ID**: hero_id
- **Role**: Damage
- **Damage Type**: Physical
- **Combat Types**: Counter-based, Single-target
- **Attack Type**: Melee

## Base Stats
Max Hp      : 18
ATK         : 2
DEF         : 2
Speed       : 100
Move        : 1
Break Bar   : 14
Aggro Bar   : 5
Base Bounty : 400

## Combat Modifiers
Armor : 1
Magic Armor : 1

## Passive: Bastione Bianco (White Bastion)
- Effect: All of Bianca's DEF is converted, so her DEF is always 0. She gains:
  - Armor + 100% DEF
  - Magic Armor + 50% DEF
- "DEF" in Bianca's skill formulas means her DEF before conversion (base DEF plus any DEF from items or buffs).

## Normal Attack: Pugno d'Acciaio (Steel Fist)
- Mana: 2
- Physical: ATK + DEF
- Magic: 0
- Break: 1
- Ult Points gained: 1
- Hit form: 
```
Rotating (8 directions) | Hit: All | No lock
X
C
```

## Skill: Martello del Giuramento (Hammer of the Oath)
- Mana: 3
- Physical: DEF + ATK
- Magic: 0
- Break: 3
- Ult Points gained: 2
- Tags: None
- Effect: None
- Hit form:
```
Rotating (8 directions) | Hit: All | No lock
X
C
```

## Skill: Scudo d'Avorio (Ivory Aegis)
- Mana: 3
- Physical: 0
- Magic: 0
- Break: 0
- Ult Points gained: 2
- Tags: Automatic Interject
- Effect: Giuramento d'Avorio
- Hit form:
```
Hit: Allies | No lock
X X X
X C X
X X X
```

## Ultimate: Fortezza Inviolata (The Unbroken Citadel)
- Mana: 4
- Ult Point usage: 5
- Physical: 5 + DEF
- Magic: 0
- Break: 5
- Tags: None
- Effect: Vendetta della Cittadella
- Hit form:
```
Rotating (4 directions <N, E, S, W>) | Hit: All | No lock
X
X
C
```

## Giuramento d'Avorio (Ivory Oath)
Bianca and all allies within 1 tile of her gain +2 Armor and +1 Magic Armor for 4 Turns.

- If a guarded ally moves more than 1 tile away from Bianca, that ally loses the effect immediately. If Bianca moves, the effect ends for everyone.
- When an enemy hits a guarded unit (including Bianca), Bianca counter-attacks (Automatic Interject) for **1 + DEF** Physical damage and reduces that enemy's Break Bar by 2.
  - If the attacker is in the 5x5 square around Bianca, she hits the attacker.
  - Otherwise, she hits the nearest enemy in the 5x5 square around her. Heroes are chosen first.
  - If no enemy is in that square, she does not counter.
  - **Each guarded unit hit counts**: an AoE that hits 3 guarded units triggers 3 counter-attacks (still up to 2 per cast, below).
  - She can counter more than once in the same Turn. Each counter-attack is its own interject, one after another.
  - Damage from stepping onto a hidden unit (Stealth, `statuses.md`) also counts. Stealth ends at that moment, so she can hit that unit if it is in her square.
  - Counter-attacks are **Lock-on**: they skip units in Stealth, even when they are shown (`statuses.md`).
- Counter-attacks do not give Ult Points.
- Up to 2 counter-attacks per cast.
- Does not stack. Casting Giuramento d'Avorio or Vendetta della Cittadella while either is active replaces it and resets the duration and the counter-attack count.

## Vendetta della Cittadella (Citadel's Retribution)
Same as Giuramento d'Avorio, except each counter-attack deals **2 + 150% DEF** Physical damage and reduces that enemy's Break Bar by 3.

- Up to 2 counter-attacks per cast.
- Does not stack with Giuramento d'Avorio. Whichever was cast last replaces the other and resets the duration and the counter-attack count.