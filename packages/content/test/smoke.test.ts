import {
  abilityOf,
  apply,
  botAction,
  candidateAims,
  heroDef,
  newMatch,
  normalConfig,
  validate,
  type AbilityRef,
  type Action,
  type GameState,
} from "@hcd/engine";
import { describe, expect, it } from "vitest";
import { content, starterDeck } from "../src/index.ts";

// Only 3 heroes are in the game while the engine moves to the docs' notation, too few for a Normal draft
// (ideas.md "Normal draft needs 12 heroes"). These runs use a small draft: no bans, 1 hero each.
const smokeConfig = { ...normalConfig, skipBans: true, heroesPerPlayer: { A: 1, B: 1 }, pickOrder: ["A", "B"] as ("A" | "B")[] };

// A simple bot: use an ability that deals damage if it can, else play a card, else step forward (up to 3 steps), else end the Round.
function timeUpBot(s: GameState): Action {
  if (s.phase === "draft") return { type: "DraftTimeUp" };
  if (s.phase === "prep") return { type: "PrepTimeUp" };
  const seat = s.activeSeat;
  const hurts = (a: Action) => {
    const r = apply(s, a, content);
    return r.ok && r.events.some((e) => (e.type === "Damaged" && e.sourceId !== null) || e.type.startsWith("Tower"));
  };
  const ok = (a: Action) => validate(s, a, content) === null && (a.type !== "UseAbility" || hurts(a));
  for (const u of s.units.filter((x) => x.owner === seat && !x.dead && x.pos)) {
    const hero = heroDef(content, u.defId);
    const refs: AbilityRef[] = hero ? ["ultimate", ...hero.skills.map((_, i) => i), "normal"] : ["normal"];
    for (const ability of refs) {
      const ab = abilityOf(content, u.defId, ability)!;
      for (const aim of candidateAims(s, u, ab.form, ability === "normal")) {
        const a: Action = { type: "UseAbility", seat, unitId: u.id, ability, aim };
        if (ok(a)) return a;
      }
    }
  }
  for (let card = 0; card < s.players[seat].hand.length; card++) {
    const tiles = Array.from({ length: s.config.boardWidth * s.config.boardHeight }, (_, i) => ({ tiles: [{ x: i % s.config.boardWidth, y: Math.floor(i / s.config.boardWidth) }] }));
    for (const aim of [{}, ...tiles]) {
      const a: Action = { type: "PlayCard", seat, card, aim };
      if (ok(a)) return a;
    }
  }
  if (s.stepsThisTurn < 3) {
    // Step toward the enemy side when possible.
    const dy = seat === "A" ? 1 : -1;
    for (const u of s.units.filter((x) => x.owner === seat && !x.dead && x.pos)) {
      for (const d of [[0, dy], [1, dy], [-1, dy], [1, 0], [-1, 0]] as const) {
        const a: Action = { type: "Step", seat, unitId: u.id, to: { x: u.pos!.x + d[0], y: u.pos!.y + d[1] } };
        if (ok(a)) return a;
      }
    }
  }
  return s.stepsThisTurn > 0 ? { type: "EndTurn", seat } : { type: "EndRound", seat };
}

describe("whole matches with the real heroes (smoke test)", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    it(`seed ${seed}: plays without errors until someone wins`, () => {
      let s = newMatch(smokeConfig, seed, { A: starterDeck, B: starterDeck });
      let actions = 0;
      while (s.phase !== "over" && actions < 3000) {
        const a = timeUpBot(s);
        const r = apply(s, a, content);
        if (!r.ok) throw new Error(`round ${s.round}, ${a.type}: ${r.error}`);
        s = r.state;
        actions++;
      }
      expect(s.phase).toBe("over");
      expect(s.winner).not.toBeNull();
    });
  }
});

describe("the AI (engine botAction) with the real heroes", () => {
  for (const seed of [11, 12]) {
    it(`seed ${seed}: plays both sides from the draft to a winner`, () => {
      let s = newMatch(smokeConfig, seed, { A: starterDeck, B: starterDeck });
      for (let n = 0; n < 5000 && s.phase !== "over"; n++) {
        const a = botAction(s, content, "A") ?? botAction(s, content, "B");
        if (!a) throw new Error(`no move in phase ${s.phase}`);
        const r = apply(s, a, content);
        if (!r.ok) throw new Error(`${a.type}: ${r.error}`);
        s = r.state;
      }
      expect(s.winner).not.toBeNull();
    });
  }
});
