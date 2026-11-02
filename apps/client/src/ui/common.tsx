// Shared pieces, ported from the prototype's render functions (prototype/index.html "render").
import { content } from "@hcd/content";
import {
  createUnit,
  heroDef,
  type HeroDef,
  stat,
  unitDef,
  type AbilityDef,
  type AbilityRef,
  type Formula,
  type FormulaInput,
  type Offset,
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

const evalF = (f: Formula | undefined, input: FormulaInput) => (f === undefined ? 0 : typeof f === "number" ? f : f(input));
const fmtPM = (p: number, m: number) => {
  const parts = [p > 0 && `กายภาพ ${p}`, m > 0 && `เวท ${m}`].filter(Boolean);
  return parts.join(" + ") || "0";
};
const shapeName = (n: number) => `${n} ช่อง`;

function areaText(ab: AbilityDef): string {
  const t = ab.targeting;
  switch (t.type) {
    case "adjacent":
      return "ระยะ 1 รอบตัว 8 ทิศ โดนเป้าเดียว";
    case "enemy":
      return t.blink ? `วาร์ปไปข้างศัตรู 1 ตัวในระยะ ${t.range}` : `ศัตรู 1 ตัวในระยะ ${t.range}`;
    case "shape":
      return `${t.shape.length} ช่องด้านหน้า หันได้ 4 ทิศ โดนทุกตัวในพื้นที่`;
    case "around":
      return `รอบตัว ${shapeName(t.shape.length)}`;
    case "line":
      return `เส้นตรง ${t.length} ช่อง หันได้ 4 ทิศ ${t.pierce ? "ทะลุโดนทุกตัว" : "โดนตัวแรกที่ขวาง"}`;
    case "tile":
      return `เลือกจุดในระยะ ${t.range} ระเบิดเป็น ${shapeName(t.shape.length)}`;
    case "tiles":
      return `เลือก ${t.count} ช่องในระยะ ${t.range} (เลือกช่องเดิมซ้ำได้)`;
    case "ally":
      return `พวก 1 ตัวในระยะ ${t.range} (รวมตัวเอง)`;
    case "team":
      return "พวกทุกตัวบนกระดาน";
    case "summon":
      return "ลงในช่องว่างติดตัว 8 ทิศ";
    case "dash":
      return `พุ่งตรงสูงสุด ${t.length} ช่อง หันได้ 4 ทิศ`;
    case "board":
      return "ยูนิตทุกตัวบนกระดาน";
  }
}

const SPECIAL: Record<string, string> = {
  oath: "Giuramento d'Avorio: คุ้มกันพวกรอบตัวและสวนกลับ",
  vendetta: "ได้ Vendetta della Cittadella (สวนกลับแรงขึ้น)",
  collapse: "Collapse: ระเบิด Voidmark ทุกตัวบนกระดาน",
  rehide: "ถ้าฆ่าได้ จะล่องหนอีกครั้ง",
  shuffle: "สุ่มย้ายยูนิตทุกตัว",
};

function details(u: Unit, ab: AbilityDef, ref: AbilityRef): string[] {
  const L: string[] = [];
  const input = (index: number): FormulaInput => ({ atk: stat(content, u, "atk"), def: stat(content, u, "def"), index, target: null });
  if (ab.trueDamage !== undefined) L.push("ดาเมจทะลุทุกอย่าง 22% ของ HP สูงสุดเป้า");
  else if (ab.physical !== undefined || ab.magic !== undefined) {
    const n = ab.targeting.type === "shape" ? ab.targeting.shape.length : 1;
    const vals = Array.from({ length: n }, (_, i) => fmtPM(Math.max(0, evalF(ab.physical, input(i))), Math.max(0, evalF(ab.magic, input(i)))));
    const count = ab.targeting.type === "tiles" ? ` ต่อดาบ × ${ab.targeting.count} เล่ม` : "";
    if (new Set(vals).size === 1) L.push(`ดาเมจ ${vals[0]}${count}`);
    else vals.forEach((v, i) => L.push(`ช่อง ${i + 1}: ${v}`));
  }
  if (ab.penetration) L.push(`Penetration +${ab.penetration} เฉพาะท่านี้`);
  if (ab.break) L.push(`Break ${ab.break}${ab.breakPerHit ? " ต่อครั้ง" : ""}`);
  const hero = heroDef(content, u.defId);
  if (hero) {
    const gauge = hero.ultimate.gaugeName ?? "อัลติ";
    if (ref === "ultimate") L.push(`ใช้ ${gauge} ${hero.ultimate.ultCost} (เก็บได้สูงสุด ${hero.ultimate.ultMax})`);
    else {
      const g = ab.ultGain ?? (ref === "normal" ? 1 : 2);
      L.push(g ? `ได้ ${gauge} +${g}` : `ไม่ได้ ${gauge}`);
    }
  }
  if (ab.hpCost) L.push(`เสีย HP ตัวเอง ${ab.hpCost}`);
  for (const e of ab.onHit ?? []) {
    if (e.type === "cc") L.push(`${CCI[e.cc]} ${CCN[e.cc]} ${e.recovery} (ประมาณ ${Math.floor(e.recovery / 100)} Turns ถ้าเป้า Speed 100)`);
    else {
      const boost = stat(content, u, "dotBoost");
      const p = evalF(e.physical, input(0));
      const m = evalF(e.magic, input(0));
      const tick = (p > 0 ? p + boost : 0) + (m > 0 ? m + boost : 0);
      L.push(`${e.id === "voidmark" ? "🌀 Voidmark" : "🔥 " + e.id} ${e.rounds} รอบ: ทิกตอนจบรอบ ${Math.max(tick, 1)} ไม่สนโล่และเกราะ`);
    }
  }
  if (ab.heal) L.push(`ฟื้น HP ${ab.heal}`);
  if (ab.shield) L.push(`โล่แบบ ${ab.shield.mode === "add" ? "Add" : "Set"} ${ab.shield.amount} นาน ${ab.shield.turns} Turns`);
  for (const b of ab.buffs ?? []) L.push(`${STATN[b.stat] ?? b.stat} +${b.amount} นาน ${b.turns} Turns`);
  if (ab.selfBuff) L.push(`ตัวเอง ${STATN[ab.selfBuff.stat] ?? ab.selfBuff.stat} +${ab.selfBuff.amount} นาน ${ab.selfBuff.turns} Turns`);
  if (ab.cleanse) L.push("Cleanse ล้าง CC และ DOT ทั้งหมด");
  if (ab.selfHeal) L.push(`ฟื้น HP ตัวเอง ${ab.selfHeal}`);
  if (ab.lifeSteal) L.push("ฟื้น HP ตัวเองครึ่งหนึ่งของดาเมจที่ทำ");
  if (ab.knockback) L.push("ผลักเป้าถอย 1 ช่อง");
  if (ab.freeAction) L.push("ไม่เสีย Turn");
  if (ab.zone) L.push(`☁️ ควัน ${ab.zone.turns} Turns`);
  if (ab.targeting.type === "summon") {
    const d = unitDef(content, ab.targeting.unit);
    L.push(`เรียก ${d.icon} ${d.name} สูงสุด ${ab.targeting.count} ตัว (HP ${d.stats.maxHp} ATK ${d.stats.atk})`);
  }
  if (ab.special) L.push(`${SPECIAL[ab.special] ?? ab.special} (ยังไม่ทำงานในเวอร์ชันนี้)`);
  return L;
}

// Mini grid of the area. Offsets are +y forward; the grid draws forward as up.
function Pattern({ ab }: { ab: AbilityDef }) {
  const m = new Map<string, string>();
  const set = (x: number, y: number, c: string) => m.set(`${x},${-y}`, c);
  const ring = (r: number, c: string, cheb: boolean) => {
    for (let y = -r; y <= r; y++)
      for (let x = -r; x <= r; x++) {
        const d = cheb ? Math.max(Math.abs(x), Math.abs(y)) : Math.abs(x) + Math.abs(y);
        if (d >= 1 && d <= r) set(x, y, c);
      }
  };
  const cap = (n: number) => Math.min(n, 3);
  const shape = (offs: readonly Offset[], dy = 0) => offs.forEach(([x, y]) => Math.abs(x) <= 3 && Math.abs(y + dy) <= 3 && set(x, y + dy, "hit"));
  const t = ab.targeting;
  switch (t.type) {
    case "adjacent":
      ring(1, "rng", true);
      set(0, 1, "hit");
      break;
    case "enemy":
    case "tiles":
      ring(cap(t.range), "rng", false);
      set(0, cap(Math.min(t.range, 2)), "hit");
      break;
    case "shape":
    case "around":
      shape(t.shape);
      break;
    case "line":
      for (let i = 1; i <= cap(t.length); i++) set(0, i, t.pierce || i === 1 ? "hit" : "rng");
      break;
    case "dash":
      for (let i = 1; i <= cap(t.length); i++) set(0, i, "mv");
      break;
    case "tile":
      ring(cap(t.range), "rng", false);
      shape(t.shape, Math.min(t.range, 2));
      break;
    case "ally":
      ring(cap(t.range), "al2", false);
      break;
    case "summon":
      ring(1, "al", true);
      break;
    default:
      return null;
  }
  let R = 1;
  for (const k of m.keys()) {
    const [x, y] = k.split(",").map(Number);
    R = Math.max(R, Math.abs(x!), Math.abs(y!));
  }
  R = Math.min(3, R);
  const cells = [];
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) cells.push(<i key={`${x},${y}`} className={x === 0 && y === 0 ? "me" : m.get(`${x},${y}`) ?? ""} />);
  return (
    <span className="pg" style={{ gridTemplateColumns: `repeat(${2 * R + 1},9px)` }} aria-hidden="true">
      {cells}
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
