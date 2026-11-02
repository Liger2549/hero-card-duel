// Pages from the home screen: heroes, deck builder, game info (docs/ui.md "Other pages").
import { content, starterDeck } from "@hcd/content";
import { checkDeck, normalConfig } from "@hcd/engine";
import { useState } from "react";
import { loadDeck, saveDeck } from "../storage.ts";
import { HeroCard, PatternLegend } from "./common.tsx";
import { PageTop } from "./Menu.tsx";

export function HeroesPage({ back }: { back: () => void }) {
  return (
    <>
      <PageTop title="ฮีโร่ทั้งหมด" back={back} />
      <p className="muted">ตัวเลขในการ์ดสกิลคำนวณจากค่าสถานะเริ่มต้นของฮีโร่ (ยังไม่รวมไอเทมหรือบัฟ)</p>
      <div className="hgrid">
        {content.heroes.map((h) => (
          <HeroCard key={h.id} hero={h} />
        ))}
      </div>
      <PatternLegend />
    </>
  );
}

// rules.md "Cards": a deck has deckSize cards; each card says how many copies a deck may hold.
export function DeckPage({ back }: { back: () => void }) {
  const [deck, setDeck] = useState(loadDeck);
  const [saved, setSaved] = useState(true);
  const size = normalConfig.deckSize;
  const count = (id: string) => deck.filter((x) => x === id).length;
  const change = (next: string[]) => (setDeck(next), setSaved(false));
  const add = (id: string) => change([...deck, id]);
  const remove = (id: string) => {
    const i = deck.lastIndexOf(id);
    if (i >= 0) change(deck.filter((_, k) => k !== i));
  };
  const ok = checkDeck(content, deck, size).length === 0;
  return (
    <>
      <PageTop title="เด็คการ์ด" back={back} />
      <p className="status">
        การ์ดในเด็ค <b>{deck.length}</b>/{size} {ok ? "✓ พร้อมใช้" : deck.length !== size ? `(ต้องมี ${size} ใบพอดี)` : ""}
      </p>
      <div className="items" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))" }}>
        {content.cards.map((c) => {
          const n = count(c.id);
          return (
            <div key={c.id} className="card" style={{ flex: "none" }}>
              <span className="ch">
                <span className="ci">{c.icon}</span>
                <span className="cost">{c.mana}</span>
              </span>
              <b>{c.name}</b>
              <span className="cd">{c.text}</span>
              <span className="cd">
                {c.kind === "unit" ? "การ์ดยูนิต" : "การ์ดเวท"} · ใส่ได้สูงสุด {c.maxCopies} ใบ
              </span>
              <div className="row">
                <button className="btn" disabled={n === 0} onClick={() => remove(c.id)}>
                  −
                </button>
                <b>{n}</b>
                <button className="btn" disabled={n >= c.maxCopies || deck.length >= size} onClick={() => add(c.id)}>
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 12 }}>
        <button className="btn pri" disabled={!ok || saved} onClick={() => (saveDeck(deck), setSaved(true))}>
          {saved ? "บันทึกแล้ว" : "บันทึกเด็ค"}
        </button>
        <button className="btn" onClick={() => change([...starterDeck])}>
          ใช้เด็คเริ่มต้น
        </button>
        <button className="btn" onClick={() => change([])}>
          ล้างทั้งหมด
        </button>
      </div>
      <p className="muted">เด็คที่บันทึกจะถูกใช้ทุกโหมด (เก็บไว้ในเบราว์เซอร์เครื่องนี้)</p>
    </>
  );
}

