# Decisions

Answers the owner gave to rule questions, newest first. The rule docs already include them; this file says when and why they changed.

## 2026-11-02 — Towers, draft, phases

- **CC effects** follow the prototype for now (`combat.md` "Crowd Control").
- **Valen's swords** may land on the same tile; each sword is its own hit. The UI shows how many swords each tile has.
- **Towers**: attack rules from the prototype (normal attacks only, from the tower's columns, within range, nobody of the tower's team in between); HP from the docs table; towers exist from round 1.
- **Bans are simultaneous** (2 each), shown at once; a hero the opponent banned cannot be banned again. Picks stay one at a time.
- **Every round is a Major Phase** for now.
- **Preparation Phase**: both players act at the same time; it ends when time runs out or both are Ready.

## 2026-11-02 — Cards and items from the prototype

- The prototype's 6 cards and 18 items are ported as placeholders.
- ~~Unit cards cost 1 mana for the first one each Round, 2 after.~~ Corrected by the owner the same day: it is the **unit's attack** that is cheaper, not the card. Each summoned unit's first attack is free in the Round it was summoned, then 1 mana for the first attack of every later Round; all other attacks cost 2. Unit cards cost 3 mana again, as in the prototype. Units are expensive for what they hit.
- The cheap first attack also applies to **units summoned by hero skills**, but each unit sheet states its own first-attack mana instead of one value for all.
- The owner sets card and unit values (mana, stats).
- Gold and shop rules come from the prototype for now (`rules.md` "Shop and Items").

## 2026-11-02 — Going out of the Round

- **End Turn = out of the Round** (like the prototype): the other player keeps taking Turns alone until they also press End Turn. This replaces "every player presses End Turn one Turn after another".
- A player who **can do nothing** on their Turn goes out of the Round automatically (the Round does not end for the other player).
- **Damage preview** (`ui.md`): aiming a skill at a target shows how much HP each unit would lose or gain.
- **Turns while one player is out** still count for every "Turns" duration and CC Recovery, including the out player's. Intended.
- **Heroes**: port the prototype's 17 heroes for now (Valen, Bianca, Serie follow their docs where the two differ).

## 2026-11-02 — Round end and who starts

- **End Turn needs a step**: a player must move at least 1 hero/unit before pressing End Turn.
- ~~Round end: every player presses End Turn, one Turn after another.~~ Replaced above.
- **Who starts**: B in round 1; after that, whoever went out of the previous Round first.

## 2026-11-02 — Cards and UI layout

- **Playing a card does not end the Turn** (the prototype ended it).
- **UI** (`ui.md`): action order bar at the top left; the enemy's hand (card backs) between the clock and the board; the hand pops up from the bottom edge; Shop / Dungeon / Team buffs share one collapsible tabbed panel.

## 2026-11-02 — Turn flow, Own Turns, DOT

- **One Action per Turn**: a normal attack, skill or ultimate ends the Turn. A skill tagged **Free Action** does not.
- **Own Turn**: a hero/unit uses its Own Turn when it does a normal attack, skill or ultimate. Moving does not count.
- **Durations** count Turns (default) or Own Turns; the skill says which, and whose Own Turns. The Turn an effect is applied in is not counted.
- **DOT** now ticks at the end of every Round, and its duration is in Rounds. This replaces the earlier "tick at the end of the Turn it was applied" answer. Serie's Voidmark is now 2 Rounds (collapse: 1 Round), so her ultimate can collapse it in the next Round.
- **Mixed** heroes: each sheet says whether it gets the Melee free step.
- **Preparation Phase move** does not use up the Melee free step.

## 2026-11-02 — Follow-up answers

- **Attack Type** is a field on every hero/unit sheet: Melee, Ranged or Mixed. The owner sets it per hero; it is no longer worked out from the normal attack's reach.
- **Preparation Phase move** (from round 2): free, once per hero/unit, to any free tile of its own zone, as long as that part of the zone has not disappeared.
- **DOT timing**: the first tick is at the end of the Turn the DOT was applied in (`combat.md` "Damage over Time").
- **Hero sheets**: the Movement line is removed (everyone moves in 8 directions). Match mode "Ranked" is renamed Normal.
- **UI**: an action-order panel shows which interjects will resolve and in what order. Every action plays an animation instead of resolving instantly; generic animations first, per-hero ones later.

## 2026-11-02 — Web version starts from the card-game docs

- The rule docs were copied from the C++ project (`card-game/docs`). From now on this repo owns its own rules; the two projects may drift apart.
- **Board**: 9x9. Each team's zone is still its first 2 rows. Each of the 3 towers covers 3 columns. Tower attack range stays 2.
- **Movement** (`board.md` "Movement"):
  - Every hero/unit steps in 8 directions. The per-hero Movement line was removed from the hero sheets.
  - 1 step per Turn (`Move: 1`). Only cards, passives and skills give more.
  - Any number of heroes/units can move in one Turn; each pays its own step cost.
  - Step Cost is a stat (default 1 mana) that effects can change. (Carried over from the card-game plan "Step cost is not a fixed number".)
  - Melee heroes/units: the first step of each Round is free. Ranged always pay.
  - Undo works as before.
  - From round 2, each hero/unit may take 1 step inside its own zone during the Preparation Phase. Units outside their zone cannot step then.
- **Match modes**: "Ranked" is renamed **Normal**. **Custom room** can change the match config and skip bans.
- **Towers are targeted like tiles** (carried over from the card-game plan): each tower has off-board tiles next to its edge tiles, and a Cast always targets a tile.

## Earlier (from the prototype)

- Bianca: Serie's Erosion lowers Bianca's DEF before her DEF-to-Armor conversion.
- Serie: Collapse damage is mitigated by DEF and Fortitude once, on the total.
- Valen and Bianca: Max Ult Points = Ult Point usage (4 and 5).
