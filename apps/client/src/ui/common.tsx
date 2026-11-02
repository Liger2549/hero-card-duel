import { content } from "@hcd/content";
import type { HeroDef, Seat } from "@hcd/engine";
import { useEffect, useState } from "react";
import type { Snapshot } from "../session.ts";

// Who this device is acting as. Online: its own seat. Local: whoever is due, or the seat toggle
// in the phases where both players act at the same time (bans, Preparation Phase).
export function actingSeat(snap: Snapshot, localSeat: Seat): Seat {
  if (snap.mySeat) return snap.mySeat;
  const s = snap.state!;
  if (s.phase === "draft") {
    if (s.draft!.stage === "timeOfDay") return "A";
    if (s.draft!.stage === "pick") return s.config.pickOrder[s.draft!.pickIndex]!;
    return localSeat;
  }
  if (s.phase === "combat") return s.activeSeat;
  return localSeat;
}

export function SeatToggle({ seat, onChange }: { seat: Seat; onChange: (s: Seat) => void }) {
  return (
    <span className="seat-toggle">
      เล่นเป็น
      {(["A", "B"] as const).map((x) => (
        <button key={x} className={x === seat ? `on seat-${x}` : ""} onClick={() => onChange(x)}>
          {x}
        </button>
      ))}
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
  return <span className="countdown">⏱ {Math.max(Math.ceil((deadline - Date.now()) / 1000), 0)}</span>;
}

// Hero viewer: stats, passive, every ability (ui.md "Hero viewer").
export function HeroDetail({ hero }: { hero: HeroDef }) {
  const s = hero.stats;
  const abilities = [
    { tag: "ตีปกติ", a: hero.normalAttack },
    ...hero.skills.map((a) => ({ tag: "สกิล", a })),
    { tag: `อัลติ (${hero.ultimate.ultCost} ${hero.ultimate.gaugeName ?? "แต้ม"})`, a: hero.ultimate },
  ];
  return (
    <div className="hero-detail">
      <h3>
        {hero.icon} {hero.name} <small className="muted">{hero.role}</small>
      </h3>
      <p className="stats">
        HP {s.maxHp} · ATK {s.atk} · DEF {s.def} · Speed {s.speed} · Break {s.breakBar}
        {s.armor ? ` · Armor ${s.armor}` : ""}
        {s.magicArmor ? ` · M.Armor ${s.magicArmor}` : ""}
        {s.penetration ? ` · Pen ${s.penetration}` : ""} · {hero.attackType}
      </p>
      <p>
        <b>Passive{hero.passive.name ? `: ${hero.passive.name}` : ""}</b> — {hero.passive.text}
      </p>
      {abilities.map(({ tag, a }) => (
        <p key={tag + a.name}>
          <span className="tag">{tag}</span> <b>{a.name}</b> <span className="mana">{a.mana}💧</span> — {a.text}
        </p>
      ))}
    </div>
  );
}

export const heroById = (id: string) => content.heroes.find((h) => h.id === id)!;