const STATS: [string, string][] = [
  ["Max HP", "เลือดสูงสุด HP เหลือ 0 = ล้ม"],
  ["ATK", "ค่าพลังโจมตี สูตรของสกิลแต่ละอันใช้ ATK คำนวณดาเมจกายภาพและเวท"],
  ["DEF", "ลดดาเมจทุกชนิดหลังหักเกราะ (ลด DOT ด้วย)"],
  ["Armor", "ลดดาเมจกายภาพ"],
  ["Magic Armor", "ลดดาเมจเวท"],
  ["Penetration", "ลด Armor และ Magic Armor ของเป้าเฉพาะการตีของเรา (ไม่ลด DEF และโล่)"],
  ["Speed", "ความเร็วหาย CC ยิ่งสูงยิ่งหายเร็ว"],
  ["Move / ค่าเดิน", "เดินได้ 8 ทิศ ช่องละ 1 มานา ตัวประชิดเดินช่องแรกของรอบฟรี"],
  ["Break Bar", "แถบ Break ถูกตีลดลงตามค่า Break ของท่า เหลือ 0 = Break"],
  ["Aggro Bar", "เต็มแล้วจะโดนยั่วยุ (Taunt) ต้องตีคนที่ยั่ว (ยังไม่มีในเกม)"],
  ["Tenacity", "ลดค่า Recovery ของ CC ที่โดน ทำให้ CC สั้นลง"],
  ["Fortitude", "ลดดาเมจ DOT ต่อทิก"],
  ["DOT Boost", "เพิ่มดาเมจ DOT ที่เราใส่"],
  ["Break Boost", "เพิ่มค่า Break ของท่าเรา"],
  ["Break DMG Bonus", "เพิ่มดาเมจตอนทำให้เป้า Break"],
  ["Life Steal", "ฟื้น HP ทุก hit ที่ทำดาเมจ"],
  ["Shield by Damage", "โล่รับดาเมจก่อนเกราะ รับชนิดที่น้อยกว่าก่อน"],
  ["Shield by Hits", "โล่กันทั้ง hit ใช้ไป 1 ต่อ hit"],
];

