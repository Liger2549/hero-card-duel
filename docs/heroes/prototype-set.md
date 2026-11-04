# Prototype Set

The 11 prototype heroes not yet adapted on their own sheets, put back in the draft on 2026-11-04 so there are more heroes to play. They were not designed by the owner: values are the prototype's (`archive/prototype-heroes.md`), names are Claude's. The owner may redesign or remove any of them; a hero that gets redesigned moves to its own sheet (like Rocco, Konrad and Eira).

Shared defaults: Move 1, Aggro Bar 5, Base Bounty 400, Max Ult Points = usage, Normal Attack mana 2 / Break 1 / Ult Points 1. "Pick N" is a Lock-on pick within N tiles (Manhattan). "Every ally" is the whole team on the board. Durations are Turns unless written as Rounds.

Code: `packages/content/src/heroes/prototype.ts`.

## 🩸 Dante (นักดาบโลหิต)
- Damage / Burst · melee · physical · HP 22, ATK 4, DEF 0, Speed 100, Break Bar 12
- **Passive — Blood Edge (คมเลือด)**: his normal attack hits 2 harder but costs him 2 HP.
- **Normal — Blood Slash (ฟันเลือด)**: 1 tile in 8 directions, Physical ATK + 2. Loses 2 HP (needs more than 2 HP).
- **Skill — Bloodline Cut (ตัดสายเลือด)** (mana 3): pick 1, Break 2. The target loses 22% of its Max HP, past DEF and shields.
- **Ultimate — Blood Night (ราตรีเลือด)** (mana 4, ult 4): the 8 tiles around him, Physical ATK + 2, Break 2. Heals him half the HP damage dealt.

## 🔥 Ember (นักเวทเพลิง)
- Damage / DOT · ranged · magic · HP 16, ATK 3, DEF 0, Speed 100, Break Bar 9
- **Passive — Kindling (เชื้อไฟ)**: hits on an enemy with Burn get Magic + 1. ATK + 1 during Day (set when the Combat Phase starts).
- **Normal — Fire Bolt (ยิงไฟ)**: pick 2, Magic ATK.
- **Skill — Fireball (ลูกไฟ)** (mana 3): pick 2, plus shape (P and the 4 tiles beside it), Magic ATK − 1, Break 2, Burn for 2 Rounds.
- **Ultimate — Sea of Flames (ทะเลเพลิง)** (mana 4, ult 5): pick 3, 3x3 around P, Magic ATK, Break 2, Burn for 4 Rounds.

## 🗡️ Kage (นักฆ่าไร้เงา)
- Damage / Burst · melee · physical · HP 18, ATK 4, DEF 0, Speed 130, Break Bar 10
- **Passive — Unseen (ไร้เงา)**: gains Stealth when each Combat Phase starts; any ability of his ends it. His hits from Stealth deal Physical + 2 (+ 3 at Night and Late Night).
- **Normal — Stab (แทง)**: 1 tile in 8 directions, Physical ATK.
- **Skill — Shadowstep (แทงจากเงา)** (mana 3): pick 3. Moves to the nearest free tile next to the target, then hits it for Physical ATK + 1, Break 2. Needs a free tile there.
- **Ultimate — Death Shadow (เงามรณะ)** (mana 4, ult 4): pick 1, Physical ATK + 4, Break 3. If the target dies, he is in Stealth again.

## 🌫️ Misty (ภูตหมอกควัน)
- Support / Control · ranged · magic · HP 18, ATK 4, DEF 0, Speed 105, Break Bar 11
- **Passive — Second Breath (ลมหายใจที่สอง)**: once per match, if she dies and her team kills an enemy hero in that Round or the next while her team still has a hero, she rises with HP 8 where she died (or a free tile next to it).
- **Normal — Mist Bolt (ยิงหมอก)**: pick 2, Magic ATK.
- **Skill — Smoke Screen (ม่านควัน)** (mana 3): pick 3, plus shape. Leaves Smoke on those tiles for 4 Turns (`statuses.md`). Enemies there take Magic 2, Break 1. Can be cast with no enemy in the area.
- **Ultimate — Engulfing Mist (หมอกกลืนกิน)** (mana 4, ult 4): pick 3, 3x3, Magic ATK + 1, Break 2, Silence 300.

## 🔒 Silas (ผู้ผนึกเวท)
- Support / Control · ranged · magic · HP 20, ATK 3, DEF 1, Magic Armor 1, Speed 95, Break Bar 13
- **Passive — Hush (เงียบ)**: hits on a Silenced enemy get Magic + 2.
- **Normal — Arcane Bolt (ยิงเวท)**: pick 2, Magic ATK.
- **Skill — Seal Mark (ตราผนึก)** (mana 3): pick 3, Magic ATK, Break 2, Silence 300.
- **Ultimate — Silent Domain (อาณาเขตเงียบ)** (mana 4, ult 5): every tile within 2 of him (diamond), Break 1, Silence 500.

