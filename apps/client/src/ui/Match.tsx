// The match screen, laid out like the prototype's gameHTML: field (side bars, towers, board) and a side
// column (status, panel, controls, hand, log).
import { content } from "@hcd/content";
import {
  abilityOf,
  apply,
  candidateAims,
  Dirs,
  heroDef,
  inZone,
  manaCost,
  resolveArea,
  stat,
  stepCostOf,
  towerOfColumn,
  towerRow,
  unitAt,
  unitDef,
  validate,
  type AbilityRef,
  type Action,
  type Aim,
  type GameEvent,
  type GameState,
  type Pos,
  type Seat,
  type Unit,
} from "@hcd/engine";
import { useEffect, useMemo, useState } from "react";
import { session, type Snapshot } from "../session.ts";
import { describe, setLogNames } from "../text.ts";
import { AbilityCard, actingSeat, CCI, Countdown, Dayband, PatternLegend, Pips, sideClass, sideName, TIMES } from "./common.tsx";

type Act =
  | { type: "move"; unitId: string }
  | { type: "ability"; unitId: string; ref: AbilityRef; picks: Pos[] }
  | { type: "card"; index: number }
  | null;
const key = (p: Pos) => `${p.x},${p.y}`;

const ERR: Record<string, string> = {
  "not enough mana": "มานาไม่พอ",
  stunned: "ติด Stun ใช้ไม่ได้",
  silenced: "ติด Silence ใช้สกิลไม่ได้",
  "not enough HP": "HP ไม่พอ",
  "not available yet": "ยังไม่ทำงานในเวอร์ชันนี้ (รอ hook ของฮีโร่)",
  "not enough Ult Points": "แต้มอัลติยังไม่พอ",
};

