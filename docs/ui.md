# UI

Layout of the client. The owner designs the look; this file records what goes where.

## Match screen

```
 [ action order: interjects  ]   [   clock: time of day, Round, Turn   ]
 [Shop | Dungeon | Team buffs]   [ enemy hand: card backs only         ]
 (collapsible)                                                            [ selected unit stats ]
 [ hero cards x4 + items     ]
 [ stash                     ]          [     board 9x9     ]             [ skills              ]
 [ log                       ]                                            [ Undo | End Turn     ]
                                 [ hand: pops up from the bottom edge ]
```

- **Clock** (top center): a half dial that turns to show the time of day (`rules.md`). Also shows the Round, whose Turn it is, the Preparation Phase timer and Major / Minor Phase.
- **Enemy hand** (between the clock and the board): one card back per card the opponent holds. Only the count is shown; the server never sends the cards themselves.
- **Action order** (top left, above the tabbed panel): pending interjects in resolution order, with Turns left (`combat.md` "Action Order", "Interject").
- **Board** (center): 9x9, the player's own side at the bottom. Towers sit on the edges and show their HP.
- **Left column**, top to bottom:
  - **Tabbed panel**, can be collapsed: Shop, Dungeon, and (planned) Team buffs. Shop and Dungeon only work in a Major Phase.
    - When the Combat Phase starts, the panel switches to the Team buffs tab by itself.
    - While collapsed, its tab bar still shows the active team buffs as small icons; hovering one shows its details.
  - **Hero cards** (one per hero): portrait, HP, Break Bar, Ult Points, 2 item slots, Melee free step marker, statuses.
  - **Stash**: items not on a hero (rule not written yet, see `ideas.md`).
  - **Log**: what happened, with damage numbers.
- **Right column**:
  - **Selected unit**: stats of the clicked unit, ally or enemy, with statuses and time left (Turns / Own Turns / Rounds), shields, Break Bar.
  - **Skills**: one button per skill with its mana cost. Hovering a skill shows its hit form on the board. Undo and End Turn buttons. End Turn takes the player out of the Round, so it asks for confirmation.
  - **Several targets** (e.g. Valen's Sword of Justice): each chosen tile shows how many times it was picked (×2, ×3); clicking a tile again adds another.
  - **Damage preview**: while a skill is aimed at a target, the stats panel shows how much HP each affected unit would lose or gain (and Break, shields), before the player confirms. The engine works it out by running the action on a copy of the state, so the preview always matches what will happen, counter-attacks included.
- An "out of the Round" marker next to a player who has pressed End Turn.
- **Hand** (max 5 cards): hidden at the bottom edge; hovering the bottom edge pops it up.
  - While hidden, a thin strip shows the card count (e.g. 3/5), so players know the hand is there.
  - It drops back down while a card is dragged onto the board, so it never covers the player's zone.
  - On touch screens, tap the strip to open it.

## Animations

Every action animates instead of resolving at once: the client plays the engine's events (`packages/engine/src/events.ts`) one by one. Generic animations first (move, hit, damage number, status, death); per-hero animations later.

## Other pages

- **Hero viewer**: every hero's stats, skills and hit forms, built from the content data.
- **Deck builder**: arrange the 24-card deck.
- **Match setup**: Normal or Custom room.

## Not decided

- Where the mana (12 orbs) is shown.
- Where the enemy's heroes are listed, or only by clicking them on the board.