// Game info: stats, rules and CC in short Thai, from docs/rules.md, combat.md and board.md.
export function InfoPage({ back }: { back: () => void }) {
  return (
    <>
      <PageTop title="ข้อมูลเกม" back={back} />
      <div className="panel info">
        <h3>เป้าหมาย</h3>
        <p>กระดาน 9x9 แต่ละฝั่งมีโซน 2 แถวของตัวเอง และหอคอย 3 ต้นอยู่นอกขอบกระดาน (ต้นละ 3 คอลัมน์) ชนะเมื่อฮีโร่ฝ่ายตรงข้ามล้มหมด หรือพังหอคอย 2 ใน 3 ต้น</p>

        <h3>ก่อนเริ่ม: ดราฟต์</h3>
        <ul>
          <li>ผู้เล่น 1 เลือกช่วงเวลาเริ่มเกม (ช่วงเวลาเดินหน้าทุกรอบ: เช้า → เที่ยง → เย็น → พลบค่ำ → กลางคืน → ดึก)</li>
          <li>แบนทีละคน 1 → 2 → 1 → 2 แล้วเลือกฮีโร่ทีละคน ฝั่งละ 4 ตัว ห้ามซ้ำ ขั้นละ 8 วินาที หมดเวลาแล้วระบบเลือกให้</li>
        </ul>

        <h3>หนึ่งรอบ</h3>
        <ul>
          <li>
            <b>เฟสเตรียมตัว</b> ทั้งสองฝ่ายทำพร้อมกัน: รอบแรกวางฮีโร่ในโซนตัวเอง รอบต่อไปย้ายได้ตัวละ 1 ครั้งในโซน (ฟรี) ซื้อไอเทม ลงยูนิตจากการ์ด จบเมื่อหมดเวลาหรือพร้อมทั้งคู่
          </li>
          <li>
            <b>เฟสต่อสู้</b> สลับกันเล่นทีละ Turn ได้มานา 12 ต่อรอบ (ไม่สะสม)
          </li>
          <li>ใน 1 Turn: เดินกี่ครั้งก็ได้ (ใช้มานา ย้อนได้) ใช้การ์ดกี่ใบก็ได้ แล้วตีปกติ / ใช้สกิล / ใช้อัลติได้ 1 ครั้ง ซึ่งทำให้ Turn จบ (ยกเว้นสกิลที่ไม่เสีย Turn)</li>
          <li>
            <b>จบ Turn</b> ส่งตาให้อีกฝ่าย (ต้องเดินอย่างน้อย 1 ช่องก่อน ถ้าเดินได้) · <b>จบรอบ (ผ่าน)</b> ออกจากรอบนี้ อีกฝ่ายเล่นต่อคนเดียว
          </li>
          <li>รอบจบเมื่อทั้งสองฝ่ายออก คนที่ออกก่อนได้เริ่มก่อนรอบหน้า ใครทำอะไรไม่ได้เลยจะออกจากรอบเอง</li>
        </ul>

        <h3>หอคอย</h3>
        <ul>
          <li>HP ตามรอบ: 30 → 27 → 25 → 23 → 21 → 20 (รอบ 6 เป็นต้นไป) รอบ 1 มีโล่กัน 5 ครั้ง รอบ 2 มี 3 ครั้ง ฟื้น +1 ต่อรอบถ้าเสีย HP</li>
          <li>ตีได้ด้วยตีปกติเท่านั้น ต้องยืนในคอลัมน์ของหอคอย ระยะถึง และไม่มีฝ่ายป้องกันขวางในคอลัมน์</li>
        </ul>

        <h3>ดาเมจ</h3>
        <p>ดาเมจ = (กายภาพ − Armor) + (เวท − Magic Armor) − DEF โดย Penetration ลดเกราะของเป้าก่อน ค่าติดลบนับเป็น 0 ตัวเลขทุกตัวเป็นจำนวนเต็ม หารแล้วปัดลง</p>

        <h3>Break</h3>
        <p>ทุกท่ามีค่า Break ลด Break Bar ของเป้าครั้งเดียวต่อท่า ถ้าเหลือ 0 เป้าโดน Break DMG (Break Bar สูงสุด ÷ 5) ที่ไม่สนเกราะ และติด Stun 500 พอ Stun หมด Break Bar เต็มคืน ถ้าโล่รับไว้ทั้งท่า Break Bar ไม่ลด</p>

        <h3>CC (สถานะควบคุม)</h3>
        <ul>
          <li>CC บอกความแรงเป็นค่า Recovery เช่น Stun 300 ตอนติดลบด้วย Tenacity ของเป้า</li>
          <li>จบทุก Turn (ของใครก็ได้) ลด Recovery ลงเท่ากับ Speed ของเป้า หายเมื่อเหลือน้อยกว่า Speed เช่น Stun 300 ที่ Speed 100 อยู่ 3 Turns</li>
          <li>💫 <b>Stun</b> เดินและทำอะไรไม่ได้ · ⛓️ <b>Root</b> เดินไม่ได้ · 🔇 <b>Silence</b> ใช้สกิลและอัลติไม่ได้ (ตีปกติได้) · 🧊 <b>Slow</b> เดินแพงขึ้นช่องละ 1 มานา</li>
          <li>ติด CC เดิมซ้ำ ใช้ค่าที่สูงกว่า ไม่สะสม · Cleanse ล้าง CC</li>
        </ul>

        <h3>DOT (ดาเมจต่อเนื่อง)</h3>
        <p>ทิกตอนจบรอบ นานตามจำนวนรอบที่ระบุ ไม่สนโล่และเกราะ ลดได้ด้วย DEF และ Fortitude ทิกละอย่างน้อย 1 ติดซ้ำชนิดเดิมจะแทนที่ของเดิม</p>

        <h3>โล่</h3>
        <p>โล่แบบ Add บวกเพิ่ม แบบ Set แทนที่ Set เดิม โดนดาเมจ Add ก่อน (เก่าสุดก่อน) Set ท้ายสุด โล่มีอายุเป็น Turn และนับตั้งแต่ Turn ถัดไป</p>

        <h3>แต้มอัลติ</h3>
        <p>ตีปกติได้ 1 แต้ม สกิลได้ 2 (บางท่าระบุเอง) ใช้อัลติเมื่อแต้มถึงค่าที่ใช้ ฮีโร่ล้มแล้วแต้มเป็น 0</p>

        <h3>การ์ด ยูนิต และร้านค้า</h3>
        <ul>
          <li>เด็ค 24 ใบ รอบแรกจั่ว 5 รอบต่อไปจั่ว 2 ถือได้ไม่เกิน 5 ใบ การ์ดไม่ทำให้ Turn จบ</li>
          <li>การ์ดยูนิตลงในโซนตัวเองหรือติดกับพวก (8 ทิศ) ได้ทั้งเฟสเตรียมและเฟสต่อสู้ ยูนิตตีครั้งแรกของรอบถูกลง (รอบที่ลงฟรี)</li>
          <li>ทองเริ่ม 800 ได้ +300 ทุกรอบ และค่าหัวเมื่อฆ่าศัตรู ฮีโร่ใส่ไอเทมได้ 2 ชิ้น อัพเกรดจ่ายส่วนต่าง ขายคืนได้ครึ่งราคา</li>
        </ul>

        <h3>ค่าสถานะ</h3>
        <table className="stages">
          <tbody>
            {STATS.map(([k, v]) => (
              <tr key={k}>
                <td>
                  <b>{k}</b>
                </td>
                <td>{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
