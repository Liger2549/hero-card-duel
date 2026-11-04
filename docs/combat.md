# Combat Rules

## General

- All values are integers.
- **Rounding**: any result that is not a whole number (division, %, stat modifiers) is **rounded to the nearest whole number**, looking only at the first 2 decimal places (.50 and above rounds up). This applies unless a rule states otherwise.
  - Stats are rounded when they are worked out (Stat Modifiers). Inside a formula, round **once, at the end** of that formula, not after each step.
  - A value on a skill (e.g. "Break: 2 + 150% ATK") is also rounded when it is worked out, before it goes into the Damage, Break or Heal formula. Example: Falka (ATK 5) Shatter Round Break = 2 + 7.5 = 9.5 → 10.
  - Example: 120% of ATK 4 = 4.80 → 5. 25% of ATK 3 = 0.75 → 1. 30% of ATK 4 = 1.20 → 1. 7 / 2 = 3.50 → 4. 2.495 is read as 2.49 → 2.
- Scaling effects may be written as a percentage of a stat (e.g. "75% ATK") or as steps (e.g. "+1 per 3 ATK"). Steps count only whole steps (ATK 5 gives 1 step of 3).

## Terms

| Term | Definition |
|---|---|
| **Round** | One full combat phase. Ends when all players have declared "end turn". |
| **Turn** | One player's turn within a Round. Every player's Turn counts (A → B → A = 3 Turns). |
| **Own Turn** | A Turn in which a given hero/unit used its turn: it did a normal attack, skill or ultimate. Moving does not count. See Turn Flow. |
| **Action** | A single use of a skill, attack, or move by one hero/unit. |
| **Hit** | One landing of an attack or skill on one unit. See Hits. |

## Turn Flow

- In a Turn, the player may move any number of heroes/units (`board.md` "Movement"), then do **one** normal attack, skill or ultimate. That ends the Turn. The player can also end the Turn without acting.
- **Free Action**: a skill with this tag does not end the Turn. The player may then act again or end the Turn.
- **Playing a card** does not end the Turn.
- **End Turn button**: ends the Turn; the other player goes next.
  - The player must have taken at least **1 step** this Turn (an undone step does not count) before pressing End Turn. If none of their heroes/units can step at all, End Turn is allowed without one.
- **End Round button**: the player is **out of the Round**. The other player keeps taking Turns alone until they also go out.
- A player who **can do nothing** when their Turn would start (no possible step or Action) goes out of the Round automatically.
- The Round ends when every player is out (`rules.md` "Combat Phase").
- A hero/unit **uses its Own Turn** when it does a normal attack, skill or ultimate in a Turn. A Free Action does not use it. A hero/unit uses at most one Own Turn per Turn.

## Durations

Buffs, debuffs, shields and other timed effects state their duration in one of three ways:

