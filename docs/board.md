# Board Rules

Board size, starting zones, tower positions, and unit limits are defined by each game mode (see `rules.md`). This file covers how tiles and the board work in every mode.

## Tiles

Each tile has two parts:

| Part | Holds | Affects |
|---|---|---|
| **Center** | One hero/unit, and center-type skills | The unit standing on the tile |
| **Edges** (4 directions: N, E, S, W) | Edge-type skills (e.g. walls, traps) | Units moving across that edge |

- A skill states whether it is placed on the center or on an edge.
- Some skill types can stack on the same tile or edge. Each skill states whether it can stack.
- A hero/unit can still occupy a tile that has skills on it.

### Coordinates

- Tiles are written as `(x, y)`. `(0, 0)` is the **bottom-left** tile; x increases to the right (E), y increases upward (N).
- An area such as a zone is written as a rectangle from its bottom-left tile to its top-right tile, both included.

## Occupancy

- A tile's center can hold only **one** hero/unit at a time.
- A hero/unit **cannot** step onto a tile occupied by an enemy.
- **Swap**: If a hero/unit steps onto a tile occupied by an ally, the two swap positions: the ally is placed on the tile the moving unit stepped from.
  - A swap counts as a step for **both** units: each uses 1 of its remaining Move.
  - The swap costs the **sum of both units' step costs** (moving unit's step cost + ally's step cost).
  - A swap is not allowed if the ally has no Move left.

## Movement

- A hero/unit moves **1 tile per step**. Moving more than 1 tile is done as several steps in a row.
- Every hero/unit steps in **8 directions** (N, NE, E, SE, S, SW, W, NW). A diagonal step also moves 1 tile.
- **Move** is a stat with two values:
  - **Base Move**: the hero/unit's stat (e.g. `Move: 1` on the hero sheet).
  - **Remaining Move**: how many steps it can still take right now. Each step uses 1. It cannot step with 0 Remaining Move.
- Remaining Move refills to Base Move at the end of every Turn. With `Move: 1`, a hero/unit takes 1 step per Turn. Only cards, passives and skills can give more.
- In one Turn, a player may move **any number** of their heroes/units. Moving does not end the Turn.
- A step is blocked by board edges, enemies, and edge-type skills that block movement.

### Step Cost

- Each hero/unit has a **Step Cost** stat: the mana one of its steps costs. Default **1**. Cards and skills can change it with a stat modifier (e.g. Override 0 = free steps).
- **Melee free step**: the **first step** a Melee hero/unit takes in each Round costs **0** mana. Its later steps that Round cost its Step Cost. Ranged heroes/units always pay their Step Cost. The free step comes back at the start of every Round.
  - Each hero/unit sheet states its **Attack Type**: **Melee**, **Ranged** or **Mixed**. A Mixed sheet also states whether it gets the free step.
- Every hero/unit pays for its own step. Moving 3 units in one Turn costs the sum of their 3 step costs.
- A swap is a step for both units, so it costs both units' step costs (see Occupancy). A Melee ally that still has its free step pays 0 for its part.

### Preparation Phase Steps

- Round 1: heroes are **placed**, not stepped (`rules.md` "Preparation Phase").
- From round 2, in the Preparation Phase each hero/unit may **move once**, to any free tile of its team's zone. Distance and direction do not matter, and it costs **no mana**. It does not use up the Melee free step of that Round.
  - It must stay inside its team's zone, and cannot end on a part of the zone that has disappeared (destroyed tower, `rules.md`).
  - A hero/unit standing outside its team's zone cannot move in this phase.

### Undo

- During their own Turn, a player can **undo** steps, newest first, before ending the Turn.
- Undoing a step returns the unit (and any swapped ally) to where it was, gives back the Remaining Move it used, and refunds that step's cost. If the step used a Melee free step, the free step comes back too.
- Steps can no longer be undone once the player does any non-move action (attack, skill, card), or once a step triggers a reaction (e.g. an automatic interject).

## Range

- Range is measured with **Manhattan distance**: horizontal tiles + vertical tiles.
- Diagonal movement does not change how attack/skill range is measured, unless the skill states otherwise.
- **Off-board objects** (e.g. towers at the board edge) are treated as adjacent to the edge tiles next to them. Range to an off-board object = Manhattan distance to the nearest of those edge tiles + 1.

