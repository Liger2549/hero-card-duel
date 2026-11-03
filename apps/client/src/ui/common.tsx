// Shared pieces, ported from the prototype's render functions (prototype/index.html "render").
import { content } from "@hcd/content";
import {
  createUnit,
  heroDef,
  type HeroDef,
  stat,
  pctOf,
  unitDef,
  type AbilityDef,
  type AbilityRef,
  type FormulaInput,
  type HitForm,
  evalFormula,
  gridRow,
  inRange,
  type Seat,
  type Unit,
} from "@hcd/engine";
import { useEffect, useState } from "react";
import type { Snapshot } from "../session.ts";

export const TIMES = [
  { n: "เช้า", ic: "🌅", sky: "#F3D7A1" },
  { n: "เที่ยง", ic: "☀️", sky: "#BFE0F0" },
  { n: "เย็น", ic: "🌇", sky: "#F0B27A" },
  { n: "พลบค่ำ", ic: "🌆", sky: "#9C6A88" },
  { n: "กลางคืน", ic: "🌙", sky: "#3A4275" },
  { n: "ดึก", ic: "🌌", sky: "#1C2142" },
];
export const CCI: Record<string, string> = { stun: "💫", silence: "🔇", root: "⛓️", slow: "🧊" };
const CCN: Record<string, string> = { stun: "Stun", silence: "Silence", root: "Root", slow: "Slow" };
const STATN: Record<string, string> = { atk: "ATK", def: "DEF", armor: "Armor", magicArmor: "Magic Armor", penetration: "Penetration", breakBoost: "Break Boost" };
const sideIndex = (seat: Seat) => (seat === "A" ? 0 : 1);
export const sideClass = (seat: Seat) => `s${sideIndex(seat)}`;
export const sideName = (seat: Seat, snap?: Snapshot) =>
  `${snap?.names[seat] || `ผู้เล่น ${seat === "A" ? 1 : 2}`}${snap?.mySeat === seat && snap.mode !== "ai" ? " (คุณ)" : ""}`;

// Who this device is acting as. Online: its own seat. Local: the seat due to act, or the seat
// being prepared in the Preparation Phase (both prepare at the same time).
export function actingSeat(snap: Snapshot, localSeat: Seat): Seat {
  if (snap.mySeat) return snap.mySeat;
  const s = snap.state!;
  if (s.phase === "draft") {
    const d = s.draft!;
    if (d.stage === "timeOfDay") return "A";
    if (d.stage === "ban") return s.config.banOrder[d.banIndex]!;
    return s.config.pickOrder[d.pickIndex]!;
  }
  if (s.phase === "combat") return s.activeSeat;
  return localSeat;
}

export function Dayband({ now, onPick }: { now: number; onPick?: (i: number) => void }) {
  return (
    <div className="dayband" role="img" aria-label={now >= 0 ? `เวลาในเกม ${TIMES[now]!.n}` : "เวลาในเกมทั้งหกช่วง"}>
      {TIMES.map((t, i) => (
        <span
          key={t.n}
          className={`${i === now ? "now" : ""}${i >= 3 ? " dk" : ""}`}
          style={{ background: t.sky, cursor: onPick ? "pointer" : undefined }}
          onClick={onPick && (() => onPick(i))}
        >
          {t.ic}
          <small>{t.n}</small>
        </span>
      ))}
    </div>
  );
}

export function Pips({ n, max }: { n: number; max: number }) {
  return (
    <span className="pips" aria-label={`มานา ${n}`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={`pip${i < n ? " on" : ""}`} />
      ))}
      {n > max && <b className="more">+{n - max}</b>}
    </span>
  );
}

export function Countdown({ deadline }: { deadline: number | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 250);
    return () => clearInterval(id);
  }, []);
  if (deadline === null) return null;
  return <b>{Math.max(Math.ceil((deadline - Date.now()) / 1000), 0)}</b>;
}

// ---- Ability cards (prototype abilityCard / areaText / abilityDetail / patternHTML) ----

const evalF = evalFormula;
const fmtPM = (p: number, m: number) => {
  const parts = [p > 0 && `กายภาพ ${p}`, m > 0 && `เวท ${m}`].filter(Boolean);
  return parts.join(" + ") || "0";
};
const rangeText = (r: NonNullable<HitForm["range"]>) =>
  "manhattan" in r ? `ในระยะ ${r.manhattan}` : "square" in r ? `ในสี่เหลี่ยม ${2 * r.square + 1}x${2 * r.square + 1}` : `บนขอบห่าง ${r.ring} ช่อง`;

// board.md "Skill Areas": header like the docs' ("Rotating (8 directions) | Hit: All | No lock").
function areaText(ab: AbilityDef): string {
  const f = ab.form;
  const turn = f.rotate === 0 ? "ไม่หมุน" : `หมุนได้ ${f.rotate} ทิศ`;
  const hit = { all: "โดนทุกตัวในพื้นที่", first: "โดนตัวแรกที่ขวาง", allies: "พวกในพื้นที่", both: "ทุกตัวในพื้นที่" }[f.hit];
  const pick = f.range ? `เลือก${(f.picks ?? 1) > 1 ? ` ${f.picks} ช่อง (ซ้ำได้)` : "ช่อง"} ${rangeText(f.range)}${f.blocked ? " ยิงข้ามไม่ได้" : ""} · Lock-on` : "No lock";
  return `${turn} · ${hit} · ${pick}`;
}

