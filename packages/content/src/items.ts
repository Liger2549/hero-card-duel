import type { ItemDef } from "@hcd/engine";

// Items from the prototype. `price` of an upgrade is what it costs on top of the item it is built from.
const defineItem = (i: ItemDef): ItemDef => i;

export const items = [
  // Tier 1
  defineItem({ id: "sword", name: "ดาบเหล็ก", icon: "🗡️", tier: 1, price: 300, mods: { atk: 1 }, text: "ATK +1" }),
  defineItem({ id: "mail", name: "เกราะโซ่", icon: "🦺", tier: 1, price: 300, mods: { armor: 2 }, text: "Armor +2" }),
  defineItem({ id: "cloak", name: "เสื้อคลุมเวท", icon: "🧥", tier: 1, price: 300, mods: { magicArmor: 2 }, text: "Magic Armor +2" }),
  defineItem({ id: "heart", name: "หัวใจยักษ์", icon: "❤️", tier: 1, price: 400, mods: { maxHp: 4 }, text: "Max HP +4 และฟื้น 4 ตอนใส่" }),
  defineItem({ id: "boots", name: "รองเท้าลม", icon: "👟", tier: 1, price: 250, mods: { speed: 25 }, text: "Speed +25 หาย CC เร็วขึ้น" }),
  defineItem({ id: "lance", name: "หอกเจาะ", icon: "🔱", tier: 1, price: 350, mods: { penetration: 1 }, text: "Penetration +1" }),
  defineItem({ id: "hammer", name: "ค้อนทลาย", icon: "🔨", tier: 1, price: 300, mods: { breakBoost: 1 }, text: "Break Boost +1" }),
  defineItem({ id: "fangs", name: "เขี้ยวดูดเลือด", icon: "🦷", tier: 1, price: 400, mods: { lifeSteal: 1 }, text: "Life Steal +1 ฟื้น 1 ทุก hit ที่ทำดาเมจ" }),
  defineItem({ id: "charm", name: "ผ้ายันต์", icon: "📿", tier: 1, price: 300, mods: { tenacity: 100 }, text: "Tenacity +100 CC สั้นลง" }),
  defineItem({ id: "amulet", name: "เครื่องรางต้านพิษ", icon: "🧿", tier: 1, price: 250, mods: { fortitude: 1 }, text: "Fortitude +1 ลดดาเมจ DOT" }),

  // Tier 2
  defineItem({ id: "blade", name: "ดาบมรกต", icon: "💚", tier: 2, from: "sword", price: 350, mods: { atk: 2 }, text: "ATK +2" }),

  // Tier 3
  defineItem({ id: "sunsword", name: "ดาบสุริยัน", icon: "☀️", tier: 3, from: "blade", price: 700, mods: { atk: 3, penetration: 1 }, text: "ATK +3 Penetration +1" }),
  defineItem({ id: "fortress", name: "ป้อมเหล็กกล้า", icon: "🏰", tier: 3, from: "mail", price: 800, mods: { armor: 4, maxHp: 6 }, text: "Armor +4 Max HP +6 (ฟื้น 6 ตอนใส่)" }),
  defineItem({ id: "starveil", name: "ม่านดารา", icon: "🌌", tier: 3, from: "cloak", price: 750, mods: { magicArmor: 4, tenacity: 150 }, text: "Magic Armor +4 Tenacity +150" }),
  defineItem({ id: "titan", name: "หัวใจไททัน", icon: "💗", tier: 3, from: "heart", price: 900, mods: { maxHp: 10, fortitude: 1 }, text: "Max HP +10 Fortitude +1 (ฟื้นส่วนที่เพิ่มตอนใส่)" }),
  defineItem({ id: "nightclaw", name: "กรงเล็บราตรี", icon: "🌒", tier: 3, from: "fangs", price: 900, mods: { lifeSteal: 2, atk: 2 }, text: "Life Steal +2 ATK +2" }),
  defineItem({ id: "quake", name: "ค้อนธรณี", icon: "🌋", tier: 3, from: "hammer", price: 800, mods: { breakBoost: 2, breakDmgBonus: 3 }, text: "Break Boost +2 Break DMG Bonus +3" }),
  defineItem({ id: "gale", name: "ปีกวายุ", icon: "🪽", tier: 3, from: "boots", price: 700, mods: { speed: 50, tenacity: 100 }, text: "Speed +50 Tenacity +100" }),
  defineItem({ id: "skypierce", name: "หอกทะลวงฟ้า", icon: "⚡", tier: 3, from: "lance", price: 800, mods: { penetration: 3, atk: 1 }, text: "Penetration +3 ATK +1" }),
  defineItem({ id: "abyss", name: "คทาเหวลึก", icon: "🔮", tier: 3, from: "amulet", price: 850, mods: { dotBoost: 2, atk: 1 }, text: "DOT Boost +2 ATK +1 (Fortitude เดิมหายไป)" }),
];

// rules.md "Shop and Items": price plus the total value of the item it is built from.
export function totalValue(id: string): number {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`unknown item ${id}`);
  return item.price + (item.from ? totalValue(item.from) : 0);
}
