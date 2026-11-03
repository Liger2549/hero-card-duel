# Hero Card Duel

1v1 turn-based hero + card duel on a 9x9 grid, played in the browser for fun with friends. Designed by Liger. The user writes in Thai; reply in Thai.

This repo is moving from a single-file browser prototype to a real TypeScript project. Gameplay rules are the user's design; when a rule is unclear, ask instead of inventing one, and record the answer in `docs/`.

## Sources of truth

The rule docs were copied from the user's C++ project (`../card-game/docs`) on 2026-11-02. This repo now owns its own copy; edit these, not the C++ ones.

- `docs/rules.md` — game modes (Normal / Custom room), board size, zones, towers and tower HP, win conditions, draft, rounds and phases.
- `docs/board.md` — tiles, occupancy and swap, movement and step cost, undo, range, placement, skill areas (hit form notation).
- `docs/combat.md` — Turn/Round terms, hits, HP types, damage formula, Break, CC Recovery, DOT, shields (Add/Set), Aggro, Resonance, Interject, stat modifiers. Follow it exactly.
- `docs/statuses.md` — shared statuses: every DOT (Nocturnal Flame, Voidmark), Stealth, Physical ATK +N, Wither.
- `docs/ui.md` — match screen layout and pages.
- `docs/heroes/README.md` — hero system, hero file template and defaults (stats in formulas are the skill owner's; Max Ult Points = usage when not stated).
- `docs/heroes/*.md` — finished heroes: Valen, Bianca, Serie, Karas, Falka, Linnet, Zoran, Pley (two forms: Ribu / Pley), Leilani, and Rocco, Konrad, Eira (taken as is from the prototype). Implement heroes exactly as written.
- `docs/heroes/archive/prototype-heroes.md` — the prototype's 14 other heroes, out of the game. Ideas only, not rules.
- New hero drafts arrive in Thai (often as `h<N>.md`). To finish one: propose names first without editing, ask only real rule gaps, then format it like the finished heroes with Thai names in brackets.
- `docs/decisions.md` — the user's answers to rule questions, with dates.
- `docs/ideas.md` — open questions and ideas not decided yet. Ask the user before building anything listed there.
- `prototype/index.html` — the old single-file prototype (playable, online via PeerJS). Its rules are older than the docs; when they differ, the docs win. Reference only. Do not extend it.

## Planned pages (client)

- Hero viewer: browse every hero's stats, skills and hit forms before playing. Built from the content data, so a new hero shows up without UI work.
- Deck builder: arrange the 24-card deck. The user will design the cards themselves.
- Match setup: Normal or Custom room.
- In the match: an action-order panel (like the turn-order bar in turn-based RPGs) showing this Turn's pending interjects in resolution order (`combat.md` "Action Order").
- Animations: every action animates instead of resolving instantly. The client plays the engine's events one by one. Start with generic animations (move, hit, damage number, status, death); per-hero animations come later.

## Target architecture

pnpm workspace, TypeScript strict everywhere.

```
packages/engine    pure rules: GameState, Action, validate(), apply() -> { state, events }
packages/content   heroes / items / cards as typed data, validated with zod
apps/client        React + Vite UI, deployed to GitHub Pages by GitHub Actions
apps/server        authoritative rooms (Cloudflare Workers + Durable Objects), same engine
tools/sim          bot-vs-bot balance runs
```

Engine rules:
- No DOM, no network, no Date.now, no Math.random. Randomness comes from a seeded RNG stored in state, so a game replays exactly from its action list.
- All integers; any non-whole result (division, %, stat modifiers) rounds to the nearest whole number using the first 2 decimal places, .50 up (`combat.md` "General"). Use integer math (e.g. hundredths), not floating point, so replays stay exact.
- Tunable rule values (board size, zones, mana per round, tower stages, gold, timers, draft order) live in one match config object. Normal mode uses the defaults; a Custom room overrides them.
- Skills are data (hit form in `board.md` tile notation, rotation, Hit: All / First, zones, falloff, physical and magic formulas, break, ult gain, effects). Unusual mechanics (Bianca's counter, Serie's Collapse) are trigger hooks in that hero's own file, not special cases in the engine core.
- apply() emits events (DamageDealt, StatusApplied, BreakTriggered, UnitDied, …) used for the UI log and animations.

Server: clients send Actions; the server validates with the engine and broadcasts results; each player only receives what they may see (no opponent hand). WebSocket over 443 so it works on campus Wi-Fi (P2P failed on ChulaWiFi).

Testing: Vitest. Turn every worked example in combat.md into a test (e.g. Stun 300 at Speed 100 ends after 3 Turns; a hit of Physical 2 + Magic 6 against a 5 shield lets Magic 3 through).

## Plan

1. Rules doc: update docs with the user's rule changes before coding them (log them in `docs/decisions.md`).
2. Engine + tests (no UI).
3. Client, local two-player on one device.
4. Server + online rooms + auto deploy.
5. Bots/sim, replays, and converting hero .md files into content data.
