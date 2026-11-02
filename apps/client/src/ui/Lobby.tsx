// A room before the game: players, Normal / Custom rules, Start and Leave (rules.md "Match config").
import { alternatingOrder, checkConfig, type MatchConfig, type Seat, type TowerStage } from "@hcd/engine";
import { session, type Snapshot } from "../session.ts";
import { Dayband } from "./common.tsx";

export function Lobby({ snap }: { snap: Snapshot }) {
  const lobby = snap.lobby;
  const isHost = snap.mode === "host";
  const link = `${location.href.split("#")[0]}#${snap.code}`;
  const errors = lobby ? checkConfig(lobby.config) : [];
  return (
    <div className="menu" style={{ maxWidth: 720 }}>
      <Dayband now={-1} />
      <h1 className="title">ห้อง {snap.code}</h1>
      <p className="linkbox">{link}</p>
      <div className="row">
        <button className="btn" onClick={() => navigator.clipboard?.writeText(link)}>
          คัดลอกลิงก์
        </button>
        <span className="muted">{lobby ? (lobby.gameMode === "normal" ? "โหมด Normal: กติกามาตรฐาน" : "โหมด Custom: เจ้าของห้องปรับกติกาได้") : ""}</span>
      </div>

      <div className="panel">
        <h3>ผู้เล่นในห้อง</h3>
        <p className="sbar s0">
          <span className="nm">{snap.names.A || "เจ้าของห้อง"}</span>
          <span className="meta">เจ้าของห้อง · ผู้เล่น 1{snap.mySeat === "A" ? " (คุณ)" : ""}</span>
        </p>
        <p className="sbar s1">
          <span className="nm">{lobby?.guestHere ? snap.names.B || "ผู้เล่น 2" : "รอผู้เล่นเข้าห้อง…"}</span>
          <span className="meta">ผู้เล่น 2{snap.mySeat === "B" ? " (คุณ)" : ""}</span>
        </p>
      </div>

      {lobby?.gameMode === "custom" && <CustomSettings config={lobby.config} editable={isHost} />}
      {errors.length > 0 && (
        <p className="warn">
          {errors.map((e) => (
            <span key={e}>
              {e}
              <br />
            </span>
          ))}
        </p>
      )}

      <div className="row">
        {isHost && (
          <button className="btn pri" disabled={!lobby?.guestHere || errors.length > 0} onClick={() => session.startGame()}>
            เริ่มเกม
          </button>
        )}
        {!isHost && <span className="muted">{lobby ? "รอเจ้าของห้องกดเริ่ม…" : ""}</span>}
        <button className="btn" onClick={() => session.leave()}>
          ออกจากห้อง
        </button>
      </div>
      <p className="muted">{snap.status}</p>
    </div>
  );
}

function Num(props: { label: string; value: number; min?: number; disabled: boolean; onChange: (n: number) => void }) {
  return (
    <label className="field-num">
      {props.label}{" "}
      <input
        type="number"
        className="codein"
        style={{ width: "5em", letterSpacing: 0 }}
        value={props.value}
        min={props.min ?? 0}
        disabled={props.disabled}
        onChange={(e) => props.onChange(Math.max(props.min ?? 0, Math.floor(Number(e.target.value) || 0)))}
      />
    </label>
  );
}

const toOrder = (text: string): Seat[] => [...text.toUpperCase()].filter((ch): ch is Seat => ch === "A" || ch === "B");