## Placement

- Summons and unit cards can be placed on an **empty** tile that is either:
  - Inside the player's own zone, or
  - Adjacent (8 directions) to any of the player's own heroes/units, including summons.
- Enemy heroes/units do not affect placement: being next to one neither allows nor blocks it.
- Placement costs mana, as stated on the card.

## Skill Areas

Each skill draws its area directly on the skill, as a small grid.

### Notation

| Symbol | Meaning |
|---|---|
| `C` | Caster |
| `T` | Target tile (for skills aimed at a tile within range) |
| `X` | Tile hit (Hit: All) |
| `1`, `2`, `3` ... | Tile hit, in travel order (Hit: First) |
| `a`, `b`, `c` ... | Tile hit, in a damage zone (Hit: All). Each zone lists its own damage. |
| `.` | Not hit |

### Anchor

- A skill's area is centered either on the **caster** (`C`) or on a **target tile** (`T`) chosen by the player within the skill's range.

### Direction

- **Rotating** areas are drawn facing up. When casting, the player chooses a direction and the area rotates to face it.
  - By default, a Rotating area uses the hero's movement directions. Every hero moves in 8 directions, so the default is all 8 (N, E, S, W and the diagonals).
  - A skill can override this by stating its own directions, e.g. **Rotating (8 directions)** or **Rotating (4 directions)**.
- **Fixed** areas do not rotate.
- Each skill states whether its area is Rotating or Fixed.
- Only draw up to the farthest tile the skill reaches. Empty rows are not needed.

### Hit Types

- **All**: Every enemy on a tile marked `X` is hit.
- **First**: The area is made of one or more **lanes**. Each lane is a projectile that travels through its tiles in number order and hits only the **first enemy** it reaches, then stops.
  - A projectile passes through allies.
  - A projectile is blocked by edge-type skills that block movement (e.g. walls). It stops there and hits nothing.
  - If a lane reaches its last tile without meeting an enemy, it hits nothing.

Example (Rotating, Hit: First, 3 lanes):

```
3 3 3
2 2 2
1 1 1
. C .
```

### Falloff

- A skill may reduce damage the farther it reaches, using a **Falloff** tag.
  - **Hit: First**: measured by the tile number where the projectile hits. Tile 1 deals full damage.
  - **Hit: All**: measured by distance from the anchor (`C` or `T`). The closest tiles deal full damage.

**Fixed falloff** — the same reduction for every extra step:

- **Falloff −N**: each step after the first reduces damage by N.
  - Example: Physical 5, Falloff −1 → step 1: 5, step 2: 4, step 3: 3.

**Varied falloff** — a different total reduction at each step:

- **Falloff −a, −b, −c ...**: the listed values are the **total** reduction at step 2, step 3, step 4, and so on. Step 1 always deals full damage.
  - Example: Physical 6, Falloff −1, −4 → step 1: 6, step 2: 5, step 3: 2.
  - If a skill reaches farther than the list, the last value is used for all remaining steps.

**General falloff rules**

- Falloff can be limited to one damage type, e.g. **Falloff −1 (Magic)**. Without a type, it applies to both Physical and Magic.
- Different types can have different falloff, e.g. **Falloff −1 (Physical); −1, −3 (Magic)**. Use `;` to separate types.
- Falloff is applied after zone values and before mitigation. It does not affect Break.
- Falloff only reduces damage types a tile already has, and cannot reduce them below **1**.
- Falloff values are integers.

### Zones

- A **Hit: All** skill may split its area into zones using lowercase letters (`a`, `b`, ...). Lowercase is used so zones are not confused with `C` (Caster) and `T` (Target).
- Each zone lists its own Physical, Magic and (optionally) Break values.
- Values not listed in a zone use the skill's main values.
- Ult Points are gained once per skill use, not per zone.

Example (Rotating, Hit: All):

```
b
b
a
C
```

- Zone a: Physical 2, Magic ATK
- Zone b: Magic ATK

### General

- Skills hit **enemies only**, unless the skill states it also hits allies.
- Tiles outside the board are ignored.
- A unit is hit at most **once** per skill use, even if more than one lane or tile reaches it. A skill with **Hits: N** hits that unit N times (see Hits in `combat.md`).
- Each unit hit takes damage using the Damage Resolution rules in `combat.md`.