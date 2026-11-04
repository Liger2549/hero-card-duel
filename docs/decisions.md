# Decisions

Answers the owner gave to rule questions, newest first. The rule docs already include them; this file says when and why they changed.

## 2026-11-04 — All 12 heroes in the engine (Claude's readings, to confirm)

- **Stealth while moving**: what a player can see is fixed at the start of their Turn ("the game shows nothing while the enemy moves"). Otherwise an enemy next to a stealthed unit always sees it, and the rule about stepping onto a hidden unit could never happen.
- **Stepping onto a hidden unit**: the step's mana is still paid.
- **Board objects** (Falka's Scanner) are hit by area skills only; a Hit: First projectile passes over them.
- **Ribu's free step every Turn**: unused ones are kept until the end of the Round, like Exfil's.
- **Pley's dive** takes the time-out pick for now (`ideas.md`).
- Valen's passive bonus counts only for hits that get past shields, and includes the ability's own Penetration (confirmed by the owner).

## 2026-11-03 — Interjects resolve when the Turn ends

- Every interject resolves when a Turn ends, right after its Action, never in the middle of a Turn. Then CC, buffs and shields count down, and Turn DOTs tick last. This covers counters, Karas's raven, Zoran's lantern, Leilani's wave, Ribu's Core and Pley's dive (`combat.md` "Interject").

## 2026-11-03 — P for the picked tile

- Hit form notation (`board.md` "Notation"): `T` marks tiles the player may pick (range drawings); `P` marks the picked tile in a drawing of the area around it. P is hit too, and a Rotating area turns around it. Karas's raven, Zoran's lantern, Ribu's Core and Pley's dive now use P.
- Zones (`a`, `b`, …) can have their own effects as well as their own damage (e.g. Karas's Ravenous Eclipse).

## 2026-11-03 — Voidmark is a Turn DOT

- Serie's **Voidmark** is now a Turn DOT: 2 Turns from Voidrend Crescent, 1 Turn after a Collapse (the numbers kept, the unit changed from Rounds to the target team's Turns). Round DOTs stay in the rules for later DOTs.

## 2026-11-03 — Three prototype heroes back

- To reach the 12 heroes a Normal draft needs, three prototype heroes come back as is: **Rocco** (rubber boxer, `rubber`), **Konrad** (iron flag bearer, `flag`, with his Footman unit) and **Eira** (frost hunter, `frost`). The owner wants them complete and playable, not redesigned; names were picked by Claude.

## 2026-11-03 — Prototype heroes out

- The prototype's 14 extra heroes are out of the game. They are archived as ideas in `heroes/archive/prototype-heroes.md`. Only heroes with a sheet in `docs/heroes` go into the engine.
- This replaces "port the prototype's 17 heroes for now" (2026-11-02).

## 2026-11-03 — Leilani

- **Leilani** is finished (`heroes/Leilani.md`). Healing Bonus % +25% became Healing Power 125%. Her emergency heal "2 + 1 per 4 Max Hp" became 2 + 25% Max HP (her own Max HP).
- Lifebuoy: not herself; triggers at once as an interject; cooldown 4 Turns of her team. "Not played for 3 Turns" counts her team's Turns.
- Rolling Tide works like Zoran's lantern: pulses on cast, then once in each of the next 3 Turns of her team, centered on her.
- Whale Breach: landing tile on the ring 3 tiles away; the player turns the area to any of 4 directions. Its heal reaches every ally hero and unit, including Leilani, but not objects.

## 2026-11-03 — Old open questions

- **Ultimate twice in one Turn**: depends on the Ultimate. One that ends the Turn cannot; a Free Action one can if the hero has enough Ult Points (`heroes/README.md`).
- **Preparation move** can swap with an ally (`board.md`).
- **Summoned units** get the Melee free step too, by their own Attack Type; each unit sheet comes later.
- **Shields** skip the Turn they were given in, like buffs (already in `combat.md` "Durations").
- **Manual interject delay** does not count the Turn it was cast in (`combat.md`).
- **Repeated skill use**: the owner is now thinking of a cooldown or extra mana.
- **Free Action** does not use the hero's Own Turn (it is not really their turn). Already in `combat.md` "Turn Flow".
- **Bianca's counter**: counts per guarded unit hit. Her counter range is now the 5x5 square around her. She can counter several times in one Turn, one interject after another. Damage from stepping onto a hidden unit counts too.
- **Stash** (`rules.md`): 12 slots; items move only in the Preparation Phase; a hero's death does not clear the stash.
- **Off-field cards (การ์ดนอกสนาม)** (`rules.md` "Cards"), the new name for "team buff cards": up to 4 active per player; each card states its duration; the enemy can remove one only with a skill or card made for that.
- **Valen**: Penetration +2 during Morning, Day and Evening.

## 2026-11-03 — % notation

- **100% is normal**: every % value is a multiplier (80% = × 80%, 120% = × 120%). Buffs and debuffs add or subtract percentage points (`combat.md` "Stat Modifiers").
- Each stat can also be multiplied as a Stat Modifier (e.g. Armor 150%).
- **% Multipliers** (`combat.md` "% Multipliers"): new % stats that multiply a formula's result. Dealer: Armor Shred%, Break Power%, Break DMG Power%, DOT Power%, Resonance Power%, Healing Power%. Receiver: Physical / Magic / Damage Taken%, Break Taken%, DOT Taken%, Drain Taken%, Healing Taken%, CC Taken%. All formulas in `combat.md` were rewritten with them.
- New **Heal** formula: `((Base heal + Healing Bonus) × Healing Power% + Healing Received) × Healing Taken%`. Life Steal does not use it.
- Formulas round once, at the end (stats are rounded when worked out). A skill's value (e.g. 2 + 150% ATK) is rounded when worked out too, before it enters a formula, so shields, Break Bars and the stats shown on screen are whole numbers the player can use as is (confirmed 2026-11-03).
- Falka: Break Boost % 110% became **Break Power 110%**. Pley's weak healing became **Healing Taken 25%**.
- **Nocturnal Flame** damage is now 50% of the applier's ATK (Karas 2, Zoran 1), locked when applied.
- **DOT stacking is per applier**: the same applier refreshes its own copy; copies from different appliers stack and each ticks on its own (`combat.md` "Damage over Time"). Serie's Collapse only affects her own Voidmark.
- **Steps to %**: Bianca: Armor + 100% DEF, Magic Armor + 50% DEF, Vendetta 2 + 150% DEF (same values as before). Voidmark 40% ATK and Erosion 1 + 20% DOT Boost, chosen to keep Serie's current values.

## 2026-11-03 — Pley (Ribu / Pley forms)

- New two-form hero **Pley** (`heroes/Pley.md`): starts as Ribu; Pley replaces him when he dies or uses his Ultimate. Pley's death is final.
- Speed dodge works on hits only. He receives only 25% of healing from skills, cards and items; his own Life Steal is not reduced.
- **Life Steal** heals only when the hit lowers the target's HP; a hit fully absorbed by shields heals nothing. The heal is capped by the HP damage the hit dealt: `min(Life Steal − Resistance, HP damage)` (`combat.md` "Healing"). Wither still applies to a fully shielded hit.
- **Wither** is now a shared status (`statuses.md`), so other skills can lower Max HP too.
- Blocked Shots for knight-move tiles: either ring 1 tile on the way blocks. The Ribu Ultimate's Revenant's Cross uses Pley's ATK.
- Paradox Gauge: Speed +5 and Life Steal +2 per point, for the rest of the game; counted before the Ultimate spends the points. The owner accepts that a skilled player can make him very strong, balanced by how easily Ribu dies early.
- Pley's arrival strike: a plus shape 3 tiles wide, reaching the board edges.
- Mixed, gets the Melee free step (plus Ribu's own free step every Turn).
- **Blocked Shots** (`board.md`): square rings, as for Zoran; now written as a general rule.
- Volatile Core: the 2x2 corner is picked when placing. Cores are removed when Ribu dies or uses his Ultimate.
- Wither lowers enemy Max HP with type Keep. Pley's Max HP cap is 250% of base Max HP (items raise the base). The Ultimate's Max HP +90% ATK lasts 2 Own Turns.
- Pley's Ultimate: range 2; DOTs stay on him while in the air; the dive follows the normal interject order.

## 2026-11-03 — Zoran

- New hero **Zoran** (`heroes/Zoran.md`), from the draft `h4.md`. Role: Support / Damage.
- **Stats in formulas** belong to the skill owner unless the skill says otherwise (`heroes/README.md`).
- Guiding Light: not Zoran himself; Wicks max 2, start at 1, +1 at the start of every Round. Each ally can get the shield once per Turn; allies that drop at the same time are shielded in one interject.
- A new Vigil Lantern replaces the old one. The lantern is a zone: it does not block movement and can sit on any tile.
- Lanternlight cannot shoot over units: blocking uses square rings, and only the outer ring (2 tiles straight) can be blocked.
- Veil of Nightflame burns forward (8 directions).
- Vigil Lantern: enemies get Nocturnal Flame for 1 Turn. Lantern shields last until 2 Turns of his team after the lantern is gone, stacking until then. The lantern cannot be hit and disappears if Zoran dies. Its Speed (50% of Zoran's) is only for action order.

## 2026-11-03 — Linnet

- New hero **Linnet** (`heroes/Linnet.md`), from the draft `h2.md`.
- **Physical ATK +N** (`statuses.md`): adds N to the Physical damage of each hit; hits with no Physical damage get nothing. N uses the giver's stats when the buff is given.
- Tidal Chorus: allies in the 8 tiles around her, not herself; up to 5 stacks, each with its own duration.
- Her buffs never include herself. Her Ultimate cannot target herself.
- **Rising Chorus** state lasts until Crescendo. Echoes of the Elder Flock: max 3, extra points are lost, reset to 0 after Crescendo. Points add up (above 50% to dead in one hit = +3). Crescendo's buff lasts 1 Own Turn of each ally.
- **Max Ult Points**: when a hero sheet does not state it, it equals the Ult Point usage (`heroes/README.md`).

## 2026-11-03 — Falka

- New hero **Falka** (`heroes/Falka.md`), from the draft `h1.md`. Her kestrel is named **Kestrel**.
- **Exfil**: below 25% HP she gets 2 free steps right away (used in her player's Turn). Cooldown 2 Rounds: the Round it triggers counts as 1, the next as 2.
- Snap Shot and Shatter Round are Hit: First lanes in 8 directions (2 and 3 tiles).
- Shatter Round: if it breaks the target, its Break DMG gets +250% ATK on top of the normal Break DMG.
- **Kestrel's Eye** (Free Action): a Scanner within 3 tiles; 3x3 Scan Field; Scanner HP 25% ATK, hit only by skills that do not lock onto a target. Her lanes that line up with the Scan Field go on to its far edge (straight lines only). Hits on enemies in the field get Break +30% ATK.
- **Vanishing Point** (Free Action): Stealth and 2 free steps. Costs 3 Ult Points, then 1 per Turn of her player. Max Ult Points 7. She can end it any time, for free.
- **Stealth** (`statuses.md`): hidden while no enemy is next to her; next to an enemy she is shown but cannot be targeted by skills that lock onto a target; being hit ends it.
- **Break Boost %**: Boost stats get a % version (Falka has Break Boost % 110%; 100% is normal). The formula comes later.
- **Lock-on / No lock** (`board.md` "Anchor"): skills anchored on `T` lock onto a target; skills anchored on `C` (areas, Hit: First lanes) do not. Every hit form header says which.
- **Stealth details**: "next to" means the 8 tiles around. Falka's own attacks do not end her Stealth. She pays 1 Ult Point at the start of each of her team's Turns. An enemy that steps onto her hidden tile is pushed back and takes 130% of her ATK, and her Stealth ends. While she is hidden, the enemy cannot undo steps and is warned first.
- **Team Turns**: a new duration kind that counts only one team's Turns (`combat.md` "Durations"). Falka's Scanner lasts 3 Turns of her team; up to 2 at once; it does not block movement and the enemy can see it.
- Exfil's unused free steps last until the end of that Round.
- A Lock-on skill cannot pick a stealthed unit's tile, but its area still hits that unit. Counter-attacks count as Lock-on, so Bianca cannot counter Falka in Stealth, even when she is shown.
- Stepping onto a hidden unit: the damage is Physical, does not reduce the Break Bar, and is not an Action (the enemy's Turn goes on).
- A third Scanner replaces the oldest.
- The Scanner works like Stealth for targeting: a Lock-on skill cannot pick its tile, but any skill area that covers it hits it for the same damage.
- Local 2-player on one device does not need to hide Stealth.

## 2026-11-02 — DOT rework, shared statuses

- **Two kinds of DOT**: Round DOT (ticks at the end of every Round, as before) and Turn DOT (ticks at the end of each Turn of the target's team; the Turn it was applied in is not counted).
- **DOT damage has no type** (no Physical / Magic). `Tick Damage = max(Damage per tick + DOT Boost − Fortitude, 1)`. DEF no longer reduces DOT. This replaces the old formula with DEF.
- Serie: Collapse is now reduced only by Fortitude, so Erosion only helps normal hits. The owner is fine with that.
- DOTs do not reduce the Break Bar. Nocturnal Flame's Break 1 per tick is its own exception: Break Boost / Resistance do not change it, and it cannot lower the Break Bar below 1.
- **`statuses.md`** holds every DOT and other shared statuses, so new heroes can reuse them. Voidmark moved there from Serie's file.
- **% of a stat** is allowed in skill values, next to steps ("+1 per 3 ATK").
- **Rounding**: every non-whole result (division, %, stat modifiers) now rounds to the nearest whole number, looking at the first 2 decimal places (.50 rounds up). This replaces "divisions round down" and "final stats are not rounded", so every stat is a whole number. Steps still count only whole steps.
- **Hit forms**: an 8-direction area may draw a straight shape and a diagonal shape (`board.md` "Direction").

## 2026-11-02 — Karas

- New hero **Karas** (`heroes/Karas.md`), from the draft `h3.md`.
- **Nocturnal Flame (เพลิงรัตติกาล)**: a new DOT counted in Turns (every player's Turn). Each tick: damage 2, Break 1. Other heroes from the same origin (e.g. h4) can apply it too.
- **Nightfall Raven Gauge**: max 3, starts at 0. Each passive interject spends 1. Wraithfire gives +2, Ravenous Eclipse +3.
- Passive: triggers only when the ally's attack hits, once per Turn, gives no Ult Points. The explosion is 3x3 around that enemy.
- Wraithfire hit form: a straight shape for N/E/S/W and a diagonal shape for the 4 diagonals.
- Ravenous Eclipse: zone a takes damage and Nocturnal Flame for 2 Turns; zone b takes only Nocturnal Flame for 1 Turn.
- Karas is Mixed and gets the Melee free step.
- Skill values may be written as % of ATK. The other heroes will be converted later.

## 2026-11-02 — Home page, rooms, deck limits

- Home page: player name, local 2-player, vs AI, deck builder, heroes, game info, create room (Normal / Custom) or join.
- Custom rooms set their own ban and pick order and timers. Different hero counts default to A B A B, then the rest.
- **Deck limits are per card** (`maxCopies` on each card).
- **Tower HP by Hits** works as in card-game: with it, every hit takes exactly 1.

## 2026-11-02 — Back toward the prototype (after the first online test)

- **Steps**: no limit per Turn again; mana is the only limit (prototype). The Move-limited rule stays as a Custom option.
- **End Turn** only ends the Turn. **End Round** (go out of the Round) is its own button again.
- **Bans** one at a time, A B A B, 8 seconds each (replaces the simultaneous bans).
- **UI** goes back to the prototype's look.

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
