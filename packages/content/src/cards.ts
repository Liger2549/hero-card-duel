import type { CardDef } from "@hcd/engine";

// Cards from the prototype. Placeholders until the owner designs the real set.
const defineCard = (c: CardDef): CardDef => c;

export const cards = [
  defineCard({
    id: "orb",
    name: "ผลึกมานา",
    icon: "🔮",
    text: "+2 มานา ใช้ตอนต่อสู้",
    kind: "spell",
    mana: 0,
    target: "none",
    manaGain: 2,
  }),
  defineCard({
    id: "guard",
    name: "เรียกทหารยาม",
    icon: "🪖",
    text: "ยูนิต HP 10 ATK 2 ระยะ 1 ลงติดกับพวกเรา",
    kind: "unit",
    mana: 3,
    target: "tile",
    summon: "guard",
  }),
  defineCard({
    id: "bow",
    name: "เรียกพลธนู",
    icon: "🎯",
    text: "ยูนิต HP 6 ATK 2 ระยะ 2 ลงติดกับพวกเรา",
    kind: "unit",
    mana: 3,
    target: "tile",
    summon: "bow",
  }),
  defineCard({
    id: "roar",
    name: "เสียงคำราม",
    icon: "📯",
    text: "ฮีโร่ฝ่ายเรา ATK +2 นาน 4 Turns",
    kind: "spell",
    mana: 1,
    target: "allyHero",
    buffs: [{ stat: "atk", amount: 2, turns: 4 }],
  }),
  defineCard({
    id: "potion",
    name: "ยาฟื้นพลัง",
    icon: "🧪",
    text: "ฟื้น HP 6 ให้ฝ่ายเรา 1 ตัว",
    kind: "spell",
    mana: 1,
    target: "ally",
    heal: 6,
  }),
  defineCard({
    id: "iron",
    name: "ผิวเหล็ก",
    icon: "⛓️",
    text: "Armor และ Magic Armor +2 นาน 4 Turns",
    kind: "spell",
    mana: 1,
    target: "ally",
    buffs: [
      { stat: "armor", amount: 2, turns: 4 },
      { stat: "magicArmor", amount: 2, turns: 4 },
    ],
  }),
];

// The prototype's deck: 4 of each card (24 cards).
export const starterDeck: string[] = cards.flatMap((c) => [c.id, c.id, c.id, c.id]);
