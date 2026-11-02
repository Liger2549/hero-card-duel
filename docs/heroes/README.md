# Heroes

## Hero System

### Skills

Each hero has the following skill types. The number of skills varies by hero.

| Type | Description |
|---|---|
| **Passive** | Always active. No activation needed. |
| **Normal Attack** | The hero's basic attack. |
| **Skill** | Active abilities. A hero may have one or more. |
| **Ultimate** | A powerful ability that costs Ult Points. |

- A normal attack, skill or ultimate ends the player's Turn, unless it has the **Free Action** tag (`combat.md` "Turn Flow").
- Each timed effect states its duration in Turns, Own Turns (and whose) (`combat.md` "Durations"). A DOT states Rounds or the target team's Turns (`combat.md` "Damage over Time").
- Statuses that several heroes can use (every DOT) are defined in `docs/statuses.md`. The hero file links to them.
- Every hit form header says **Lock-on** (anchored on `T`) or **No lock** (anchored on `C`) (`board.md` "Anchor").

### Ult Points

- Each hero has two values. Both vary by hero:
  - **Max Ult Points**: how many Ult Points the hero can store.
  - **Ult Point usage**: how many Ult Points one Ultimate costs. It is never more than Max Ult Points.
- A hero can use their Ultimate when their Ult Points are **equal to or higher than** the usage.
- Using the Ultimate subtracts the usage. Any remaining points are kept.
  - Example: Max 8, usage 4. At 8 points the hero can cast the Ultimate twice. At 6 points, one cast leaves 2.
  - A hero whose usage equals their Max (e.g. Max 5, usage 5) needs a full gauge, and casting empties it.
- A hero may cast their Ultimate more than once in the same Turn if they have enough Ult Points.
- Ult Points cannot go above Max. Any extra points gained are lost.
- Ult Points are gained by using skills. Each skill states how many Ult Points it gives.
- Some heroes may have other ways to gain Ult Points. These are described on the hero.
- Some heroes give their Ult Points a different name (e.g. Serie's **Singularity**). It follows the same rules.
- When a hero dies, their Ult Points reset to 0. A hero that respawns starts with 0 Ult Points.

### Equipment

- Each hero has **2 equipment slots**.

### Leveling

- Most heroes do not have a leveling system. Not used for now.

### Death

- When a hero dies, the player who killed it gains its **Bounty** as gold.
- All items held by that hero are **cleared**.
- Some heroes can respawn under their own conditions. These are described on the hero.

```
Bounty = Base Bounty + (Total value of held items / 4)   (rounded, combat.md "General")
```

- Item value is the item's gold price in the shop.

## Hero File Template

Each hero has its own file: `docs/heroes/<hero_id>.md`

```markdown
# [Hero Name]

- **ID**: hero_id
- **Role**: Damage / Support
- **Damage Type**: Physical / Magic
- **Combat Types**:
- **Attack Type**: Melee / Ranged / Mixed (Mixed: say whether it gets the Melee free step)

## Base Stats
Max Hp      :
ATK         :
DEF         :
Speed       :
Move        :
Break Bar   :
Aggro Bar   :
Base Bounty :

## Combat Modifiers
(list only non-zero values)

## Passive: [Name]
- Effect:

## Normal Attack: [Name]
- Mana:
- Physical: 
- Magic: 
- Break:
- Hits: (optional, default 1)
- Ult Points gained: 
- Hit form:

## Skill: [Name]
- Mana:
- Physical: 
- Magic: 
- Break:
- Hits: (optional, default 1)
- Ult Points gained:
- Tags:
- Effect:
- Hit form:

## Ultimate: [Name]
- Mana:
- Ult Point usage: 
- Physical: 
- Magic: 
- Break:
- Hits: (optional, default 1)
- Tags:
- Effect:
- Hit form:

## Respawn (optional)
- Condition:
```