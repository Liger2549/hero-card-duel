import { content } from "@hcd/content";
import { findUnit, TimesOfDay, unitDef, type GameEvent, type GameState, type Seat } from "@hcd/engine";

// Player names for log lines; the match screen keeps these up to date.
let names: Record<Seat, string> = { A: "", B: "" };
export const setLogNames = (n: Record<Seat, string>) => void (names = n);
export const seatName = (seat: Seat) => names[seat] || (seat === "A" ? "ผู้เล่น 1" : "ผู้เล่น 2");
export const timeName = (i: number) => ["เช้า", "เที่ยง", "เย็น", "พลบค่ำ", "กลางคืน", "ดึก"][i] ?? TimesOfDay[i];

export function unitName(s: GameState, id: string): string {
  const u = findUnit(s, id);
  if (!u) return id;
  const d = unitDef(content, u.defId);
  return `${d.icon} ${d.name}`;
}

const heroName = (id: string) => {
  const h = content.heroes.find((x) => x.id === id);
  return h ? `${h.icon} ${h.name}` : id;
};

// One log line per event, or null for events not worth a line.
export function describe(s: GameState, e: GameEvent): string | null {
  const n = (id: string) => unitName(s, id);
  switch (e.type) {
    case "TimeOfDayChosen":
      return `เริ่มเกมตอน${timeName(TimesOfDay.indexOf(e.time as never))}`;
    case "HeroBanned":
      return e.heroId ? `${seatName(e.seat)} แบน ${heroName(e.heroId)}` : `${seatName(e.seat)} ไม่ได้แบน`;
    case "HeroPicked":
      return `${seatName(e.seat)} เลือก ${heroName(e.heroId)}${e.random ? " (สุ่ม)" : ""}`;
    case "CombatStarted":
      return `รอบ ${e.round} เริ่มต่อสู้ ${seatName(e.starter)} เริ่มก่อน`;
    case "PlayerOut":
      return `${seatName(e.seat)} ${e.stuck ? "ทำอะไรไม่ได้แล้ว " : ""}ออกจากรอบนี้`;
    case "RoundStarted":
      return `— รอบ ${e.round} —`;
    case "UnitStepped":
      return `${n(e.unitId)} เดิน${e.cost ? ` (${e.cost} มานา)` : " (ฟรี)"}`;
    case "UnitsSwapped":
      return `${n(e.unitId)} สลับที่กับ ${n(e.allyId)}`;
    case "AbilityUsed":
      return `${n(e.unitId)} ใช้ ${e.name}`;
    case "Damaged":
      return `${n(e.unitId)} เสีย ${e.amount} HP (เหลือ ${e.hp})`;
    case "Healed":
      return `${n(e.unitId)} ฟื้น ${e.amount} HP`;
    case "ShieldAbsorbed":
      return `โล่ของ ${n(e.unitId)} รับไว้ ${e.amount}`;
    case "ShieldGained":
      return `${n(e.unitId)} ได้โล่ ${e.amount}`;
    case "Broken":
      return `💥 ${n(e.unitId)} โดน Break! Break DMG ${e.damage} และ Stun`;
    case "StatusApplied":
      return `${n(e.unitId)} ติด ${e.status}`;
    case "DotTick":
      return `${n(e.unitId)} โดน ${e.dot} ${e.damage}`;
    case "UnitDied":
      return `☠️ ${n(e.unitId)} ล้ม${e.killerSeat ? ` ${seatName(e.killerSeat)} ได้ค่าหัว ${e.bounty}` : ""}`;
    case "UnitSummoned":
      return `${seatName(e.owner)} เรียก ${n(e.unitId)}`;
    case "CardPlayed": {
      const c = content.cards.find((x) => x.id === e.cardId);
      return `${seatName(e.seat)} ใช้การ์ด ${c ? `${c.icon} ${c.name}` : e.cardId}`;
    }
    case "ItemBought":
      return `${n(e.unitId)} ซื้อ ${content.items.find((i) => i.id === e.itemId)?.name ?? e.itemId}`;
    case "ItemSold":
      return `${n(e.unitId)} ขายของได้ ${e.gold} ทอง`;
    case "TowerShieldBlocked":
      return `โล่หอคอยของ ${seatName(e.seat)} กันไว้ (เหลือ ${e.left})`;
    case "TowerDamaged":
      return `หอคอยของ ${seatName(e.seat)} เสีย ${e.amount} (เหลือ ${e.hp})`;
    case "TowerDestroyed":
      return `🏚️ หอคอยของ ${seatName(e.seat)} พัง!`;
    case "GameOver":
      return `🏆 ${seatName(e.winner)} ชนะ!`;
    default:
      return null;
  }
}
