import { useState } from "react";
import { session, type Snapshot } from "../session.ts";

export function Menu() {
  const [code, setCode] = useState(() => location.hash.slice(1).toUpperCase());
  return (
    <div className="menu">
      <h1>Hero Card Duel</h1>
      <button className="big" onClick={() => session.startLocal()}>
        เล่น 2 คนเครื่องเดียว
      </button>
      <div className="online">
        <h3>เล่นออนไลน์</h3>
        <p className="muted">สร้างห้องแล้วส่งรหัสหรือลิงก์ให้เพื่อน เจ้าของห้องต้องเปิดหน้าเกมค้างไว้ตลอดเกม</p>
        <button onClick={() => session.host()}>สร้างห้อง</button>
        <div className="row">
          <input className="code" value={code} maxLength={5} placeholder="รหัส" onChange={(e) => setCode(e.target.value.toUpperCase())} />
          <button disabled={code.length !== 5} onClick={() => session.join(code)}>
            เข้าห้อง
          </button>
        </div>
      </div>
    </div>
  );
}

export function Waiting({ snap }: { snap: Snapshot }) {
  const link = `${location.href.split("#")[0]}#${snap.code}`;
  return (
    <div className="menu">
      <h2>ห้อง</h2>
      <p className="bigcode">{snap.code}</p>
      <p className="muted">ส่งรหัสนี้หรือลิงก์นี้ให้เพื่อน</p>
      <p className="link">{link}</p>
      <button onClick={() => navigator.clipboard?.writeText(link)}>คัดลอกลิงก์</button>
      <p>{snap.status}</p>
      <button className="ghost" onClick={() => session.leave()}>
        ออก
      </button>
    </div>
  );
}
