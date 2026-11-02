import { content } from "@hcd/content";
import {
  abilityOf,
  apply,
  Dirs,
  heroDef,
  inZone,
  manaCost,
  resolveArea,
  stat,
  towerOfColumn,
  towerRow,
  unitAt,
  unitDef,
  validate,
  type AbilityRef,
  type Action,
  type Dir,
  type GameEvent,
  type GameState,
  type Pos,
  type Seat,
  type Unit,
} from "@hcd/engine";
import { useEffect, useMemo, useState } from "react";
import { session, type Snapshot } from "../session.ts";
import { describe, seatName, timeName, unitName } from "../text.ts";
import { actingSeat, Countdown, SeatToggle } from "./common.tsx";

type Aiming = { kind: "ability"; unitId: string; ability: AbilityRef } | { kind: "card"; index: number } | null;
const key = (p: Pos) => `${p.x},${p.y}`;
const DIR_LABEL: Record<Dir, string> = { N: "↑", E: "→", S: "↓", W: "←" };
const CC_ICON: Record<string, string> = { stun: "💫", silence: "🔇", root: "⛓️", slow: "🧊" };

export function Match({ snap }: { snap: Snapshot }) {
  const s = snap.state!;
  const [localSeat, setLocalSeat] = useState<Seat>("A");
  const [selected, setSelected] = useState<string | null>(null);
  const [aiming, setAiming] = useState<Aiming>(null);
  const [picks, setPicks] = useState<Pos[]>([]);
  const [hoverDir, setHoverDir] = useState<Dir | null>(null);
  const [pending, setPending] = useState<{ action: Action; events: GameEvent[] } | null>(null);
  const me = actingSeat(snap, localSeat);
  const bottom: Seat = snap.mySeat ?? "A";

  // A new state cancels any half-made action.
  useEffect(() => {
    setAiming(null);
    setPicks([]);
    setPending(null);
  }, [snap.seq]);

  const ok = (a: Action) => validate(s, a, content) === null;
  const sel = selected ? s.units.find((u) => u.id === selected && !u.dead) ?? null : null;
  const mine = sel !== null && sel.owner === me;

  // The action an aim would make, for the current ability or card.
  const actionFor = (aim: { dir?: Dir; tiles?: Pos[] }): Action | null => {
    if (aiming?.kind === "ability") return { type: "UseAbility", seat: me, unitId: aiming.unitId, ability: aiming.ability, aim };
    if (aiming?.kind === "card") return { type: "PlayCard", seat: me, card: aiming.index, aim };
    return null;
  };
  const targeting = aiming?.kind === "ability" && sel ? abilityOf(content, sel.defId, aiming.ability)?.targeting : undefined;
  const count = targeting?.type === "tiles" ? targeting.count : 1;
  const byDirection = targeting && ["shape", "line", "dash"].includes(targeting.type);
  const noAim =
    (targeting && ["around", "team", "board"].includes(targeting.type)) ||
    (aiming?.kind === "card" && content.cards.find((c) => c.id === s.players[me].hand[aiming.index])?.target === "none");

  const [error, setError] = useState("");
  const showPreview = (action: Action | null) => {
    if (!action) return;
    const r = apply(s, action, content);
    if (r.ok) setPending({ action, events: r.events });
    else setError(r.error);
  };

  // Abilities without a target go straight to the preview.
  useEffect(() => {
    setError("");
    if (aiming && noAim) showPreview(actionFor({}));
  }, [aiming]);

  // Tiles to highlight, by what a click there would do.
  const marks = useMemo(() => {
    const m = new Map<string, "move" | "target" | "area">();
    const rows = [-1, ...Array.from({ length: s.config.boardHeight + 1 }, (_, i) => i)];
    const all = rows.flatMap((y) => Array.from({ length: s.config.boardWidth }, (_, x) => ({ x, y })));
    if (pending) return m;
    if (aiming && !byDirection && !noAim) {
      for (const p of all) {
        const a = actionFor({ tiles: Array.from({ length: count }, () => p) });
        if (a && ok(a)) m.set(key(p), "target");
      }
    } else if (byDirection && hoverDir && sel) {
      const area = resolveArea(s, sel, targeting!, { dir: hoverDir });
      if (typeof area !== "string") for (const p of area.tiles) m.set(key(p), "area");
    } else if (!aiming && sel && mine) {
      for (const p of all) {
        const a: Action =
          s.phase === "combat"
            ? { type: "Step", seat: me, unitId: sel.id, to: p }
            : s.round === 1
              ? { type: "PlaceHero", seat: me, unitId: sel.id, to: p }
              : { type: "PrepMove", seat: me, unitId: sel.id, to: p };
        if (ok(a)) m.set(key(p), "move");
      }
    }
    return m;
  }, [s, aiming, sel, hoverDir, pending, me]);

  const clickTile = (p: Pos) => {
    const mark = marks.get(key(p));
    if (mark === "target") {
      const next = [...picks, p];
      if (next.length < count) return setPicks(next);
      setPicks(next);
      return showPreview(actionFor({ tiles: next }));
    }
    if (mark === "move" && sel) {
      session.dispatch(
        s.phase === "combat"
          ? { type: "Step", seat: me, unitId: sel.id, to: p }
          : s.round === 1
            ? { type: "PlaceHero", seat: me, unitId: sel.id, to: p }
            : { type: "PrepMove", seat: me, unitId: sel.id, to: p },
      );
      return;
    }
    if (aiming) return;
    setSelected(unitAt(s, p)?.id ?? null);
  };

  const cancel = () => {
    setAiming(null);
    setPicks([]);
    setPending(null);
  };

  return (
    <div className="match">
      <TopBar snap={snap} me={me} />
      <div className="columns">
        <LeftColumn snap={snap} me={me} selected={sel} onSelect={setSelected} />
        <Board
          s={s}
          bottom={bottom}
          marks={marks}
          selected={selected}
          picks={picks}
          floats={floatsFrom(s, pending ? pending.events : snap.events)}
          floatKey={pending ? `p${snap.seq}` : String(snap.seq)}
          onClick={clickTile}
        />
        <aside className="right">
          {!snap.mySeat && s.phase === "prep" && <SeatToggle seat={localSeat} onChange={setLocalSeat} />}
          <UnitPanel s={s} u={sel} />
          {pending ? (
            <div className="panel preview">
              <h4>ผลที่จะเกิด</h4>
              {pending.events.map((e, i) => {
                const line = describe(s, e);
                return line && <div key={i}>{line}</div>;
              })}
              <div className="row">
                <button className="primary" onClick={() => session.dispatch(pending.action)}>
                  ยืนยัน
                </button>
                <button onClick={cancel}>ยกเลิก</button>
              </div>
            </div>
          ) : aiming ? (
            <div className="panel">
              <h4>เล็งเป้า</h4>
              {byDirection ? (
                <div className="dirs">
                  {Dirs.map((d) => (
                    <button key={d} onMouseEnter={() => setHoverDir(d)} onMouseLeave={() => setHoverDir(null)} onClick={() => showPreview(actionFor({ dir: d }))}>
                      {DIR_LABEL[d]}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="muted">คลิกช่องที่ไฮไลต์{count > 1 ? ` (${picks.length}/${count}, ช่องเดิมซ้ำได้)` : ""}</p>
              )}
              <button onClick={cancel}>ยกเลิก</button>
            </div>
          ) : (
            <Actions s={s} me={me} unit={mine ? sel : null} onAim={(a) => (setAiming(a), setPicks([]))} />
          )}
          <p className="status">{error || snap.status}</p>
        </aside>
      </div>
      <Hand s={s} me={me} onPlay={(index) => (setAiming({ kind: "card", index }), setPicks([]))} />
      {s.phase === "over" && (
        <div className="overlay">
          <div className="panel">
            <h2>🏆 {seatName(s.winner!)} ชนะ!</h2>
            <button onClick={() => session.leave()}>กลับเมนู</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Floating numbers for HP lost or gained (ui.md "Animations"; generic for now).
function floatsFrom(s: GameState, events: GameEvent[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  const add = (p: Pos | null | undefined, text: string) => p && out.set(key(p), [...(out.get(key(p)) ?? []), text]);
  for (const e of events) {
    const u = "unitId" in e ? s.units.find((x) => x.id === e.unitId) : undefined;
    if (e.type === "Damaged") add(u?.pos, `-${e.amount}`);
    if (e.type === "Healed") add(u?.pos, `+${e.amount}`);
    if (e.type === "ShieldAbsorbed") add(u?.pos, `🛡${e.amount}`);
    if (e.type === "TowerDamaged" || e.type === "TowerShieldBlocked") {
      const cols = s.config.boardWidth / s.config.towersPerTeam;
      add({ x: e.index * cols + Math.floor(cols / 2), y: towerRow(s.config, e.seat) }, e.type === "TowerDamaged" ? `-${e.amount}` : "🛡");
    }
  }
  return out;
}

function TopBar({ snap, me }: { snap: Snapshot; me: Seat }) {
  const s = snap.state!;
  const enemy: Seat = me === "A" ? "B" : "A";
  const phase = s.phase === "prep" ? "เตรียมตัว" : s.phase === "combat" ? `ตาของ ${seatName(s.activeSeat)}` : "จบเกม";
  return (
    <header className="bar top">
      <span className="clock">
        🕒 {timeName(s.timeOfDay)} · รอบ {s.round} · {phase} <Countdown deadline={snap.deadline} />
      </span>
      <span>
        {seatName(me)}: 💧{s.players[me].mana} · 🪙{s.players[me].gold}
        {s.outOfRound.length > 0 && ` · ออกจากรอบแล้ว: ${s.outOfRound.join(", ")}`}
      </span>
      <span className="enemy-hand" title="ไพ่ในมือฝ่ายตรงข้าม">
        {seatName(enemy)}: {"🃏".repeat(s.players[enemy].hand.length)}
      </span>
      {!snap.connected && snap.mode !== "local" && <span className="bad">🔴 ไม่ได้เชื่อมต่อ</span>}
    </header>
  );
}

function LeftColumn({ snap, me, selected, onSelect }: { snap: Snapshot; me: Seat; selected: Unit | null; onSelect: (id: string) => void }) {
  const s = snap.state!;
  const [open, setOpen] = useState(true);
  const heroes = s.units.filter((u) => u.owner === me && u.kind === "hero");
  const lines = snap.history.map((e) => describe(s, e)).filter((x): x is string => !!x);
  return (
    <aside className="left">
      <div className="panel muted">ลำดับการแทรกเทิร์น: ยังไม่มี</div>
      <div className="panel">
        <div className="tabs">
          <button className="on" onClick={() => setOpen(!open)}>
            ร้านค้า {open ? "▾" : "▸"}
          </button>
          <button disabled>ดันเจี้ยน</button>
          <button disabled>บัฟทีม</button>
        </div>
        {open && <Shop s={s} me={me} hero={selected?.kind === "hero" && selected.owner === me ? selected : null} />}
      </div>
      {heroes.map((u) => (
        <HeroCard key={u.id} s={s} u={u} active={selected?.id === u.id} onClick={() => onSelect(u.id)} />
      ))}
      <div className="panel log">
        {lines
          .slice(-30)
          .reverse()
          .map((l, i) => (
            <div key={i}>{l}</div>
          ))}
      </div>
    </aside>
  );
}

function Shop({ s, me, hero }: { s: GameState; me: Seat; hero: Unit | null }) {
  if (s.phase !== "prep") return <p className="muted">ร้านเปิดตอนเฟสเตรียมตัว</p>;
  if (!hero) return <p className="muted">เลือกฮีโร่ของคุณก่อน</p>;
  return (
    <div className="shop">
      {content.items.map((it) => {
        const a: Action = { type: "BuyItem", seat: me, unitId: hero.id, itemId: it.id };
        return (
          <button key={it.id} disabled={validate(s, a, content) !== null} title={it.text} onClick={() => session.dispatch(a)}>
            {it.icon} {it.name} <small>{it.price}🪙</small>
          </button>
        );
      })}
    </div>
  );
}

function HeroCard({ s, u, active, onClick }: { s: GameState; u: Unit; active: boolean; onClick: () => void }) {
  const d = heroDef(content, u.defId)!;
  const max = stat(content, u, "maxHp");
  return (
    <div className={`panel hero-card ${active ? "active" : ""} ${u.dead ? "dead" : ""}`} onClick={onClick}>
      <b>
        {d.icon} {d.name}
      </b>{" "}
      {u.getsFreeStep && !u.freeStepUsed && "👣"} {Object.keys(u.cc).map((k) => CC_ICON[k]).join("")}
      <Bar value={u.hp} max={max} className="hp" label={`HP ${u.hp}/${max}`} />
      <small>
        Break {u.breakBar}/{d.stats.breakBar} · {d.ultimate.gaugeName ?? "Ult"} {u.ult}/{d.ultimate.ultMax}
      </small>
      <div className="items">
        {u.items.map((id, i) => {
          const it = content.items.find((x) => x.id === id)!;
          const sell: Action = { type: "SellItem", seat: u.owner, unitId: u.id, itemId: id };
          return (
            <span key={i} title={it.text}>
              {it.icon}
              {validate(s, sell, content) === null && (
                <button className="mini" onClick={(e) => (e.stopPropagation(), session.dispatch(sell))}>
                  ขาย
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function Bar({ value, max, className, label }: { value: number; max: number; className: string; label: string }) {
  return (
    <div className={`bar-outer ${className}`} title={label}>
      <div className="bar-inner" style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
      <span>{label}</span>
    </div>
  );
}

function Board(props: {
  s: GameState;
  bottom: Seat;
  marks: Map<string, string>;
  selected: string | null;
  picks: Pos[];
  floats: Map<string, string[]>;
  floatKey: string;
  onClick: (p: Pos) => void;
}) {
  const { s, bottom, marks, selected, picks, floats, floatKey, onClick } = props;
  const H = s.config.boardHeight;
  const ys = Array.from({ length: H + 2 }, (_, i) => i - 1); // -1 .. H (tower rows at both ends)
  const rows = bottom === "A" ? [...ys].reverse() : ys;
  const cols = s.config.boardWidth / s.config.towersPerTeam;
  return (
    <div className="board" style={{ gridTemplateColumns: `repeat(${s.config.boardWidth}, 1fr)` }}>
      {rows.flatMap((y) =>
        Array.from({ length: s.config.boardWidth }, (_, x) => {
          const p = { x, y };
          const k = key(p);
          const mark = marks.get(k) ?? "";
          const picked = picks.filter((q) => q.x === x && q.y === y).length;
          const float = floats.get(k)?.map((t, i) => (
            <span key={`${floatKey}-${i}`} className={`float ${t.startsWith("+") ? "heal" : ""}`} style={{ animationDelay: `${i * 0.15}s` }}>
              {t}
            </span>
          ));
          if (y === -1 || y === H) {
            const seat: Seat = y === -1 ? "A" : "B";
            const t = s.towers[seat][towerOfColumn(s.config, x)]!;
            const middle = x % cols === Math.floor(cols / 2);
            return (
              <div key={k} className={`tile tower seat-${seat} ${t.destroyed ? "destroyed" : ""} ${mark}`} onClick={() => onClick(p)}>
                {middle && (t.destroyed ? "🏚️" : `🏰 ${t.hp}${t.shieldByHits ? ` 🛡${t.shieldByHits}` : ""}`)}
                {picked > 0 && <span className="badge">×{picked}</span>}
                {float}
              </div>
            );
          }
          const u = unitAt(s, p);
          const zone = (["A", "B"] as const).find((seat) => inZone(s.config, seat, p, s.towers[seat].map((t) => t.destroyed)));
          return (
            <div key={k} className={`tile ${zone ? `zone-${zone}` : ""} ${mark} ${u?.id === selected ? "selected" : ""}`} onClick={() => onClick(p)}>
              {u && <UnitToken s={s} u={u} />}
              {picked > 0 && <span className="badge">×{picked}</span>}
              {float}
            </div>
          );
        }),
      )}
    </div>
  );
}

function UnitToken({ s, u }: { s: GameState; u: Unit }) {
  const d = unitDef(content, u.defId);
  const max = stat(content, u, "maxHp");
  return (
    <div className={`token seat-${u.owner} ${u.broken ? "broken" : ""}`} title={unitName(s, u.id)}>
      <span className="icon">{d.icon}</span>
      <span className="cc">{Object.keys(u.cc).map((k) => CC_ICON[k]).join("")}</span>
      <div className="mini-hp">
        <div style={{ width: `${(u.hp / max) * 100}%` }} />
      </div>
    </div>
  );
}

function UnitPanel({ s, u }: { s: GameState; u: Unit | null }) {
  if (!u) return <div className="panel muted">คลิกตัวละครเพื่อดูค่าสเตตัส</div>;
  const d = unitDef(content, u.defId);
  const st = (n: Parameters<typeof stat>[2]) => stat(content, u, n);
  return (
    <div className={`panel unit-panel seat-${u.owner}`}>
      <h4>
        {d.icon} {d.name} <small>({u.owner})</small>
      </h4>
      <div>
        HP {u.hp}/{st("maxHp")} · ATK {st("atk")} · DEF {st("def")} · Speed {st("speed")}
      </div>
      <div>
        Armor {st("armor")} · M.Armor {st("magicArmor")} · Pen {st("penetration")} · Break {u.breakBar}/{d.stats.breakBar}
      </div>
      {u.shields.length > 0 && <div>🛡 โล่ {u.shields.reduce((a, x) => a + x.amount, 0)}</div>}
      {Object.entries(u.cc).map(([k, v]) => (
        <div key={k}>
          {CC_ICON[k]} {k} (เหลือ ~{Math.max(1, Math.floor(v / st("speed")))} Turn)
        </div>
      ))}
      {u.dots.map((x) => (
        <div key={x.id}>
          🔥 {x.id} ({x.roundsLeft} รอบ)
        </div>
      ))}
      {u.buffs.map((b, i) => (
        <div key={i}>
          ⬆ {b.stat} +{b.amount} ({b.turnsLeft} Turn)
        </div>
      ))}
    </div>
  );
}

function Actions({ s, me, unit, onAim }: { s: GameState; me: Seat; unit: Unit | null; onAim: (a: Aiming) => void }) {
  if (s.phase === "prep") {
    return (
      <div className="panel">
        <p className="muted">{s.round === 1 ? "เลือกฮีโร่แล้วคลิกช่องในโซนเพื่อวาง" : "เลือกตัวละครแล้วคลิกช่องในโซนเพื่อย้าย (ตัวละ 1 ครั้ง)"}</p>
        <button className="primary" disabled={s.ready[me]} onClick={() => session.dispatch({ type: "Ready", seat: me })}>
          {s.ready[me] ? "พร้อมแล้ว รออีกฝ่าย…" : "พร้อม"}
        </button>
      </div>
    );
  }
  if (s.phase !== "combat") return null;
  const myTurn = s.activeSeat === me;
  const hero = unit ? heroDef(content, unit.defId) : undefined;
  const refs: AbilityRef[] = unit ? (hero ? ["normal", ...hero.skills.map((_, i) => i), "ultimate"] : ["normal"]) : [];
  return (
    <div className="panel">
      {unit && myTurn ? (
        refs.map((ref) => {
          const ab = abilityOf(content, unit.defId, ref)!;
          const tag = ref === "normal" ? "ตี" : ref === "ultimate" ? "อัลติ" : "สกิล";
          return (
            <button key={String(ref)} className="ability" title={ab.text} onClick={() => onAim({ kind: "ability", unitId: unit.id, ability: ref })}>
              <span className="tag">{tag}</span> {ab.name} <span className="mana">{manaCost(content, s, unit, ref, ab)}💧</span>
            </button>
          );
        })
      ) : (
        <p className="muted">{myTurn ? "เลือกตัวละครของคุณ" : `รอ ${seatName(s.activeSeat)}…`}</p>
      )}
      {myTurn && (
        <div className="row">
          <button disabled={s.undoSteps.length === 0} onClick={() => session.dispatch({ type: "Undo", seat: me })}>
            ↩ ย้อนเดิน
          </button>
          <button
            className="danger"
            onClick={() => confirm("จบเทิร์น = ออกจากรอบนี้ อีกฝ่ายจะเล่นต่อคนเดียว แน่ใจไหม?") && session.dispatch({ type: "EndTurn", seat: me })}
          >
            จบเทิร์น
          </button>
        </div>
      )}
    </div>
  );
}

// ui.md "Hand": hidden at the bottom edge, pops up on hover.
function Hand({ s, me, onPlay }: { s: GameState; me: Seat; onPlay: (index: number) => void }) {
  const hand = s.players[me].hand;
  return (
    <div className="hand">
      <div className="hand-strip">
        🃏 ไพ่ในมือ {hand.length}/{s.config.handLimit}
      </div>
      <div className="hand-cards">
        {hand.map((id, i) => {
          const c = content.cards.find((x) => x.id === id)!;
          return (
            <button key={i} className="card" title={c.text} onClick={() => onPlay(i)}>
              <span className="mana">{c.mana}💧</span>
              <span className="icon">{c.icon}</span>
              <b>{c.name}</b>
              <small>{c.text}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}
