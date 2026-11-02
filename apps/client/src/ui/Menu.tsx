import { content } from "@hcd/content";
import { useState } from "react";
import { session } from "../session.ts";
import { loadName, saveName } from "../storage.ts";
import { Dayband } from "./common.tsx";

export type Page = "home" | "heroes" | "deck" | "info";

// Home page (prototype menuHTML): name, play modes, pages, and online rooms.
export function Menu({ go }: { go: (p: Page) => void }) {
  const [name, setName] = useState(loadName);
  const [code, setCode] = useState(() => location.hash.slice(1).toUpperCase());
  const [mode, setMode] = useState<"normal" | "custom">("normal");
  const keepName = () => saveName(name.trim());
  return (
    <div className="menu">
      <Dayband now={-1} />
      <h1 className="title">Hero Card Duel</h1>
      <p className="lead">เกมดวลฮีโร่และการ์ดบนกระดาน 9x9 ฮีโร่ {content.heroes.length} ตัว</p>
      <div className="row">
        <label>
          ชื่อผู้เล่น{" "}
          <input className="codein nick" value={name} maxLength={20} placeholder="ชื่อของคุณ" onChange={(e) => setName(e.target.value)} onBlur={keepName} />
        </label>
      </div>
      <div className="mbtns">
        <button className="btn pri" onClick={() => (keepName(), session.startLocal())}>
          สองคนเครื่องเดียว
        </button>
        <button className="btn pri" onClick={() => (keepName(), session.startAI())}>
          เล่นกับ AI
        </button>
      </div>
      <div className="mbtns">
        <button className="btn" onClick={() => go("deck")}>
          🃏 เด็คการ์ด
        </button>
        <button className="btn" onClick={() => go("heroes")}>
          ⚔️ ฮีโร่
        </button>
        <button className="btn" onClick={() => go("info")}>
          📖 ข้อมูลเกม
        </button>
      </div>
      <div className="online">
        <h3>เล่นออนไลน์</h3>
        <p className="muted">สร้างห้องแล้วส่งลิงก์หรือรหัส 5 ตัวให้เพื่อน เจ้าของห้องต้องเปิดหน้าเกมค้างไว้ตลอดเกม</p>
        <div className="row">
          <span className="roster">
            {(["normal", "custom"] as const).map((m) => (
              <button key={m} className={mode === m ? "on" : ""} onClick={() => setMode(m)}>
                {m === "normal" ? "Normal" : "Custom"}
              </button>
            ))}
          </span>
          <button className="btn pri" onClick={() => (keepName(), session.host(mode))}>
            สร้างห้อง
          </button>
        </div>
        <div className="row">
          <input className="codein" value={code} maxLength={5} placeholder="รหัส" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button className="btn" disabled={code.length !== 5} onClick={() => (keepName(), session.join(code))}>
            เข้าห้อง
          </button>
        </div>
      </div>
    </div>
  );
}

export function PageTop({ title, back }: { title: string; back: () => void }) {
  return (
    <header className="top">
      <div className="tl">
        <h1>{title}</h1>
        <button className="ghost" onClick={back}>
          ← กลับ
        </button>
      </div>
    </header>
  );
}
