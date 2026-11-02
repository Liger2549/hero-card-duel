import { content } from "@hcd/content";
import { TimesOfDay } from "@hcd/engine";
import { session, type Snapshot } from "../session.ts";
import { actingSeat, Countdown, Dayband, HeroCard, PatternLegend, sideClass, sideName } from "./common.tsx";

// prototype draftHTML. Order: time of day (A), then bans and picks one at a time.
export function Draft({ snap }: { snap: Snapshot }) {
  const s = snap.state!;
  const d = s.draft!;
  const due = actingSeat({ ...snap, mySeat: null }, "A"); // whose step it is
  const me = snap.mySeat ?? due;
  const myStep = me === due;
  const ban = d.stage === "ban";
  const icon = (id: string) => content.heroes.find((h) => h.id === id)!.icon;
  const takenBy = (id: string) => {
    for (const seat of ["A", "B"] as const) {
      if (d.bans[seat].includes(id)) return "ban";
      if (d.picks[seat].includes(id)) return seat;
    }
    return null;
  };

  const status =
    d.stage === "timeOfDay"
      ? myStep
        ? `${sideName("A", snap)} เลือกช่วงเวลาเริ่มเกม (แตะแถบด้านบน)`
        : "รอคู่แข่งเลือกช่วงเวลา…"
      : myStep
        ? `ตาของ ${sideName(me, snap)} ${ban ? "แบน 1 ตัว" : "เลือก 1 ตัว (ห้ามซ้ำ)"}`
        : `รอ ${sideName(due, snap)} ${ban ? "แบน" : "เลือก"}…`;

  return (
    <>
      <header className="top">
        <div className="tl">
          <h1>ดราฟต์ฮีโร่</h1>
          <button className="ghost" onClick={() => confirm("ออกจากเกม?") && session.leave()}>
            ออก
          </button>
        </div>
        <Dayband
          now={s.timeOfDay}
          {...(d.stage === "timeOfDay" && myStep
            ? { onPick: (i: number) => session.dispatch({ type: "ChooseTimeOfDay", seat: "A", time: TimesOfDay[i]! }) }
            : {})}
        />
      </header>
      <p className="status" style={{ marginTop: 10 }}>
        {status} · เหลือ <Countdown deadline={snap.deadline} /> วินาที
      </p>
      <div className="picks">
        {(["A", "B"] as const).map((seat) => (
          <div key={seat} className={`pk ${sideClass(seat)}`}>
            <b>{sideName(seat, snap)}</b>
            {d.picks[seat].map(icon).join(" ") || "–"}
            <span className="bans">แบน {d.bans[seat].map(icon).join(" ") || "–"}</span>
          </div>
        ))}
      </div>
      <div className="hgrid">
        {content.heroes.map((h) => {
          const t = takenBy(h.id);
          return (
            <HeroCard
              key={h.id}
              hero={h}
              cls={t === "ban" ? "bn" : t ? `tk ${sideClass(t)}` : ""}
              {...(t === "ban" ? { label: "ถูกแบน" } : {})}
              disabled={!!t || d.stage === "timeOfDay" || !myStep}
              onClick={() => session.dispatch(ban ? { type: "Ban", seat: me, heroId: h.id } : { type: "Pick", seat: me, heroId: h.id })}
            />
          );
        })}
      </div>
      <PatternLegend />
      {snap.status && <p className="warn">{snap.status}</p>}
    </>
  );
}