const SPECIAL: Record<string, string> = {
  oath: "Giuramento d'Avorio: คุ้มกันพวกรอบตัวและสวนกลับ",
  vendetta: "ได้ Vendetta della Cittadella (สวนกลับแรงขึ้น)",
  collapse: "Collapse: ระเบิด Voidmark ทุกตัวบนกระดาน",
};

function details(u: Unit, ab: AbilityDef, ref: AbilityRef): string[] {
  const L: string[] = [];
  const input: FormulaInput = { atk: stat(content, u, "atk"), def: stat(content, u, "def"), stat: (n) => stat(content, u, n), index: 0, target: null };
  if (ab.physical !== undefined || ab.magic !== undefined) L.push(`ดาเมจ ${fmtPM(evalF(ab.physical, input), evalF(ab.magic, input))}${(ab.form.picks ?? 1) > 1 ? ` ต่อช่อง × ${ab.form.picks}` : ""}`);
  for (const [z, v] of Object.entries(ab.zones ?? {})) {
    L.push(`โซน ${z}: ${fmtPM(evalF(v.physical ?? ab.physical, input), evalF(v.magic ?? ab.magic, input))}${v.break !== undefined ? ` Break ${evalF(v.break, input)}` : ""}`);
  }
  for (const [type, f] of Object.entries(ab.falloff ?? {})) {
    if (f) L.push(`Falloff ${type === "physical" ? "กายภาพ" : "เวท"} ${"each" in f ? `−${f.each} ต่อช่องถัดไป` : f.steps.map((n) => `−${n}`).join(", ")}`);
  }
  if (ab.penetration) L.push(`Penetration +${ab.penetration} เฉพาะท่านี้`);
  if (ab.break !== undefined) L.push(`Break ${evalF(ab.break, input)}${ab.breakPerHit ? " ต่อครั้ง" : ""}`);
  const hero = heroDef(content, u.defId);
  if (hero) {
    const gauge = hero.ultimate.gaugeName ?? "อัลติ";
    if (ref === "ultimate") L.push(`ใช้ ${gauge} ${hero.ultimate.ultCost} (เก็บได้สูงสุด ${hero.ultimate.ultMax})`);
    else {
      const g = ab.ultGain ?? (ref === "normal" ? 1 : 2);
      L.push(g ? `ได้ ${gauge} +${g}` : `ไม่ได้ ${gauge}`);
    }
  }
  for (const e of ab.onHit ?? []) {
    if (e.type === "cc") L.push(`${CCI[e.cc]} ${CCN[e.cc]} ${e.recovery} (ประมาณ ${Math.floor(e.recovery / 100)} Turns ถ้าเป้า Speed 100)`);
    else {
      const tick = pctOf(evalF(e.damage, input) + stat(content, u, "dotBoost"), stat(content, u, "dotPower"));
      const when = e.kind === "round" ? `${e.duration} รอบ: ทิกตอนจบรอบ` : `${e.duration} เทิร์นของฝั่งเป้า: ทิกตอนจบเทิร์นฝั่งเป้า`;
      const brk = e.breakPerTick ? ` Break ${e.breakPerTick}` : "";
      L.push(`${e.id === "voidmark" ? "🌀 Voidmark" : "🔥 " + e.id} ${when} ${Math.max(tick, 1)}${brk} ไม่สนโล่และเกราะ`);
    }
  }
  if (ab.heal !== undefined) L.push(`ฟื้น HP ${evalF(ab.heal, input)}`);
  if (ab.shield) L.push(`โล่แบบ ${ab.shield.mode === "add" ? "Add" : "Set"} ${evalF(ab.shield.amount, input)} นาน ${ab.shield.turns} Turns`);
  for (const b of ab.buffs ?? []) L.push(`${STATN[b.stat] ?? b.stat} +${b.amount} นาน ${b.turns} Turns`);
  if (ab.selfBuff) L.push(`ตัวเอง ${STATN[ab.selfBuff.stat] ?? ab.selfBuff.stat} +${ab.selfBuff.amount} นาน ${ab.selfBuff.turns} Turns`);
  if (ab.cleanse) L.push("Cleanse ล้าง CC และ DOT ทั้งหมด");
  if (ab.selfHeal !== undefined) L.push(`ฟื้น HP ตัวเอง ${evalF(ab.selfHeal, input)}`);
  if (ab.knockback) L.push("ผลักเป้าถอย 1 ช่อง");
  if (ab.freeAction) L.push("ไม่เสีย Turn");
  if (ab.special) L.push(`${SPECIAL[ab.special] ?? ab.special} (ยังไม่ทำงานในเวอร์ชันนี้)`);
  return L;
}

