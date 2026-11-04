## Combat System and Others

- Players can hold a maximum of 5 cards in hand.
- A play-area tile can consist of 2 parts: an edge zone (4 directions) and a center zone for cards. The edge zone in each direction is reserved for certain types of skills. Some skill types can stack on the same tile, and a hero or unit can still occupy that tile even while such a skill is present on it.
- Time of day: there are Morning, Day, Evening, Dusk, Night, and Late Night. It cycles forward each round, and the time of day affects dungeons and certain heroes/units.
- Gold: can be spent on items in the shop, and can be obtained from the per-round grant, from dungeons, and from killing enemy heroes/units (based on that unit's bounty value).
- Shop: lets players purchase items for their heroes and additional cards using tokens.
- Dungeon: players may pick any number of cards from up to 3 dungeon options that appear. A dungeon option is a choice made in exchange for a reward — gold, a buff, or items — at the cost of something the player must choose to give up.
- Tower: the base each player must defend on their own side and destroy on the opponent's side. The tower does not occupy a tile on the field — it sits at the edge of the field, on the tiles just off the board in front of its columns. It is aimed at like a tile.
  - Attacking a tower (from the prototype):
    1. Only a **normal attack** can hit a tower.
    2. The attacker must stand in one of the tower's columns.
    3. The attack's range must reach the tower: rows from the attacker to the tower's off-board row ≤ the normal attack's range (1 for melee).
    4. No unit of the tower's team stands between them in the attacker's column.
  - A hit deals Physical + Magic of the normal attack (at least 1). A tower has no DEF, Armor or Magic Armor (see Tower HP).

## Cards

- A deck has 24 cards; a hand holds at most 5. Each card states how many copies of it one deck may hold.
- **Unit cards** (summons) cost the mana on the card. The owner sets card and unit values. Placement follows `board.md` "Placement".
- **A summoned unit's first attack** each Round is cheaper. This applies to units from cards and from hero skills, counted for each unit on its own, and resets every Round. Each unit sheet states:
  - the mana of its first attack in the Round it was summoned (prototype units: free),
  - the mana of its first attack in every later Round (prototype units: 1).
  - Its other attacks cost its normal attack's mana (prototype units: 2).
- Unit cards can be played in the Preparation Phase and the Combat Phase. Other cards only in the Combat Phase (as in the prototype).
- Playing a card does not end the Turn (`combat.md` "Turn Flow").
- **Off-field cards (การ์ดนอกสนาม)**: cards that stay in play off the board after they are played (e.g. a buff for the whole team).
  - Up to 4 active at once per player.
  - Each card states how long it lasts.
  - Each card also states its kind: **once** (buffs the team on the board when played) or **aura** (also buffs units that arrive while it is in play).
  - The enemy can remove one only with a skill or card made for that.

## Shop and Items (from the prototype, for now)

- Gold: 800 at the start of the match, +300 at the start of every later round, plus bounties.
- Each hero has 2 item slots. Items come in 3 tiers; buying an upgrade replaces the lower item it is built from and costs only the difference.
- Selling gives back half of the item's total value. An item's total value is its price plus the total value of the item it is built from.
- **Stash**: 12 slots for items not on a hero.
  - Items move between the stash and heroes only in the Preparation Phase.
  - When a hero dies, only the items on that hero are cleared. The stash is kept.

## Game Modes

### Standard 1v1 Mode

- Player A faces Player B on a 9x9 tile field, with 4 heroes per side (the match config sets the number of heroes per player).
- Each team's zone is its own first 2 rows: A's zone is (0,0)–(8,1), B's zone is (0,7)–(8,8). Rows 2–6 belong to no one.
- There are 3 towers per team, covering columns 1–3, 4–6, and 7–9 (x 0–2, 3–5, 6–8), and their HP increases by 1 unit per round when it has been reduced (see Tower HP).
  - Each tower covers all 3 of its columns: it sits just off its team's edge, next to the 3 edge tiles of those columns.
  - Towers and zones belong to a **team**, not a player. In a 2v2 match there are still 2 teams with 3 towers each, and both players of a team share its zone.
  - Towers exist from round 1.
- **Destroyed tower**: the part of the team's zone in front of that tower (its 3 columns × the 2 zone rows) disappears. Players of that team can no longer place there by zone; placement next to their own heroes/units still works (`board.md` "Placement").

**Tower HP**

A tower's HP is set by **stages**. Each stage starts at a round and lasts until the next stage starts; the last stage lasts for the rest of the match.

| Round | Max HP | Shield by Hits |
|---|---|---|
| 1 | 30 | 5 |
| 2 | 27 | 3 |
| 3 | 25 | – |
| 4 | 23 | – |
| 5 | 21 | – |
| 6 and onward | 20 | – |

- A tower starts the match with full HP and round 1's shield.
- At the start of every following round:
  1. If the tower's HP has been reduced, it gains **1** (never above the max).
  2. The round's stage sets the Max HP. If the new max is lower than the HP, the stage's type from `combat.md` "Max Value Changes" applies. Standard towers use **Clamp**: a tower at 28 HP in round 2 drops to 27.
  3. The round's Shield by Hits is **set** with duration −1 (permanent). It replaces the previous round's set shield, every round. A round without a shield removes it.
- A tower has no DEF, Armor or Magic Armor. Shield by Hits blocks a whole hit and uses 1.
- A tower is destroyed when its HP reaches 0.

**Tower config**: Normal mode always uses the table above. A custom room can change it:
- The stages: the starting round, Max HP, Shield by Hits and Max Value Change type of each. The first stage starts at round 1.
- The regen per round (default 1).
- The HP type for the whole match: **Normal HP** or **HP by Hits** (`combat.md` "HP Types"), never both. With HP by Hits, Max HP is Max HP Hits and each hit lowers it by 1.

**Win Conditions**
- Win by eliminating all of the opposing side's heroes.
- Win by destroying 2 of the opponent's 3 towers.
- A team with no heroes at all has lost.
- There is no draw.
- The win check runs after every action and every end of Turn, from the first Combat Phase on (before that, heroes are still being picked and placed).

**Match config**

There are 2 match modes:
- **Normal**: the standard rules in these docs, unchanged. 4 heroes per player, 2 towers to win.
- **Custom room**: the room can change the match config for that match (e.g. heroes per player, towers to win, tower config, mana, gold, timers), turn the clocks off (no time limit for the draft and the Preparation Phase), set its own **ban order and pick order** (e.g. ABAB), and can **skip the bans**. Each player can have their own number of heroes; the pick order then defaults to A B A B ... with the side that needs more heroes picking the rest at the end.
- A room shows the players (with their names); the host starts the match.
- A hero's Base Bounty comes from the hero (`heroes/README.md`), not from the match config.

#### Before the Game Starts

**Who is A and who is B** depends on the match mode (set in the match config):
- **Normal**: A and B are chosen at random.
- **Custom room**: the room assigns the teams.

Bans and picks are shown to both players as soon as they are made.

1. A chooses the time of day for the game to start (8 seconds).
2. Bans, one at a time (8 seconds each): A, B, A, B. (A Custom room can skip the bans.)
3. Picks, one at a time (8 seconds each):

A picks 1 hero
B picks 1 hero
B picks 1 hero
A picks 1 hero
A picks 1 hero
B picks 1 hero
A picks 1 hero
B picks 1 hero

If a player does not choose in time:
- Time-of-day step: Morning is selected.
- Ban step: that ban is left blank (no hero is banned).
- Pick step: a random hero is assigned from the heroes still available.

A hero that has been banned or picked (by either A or B) cannot be banned or picked again.

A and B review their 24-card deck and build hero items within 60 seconds (players may arrange their deck and build hero items outside of the game, as well as during the ban/pick phase).

#### Game Start

Each round has 2 phases.

##### Preparation Phase

A and B have 45 seconds to prepare on the first round of the game, are given 12 mana orbs every round, 5 cards on the first round (up to 2 cards on subsequent rounds), 500 tokens on the first round (100 tokens on subsequent rounds), and access to the dungeon.
Mana does not carry over between rounds. At the start of each round, each player's mana is reset to 12.
On the first round, heroes may be placed anywhere within the player's own zone. Every player must place all their heroes; heroes still not placed when the Preparation Phase ends are placed at random on free tiles of their team's zone.
From round 2, each hero/unit may move once within its team's zone during the Preparation Phase, for free (`board.md` "Preparation Phase Steps").

In the Preparation Phase both players act at the same time; there are no Turns.

**Hidden preparation**: during the Preparation Phase each player sees the other team as it was when the phase started. Hero placement, Preparation moves, units summoned from cards, items bought and the other player's mana, gold and hand all stay hidden, and their log lines too. Everything shows when the Combat Phase starts.

The Preparation Phase has 2 variants: the Major Phase and the Minor Phase. For now **every round is a Major Phase** (as in the prototype); Minor Phases come with the dungeon design.

Major Phase:
- Includes the shop and the dungeon.
- Has a 20-second preparation time (not counting the first round).

Minor Phase:
- The Combat Phase begins immediately.
- Cards and gold are still distributed.
- The shop and dungeon cannot be accessed.

##### Combat Phase

A player who presses End Round, or who can do nothing on their Turn, is out of the Round; the other player keeps taking Turns alone (`combat.md` "Turn Flow"). The phase ends once every player is out.

**Who starts**: in round 1, **B** starts. In every later round, the player who went out first in the previous round starts.

The Preparation Phase ends when every player is Ready, or when its time runs out.