export function Match({ snap }: { snap: Snapshot }) {
  const s = snap.state!;
  const [localSeat, setLocalSeat] = useState<Seat>("A");
  const [sel, setSel] = useState<string | null>(null);
  const [act, setAct] = useState<Act>(null);
  const [pv, setPv] = useState<{ action: Action; events: GameEvent[]; area: Pos[] } | null>(null);
  const [shopSel, setShopSel] = useState<string | null>(null);
  const [error, setError] = useState("");
  const me = actingSeat(snap, localSeat);
  setLogNames(snap.names);
  const view: Seat = snap.mySeat ?? "A"; // whose side is at the bottom
  const myTurn = s.phase === "combat" && s.activeSeat === me && (!snap.mySeat || snap.mySeat === me);
  const ok = (a: Action) => validate(s, a, content) === null;

  // The sky colour follows the time of day (prototype --skyc).
  useEffect(() => document.documentElement.style.setProperty("--skyc", TIMES[s.timeOfDay]!.sky), [s.timeOfDay]);
  // A new state ends any half-made action.
  useEffect(() => {
    setAct((a) => (a?.type === "move" ? a : null));
    setPv(null);
    setError("");
  }, [snap.seq]);
  // Local game: when one player is Ready, hand the device to the other.
  useEffect(() => {
    if (!snap.mySeat && s.phase === "prep" && s.ready[localSeat] && !s.ready[localSeat === "A" ? "B" : "A"]) setLocalSeat(localSeat === "A" ? "B" : "A");
  }, [s.ready.A, s.ready.B]); // eslint-disable-line

  const selUnit = sel ? s.units.find((u) => u.id === sel && !u.dead) ?? null : null;
  const actUnit = act && act.type !== "card" ? s.units.find((u) => u.id === act.unitId)! : null;

  const abilityAction = (aim: Aim): Action | null =>
    act?.type === "ability" ? { type: "UseAbility", seat: me, unitId: act.unitId, ability: act.ref, aim } : act?.type === "card" ? { type: "PlayCard", seat: me, card: act.index, aim } : null;
  const targeting = act?.type === "ability" && actUnit ? abilityOf(content, actUnit.defId, act.ref)!.targeting : null;
  const cardDef = act?.type === "card" ? content.cards.find((c) => c.id === s.players[me].hand[act.index]) : undefined;

  const preview = (action: Action | null) => {
    if (!action) return;
    const r = apply(s, action, content);
    if (!r.ok) return setError(ERR[r.error] ?? r.error);
    const used = r.events.find((e) => e.type === "AbilityUsed");
    setPv({ action, events: r.events, area: used && used.type === "AbilityUsed" ? used.tiles : [] });
  };

  // Abilities with no aim (around / team / board) and no-target cards preview at once.
  useEffect(() => {
    if ((targeting && ["around", "team", "board"].includes(targeting.type)) || cardDef?.target === "none") preview(abilityAction({}));
  }, [act]); // eslint-disable-line

  // Tiles a click would act on (.t), and the previewed area (.a).
  const { targets, dirOf } = useMemo(() => {
    const t = new Set<string>();
    const dirOf = new Map<string, Aim>();
    const all: Pos[] = [];
    for (let y = -1; y <= s.config.boardHeight; y++) for (let x = 0; x < s.config.boardWidth; x++) all.push({ x, y });
    if (pv) return { targets: t, dirOf };
    if (act?.type === "move" && actUnit) {
      for (const p of all) if (ok({ type: "Step", seat: me, unitId: actUnit.id, to: p })) t.add(key(p));
    } else if (act?.type === "ability" && actUnit && targeting) {
      if (["shape", "line", "dash"].includes(targeting.type)) {
        for (const dir of Dirs) {
          const aim = { dir };
          if (!ok(abilityAction(aim)!)) continue;
          const area = resolveArea(s, actUnit, targeting, aim);
          if (typeof area !== "string") for (const p of area.tiles) if (!dirOf.has(key(p))) (t.add(key(p)), dirOf.set(key(p), aim));
        }
      } else {
        const n = targeting.type === "tiles" ? targeting.count : 1;
        for (const aim of candidateAims(s, targeting)) {
          const p = aim.tiles?.[0];
          if (p && ok(abilityAction({ tiles: Array.from({ length: n }, () => p) })!)) t.add(key(p));
        }
      }
    } else if (act?.type === "card") {
      for (const p of all) if (p.y >= 0 && p.y < s.config.boardHeight && ok(abilityAction({ tiles: [p] })!)) t.add(key(p));
    } else if (s.phase === "prep" && selUnit && selUnit.owner === me) {
      for (const p of all) {
        const a: Action = s.round === 1 ? { type: "PlaceHero", seat: me, unitId: selUnit.id, to: p } : { type: "PrepMove", seat: me, unitId: selUnit.id, to: p };
        if (ok(a)) t.add(key(p));
      }
    }
    return { targets: t, dirOf };
  }, [s, act, pv, me, sel]); // eslint-disable-line

  const onTile = (p: Pos) => {
    setError("");
    const k = key(p);
    if (pv) {
      // Tapping the previewed area again confirms it.
      if (pv.area.some((q) => key(q) === k)) return session.dispatch(pv.action);
      setPv(null);
    }
    if (targets.has(k)) {
      if (act?.type === "move" && actUnit) return session.dispatch({ type: "Step", seat: me, unitId: actUnit.id, to: p });
      if (act?.type === "ability" && targeting) {
        if (dirOf.has(k)) return preview(abilityAction(dirOf.get(k)!));
        const n = targeting.type === "tiles" ? targeting.count : 1;
        if (n === 1) return preview(abilityAction({ tiles: [p] }));
        // Several tiles (Valen's swords): count each pick, the same tile may be picked again.
        const picks = [...act.picks, p];
        setAct({ ...act, picks });
        if (picks.length === n) preview(abilityAction({ tiles: picks }));
        return;
      }
      if (act?.type === "card") {
        const a = abilityAction({ tiles: [p] })!;
        return cardDef?.kind === "unit" ? session.dispatch(a) : preview(a);
      }
      if (s.phase === "prep" && selUnit) {
        return session.dispatch(s.round === 1 ? { type: "PlaceHero", seat: me, unitId: selUnit.id, to: p } : { type: "PrepMove", seat: me, unitId: selUnit.id, to: p });
      }
    }
    if (p.y < 0 || p.y >= s.config.boardHeight) return;
    const u = unitAt(s, p);
    setSel(u?.id ?? null);
    setAct(null);
  };

  const cancel = () => (setAct(null), setPv(null), setError(""));
  const enemy: Seat = view === "A" ? "B" : "A";
  const flashes = useMemo(() => flashMap(s, pv ? pv.events : snap.events), [s, pv, snap.events]);

  return (
    <>
      <header className="top">
        <div className="tl">
          <h1>Hero Card Duel</h1>
          <span className="rd">
            รอบที่ {s.round} Turn {s.turn}
          </span>
          {snap.mode !== "local" && <span className={`netb${snap.connected ? "" : " bad"}`}>{snap.connected ? "🟢 เชื่อมต่ออยู่" : "🔴 ขาดการเชื่อมต่อ"}</span>}
          <button className="ghost" onClick={() => confirm("ออกจากเกม?") && session.leave()}>
            ออก
          </button>
        </div>
        <Dayband now={s.timeOfDay} />
      </header>
      <div className="layout">
        <section className="field">
          <SideBar s={s} seat={enemy} snap={snap} />
          <Towers s={s} seat={enemy} view={view} targets={targets} picks={act?.type === "ability" ? act.picks : []} onClick={onTile} flashes={flashes} />
          <Board s={s} view={view} sel={sel} targets={targets} area={pv?.area ?? []} picks={act?.type === "ability" ? act.picks : []} flashes={flashes} seq={snap.seq} onClick={onTile} />
          <Towers s={s} seat={view} view={view} targets={targets} picks={[]} onClick={onTile} flashes={flashes} />
          <SideBar s={s} seat={view} snap={snap} />
        </section>
        <section className="side">
          <div className="panel">
            <p className="status">
              <StatusText s={s} snap={snap} me={me} act={act} myTurn={myTurn} />
            </p>
            {!snap.mySeat && s.phase === "prep" && (
              <div className="roster">
                กำลังเตรียม:
                {(["A", "B"] as const).map((x) => (
                  <button key={x} className={x === localSeat ? "on" : ""} onClick={() => setLocalSeat(x)}>
                    {sideName(x)}
                    {s.ready[x] ? " ✓" : ""}
                  </button>
                ))}
              </div>
            )}
            {s.phase === "prep" && <Prep s={s} me={me} snap={snap} sel={sel} onSel={setSel} shopSel={shopSel} onShopSel={setShopSel} />}
            {pv && <Preview s={s} events={pv.events} />}
            {error && <p className="warn">{error}</p>}
            {selUnit ? (
              <UnitInfo s={s} u={selUnit} mine={myTurn && selUnit.owner === me} act={act} onAct={(a) => (setAct(a), setPv(null))} />
            ) : (
              myTurn && !act && <p className="muted">แตะยูนิตบนกระดานเพื่อดูข้อมูลและการกระทำ หรือใช้การ์ดด้านล่าง</p>
            )}
          </div>
          <div className="row">
            {s.phase === "prep" && (
              <button
                className="btn pri"
                disabled={s.ready[me] || s.units.some((u) => u.owner === me && u.kind === "hero" && !u.dead && !u.pos)}
                onClick={() => session.dispatch({ type: "Ready", seat: me })}
              >
                {s.ready[me] ? "พร้อมแล้ว รออีกฝ่าย…" : "พร้อมรบ"}
              </button>
            )}
            {myTurn && (
              <>
                {s.undoSteps.length > 0 && (
                  <button className="btn" onClick={() => session.dispatch({ type: "Undo", seat: me })}>
                    ↩️ ย้อนการเดิน ({s.undoSteps.length})
                  </button>
                )}
                <button className="btn" onClick={() => session.dispatch({ type: "EndTurn", seat: me }) && setError("ต้องเดินอย่างน้อย 1 ช่องก่อนจบ Turn")}>
                  จบ Turn
                </button>
                <button className="btn" onClick={() => confirm("จบรอบของคุณ? อีกฝ่ายจะเล่นต่อคนเดียวจนจบรอบ") && session.dispatch({ type: "EndRound", seat: me })}>
                  จบรอบของฉัน (ผ่าน)
                </button>
              </>
            )}
            {(act || pv) && (
              <button className="btn" onClick={cancel}>
                ยกเลิก
              </button>
            )}
            {pv && (
              <button className="btn pri" onClick={() => session.dispatch(pv.action)}>
                ยืนยัน
              </button>
            )}
          </div>
          <Hand s={s} snap={snap} me={me} act={act} onCard={(index) => (setAct({ type: "card", index }), setPv(null), setSel(null))} />
          <ol className="log" aria-live="polite">
            {snap.history
              .map((e) => [e, describe(s, e)] as const)
              .filter(([, t]) => t)
              .slice(-30)
              .reverse()
              .map(([e, t], i) => (
                <li key={i} className={logClass(s, e)}>
                  {t}
                </li>
              ))}
          </ol>
        </section>
      </div>
      {s.phase === "over" && (
        <div className="ov show">
          <div className="panel" style={{ textAlign: "center", maxWidth: 360 }}>
            <h2>🏆 {sideName(s.winner!, snap)} ชนะ!</h2>
            <p>
              <button className="btn pri" onClick={() => session.leave()}>
                กลับเมนู
              </button>
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function logClass(s: GameState, e: GameEvent): string {
  if (e.type === "UnitDied" || e.type === "TowerDestroyed" || e.type === "Broken" || e.type === "GameOver") return "kill";
  const seat = "seat" in e ? e.seat : "unitId" in e ? s.units.find((u) => u.id === e.unitId)?.owner : undefined;
  return seat ? sideClass(seat).replace("s", "c") : "sys";
}

// Tiles to flash (prototype fx-bad / fx-good) and the numbers that float up from them.
function flashMap(s: GameState, events: GameEvent[]) {
  const m = new Map<string, { kind: "bad" | "good"; texts: string[] }>();
  const add = (p: Pos | null | undefined, kind: "bad" | "good", text: string) => {
    if (!p) return;
    const e = m.get(key(p)) ?? { kind, texts: [] };
    e.texts.push(text);
    m.set(key(p), e);
  };
  const posOf = (id: string) => s.units.find((u) => u.id === id)?.pos;
  const towerTile = (seat: Seat, index: number) => {
    const cols = s.config.boardWidth / s.config.towersPerTeam;
    return { x: index * cols + Math.floor(cols / 2), y: towerRow(s.config, seat) };
  };
  for (const e of events) {
    if (e.type === "Damaged") add(posOf(e.unitId), "bad", `-${e.amount}`);
    if (e.type === "Healed") add(posOf(e.unitId), "good", `+${e.amount}`);
    if (e.type === "ShieldAbsorbed") add(posOf(e.unitId), "bad", `🛡${e.amount}`);
    if (e.type === "TowerDamaged") add(towerTile(e.seat, e.index), "bad", `-${e.amount}`);
    if (e.type === "TowerShieldBlocked") add(towerTile(e.seat, e.index), "bad", "🛡");
  }
  return m;
}

function SideBar({ s, seat, snap }: { s: GameState; seat: Seat; snap: Snapshot }) {
  const heroes = s.units.filter((u) => u.owner === seat && u.kind === "hero");
  const on = s.phase === "combat" ? s.activeSeat === seat && !s.outOfRound.includes(seat) : s.phase === "prep" && !s.ready[seat];
  return (
    <div className={`sbar ${sideClass(seat)}${on ? " on" : ""}`}>
      <span className="nm">{sideName(seat, snap)}</span>
      <Pips n={s.players[seat].mana} max={s.config.manaPerRound} />
      <span className="meta">
        <span>💰 {s.players[seat].gold}</span>
        <span>
          ฮีโร่ {heroes.filter((u) => !u.dead).length}/{heroes.length}
        </span>
        <span>มือ {s.players[seat].hand.length} ใบ</span>
        {s.phase === "combat" && s.outOfRound.includes(seat) && <span>ผ่านแล้ว</span>}
      </span>
    </div>
  );
}

function Towers(props: { s: GameState; seat: Seat; view: Seat; targets: Set<string>; picks: Pos[]; flashes: Map<string, { kind: string; texts: string[] }>; onClick: (p: Pos) => void }) {
  const { s, seat, view, targets, picks, flashes, onClick } = props;
  const cols = s.config.boardWidth / s.config.towersPerTeam;
  const row = towerRow(s.config, seat);
  const order = Array.from({ length: s.config.towersPerTeam }, (_, i) => i);
  if (view === "B") order.reverse();
  return (
    <div className="towers">
      {order.map((k) => {
        const t = s.towers[seat][k]!;
        // Aim at the column of the tower that the attack can use (any of its columns).
        const tiles = Array.from({ length: cols }, (_, i) => ({ x: k * cols + i, y: row }));
        const target = tiles.find((p) => targets.has(key(p)));
        const mid = { x: k * cols + Math.floor(cols / 2), y: row };
        const fx = flashes.get(key(mid));
        const picked = picks.filter((p) => p.y === row && towerOfColumn(s.config, p.x) === k).length;
        return (
          <button key={k} className={`tw ${sideClass(seat)}${t.destroyed ? " dead" : ""}${target ? " t" : ""}`} disabled={t.destroyed} onClick={() => onClick(target ?? mid)}>
            <span>{t.destroyed ? "💥" : "🏯"}</span>
            <span>{t.destroyed ? "พัง" : `${t.hp}/${t.maxHp}`}</span>
            {!t.destroyed && t.shieldByHits > 0 && <span>🛡{t.shieldByHits}</span>}
            {picked > 0 && <span className="badge">×{picked}</span>}
            {fx?.texts.map((x, i) => (
              <span key={i} className={`float ${fx.kind}`} style={{ animationDelay: `${i * 0.15}s` }}>
                {x}
              </span>
            ))}
          </button>
        );
      })}
    </div>
  );
}

function Board(props: {
  s: GameState;
  view: Seat;
  sel: string | null;
  targets: Set<string>;
  area: Pos[];
  picks: Pos[];
  flashes: Map<string, { kind: string; texts: string[] }>;
  seq: number;
  onClick: (p: Pos) => void;
}) {
  const { s, view, sel, targets, area, picks, flashes, seq, onClick } = props;
  const W = s.config.boardWidth;
  const H = s.config.boardHeight;
  const areaSet = new Set(area.map(key));
  const cells = [];
  for (let yy = 0; yy < H; yy++) {
    for (let xx = 0; xx < W; xx++) {
      // A's side at the bottom for A (and for local games); B sees the board turned around.
      const y = view === "A" ? H - 1 - yy : yy;
      const x = view === "A" ? xx : W - 1 - xx;
      const p = { x, y };
      const k = key(p);
      const u = unitAt(s, p);
      const zone = (["A", "B"] as const).find((seat) => inZone(s.config, seat, p, s.towers[seat].map((t) => t.destroyed)));
      const fx = flashes.get(k);
      const picked = picks.filter((q) => q.x === x && q.y === y).length;
      const c = ["cell"];
      if (zone) c.push(zone === "A" ? "z0" : "z1");
      if (targets.has(k)) c.push("t");
      if (areaSet.has(k)) c.push("a");
      if (u && u.id === sel) c.push("sel");
      if (fx) c.push(`fx-${fx.kind}`);
      cells.push(
        <button key={`${k}-${fx ? seq : 0}`} className={c.join(" ")} onClick={() => onClick(p)} aria-label={`ช่อง ${x + 1} แถว ${y + 1}`}>
          {u && <Token s={s} u={u} />}
          {picked > 0 && <span className="badge">×{picked}</span>}
          {fx?.texts.map((t, i) => (
            <span key={i} className={`float ${fx.kind}`} style={{ animationDelay: `${i * 0.15}s` }}>
              {t}
            </span>
          ))}
        </button>,
      );
    }
  }
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${W},1fr)` }}>
      {cells}
    </div>
  );
}

function statusIcons(u: Unit): string {
  return u.dots.map((d) => (d.id === "voidmark" ? "🌀" : "🔥")).join("") + Object.keys(u.cc).map((k) => CCI[k]).join("");
}

function Token({ s, u }: { s: GameState; u: Unit }) {
  const d = unitDef(content, u.defId);
  const max = stat(content, u, "maxHp");
  const sh = u.shields.reduce((a, x) => a + x.amount, 0);
  const st = statusIcons(u);
  void s;
  return (
    <span className={`u ${sideClass(u.owner)}${u.kind === "summon" ? " unit" : ""}${u.cc.stun !== undefined ? " stunned" : ""}`}>
      <span className="e">{d.icon}</span>
      <span className="hpn">{u.hp}</span>
      <span className="hp">
        <i style={{ width: `${Math.round((100 * u.hp) / max)}%` }} />
      </span>
      <span className="bbr">
        <i style={{ width: `${Math.round((100 * u.breakBar) / d.stats.breakBar)}%` }} />
      </span>
      {sh > 0 && <span className="shd">🛡{sh}</span>}
      {st && <span className="sti">{st}</span>}
    </span>
  );
}

function StatusText({ s, snap, me, act, myTurn }: { s: GameState; snap: Snapshot; me: Seat; act: Act; myTurn: boolean }) {
  if (s.phase === "prep") {
    return (
      <>
        <b>{sideName(me, snap)}</b>{" "}
        {s.round === 1
          ? "วางฮีโร่ทั้ง 4 ตัวในสองแถวฝั่งของคุณ (แตะชื่อฮีโร่แล้วแตะช่อง) ลงยูนิตจากการ์ดได้ และซื้อของได้"
          : "ช่วงเตรียมตัว ลงยูนิตจากการ์ดได้ และย้ายฮีโร่ได้ตัวละ 1 ครั้งในเขตตัวเอง (แตะตัวแล้วแตะช่อง)"}{" "}
        · เหลือ <Countdown deadline={snap.deadline} /> วินาที
      </>
    );
  }
  if (s.phase !== "combat") return null;
  if (!myTurn) return <>รอ {sideName(s.activeSeat, snap)} เล่น…</>;
  if (act?.type === "ability" && act.picks.length) return <>เลือกช่อง {act.picks.length} แล้ว (เลือกช่องเดิมซ้ำได้)</>;
  if (act?.type === "ability") return <>แตะช่องที่มีกรอบสีเหลืองเพื่อดูผล แล้วแตะซ้ำหรือกดยืนยัน</>;
  if (act?.type === "move") return <>แตะช่องที่มีกรอบสีเหลืองเพื่อเดิน (เดินต่อได้เรื่อย ๆ ตราบที่มีมานา)</>;
  if (act?.type === "card") return <>แตะเป้าหมายที่มีกรอบสีเหลือง</>;
  return (
    <>
      Turn ของ <b>{sideName(me, snap)}</b> เดินได้หลายครั้งโดยไม่เสีย Turn (ใช้มานา ย้อนได้) แล้วเลือก 1 Action หรือกดจบ Turn
    </>
  );
}

function Preview({ s, events }: { s: GameState; events: GameEvent[] }) {
  const lines = events.map((e) => describe(s, e)).filter((x): x is string => !!x && !x.includes("ใช้ "));
  return (
    <div className="tags" style={{ flexDirection: "column", alignItems: "stretch" }}>
      <b>ผลที่จะเกิด</b>
      {lines.length ? lines.map((l, i) => <span key={i}>{l}</span>) : <span>ไม่มีผลกับใคร</span>}
    </div>
  );
}

function Prep(props: { s: GameState; me: Seat; snap: Snapshot; sel: string | null; onSel: (id: string) => void; shopSel: string | null; onShopSel: (id: string | null) => void }) {
  const { s, me, sel, onSel, shopSel, onShopSel } = props;
  const heroes = s.units.filter((u) => u.owner === me && u.kind === "hero" && !u.dead);
  const unplaced = heroes.filter((u) => !u.pos);
  const tiers = [1, 2, 3] as const;
  const label = ["", "ขั้นที่ 1 ซื้อได้เลย", "ขั้นที่ 2 อัพเกรดจากขั้นที่ 1", "ขั้นที่ 3 อัพเกรดจากขั้นก่อนหน้า (ค่าสถานะสูง)"];
  const buyable = (itemId: string, unitId: string) => validate(s, { type: "BuyItem", seat: me, unitId, itemId }, content) === null;
  return (
    <>
      {unplaced.length > 0 && (
        <div className="roster">
          {unplaced.map((u) => {
            const d = unitDef(content, u.defId);
            return (
              <button key={u.id} className={sel === u.id ? "on" : ""} onClick={() => onSel(u.id)}>
                {d.icon} {d.name}
              </button>
            );
          })}
        </div>
      )}
      <div className="shop">
        <h3>
          ร้านค้า <span className="gold">💰 {s.players[me].gold} ทอง</span>
        </h3>
        <p className="muted">
          ฮีโร่ใส่ได้ตัวละ {s.config.itemSlots} ชิ้น อัพเกรดแทนที่ชิ้นเดิมโดยไม่เสียช่อง ขายคืนได้ครึ่งของราคารวม ฮีโร่ที่ล้มจะเสียไอเทม และอีกฝั่งได้ค่าหัว
        </p>
        <div className="items">
          {tiers.map((tier) => [
            <p key={`l${tier}`} className="tierlbl">
              {label[tier]}
            </p>,
            ...content.items
              .filter((it) => it.tier === tier)
              .map((it) => {
                const from = it.from ? content.items.find((x) => x.id === it.from) : undefined;
                const can = heroes.some((u) => buyable(it.id, u.id));
                return (
                  <button key={it.id} className={`item t${tier}${shopSel === it.id ? " on" : ""}`} disabled={!can} onClick={() => onShopSel(it.id)}>
                    <span className="ii">{it.icon}</span>
                    <b>{it.name}</b>
                    <span className="ip">
                      {from ? "+" : ""}
                      {it.price}
                    </span>
                    <span className="cd">
                      {it.text}
                      {from ? ` อัพเกรดจาก ${from.icon} ${from.name}` : ""}
                    </span>
                  </button>
                );
              }),
          ])}
        </div>
        {shopSel && (
          <>
            <p className="status">ใส่ {content.items.find((i) => i.id === shopSel)!.name} ให้ใคร</p>
            <div className="roster">
              {heroes.map((u) => {
                const d = unitDef(content, u.defId);
                return (
                  <button
                    key={u.id}
                    disabled={!buyable(shopSel, u.id)}
                    onClick={() => (session.dispatch({ type: "BuyItem", seat: me, unitId: u.id, itemId: shopSel }), onShopSel(null))}
                  >
                    {d.icon} {d.name} ({u.items.length}/{s.config.itemSlots})
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </>
  );
}

// prototype unitInfo: header, stats, status tags, items, passive, gauge, and the actions.
function UnitInfo({ s, u, mine, act, onAct }: { s: GameState; u: Unit; mine: boolean; act: Act; onAct: (a: Act) => void }) {
  const d = unitDef(content, u.defId);
  const hero = heroDef(content, u.defId);
  const st = (n: Parameters<typeof stat>[2]) => stat(content, u, n);
  const tags: string[] = [];
  for (const sh of u.shields) tags.push(`🛡 โล่ ${sh.amount}${sh.turnsLeft > 0 ? ` (${sh.turnsLeft} Turns)` : ""}`);
  for (const x of u.dots) tags.push(`${x.id === "voidmark" ? "🌀 Voidmark" : "🔥 " + x.id} เหลือ ${x.roundsLeft} รอบ`);
  for (const [k, v] of Object.entries(u.cc)) tags.push(`${CCI[k]} ${k} ${v} (≈${Math.max(1, Math.floor(v / st("speed")))} Turns)`);
  if (u.broken) tags.push("💥 Break");
  for (const b of u.buffs) tags.push(`${b.stat} +${b.amount} (${b.turnsLeft} Turns)`);
  const refs: AbilityRef[] = hero ? ["normal", ...hero.skills.map((_, i) => i), "ultimate"] : ["normal"];
  const sellable = (itemId: string) => validate(s, { type: "SellItem", seat: u.owner, unitId: u.id, itemId }, content) === null;

  // Why an ability cannot be used, from the engine's own check (prototype "warn").
  const warnFor = (ref: AbilityRef): string => {
    const ab = abilityOf(content, u.defId, ref)!;
    const aims = candidateAims(s, ab.targeting);
    const errors = aims.map((aim) => validate(s, { type: "UseAbility", seat: u.owner, unitId: u.id, ability: ref, aim }, content));
    if (errors.some((e) => e === null)) return "";
    const first = errors[0] ?? "";
    return ERR[first] ?? "ไม่มีเป้าหรือช่องที่ใช้ได้";
  };
  const stepCost = stepCostOf(u);

  return (
    <div className={`uinfo ${sideClass(u.owner)}`}>
      <div className="uh">
        <span className="big">{d.icon}</span>
        <div>
          <h3>{d.name}</h3>
          <div className="sub">
            {sideName(u.owner)} / {hero ? hero.role : "ยูนิตเรียก"}
          </div>
        </div>
      </div>
      <div className="stats">
        <span>
          HP <b>{u.hp}/{st("maxHp")}</b>
        </span>
        <span>
          ATK <b>{st("atk")}</b>
        </span>
        <span>
          DEF <b>{st("def")}</b>
        </span>
        <span>
          Armor <b>{st("armor")}</b>
        </span>
        <span>
          Magic Armor <b>{st("magicArmor")}</b>
        </span>
        <span>
          Speed <b>{st("speed")}</b>
        </span>
        <span>
          Break <b>{u.breakBar}/{d.stats.breakBar}</b>
        </span>
        {st("penetration") > 0 && (
          <span>
            Penetration <b>{st("penetration")}</b>
          </span>
        )}
        {st("dotBoost") > 0 && (
          <span>
            DOT Boost <b>{st("dotBoost")}</b>
          </span>
        )}
      </div>
      {tags.length > 0 && (
        <div className="tags">
          {tags.map((t, i) => (
            <span key={i}>{t}</span>
          ))}
        </div>
      )}
      {hero && (
        <div className="equip">
          <span className="muted">
            ไอเทม {u.items.length}/{s.config.itemSlots}
          </span>
          {u.items.map((id, i) => {
            const it = content.items.find((x) => x.id === id)!;
            return (
              <span key={i} className="eq">
                {it.icon} {it.name} <small>{it.text}</small>
                {sellable(id) && (
                  <button className="mini" onClick={() => session.dispatch({ type: "SellItem", seat: u.owner, unitId: u.id, itemId: id })}>
                    ขาย
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}
      {hero && (
        <>
          <p className="pas">
            พาสซีฟ: {hero.passive.name ? `${hero.passive.name}: ` : ""}
            {hero.passive.text} <span className="muted">(ยังไม่ทำงานในเวอร์ชันนี้)</span>
          </p>
          <div className="ultm">
            {hero.ultimate.gaugeName ?? "อัลติ"} {u.ult}/{hero.ultimate.ultMax} (ใช้ {hero.ultimate.ultCost})
            <span className="bar">
              <i style={{ width: `${Math.round((100 * u.ult) / hero.ultimate.ultMax)}%` }} />
            </span>
          </div>
        </>
      )}
      <div className="acts">
        {mine ? (
          <>
            <button className={`act${act?.type === "move" ? " on" : ""}`} disabled={u.cc.stun !== undefined || u.cc.root !== undefined} onClick={() => onAct({ type: "move", unitId: u.id })}>
              <span className="cost">{stepCost}</span>
              <span className="an">เดิน (8 ทิศ)</span>
              <span className="ad">
                {u.cc.root !== undefined ? "ติด Root เดินไม่ได้ " : stepCost === 0 ? "ฟรี ตัวประชิดเดินฟรีได้ 1 ครั้งต่อรอบ " : ""}
                ไม่เสีย Turn เดินต่อได้หลายช่อง ย้อนได้
              </span>
            </button>
            {refs.map((ref) => {
              const ab = abilityOf(content, u.defId, ref)!;
              const warn = warnFor(ref);
              return (
                <AbilityCard
                  key={String(ref)}
                  u={u}
                  ab={ab}
                  ref_={ref}
                  cost={manaCost(content, s, u, ref, ab)}
                  disabled={!!warn}
                  on={act?.type === "ability" && act.ref === ref}
                  {...(warn ? { warn } : {})}
                  onClick={() => onAct({ type: "ability", unitId: u.id, ref, picks: [] })}
                />
              );
            })}
          </>
        ) : (
          <>
            <p className="muted" style={{ margin: 0 }}>
              ความสามารถ
            </p>
            {refs.map((ref) => {
              const ab = abilityOf(content, u.defId, ref)!;
              return <AbilityCard key={String(ref)} u={u} ab={ab} ref_={ref} cost={manaCost(content, s, u, ref, ab)} />;
            })}
          </>
        )}
        <PatternLegend />
      </div>
    </div>
  );
}

// prototype handHTML: the cards of whoever may play now.
function Hand({ s, snap, me, act, onCard }: { s: GameState; snap: Snapshot; me: Seat; act: Act; onCard: (i: number) => void }) {
  if (snap.mySeat && snap.mySeat !== me) return null;
  const p = s.players[me];
  const playable = (card: number) => {
    const tries: Aim[] = [{}];
    for (let y = 0; y < s.config.boardHeight; y++) for (let x = 0; x < s.config.boardWidth; x++) tries.push({ tiles: [{ x, y }] });
    return tries.some((aim) => validate(s, { type: "PlayCard", seat: me, card, aim }, content) === null);
  };
  return (
    <>
      <p className="handlbl">
        การ์ดในมือของ{sideName(me, snap)} (กองเหลือ {p.deck.length})
      </p>
      {p.hand.length === 0 ? (
        <p className="muted">ไม่มีการ์ดในมือ</p>
      ) : (
        <div className="hand">
          {p.hand.map((id, i) => {
            const c = content.cards.find((x) => x.id === id)!;
            return (
              <button key={i} className={`card${act?.type === "card" && act.index === i ? " on" : ""}`} disabled={!playable(i)} onClick={() => onCard(i)}>
                <span className="ch">
                  <span className="ci">{c.icon}</span>
                  <span className="cost">{c.mana}</span>
                </span>
                <b>{c.name}</b>
                <span className="cd">{c.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