- **Turns** (the default): counts every Turn, whoever's it is.
- **Team Turns**: counts only the Turns of one team. The skill states whose (e.g. the caster's team). Example: Falka's Scanner lasts 3 Turns of her team.
- **Own Turns**: counts only the Turns in which a hero/unit uses its Own Turn. The skill states whose Own Turns count (e.g. the unit that has the effect, or its caster).

All kinds:
- The Turn in which the effect is applied is **not counted**. Counting starts with the next Turn (or the next Team Turn or Own Turn).
  - Example: on A's Turn, Bianca gives Valen a buff for 2 Turns. It counts down at the end of B's Turn and at the end of A's next Turn, then ends.
- A duration of **-1** means permanent.
- These rules do not apply to crowd control (Recovery, see Crowd Control) or DOT (see Damage over Time).

## Hits

- A normal attack or skill is **1 hit** unless it states **Hits: N**. Then it hits each target N times.
- Each hit is resolved on its own: its own damage, shields, Life Steal and on-hit effects.
- **Break is not per hit.** The Break Bar is reduced once per action, by that normal attack's or skill's Break value, however many hits it has.
- These are **not hits**: DOT ticks, Collapse damage and Break DMG.

## HP Types

Each hero/unit has one of two HP types.

- **Normal HP**: each hit or other damage lowers HP by the damage dealt.
- **HP by Hits**: the unit has **Max HP Hits** instead of Max HP.
  - Each hit lowers it by **1**, whatever the damage, even if the damage is 0 after mitigation.
  - Damage that is not a hit (DOT, Collapse, Break DMG) does not lower it.
  - Healing from skills, cards and items never restores it. Only a unit's own self-healing ability (stated on that unit) can restore HP Hits, never above Max HP Hits.
  - **Shield by Hits** blocks hits one by one. Only the hits it does not block lower HP Hits.
    - Example: a 5-hit action against a unit with 3 Shield by Hits and 3 HP Hits. 3 hits are blocked, 2 land, and the unit has 1 HP Hit left.
  - **Shield by Damage** counts the whole action together. All hits of the action reduce the shield first.
    - If the shield holds, HP Hits does not change (unless the action has Shield Penetration, see Shield Keywords).
    - If the action breaks the shield, the unit loses HP Hits equal to the action's **full hit count**.
    - Example: a 5-hit action breaks the shield. The unit loses 5 HP Hits.
  - **Both shields at once**: the unit loses HP Hits only for the hits that land after it has **no shield left**.
    - Example: 3 HP Hits, Shield by Hits 3, Shield by Damage 10. A 5-hit action deals 4 to the shield per hit. Hits 1–3 use up Shield by Hits and break Shield by Damage (10 → 6 → 2 → broken). Hits 4–5 land on no shield, so the unit loses 2 and has 1 HP Hit left.
- **Heroes always have Normal HP.** Only non-hero units can have HP by Hits.
- A hero/unit dies when its HP (or HP Hits) reaches 0.

## Action Order

- During their own Turn, a player may act with any of their heroes/units. Speed does not restrict this. (One Action ends the Turn unless it is a Free Action, see Turn Flow.)
- Each hero/unit has an **Action Count** that increases by 1 every time it performs an Action (normal or interject) within the current Turn.
- Action Value is calculated and **stored when the Action is cast or triggered**. The stored value is used when it resolves.

```
Action Value = Action Count × 10,000 / Speed   (rounded UP)
```

- All Action Counts reset to 0 at the end of each Turn. Stored Action Values of pending Actions are not affected by the reset.

### Resolution Order

When more than one Action resolves at the same point (e.g. interject skills landing on the same Turn, or automatic interjects triggered by the same event), they resolve in this order:

1. **Lower Action Value** resolves first.
2. If Action Values are equal, the Action that was **cast or triggered first** resolves first.
3. **Exception**: if Action Values are equal and all of those Actions have the **Resonance** tag, they resolve **simultaneously**.

## Interject

There are two kinds of interject.

- **When**: an interject always resolves **when a Turn ends**: right after that Turn's Action. Then the end-of-Turn countdowns run (CC, buffs, shields) and Turn DOTs tick **last**, before the next Turn starts. An interject triggered during a Turn (even by a Free Action) waits until that Turn ends. Interjects that resolve then may trigger more, which resolve right after.
- A skill that "interjects in a Turn" (e.g. Zoran's lantern, Leilani's wave, Ribu's Core, Pley's dive) resolves when that Turn ends.
- **A choice while resolving**: some interjects let their player choose something as they resolve (e.g. Pley's dive tile). The game waits for that player; nothing else happens until they choose. When the timer runs out, the skill's time-out pick is used. Then the rest of the Turn's end goes on.

### Manual Interject (player-activated)

- Can only be cast during the caster's owner's own Turn.
- Each manual interject skill states a delay: it resolves **N Turns** after being cast. The Turn it was cast in is not counted (as in Durations).
- The target is locked to a **tile** when cast, not to a unit. Units can move out of the targeted tile before it resolves.
- Targeted tiles and remaining Turns must always be visible on the board.

### Automatic Interject (skill-triggered)

- Triggers by itself when its condition is met (e.g. a counter-attack when hit), **on any player's Turn**.
- Uses the same Action Count, Action Value and Resolution Order rules as other Actions.

### Fizzle

- If the caster is killed or crowd-controlled before an interject resolves, it fizzles.
- A crowd-controlled unit cannot trigger automatic interjects.

## Damage Resolution

- **ATK** is the normal attack value.
- **Physical ATK** and **Magic ATK** are derived from ATK. How each is scaled is defined per hero/unit skill.
- **Penetration** reduces the target's Armor and Magic Armor by a flat amount for this attacker's hits only (minimum 0). It does not reduce DEF or shields.
- **Armor Shred%** (attacker) multiplies the target's Armor and Magic Armor before Penetration.
- **Physical Taken%**, **Magic Taken%** and **Damage Taken%** (target) multiply the damage the target takes. All % stats are 100% by default (see "% Multipliers").

```
Effective Armor       = max( Armor × Armor Shred% − Penetration, 0 )
Effective Magic Armor = max( Magic Armor × Armor Shred% − Penetration, 0 )

Physical part = max( Physical ATK − Effective Armor, 0 ) × Physical Taken%
Magic part    = max( Magic ATK − Effective Magic Armor, 0 ) × Magic Taken%

Damage = max( (Physical part + Magic part − DEF) × Damage Taken%, 0 )
```

- Example: Physical 10, Magic 4, Penetration 1, Armor Shred 50% against Armor 4, Magic Armor 2, DEF 1, Physical Taken 80%.
  Effective Armor = 4 × 50% − 1 = 1. Effective Magic Armor = 2 × 50% − 1 = 0.
  Physical part = 9 × 80% = 7.2. Magic part = 4. Damage = (7.2 + 4 − 1) × 100% = 10.2 → 10.

## Resonance

- When resonating Actions resolve simultaneously (see Resolution Order), their damage is combined **per target**.
- For each target, only the resonating skills that actually hit that target are counted.

```
n   = number of resonating skills that hit this target
Raw = ( Σ(raw damage of those skills) × floor(log2(n))
      + Σ(Resonance Boost of each hero whose skill hit this target) )
    × Resonance Power%

Resonance Power% = 100% + Σ(each of those heroes' Resonance Power% − 100%)
                   (e.g. 120% and 110% → 130%)

Resonance Damage = Raw, then mitigated once as normal
                   (Penetration, Armor, Magic Armor, DEF)
```

- `floor(log2(n))` is calculated with integers (highest power of 2 not greater than n), not floating point.
- Resonance Damage **replaces** the normal damage of those skills on that target.

| n | Multiplier |
|---|---|
| 2–3 | 1 |
| 4–7 | 2 |
| 8–15 | 3 |

## Crowd Control

- Crowd-control statuses (Stun, Silence, Root, Slow) state their strength as a **Recovery value** instead of Turns (e.g. Stun 300).
- What each does (from the prototype, for now):
  - **Stun**: cannot step or act.
  - **Root**: cannot step (and cannot be swapped).
  - **Silence**: cannot use skills or the ultimate; the normal attack still works.
  - **Slow**: each step costs 1 more mana.
- When a CC status is applied:

```
Remaining Recovery = max( Recovery value × CC Taken% − Tenacity, 0 )
```

- At the end of **every Turn**:

```
Remaining Recovery = Remaining Recovery − Speed   (current Speed)
```

- The CC ends when **Remaining Recovery < current Speed**.
- Changes during the CC take effect immediately:
  - Speed buffs/debuffs change how much is removed at the end of each following Turn.
  - Tenacity buffs/debuffs are subtracted from / added to Remaining Recovery by the amount of the change.
- **Tenacity**: A flat value subtracted from the Recovery value of CC statuses on this unit. Positive Tenacity shortens CC; negative Tenacity (debuff) lengthens it.
- If the same CC is applied to a unit that already has it, the **higher** Remaining Recovery is kept. They do not stack.
- Remaining Turns shown on the UI = Remaining Recovery / current Speed.
- Example: Stun 300, Speed 100 → 200, 100, 0 → ends after 3 Turns. With Tenacity 100 → ends after 2 Turns.
- **Cleanse** effects (skill keyword) remove CC immediately.

## Break

- Each hero/unit has a fixed **Max Break Bar** value. It is not derived from HP or ATK.
- Each skill and normal attack states a **Break** value: how much it reduces the target's Break Bar.

```
Break Bar reduction per action = max( (Break + Break Boost) × Break Power% × Break Taken%
                                      − Break Resistance, 1 )
Break DMG dealt = ( max(Target Max Break Bar / 5, 1) + attacker's Break DMG Bonus )
                  × attacker's Break DMG Power%
```

- When the Break Bar reaches 0, the hero/unit:
  - Takes **Break DMG** from the attacker whose action broke it. Break DMG is dealt once and is not reduced by DEF, Armor or Magic Armor.
  - Receives **Stun 500** (the same Stun as any other, following Crowd Control rules).
- When that Stun ends, the Break Bar refills to full.
- Some skills and cards **restore** the Break Bar (never above Max Break Bar). While a unit is broken (until its Break Stun ends), restoring does nothing.
- If Max Break Bar increases during the game (e.g. from an item), the current Break Bar increases by the same amount. If it decreases, the current Break Bar cannot exceed the new maximum.

## Damage over Time (DOT)

- A DOT status deals damage to its target on every tick, for its duration. The duration is the number of ticks.
- DOTs that more than one hero can use are defined in `statuses.md`.
- Each DOT is one of two kinds:
  - **Round DOT**: ticks at the **end of every Round** (when the Combat Phase ends). Its duration is in **Rounds**. The first tick happens at the end of the Round the DOT was applied in.
    - Example: in round 3, a hero applies a Round DOT for 2 Rounds. It ticks at the end of round 3 and at the end of round 4, then expires.
  - **Turn DOT**: ticks at the **end of each Turn of the target's team**, after that Turn's interjects (DOT is the last thing in a Turn). Turns of the applier's team do not count. Its duration is in those Turns. The Turn it was applied in is not counted.
    - Example: on A's Turn, Karas applies Nocturnal Flame for 2 Turns to a hero of B. It ticks at the end of B's next Turn and at the end of B's Turn after that, then expires.
- Each DOT states its **Damage** per tick. DOT damage has no type (not Physical or Magic).
- The damage per tick is calculated and **stored when the DOT is applied**, using the applier's stats at that moment (ATK, DOT Boost).
- DOT damage **ignores shields**. It goes straight past Shield by Damage and Shield by Hits and does not reduce either of them.
- DOT damage **ignores DEF, Armor and Magic Armor** (so Penetration has no effect on it). It is reduced only by Fortitude:

```
DOT Damage  = (Damage per tick + DOT Boost) × DOT Power%      (applier's, when applied)
Tick Damage = max( DOT Damage × DOT Taken% − Fortitude, 1 )  (target's, on every tick)
```

- The target's Fortitude is checked **on every tick**, so buffs and debuffs on the target take effect immediately.
- Every tick deals at least **1 damage**.
- A DOT tick is **not an attack or a hit**. It does not trigger counter-attacks, Life Steal or on-hit effects.
- A DOT tick does not reduce the Break Bar, unless that DOT states its own **Break** per tick (e.g. Nocturnal Flame).
- **Stacking is per applier**:
  - The same applier applying the same DOT again replaces its own copy (new damage and full duration).
  - The same DOT from different appliers stacks. Each copy ticks on its own: its own damage, DOT Taken%, Fortitude and 1-damage minimum, and its own Break if the DOT has one.
  - Different DOTs stack.
  - Example: Karas's Nocturnal Flame (2) and Zoran's Nocturnal Flame (1) on a target with Fortitude 1. Each tick: Karas's copy deals max(2 − 1, 1) = 1, Zoran's copy deals max(1 − 1, 1) = 1. Total 2 per tick.
- If the applier dies, their DOTs keep ticking until they expire.
- **Cleanse** removes DOT statuses only if the Cleanse skill says so.

## Other Statuses

- **Fortitude**: Reduces DOT damage per tick by a flat amount (see Damage over Time).
- Non-CC statuses (buffs, debuffs) state their duration in Turns or Own Turns (see Durations). DOT states it in Rounds or in the target team's Turns (see Damage over Time).

## Shields

- Shields are granted by skills, cards and items during the game. A shield's current amount is the unit's runtime state, not a stat.
- A skill either **adds** a shield or **sets** it:
  - **Add**: the amount is added to the current shield.
  - **Set**: replaces only the previous **set** shield of that type, even if the new one is lower. The latest set wins. Added shields are not replaced.
  - The total shield is the latest set + every add.
  - Example: hero A sets 5, hero B adds 3 → 8. Then hero B sets 3 → B's set 3 + B's add 3 = 6.
- **Duration**: each shield lasts the number of Turns (or Own Turns) stated by the skill, card or item that gave it (see Durations). Every shield counts down on its own and is removed when it reaches 0.
  - A duration of **-1** means permanent: the shield never runs out and lasts until it is used up.
  - A set replaces the previous set shield along with its duration.
  - The duration is only how long the shield lasts. The shield does not refill or grow each Turn.
  - If a shield is used up (reaches 0) before its duration ends, it is gone. It does not come back.
  - When a unit has more than one shield of a type, **added shields are hit first, oldest first, and the set shield is always hit last**. Damage that is left over moves on to the next shield.
    - Example: the unit gets set 10, then add 2, then add 3. A 6-damage hit uses up add 2, then add 3, then takes 1 from the set, leaving set 9.
- **Shield by Damage**: Absorbs incoming damage before DEF, Armor and Magic Armor are applied. Each hit reduces the shield by:

```
Shield reduction per hit = Physical ATK + Magic ATK
```

  - If the hit is larger than the remaining shield, the shield **breaks** and the extra damage goes through to HP, mitigated as normal (DEF, Armor, Magic Armor).
  - **Which damage goes through**: the shield absorbs the hit's **lower** damage type first, then the higher one. So the extra damage that goes through is of the higher type. If both are equal, the shield absorbs Magic first, so the extra damage that goes through is Physical.
    - Example: a hit of Physical 2 + Magic 6 against a shield of 5. The shield absorbs Physical 2, then Magic 3, and breaks. Magic 3 goes through to HP and is reduced by Magic Armor.
- **Shield by Hits**: Blocks a set number of hits entirely. Each blocked hit uses 1.
- **Both shields at once**: a hit reduces **both at the same time**. It uses 1 Shield by Hits and reduces Shield by Damage as above. While Shield by Hits blocks the hit, nothing goes through to HP.
- **Break Bar**: if the shield holds through the whole action, the Break Bar is not reduced. If the action breaks the shield, the Break Bar is reduced by that action's Break as normal.
- Shields do not block or absorb DOT damage (see Damage over Time).
- Penetration does not affect shields.

### Shield Keywords

These are skill keywords defined per skill, not stats.

- **Shield Breaker N**: each hit reduces Shield by Damage by N more than normal. It has no effect on Shield by Hits.
- **Shield Penetration N**: up to N of each hit's damage skips the shield and goes straight to HP, mitigated as normal. The rest of the hit hits the shield as usual.
  - Against HP by Hits: if the action has Shield Penetration above 0, the unit loses HP Hits equal to the action's hit count, even while Shield by Damage holds.

## Aggro

- **Aggro Bar**: When full, the hero/unit is **Taunted** by the source:
  - It cannot move to other tiles.
  - It can only use normal attacks, targeting the source.
- The effect ends and the Aggro Bar resets to 0 after it attacks the source.
- The effect also ends if the source moves out of its attack range.

## Healing

- **Life Steal**: Each hit that lowers the target's HP (after shields) heals the attacker by the amount below. A hit fully absorbed by shields, or that deals 0 damage, heals nothing. On-hit effects still apply.

```
Life Steal heal = min( max(Life Steal × Drain Taken% − Life Steal Resistance, 0),
                       HP damage dealt by this hit )
```

- Drain Taken% and Life Steal Resistance are the target's.
- The heal is never more than the HP the hit took away (after shields).
  - Example: Life Steal 15. A hit that takes 3 HP heals 3. A hit that takes 9 HP heals 9. A hit that takes 20 HP heals 15.
- Life Steal does not go through the Heal formula below.

- **Heal** from skills, cards and items:

```
Heal = ( (Base heal + Healing Bonus) × Healing Power% + Healing Received ) × Healing Taken%
```

- Healing Bonus and Healing Power% are the healer's. Healing Received and Healing Taken% are the receiver's.
  - Example: Zoran heals 2 (Healing Bonus 0, Healing Power 100%) on Pley (Healing Taken 25%): 2 × 25% = 0.5 → 1.

## Max Value Changes

These rules apply to **Max HP**, **Max HP Hits** and **Max Break Bar**, on heroes, units and towers.

- **When a max goes down** below the current value, the effect or system that lowers it states one of these types:

| Type | What happens to the current value |
|---|---|
| **Clamp** | Drops to the new max right away. |
| **Decay N** | Stays above the max and loses N at the end of every Turn until it reaches the max. |
| **Keep** | Stays above the max. |

- If a later change lowers the max again, its type replaces the earlier one.
- **When a max goes up**, the current value does not change. An effect that should also raise it does so with its own heal or restore, together with the max increase (e.g. Max Break Bar items, see Break).
- While the current value is above the max:
  - Healing and restoring do nothing. They never lower it.
  - Damage works as normal. Once the value is at or below the max, Decay stops.
- **Aggro Bar** and **Remaining Move** do not use these types. When their max goes down, they are always capped at the new max.
  - A capped Aggro Bar that is now full counts as full: the unit is Taunted.
  - Remaining Move refills to Base Move at the end of every Turn.

## Stat Modifiers

- Buffs, debuffs and items change stats with modifiers. Each one is **Flat**, **Additive %**, **Multiplicative** or **Override**, and lasts a number of Turns or until it is removed (e.g. an item).

```
Final stat = (Base + all Flat) × (1 + all Additive %) × every Multiplicative
```

- **% values are written as a multiplier where 100% is normal.** A stat at 80% is × 80%; at 120% it is × 120%. Buffs and debuffs move it by percentage points: 100% + 20% − 10% = 110%. It never goes below 0%.
  - In the formula above, `(1 + all Additive %)` is this value (e.g. +20% → 120%).
- **Override** fixes the stat to its value, ignoring the others. If there is more than one, the latest wins.
- Final stats are rounded (see General "Rounding"), so every stat is a whole number.
- A final stat is never below 0, except **Tenacity** (it can be negative). **Speed** is at least 1.
- A modifier that lowers Max HP, Max HP Hits or Max Break Bar (when it is added, or when a buff that raised it ends) states its type from Max Value Changes.

---

# Stats

## Core Stats

| Stat | Average |
|---|---|
| Max HP | 20 |
| ATK | 4 |
| DEF | 0 |
| Speed | 100 |
| Break Bar | Fixed value per hero. Guideline when designing: about 50-75% of Max HP |
| Aggro Bar | 5 |

## Combat Modifiers

- Shield by Hits
- Shield by Damage
- Armor (Physical Resistance)
- Magic Armor (Magic Resistance)
- Penetration
- Healing Bonus
- Healing Received
- Life Steal
- Life Steal Resistance
- Break Boost
- Break DMG Bonus
- Break Resistance
- Resonance Boost
- Tenacity
- Fortitude
- DOT Boost

## % Multipliers

Every % stat is 100% by default (100% = normal, see Stat Modifiers). They multiply a formula's result, not a stat.

| Dealer's | Used in | Receiver's | Used in |
|---|---|---|---|
| Armor Shred% | Damage Resolution | Physical Taken% | Damage Resolution |
| Break Power% | Break | Magic Taken% | Damage Resolution |
| Break DMG Power% | Break | Damage Taken% | Damage Resolution |
| DOT Power% | DOT | Break Taken% | Break |
| Resonance Power% | Resonance | DOT Taken% | DOT |
| Healing Power% | Healing | Drain Taken% | Healing (Life Steal) |
| | | Healing Taken% | Healing |
| | | CC Taken% | Crowd Control |

- A % of a stat itself (e.g. Armor 150% = Armor × 150%) is a Stat Modifier, not one of these.

---

# Hero Combat Types

- Single-target
- Burst
- Rapid Strikes
- AoE
- Break
- Counter-based
- Interject
- Resonance
- DOT
- Penetration
- Healer