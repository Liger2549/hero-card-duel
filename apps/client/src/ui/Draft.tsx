import { content } from "@hcd/content";
import { TimesOfDay, type Seat } from "@hcd/engine";
import { useState } from "react";
import { session, type Snapshot } from "../session.ts";
import { seatName, timeName } from "../text.ts";
import { actingSeat, Countdown, HeroDetail, heroById, SeatToggle } from "./common.tsx";

// rules.md "Before the Game Starts": time of day, simultaneous bans, one-at-a-time picks.
export function Draft({ snap }: { snap: Snapshot }) {
  const s = snap.state!;
  const d = s.draft!;
  const [localSeat, setLocalSeat] = useState<Seat>("A");
  const [viewing, setViewing] = useState(content.heroes[0]!.id);
  const me = actingSeat(snap, localSeat);
  const takenBy = (id: string) =>
    (["A", "B"] as const).flatMap((seat) => [
      ...(d.bans[seat].includes(id) ? [`ban-${seat}`] : []),
      ...(d.picks[seat].includes(id) ? [`pick-${seat}`] : []),
    ])[0];

  const heading =
    d.stage === "timeOfDay"
      ? `${seatName("A")} เลือกช่วงเวลาเริ่มเกม`
      : d.stage === "ban"
        ? `แบนพร้อมกัน ฝ่ายละ ${s.config.bansPerPlayer} ตัว`
        : `${seatName(s.config.pickOrder[d.pickIndex]!)} เลือกฮีโร่`;

  const act = (heroId: string) =>
    session.dispatch(d.stage === "ban" ? { type: "Ban", seat: me, heroId } : { type: "Pick", seat: me, heroId });

  return (
    <div className="draft">
      <header className="bar">
        <b>{heading}</b> <Countdown deadline={snap.deadline} />
        {!snap.mySeat && d.stage === "ban" && <SeatToggle seat={localSeat} onChange={setLocalSeat} />}
        {snap.mySeat && <span className="muted">คุณคือ {seatName(snap.mySeat)}</span>}
        <span className="status">{snap.status}</span>
      </header>

      {d.stage === "timeOfDay" ? (
        <div className="times">
          {TimesOfDay.map((t, i) => (
            <button key={t} disabled={me !== "A"} onClick={() => session.dispatch({ type: "ChooseTimeOfDay", seat: "A", time: t })}>
              {timeName(i)}
            </button>
          ))}
        </div>
      ) : (
        <div className="draft-body">
          <div className="hero-grid">
            {content.heroes.map((h) => {
              const t = takenBy(h.id);
              return (
                <div key={h.id} className={`hero-tile ${t ?? ""} ${viewing === h.id ? "viewing" : ""}`} onClick={() => setViewing(h.id)}>
                  <div className="icon">{h.icon}</div>
                  <div>{h.name}</div>
                  <small className="muted">{h.role}</small>
                  {!t && (
                    <button onClick={(e) => (e.stopPropagation(), act(h.id))}>{d.stage === "ban" ? "แบน" : "เลือก"}</button>
                  )}
                  {t && <small>{t.startsWith("ban") ? `แบนโดย ${t.slice(-1)}` : `ของ ${t.slice(-1)}`}</small>}
                </div>
              );
            })}
          </div>
          <aside>
            {(["A", "B"] as const).map((seat) => (
              <p key={seat} className={`seat-${seat}`}>
                <b>{seatName(seat)}</b> แบน: {d.bans[seat].map((id) => heroById(id).icon).join(" ") || "-"} · เลือก:{" "}
                {d.picks[seat].map((id) => heroById(id).icon).join(" ") || "-"}
              </p>
            ))}
            <HeroDetail hero={heroById(viewing)} />
          </aside>
        </div>
      )}
    </div>
  );
}