// Mini grid of the area, drawn straight from the docs' grid (facing up). A picked tile with no grid shows its range.
function Pattern({ ab }: { ab: AbilityDef }) {
  const f = ab.form;
  let rows: string[][];
  if (f.grid) {
    rows = f.grid.map(gridRow);
  } else if (f.range) {
    const n = Math.min("manhattan" in f.range ? f.range.manhattan : "square" in f.range ? f.range.square : f.range.ring, 3);
    rows = Array.from({ length: 2 * n + 1 }, (_, y) =>
      Array.from({ length: 2 * n + 1 }, (_, x) => {
        const dx = Math.abs(x - n);
        const dy = Math.abs(y - n);
        if (dx === 0 && dy === 0) return "C";
        return f.range && inRange(f.range, { x: n, y: n }, { x, y }) ? "T" : ".";
      }),
    );
  } else return null;
  const cls = (m: string) => (m === "C" ? "me" : m === "." ? "" : m === "T" ? "rng" : f.hit === "allies" ? "al" : "hit");
  const width = Math.max(...rows.map((r) => r.length));
  return (
    <span className="pg" style={{ gridTemplateColumns: `repeat(${width},9px)` }} aria-hidden="true">
      {rows.flatMap((r, y) => Array.from({ length: width }, (_, x) => <i key={`${x},${y}`} className={cls(r[x] ?? ".")} />))}
    </span>
  );
}

export const PatternLegend = () => (
  <p className="pgl">
    <i className="me" />
    ตัวเอง <i className="hit" />
    ช่องที่โดน <i className="rng" />
    ระยะที่เลือกได้ <i className="al" />
    พวก <i className="mv" />
    ทางเดิน
  </p>
);

export function AbilityCard(props: {
  u: Unit;
  ab: AbilityDef;
  ref_: AbilityRef;
  cost: number;
  onClick?: () => void;
  disabled?: boolean;
  on?: boolean;
  warn?: string;
}) {
  const { u, ab, ref_, cost, onClick, disabled, on, warn } = props;
  const type = ref_ === "normal" ? "na" : ref_ === "ultimate" ? "ult" : "skill";
  const tag = { na: "ตีปกติ", skill: "สกิล", ult: "อัลติ" }[type];
  const body = (
    <>
      <span className="cost">{cost}</span>
      <span className="abm">
        <span className="abh">
          <span className="abt">{tag}</span>
          <span className="an">{ab.name}</span>
        </span>
        <span className="ara">{areaText(ab)}</span>
        <span className="abl">
          {details(u, ab, ref_).map((l, i) => (
            <span key={i}>{l}</span>
          ))}
        </span>
        {warn && <span className="abw">{warn}</span>}
      </span>
      <Pattern ab={ab} />
    </>
  );
  if (!onClick) return <span className={`act ab ${type} ro`}>{body}</span>;
  return (
    <button className={`act ab ${type}${on ? " on" : ""}`} disabled={disabled} onClick={onClick}>
      {body}
    </button>
  );
}

const ORIGIN = { own: "ฮีโร่ของคุณ", idea: "จากไอเดียของคุณ", new: "ตัวใหม่" };

// One hero with stats, passive and every ability (prototype draft card; also the hero page).
export function HeroCard(props: { hero: HeroDef; cls?: string; label?: string; disabled?: boolean; onClick?: () => void }) {
  const { hero: h, cls = "", label, disabled, onClick } = props;
  const u = createUnit(content, h.id, "A", h.id);
  const refs: AbilityRef[] = ["normal", ...h.skills.map((_, k) => k), "ultimate"];
  const body = (
    <>
      <span className={`org ${h.origin}`}>{label ?? ORIGIN[h.origin]}</span>
      <span className="hn">
        <span>{h.icon}</span>
        <span>
          <h3>{h.name}</h3>
          <span className="sub">
            {h.role} · {h.attackType}
          </span>
        </span>
      </span>
      <p>
        HP {h.stats.maxHp} ATK {h.stats.atk} DEF {h.stats.def} Speed {h.stats.speed} Break {h.stats.breakBar}
        {h.stats.armor ? ` Armor ${h.stats.armor}` : ""}
        {h.stats.magicArmor ? ` Magic Armor ${h.stats.magicArmor}` : ""}
        {h.stats.penetration ? ` Pen ${h.stats.penetration}` : ""}
        {h.stats.dotBoost ? ` DOT Boost ${h.stats.dotBoost}` : ""}
      </p>
      <p>
        <span className="k">พาสซีฟ</span> {h.passive.name ? `${h.passive.name}: ` : ""}
        {h.passive.text}
      </p>
      <span className="hab">
        {refs.map((ref) => {
          const ab = ref === "normal" ? h.normalAttack : ref === "ultimate" ? h.ultimate : h.skills[ref]!;
          return <AbilityCard key={String(ref)} u={u} ab={ab} ref_={ref} cost={ab.mana} />;
        })}
      </span>
    </>
  );
  if (!onClick) return <div className={`hcard ${cls}`}>{body}</div>;
  return (
    <button className={`hcard ${cls}`} disabled={disabled} onClick={onClick}>
      {body}
    </button>
  );
}
