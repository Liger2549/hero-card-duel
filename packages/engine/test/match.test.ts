import { describe, expect, it } from "vitest";
import { apply, type Action } from "../src/actions.ts";
import { normalConfig, TimesOfDay } from "../src/config.ts";
import type { Content } from "../src/content.ts";
import { newMatch } from "../src/rules/draft.ts";
import { updateTowersForRound } from "../src/rules/towers.ts";
import type { GameState } from "../src/state.ts";
import { draftFixtures } from "./fixtures.ts";
import { get, play, player, rejects, state, unit } from "./helpers.ts";

const na = (unitId: string, x: number, y: number, seat: "A" | "B" = "A"): Action => ({
  type: "UseAbility",
  seat,
  unitId,
  ability: "normal",
  aim: { tiles: [{ x, y }] },
});

describe("towers (rules.md Tower, Tower HP)", () => {
  // B's towers sit on row 9 (just above the board); the middle one covers x 3–5.
  const atTower = () => state([unit("a", "A", 4, 8), unit("b", "B", 0, 7)]);

  it("start with 30 HP and Shield by Hits 5; a shield blocks the whole hit", () => {
    const s = play(atTower(), na("a", 4, 9));
    expect(s.towers.B[1]).toMatchObject({ hp: 30, shieldByHits: 4 });
  });

  it("without a shield, a hit deals Physical + Magic (no Armor)", () => {
    const s = atTower();
    s.towers.B[1]!.shieldByHits = 0;
    expect(play(s, na("a", 4, 9)).towers.B[1]!.hp).toBe(26);
  });

  it("only from the tower's columns, within range, with no defender in between", () => {
    expect(rejects(state([unit("a", "A", 4, 7), unit("b", "B", 0, 7)]), na("a", 4, 9))).toBe("out of range");
    expect(rejects(state([unit("a", "A", 2, 8), unit("b", "B", 0, 7)]), na("a", 3, 9))).toBe(
      "stand in the tower's columns to attack it",
    );
    const archer = (blocked: boolean) =>
      state([unit("r", "A", 4, 7, { defId: "archer" }), unit("b", "B", blocked ? 4 : 0, 8)]);
    expect(rejects(archer(true), na("r", 4, 9))).toBe("a defender is in the way");
    expect(play(archer(false), na("r", 4, 9)).towers.B[1]!.shieldByHits).toBe(4);
  });

  it("only normal attacks can hit towers", () => {
    const s = atTower();
    expect(rejects(s, { type: "UseAbility", seat: "A", unitId: "a", ability: 1, aim: { tiles: [{ x: 4, y: 9 }] } })).toBe(
      "only normal attacks can hit towers",
    );
  });

  it("destroying 2 of 3 towers wins", () => {
    const s = atTower();
    s.towers.B[0]!.destroyed = true;
    Object.assign(s.towers.B[1]!, { hp: 1, shieldByHits: 0 });
    const after = play(s, na("a", 4, 9));
    expect(after.towers.B[1]!.destroyed).toBe(true);
    expect(after.winner).toBe("A");
  });

  it("each new round: +1 regen, then the stage's Max HP (Clamp), then its shield", () => {
    const s = atTower();
    Object.assign(s.towers.B[1]!, { hp: 28, shieldByHits: 0 });
    s.round = 2;
    updateTowersForRound(s);
    expect(s.towers.B[1]).toMatchObject({ hp: 27, maxHp: 27, shieldByHits: 3 }); // 29, clamped to 27
  });
});

describe("draft (rules.md Before the Game Starts)", () => {
  const run = (s: GameState, c: Content, ...actions: Action[]) => {
    for (const a of actions) {
      const r = apply(s, a, c);
      if (!r.ok) throw new Error(`${a.type}: ${r.error}`);
      s = r.state;
    }
    return s;
  };
  const deck = Array.from({ length: 24 }, (_, i) => (i % 2 ? "potion" : "orb"));
  const start = () => newMatch(normalConfig, 5, { A: deck, B: deck });
  const ban = (seat: "A" | "B", heroId: string): Action => ({ type: "Ban", seat, heroId });
  const pick = (seat: "A" | "B", heroId: string): Action => ({ type: "Pick", seat, heroId });

  it("A chooses the time of day, then bans go A, B, A, B", () => {
    let s = start();
    expect(apply(s, { type: "ChooseTimeOfDay", seat: "B", time: "Night" }, draftFixtures)).toMatchObject({ ok: false });
    s = run(s, draftFixtures, { type: "ChooseTimeOfDay", seat: "A", time: "Night" }, ban("A", "h0"));
    expect(TimesOfDay[s.timeOfDay]).toBe("Night");
    expect(apply(s, ban("A", "h1"), draftFixtures)).toMatchObject({ ok: false, error: "not your ban" });
    expect(apply(s, ban("B", "h0"), draftFixtures)).toMatchObject({ ok: false, error: "already banned" });
    s = run(s, draftFixtures, ban("B", "h1"), ban("A", "h2"), ban("B", "h3"));
    expect(s.draft!.stage).toBe("pick");
  });

  it("picks follow the pick order; after the last pick round 1 starts with 5 cards in hand", () => {
    const timeUp = { type: "DraftTimeUp" } as const;
    let s = run(start(), draftFixtures, timeUp, timeUp, timeUp, timeUp, timeUp); // Morning, 4 blank bans
    expect(apply(s, pick("B", "h0"), draftFixtures)).toMatchObject({ ok: false, error: "not your pick" });
    const order = normalConfig.pickOrder;
    s = run(s, draftFixtures, ...order.map((seat, i) => pick(seat, `h${i}`)));
    expect(s.phase).toBe("prep");
    expect(s.units.map((u) => u.id)).toContain("B-h1");
    expect(s.units.filter((u) => u.owner === "A")).toHaveLength(4);
    expect(s.players.A.hand).toHaveLength(5);
    expect(s.players.A.deck).toHaveLength(19);
  });

  it("time up on a pick gives a random hero, the same one for the same seed", () => {
    const ups = Array.from({ length: 6 }, () => ({ type: "DraftTimeUp" }) as const); // time, 4 bans, 1 pick
    const s1 = run(start(), draftFixtures, ...ups);
    const s2 = run(start(), draftFixtures, ...ups);
    expect(s1.draft!.picks.A).toHaveLength(1);
    expect(s1.draft!.picks.A).toEqual(s2.draft!.picks.A);
  });

  it("a Custom room can skip the bans", () => {
    const s = newMatch({ ...normalConfig, mode: "custom", skipBans: true }, 5, { A: [], B: [] });
    expect(run(s, draftFixtures, { type: "DraftTimeUp" }).draft!.stage).toBe("pick");
  });
});