// Custom room settings, as listed in rules.md "Match config" and "Tower config".
function CustomSettings({ config: c, editable }: { config: MatchConfig; editable: boolean }) {
  const set = (patch: Partial<MatchConfig>) => session.setConfig({ ...c, ...patch });
  const dis = !editable;
  const setHeroes = (seat: Seat, n: number) => {
    const heroesPerPlayer = { ...c.heroesPerPlayer, [seat]: n };
    set({ heroesPerPlayer, pickOrder: alternatingOrder(heroesPerPlayer.A, heroesPerPlayer.B) });
  };
  const setStage = (i: number, patch: Partial<TowerStage>) => set({ towerStages: c.towerStages.map((st, k) => (k === i ? { ...st, ...patch } : st)) });
  return (
    <div className="panel custom">
      <h3>กติกาห้อง Custom</h3>

      <h4>ฮีโร่และดราฟต์</h4>
      <div className="row">
        <Num label="ฮีโร่ผู้เล่น 1" value={c.heroesPerPlayer.A} min={1} disabled={dis} onChange={(n) => setHeroes("A", n)} />
        <Num label="ฮีโร่ผู้เล่น 2" value={c.heroesPerPlayer.B} min={1} disabled={dis} onChange={(n) => setHeroes("B", n)} />
      </div>
      <div className="row">
        <label>
          <input type="checkbox" checked={c.skipBans} disabled={dis} onChange={(e) => set({ skipBans: e.target.checked })} /> ไม่มีการแบน
        </label>
      </div>
      <div className="row">
        <label>
          ลำดับแบน{" "}
          <input className="codein" style={{ width: "10em" }} value={c.banOrder.join("")} disabled={dis || c.skipBans} onChange={(e) => set({ banOrder: toOrder(e.target.value) })} />
        </label>
        <label>
          ลำดับพิก{" "}
          <input className="codein" style={{ width: "12em" }} value={c.pickOrder.join("")} disabled={dis} onChange={(e) => set({ pickOrder: toOrder(e.target.value) })} />
        </label>
      </div>
      <p className="muted">พิมพ์ A (ผู้เล่น 1) และ B (ผู้เล่น 2) ตามลำดับ เช่น ABAB</p>
      <div className="row">
        <Num label="เวลาเลือกช่วงเวลา (วิ)" value={c.timers.timeOfDay} min={1} disabled={dis} onChange={(n) => set({ timers: { ...c.timers, timeOfDay: n } })} />
        <Num label="เวลาแบนต่อครั้ง" value={c.timers.ban} min={1} disabled={dis} onChange={(n) => set({ timers: { ...c.timers, ban: n } })} />
        <Num label="เวลาพิกต่อครั้ง" value={c.timers.pick} min={1} disabled={dis} onChange={(n) => set({ timers: { ...c.timers, pick: n } })} />
      </div>

      <h4>รอบและทรัพยากร</h4>
      <div className="row">
        <Num label="มานาต่อรอบ" value={c.manaPerRound} min={1} disabled={dis} onChange={(n) => set({ manaPerRound: n })} />
        <Num label="ทองเริ่ม" value={c.startGold} disabled={dis} onChange={(n) => set({ startGold: n })} />
        <Num label="ทองต่อรอบ" value={c.goldPerRound} disabled={dis} onChange={(n) => set({ goldPerRound: n })} />
      </div>
      <div className="row">
        <Num label="เวลาเตรียมรอบแรก (วิ)" value={c.timers.firstPrep} min={1} disabled={dis} onChange={(n) => set({ timers: { ...c.timers, firstPrep: n } })} />
        <Num label="เวลาเตรียมรอบต่อไป" value={c.timers.majorPrep} min={1} disabled={dis} onChange={(n) => set({ timers: { ...c.timers, majorPrep: n } })} />
      </div>
      <div className="row">
        <Num label="การ์ดรอบแรก" value={c.cardsFirstRound} disabled={dis} onChange={(n) => set({ cardsFirstRound: n })} />
        <Num label="การ์ดต่อรอบ" value={c.cardsPerRound} disabled={dis} onChange={(n) => set({ cardsPerRound: n })} />
        <Num label="มือสูงสุด" value={c.handLimit} min={1} disabled={dis} onChange={(n) => set({ handLimit: n })} />
      </div>
      <div className="row">
        <label>
          รอบแรกเริ่มก่อน{" "}
          <select value={c.firstRoundStarter} disabled={dis} onChange={(e) => set({ firstRoundStarter: e.target.value as Seat })}>
            <option value="A">ผู้เล่น 1</option>
            <option value="B">ผู้เล่น 2</option>
          </select>
        </label>
        <label>
          การเดิน{" "}
          <select value={c.stepLimit} disabled={dis} onChange={(e) => set({ stepLimit: e.target.value as MatchConfig["stepLimit"] })}>
            <option value="none">เดินกี่ช่องก็ได้ (จ่ายมานา)</option>
            <option value="move">ไม่เกินค่า Move ต่อ Turn</option>
          </select>
        </label>
      </div>

      <h4>หอคอย</h4>
      <div className="row">
        <Num label="พังกี่ต้นถึงชนะ" value={c.towersToWin} min={1} disabled={dis} onChange={(n) => set({ towersToWin: n })} />
        <Num label="ฟื้นต่อรอบ" value={c.towerRegenPerRound} disabled={dis} onChange={(n) => set({ towerRegenPerRound: n })} />
        <label>
          ชนิด HP{" "}
          <select value={c.towerHpType} disabled={dis} onChange={(e) => set({ towerHpType: e.target.value as MatchConfig["towerHpType"] })}>
            <option value="normal">Normal HP (ลดตามดาเมจ)</option>
            <option value="byHits">HP by Hits (โดน 1 ครั้งลด 1)</option>
          </select>
        </label>
      </div>
      <table className="stages">
        <thead>
          <tr>
            <th>ตั้งแต่รอบ</th>
            <th>{c.towerHpType === "byHits" ? "Max HP Hits" : "Max HP"}</th>
            <th>โล่ (ครั้ง)</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {c.towerStages.map((st, i) => (
            <tr key={i}>
              <td>
                <Num label="" value={st.fromRound} min={1} disabled={dis || i === 0} onChange={(n) => setStage(i, { fromRound: n })} />
              </td>
              <td>
                <Num label="" value={st.maxHp} min={1} disabled={dis} onChange={(n) => setStage(i, { maxHp: n })} />
              </td>
              <td>
                <Num label="" value={st.shieldByHits} disabled={dis} onChange={(n) => setStage(i, { shieldByHits: n })} />
              </td>
              <td>
                {editable && c.towerStages.length > 1 && i > 0 && (
                  <button className="mini" onClick={() => set({ towerStages: c.towerStages.filter((_, k) => k !== i) })}>
                    ลบ
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {editable && (
        <button
          className="btn"
          onClick={() => {
            const last = c.towerStages[c.towerStages.length - 1]!;
            set({ towerStages: [...c.towerStages, { ...last, fromRound: last.fromRound + 1 }] });
          }}
        >
          + เพิ่มช่วง
        </button>
      )}
    </div>
  );
}
