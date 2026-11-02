import {
  apply,
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

// A simple bot: use an ability that deals damage if it can, else play a card, else step forward, else end the Turn.
function botAction(s: GameState): Action {
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
      const ab = hero ? (ability === "normal" ? hero.normalAttack : ability === "ultimate" ? hero.ultimate : hero.skills[ability]!) : null;
      const targeting = ab?.targeting ?? { type: "adjacent" as const };
      for (const aim of candidateAims(s, targeting)) {
        const a: Action = { type: "UseAbility", seat, unitId: u.id, ability, aim };
        if (ok(a)) return a;
      }
    }
  }
  for (let card = 0; card < s.players[seat].hand.length; card++) {
    for (const aim of [{}, ...candidateAims(s, { type: "tile", range: 99, shape: [[0, 0]] })]) {
      const a: Action = { type: "PlayCard", seat, card, aim };
      if (ok(a)) return a;
    }
  }
  if (s.stepsThisTurn === 0) {
    // Step toward the enemy side when possible.
    const dy = seat === "A" ? 1 : -1;
    for (const u of s.units.filter((x) => x.owner === seat && !x.dead && x.pos)) {
      for (const d of [[0, dy], [1, dy], [-1, dy], [1, 0], [-1, 0]] as const) {
        const a: Action = { type: "Step", seat, unitId: u.id, to: { x: u.pos!.x + d[0], y: u.pos!.y + d[1] } };
        if (ok(a)) return a;
      }
    }
  }
  return { type: "EndTurn", seat };
}

describe("whole matches with the real heroes (smoke test)", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    it(`seed ${seed}: plays without errors until someone wins`, () => {
      let s = newMatch(normalConfig, seed, { A: starterDeck, B: starterDeck });
      let actions = 0;
      while (s.phase !== "over" && actions < 3000) {
        const a = botAction(s);
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