## 👑 Morgan (ราชันเงา)
- Damage / Summoner · melee · physical · HP 18, ATK 2, DEF 1, Speed 100, Break Bar 12
- **Passive — Rising Throne (บัลลังก์ที่ก่อตัว)**: ATK + 1 for every 2 Rounds (at most + 3), and + 1 more at Night and Late Night. Worked out when each Combat Phase starts.
- **Normal — Slash (ฟัน)**: 1 tile in 8 directions, Physical ATK.
- **Skill — Raise Shade (ปลุกเงา)** (mana 3): pick a free tile next to him (8 directions). Summons a Shade (HP 6, ATK 3, melee, 1 tile in 8 directions).
- **Ultimate — Shadow Army (กองทัพเงา)** (mana 4, ult 5): up to 3 Shades on free tiles around him, and he gets ATK + 2 for 4 Turns.

## 🔭 Wren (มือปืนสายลม)
- Damage / Single-target · ranged · physical · HP 16, ATK 3, DEF 0, Speed 110, Break Bar 9
- **Passive — First Shot (นัดแรก)**: her first normal attack in each Round deals Physical + 2.
- **Normal — Shoot (ยิง)**: pick 2, Physical ATK.
- **Skill — Piercing Round (กระสุนเจาะเกราะ)** (mana 3): a line of 3 tiles in 4 directions, Hit: First, Physical ATK + 3, Penetration + 3, Break 2.
- **Ultimate — Dead Aim (เป้าตาย)** (mana 4, ult 5): pick 3, Physical ATK + 4, Break 3.

## 💎 Crystal (ผู้พิทักษ์ผลึก)
- Support / Shield · ranged · magic · HP 20, ATK 2, DEF 1, Magic Armor 1, Speed 95, Break Bar 14
- **Passive — Prism (ปริซึม)**: her shields are 2 larger on a target below half its Max HP.
- **Normal — Crystal Shot (ยิงผลึก)**: pick 2, Magic ATK.
- **Skill — Crystal Ward (ผลึกคุ้มภัย)** (mana 3): an ally within 2 (herself too), Set shield 6 for 4 Turns.
- **Ultimate — Crystal Bastion (ปราการผลึก)** (mana 4, ult 5): every ally, Add shield 5 and Armor + 1 for 4 Turns.

## 🎺 Lyra (นักกวีศึก)
- Support / Buffer · ranged · magic · HP 17, ATK 2, DEF 0, Speed 110, Break Bar 11
- **Passive — Battle Chorus (เพลงศึก)**: allies in the 8 tiles around her get ATK + 1 while they stand there.
- **Normal — Sound Wave (คลื่นเสียง)**: pick 2, Magic ATK.
- **Skill 1 — Rousing Song (บทเพลงฮึกเหิม)** (mana 3): an ally within 3 (herself too), ATK + 2 for 4 Turns.
- **Skill 2 — Piercing Beat (จังหวะเจาะเกราะ)** (mana 2, ult points 1): an ally within 3 (herself too), Penetration + 2 for 4 Turns.
- **Ultimate — War Symphony (ซิมโฟนีสงคราม)** (mana 4, ult 5): every ally, ATK + 2 and Break Boost + 1 for 4 Turns.

## 💧 Brooke (หมอธารา)
- Support / Healer · ranged · magic · HP 18, ATK 2, DEF 0, Speed 105, Break Bar 11
- **Passive — Clear Stream (ธารใส)**: her heals get + ATK ÷ 2 (as Healing Bonus).
- **Normal — Water Bolt (ยิงน้ำ)**: pick 2, Magic ATK.
- **Skill — Cleansing Stream (สายธารชำระ)** (mana 3): an ally within 2 (herself too), heal 5 and Cleanse (CC and DOT).
- **Ultimate — Reviving Rain (ฝนชุบชีวิต)** (mana 4, ult 5): every ally heals 6.

## 🌿 Jade (นักบวชหยก)
- Support / Healer · ranged · magic · HP 18, ATK 2, DEF 1, Speed 95, Break Bar 12
- **Passive — Morning Prayer (บทสวดยามเช้า)**: when a Round starts, allies in the 8 tiles around her heal 2.
- **Normal — Light Bolt (ยิงแสง)**: pick 2, Magic ATK.
- **Skill — Jade Blessing (พรหยก)** (mana 3): an ally within 3 (herself too), heal 6.
- **Ultimate — Jade Stream (สายธารหยก)** (mana 4, ult 5): every ally heals 5 and gets an Add shield 4 for 4 Turns.
