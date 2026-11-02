# Bianca

An Italian armored girl named Bianca, whose left gauntlet can turn into a shield.

- **ID**: hero_id
- **Role**: Damage
- **Damage Type**: Physical
- **Combat Types**: Counter-based, Single-target
- **Attack Type**: (not set yet: Melee / Ranged / Mixed)

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
  - +1 Armor per 1 DEF
  - +1 Magic Armor per 2 DEF
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
- When an enemy attacks a guarded unit (including Bianca), Bianca counter-attacks for **1 + DEF** Physical damage and reduces that enemy's Break Bar by 2.
  - If the attacker is within 1 tile of Bianca, she hits the attacker.
  - Otherwise, she hits the nearest enemy within 1 tile of her. Heroes are chosen first.
  - If no enemy is within 1 tile of her, she does not counter.
  - Counter-attacks are **Lock-on**: they skip units in Stealth, even when they are shown (`statuses.md`).
- Counter-attacks do not give Ult Points.
- Up to 2 counter-attacks per cast.
- Does not stack. Casting Giuramento d'Avorio or Vendetta della Cittadella while either is active replaces it and resets the duration and the counter-attack count.

## Vendetta della Cittadella (Citadel's Retribution)
Same as Giuramento d'Avorio, except each counter-attack deals **2 + 3 per 2 DEF** Physical damage and reduces that enemy's Break Bar by 3.

- Up to 2 counter-attacks per cast.
- Does not stack with Giuramento d'Avorio. Whichever was cast last replaces the other and resets the duration and the counter-attack count.