describe("cards (rules.md Cards, board.md Placement)", () => {
  const card = (cardIndex: number, x?: number, y?: number, seat: "A" | "B" = "A"): Action => ({
    type: "PlayCard",
    seat,
    card: cardIndex,
    aim: x === undefined ? {} : { tiles: [{ x, y: y! }] },
  });

  it("unit cards go in the own zone or next to an own unit, also in the Preparation Phase", () => {
    const s = state([unit("a", "A", 4, 4), unit("b", "B", 0, 8)], {
      phase: "prep",
      players: { A: player(12, { hand: ["pupCard", "pupCard", "pupCard"] }), B: player(12) },
    });
    expect(rejects(s, card(0, 8, 5))).toBe("place in your zone or next to your own unit");
    const after = play(s, card(0, 0, 0), card(0, 5, 5));
    expect(after.players.A.mana).toBe(6);
    expect(after.units.filter((u) => u.defId === "pup").map((u) => u.summonedRound)).toEqual([2, 2]);
  });

  it("other cards only in the Combat Phase, and they do not end the Turn", () => {
    const hand = { A: player(12, { hand: ["potion", "orb"] }), B: player(12) };
    expect(rejects(state([unit("a", "A", 4, 4)], { phase: "prep", players: hand }), card(0, 4, 4))).toBe(
      "only unit cards in the Preparation Phase",
    );
    const s = play(state([unit("a", "A", 4, 4, { hp: 10 }), unit("b", "B", 0, 8)], { players: hand }), card(0, 4, 4), card(0));
    expect(get(s, "a").hp).toBe(16);
    expect(s.players.A.mana).toBe(13); // 12 − 1 + 2
    expect(s.activeSeat).toBe("A");
  });
});

describe("shop (rules.md Shop and Items)", () => {
  const shop = () =>
    state([unit("a", "A", 4, 1, { hp: 15 }), unit("b", "B", 0, 8)], { phase: "prep", players: { A: player(12, { gold: 800 }), B: player(12) } });
  const buy = (itemId: string): Action => ({ type: "BuyItem", seat: "A", unitId: "a", itemId });

  it("an upgrade replaces the lower item and costs the difference; selling gives back half the total", () => {
    let s = play(shop(), buy("sword"), buy("blade"));
    expect(get(s, "a").items).toEqual(["blade"]);
    expect(s.players.A.gold).toBe(150);
    s = play(s, { type: "SellItem", seat: "A", unitId: "a", itemId: "blade" });
    expect(s.players.A.gold).toBe(475); // 150 + 650 / 2
  });

  it("2 item slots; Max HP from an item is also healed", () => {
    const s = play(shop(), buy("heart"), buy("charm"));
    expect(get(s, "a").hp).toBe(19);
    expect(rejects(s, buy("sword"))).toBe("no free item slot");
  });
});

describe("time of day (rules.md)", () => {
  it("moves forward each round", () => {
    const s = play(
      state([unit("a", "A", 4, 4), unit("b", "B", 4, 8)]),
      { type: "Step", seat: "A", unitId: "a", to: { x: 4, y: 5 } },
      { type: "EndRound", seat: "A" },
      { type: "Step", seat: "B", unitId: "b", to: { x: 4, y: 7 } },
      { type: "EndRound", seat: "B" },
    );
    expect(s.round).toBe(3);
    expect(TimesOfDay[s.timeOfDay]).toBe("Day");
  });
});

describe("tower HP by Hits (rules.md Tower config)", () => {
  it("every hit takes exactly 1, whatever the damage", () => {
    const s = state([unit("a", "A", 4, 8), unit("b", "B", 0, 7)], { config: { ...normalConfig, towerHpType: "byHits" } });
    s.towers.B[1]!.shieldByHits = 0;
    expect(play(s, { type: "UseAbility", seat: "A", unitId: "a", ability: "normal", aim: { tiles: [{ x: 4, y: 9 }] } }).towers.B[1]!.hp).toBe(29);
  });
});
