# Prototype Heroes (archive)

The 14 heroes from the old prototype, taken out of the game on 2026-11-03 when the engine moved to the docs' skill notation. Kept as ideas for new heroes. All 14 are back in the draft as of 2026-11-04: 3 on their own sheets (Rocco, Konrad, Eira) and 11 in `../prototype-set.md`. Their rules follow the prototype, not the current docs. The original data is in git history (`packages/content/src/heroes/idea.ts` and `new.ts`, commit 2e88677).

## 🩸 นักดาบโลหิต (`blood`)

- Role: Damage / Burst · melee · physical · built from the owner's idea
- Stats: HP 22, ATK 4, DEF 0, Speed 100, Move 1, Break Bar 12, Aggro 5, Bounty 400
- **Passive**: ตีปกติเคลือบเลือด แรงขึ้น 2 แต่เสีย HP ตัวเอง 2
- **Normal** ฟันเลือด (mana 2): ฟัน 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK + 2 เสีย HP ตัวเอง 2
- **Skill** ตัดสายเลือด (mana 3): ตัดเลือดศัตรูที่ยืนติดกัน 22% ของ HP สูงสุด ไม่สนเกราะและโล่
- **Ultimate** ราตรีเลือด (mana 4, ult 4/4): ฟาด 8 ช่องรอบตัว กายภาพ ATK + 2 ฟื้น HP ครึ่งหนึ่งของดาเมจ

## 🚩 ผู้ถือธงเหล็ก (`flag`)

- Role: Tank / Control · melee · physical · built from the owner's idea
- Stats: HP 22, ATK 3, DEF 1, Speed 85, Move 1, Break Bar 16, Aggro 5, Bounty 400, armor 1
- **Passive**: พวกที่ยืนติดกัน 4 ทิศได้ DEF +1
- **Normal** ฟาด (mana 2): ฟาด 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK Break 2
- **Skill** ปักธงท้าทาย (mana 3): กระแทก 4 ช่องรอบตัว กายภาพ 2 ติด Root 300
- **Skill** บุกนำทัพ (mana 2): พุ่งตรงสูงสุด 2 ช่อง (เคลื่อนที่อย่างเดียว)
- **Ultimate** เรียกพลทหาร (mana 3, ult 4/4): เรียกพลทหาร 2 ตัวข้างตัว

## 🔥 นักเวทเพลิง (`flame`)

- Role: Damage / DOT · ranged · magic · built from the owner's idea
- Stats: HP 16, ATK 3, DEF 0, Speed 100, Move 1, Break Bar 9, Aggro 5, Bounty 400
- **Passive**: ตีศัตรูที่ติด Burn ได้ดาเมจ +1 ช่วงเที่ยง ATK +1
- **Normal** ยิงไฟ (mana 2): ยิงไฟ 1 ตัวในระยะ 2 เวท ATK
- **Skill** ลูกไฟ (mana 3): ระเบิดกากบาทในระยะ 2 เวท ATK − 1 ติด Burn เวท 1 นาน 2 Rounds
- **Ultimate** ทะเลเพลิง (mana 4, ult 5/5): พื้นที่ 3x3 ในระยะ 3 เวท ATK ติด Burn เวท 1 นาน 4 Rounds

## ❄️ นักล่าน้ำแข็ง (`frost`)

- Role: Damage / Control · melee · physical · built from the owner's idea
- Stats: HP 22, ATK 4, DEF 1, Speed 105, Move 1, Break Bar 13, Aggro 5, Bounty 400
- **Passive**: ตีศัตรูที่ติด Slow ได้ดาเมจ +2
- **Normal** แทง (mana 2): แทง 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK
- **Skill** หอกเยือกแข็ง (mana 3): แทงทะลุ 2 ช่อง กายภาพ ATK ติด Slow 300 (เดินใช้มานา +1)
- **Ultimate** พายุหิมะ (mana 4, ult 5/5): ศัตรูในระยะ 2 รอบตัว กายภาพ 2 ติด Stun 300

## 🗡️ นักฆ่าไร้เงา (`ghost`)

- Role: Damage / Burst · melee · physical · built from the owner's idea
- Stats: HP 18, ATK 4, DEF 0, Speed 130, Move 1, Break Bar 10, Aggro 5, Bounty 400
- **Passive**: ต้นทุกช่วงต่อสู้ล่องหนจนกว่าจะโจมตี โจมตีตอนล่องหนดาเมจ +2 (กลางคืนและดึก +3)
- **Normal** แทง (mana 2): แทง 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK
- **Skill** แทงจากเงา (mana 3): วาร์ปไปข้างศัตรูในระยะ 3 แล้วแทง กายภาพ ATK + 1
- **Ultimate** เงามรณะ (mana 4, ult 4/4): แทงศัตรูที่ยืนติดกัน กายภาพ ATK + 4 ถ้าฆ่าได้จะล่องหนอีกครั้ง

## 🌫️ ภูตหมอกควัน (`mist`)

- Role: Support / Control · ranged · magic · built from the owner's idea
- Stats: HP 18, ATK 4, DEF 0, Speed 105, Move 1, Break Bar 11, Aggro 5, Bounty 400
- **Passive**: ตายแล้วฟื้นได้ 1 ครั้ง (HP 8) ถ้าทีมฆ่าฮีโร่ศัตรูได้ภายในรอบใหญ่ที่ตายหรือรอบถัดไป และยังมีพวกเหลือ
- **Normal** ยิงหมอก (mana 2): ยิงหมอก 1 ตัวในระยะ 2 เวท ATK
- **Skill** ม่านควัน (mana 3): ควันกากบาทในระยะ 3 นาน 4 Turns ศัตรูในควันโดนเวท 2 พวกในควันโดนตีปกติและสกิลเล็งเป้าไม่ได้
- **Ultimate** หมอกกลืนกิน (mana 4, ult 4/4): พื้นที่ 3x3 ในระยะ 3 เวท ATK + 1 ติด Silence 300

## 🥊 นักมวยยาง (`rubber`)

- Role: Damage / Disrupt · ranged · physical · built from the owner's idea
- Stats: HP 20, ATK 3, DEF 1, Speed 110, Move 1, Break Bar 14, Aggro 5, Bounty 400
- **Passive**: แขนยางยืด ตีปกติได้ไกล 2 ช่อง
- **Normal** หมัดยาง (mana 2): ต่อยศัตรู 1 ตัวในระยะ 2 กายภาพ ATK
- **Skill** หมัดยืด (mana 3): ต่อยเส้นตรง 3 ช่อง โดนตัวแรก กายภาพ ATK + 2 และผลักถอย 1 ช่อง
- **Ultimate** งานรื่นเริงยาง (mana 3, ult 5/5): สุ่มย้ายยูนิตทุกตัวบนกระดานไม่เกิน 2 ช่อง (หอคอยไม่ขยับ) และฟื้น HP ตัวเอง 5

## 🔒 ผู้ผนึกเวท (`seal`)

- Role: Support / Control · ranged · magic · built from the owner's idea
- Stats: HP 20, ATK 3, DEF 1, Speed 95, Move 1, Break Bar 13, Aggro 5, Bounty 400, magicArmor 1
- **Passive**: ตีศัตรูที่ติด Silence ได้ดาเมจ +2
- **Normal** ยิงเวท (mana 2): ยิงเวท 1 ตัวในระยะ 2 เวท ATK
- **Skill** ตราผนึก (mana 3): ศัตรู 1 ตัวในระยะ 3 เวท ATK ติด Silence 300
- **Ultimate** อาณาเขตเงียบ (mana 4, ult 5/5): ศัตรูในระยะ 2 รอบตัว ติด Silence 500

## 👑 ราชันเงา (`shadowk`)

- Role: Damage / Summoner · melee · physical · built from the owner's idea
- Stats: HP 18, ATK 2, DEF 1, Speed 100, Move 1, Break Bar 12, Aggro 5, Bounty 400
- **Passive**: ทุก 2 รอบใหญ่ ATK +1 (สูงสุด +3) กลางคืนและดึก ATK +1
- **Normal** ฟัน (mana 2): ฟัน 1 ช่องรอบตัว 8 ทิศ กายภาพ ATK
- **Skill** ปลุกเงา (mana 3): เรียกทหารเงา (HP 6 ATK 3) ช่องติดตัว
- **Ultimate** กองทัพเงา (mana 4, ult 5/5): เรียกทหารเงาสูงสุด 3 ตัว และ ATK +2 นาน 4 Turns

## 🔭 มือปืนสายลม (`sniper`)

- Role: Damage / Single-target · ranged · physical · built from the owner's idea
- Stats: HP 16, ATK 3, DEF 0, Speed 110, Move 1, Break Bar 9, Aggro 5, Bounty 400
- **Passive**: ตีปกตินัดแรกของแต่ละรอบใหญ่ดาเมจ +2
- **Normal** ยิง (mana 2): ยิงศัตรู 1 ตัวในระยะ 2 กายภาพ ATK
- **Skill** กระสุนเจาะเกราะ (mana 3): ยิงเส้นตรง 3 ช่อง โดนตัวแรก กายภาพ ATK + 3 Penetration +3
- **Ultimate** เป้าตาย (mana 4, ult 5/5): ยิงศัตรู 1 ตัวในระยะ 3 กายภาพ ATK + 4

## 💎 ผู้พิทักษ์ผลึก (`aegis`)

- Role: Support / Shield · ranged · magic · new in the prototype
- Stats: HP 20, ATK 2, DEF 1, Speed 95, Move 1, Break Bar 14, Aggro 5, Bounty 400, magicArmor 1
- **Passive**: โล่ที่ตัวนี้ให้ ได้เพิ่ม 2 ถ้าเป้าหมายมี HP ไม่ถึงครึ่ง
- **Normal** ยิงผลึก (mana 2): ยิงผลึก 1 ตัวในระยะ 2 เวท ATK
- **Skill** ผลึกคุ้มภัย (mana 3): ตั้งโล่แบบ Set 6 ให้พวก 1 ตัวในระยะ 2 นาน 4 Turns
- **Ultimate** ปราการผลึก (mana 4, ult 5/5): ทั้งทีมได้โล่แบบ Add 5 และ Armor +1 นาน 4 Turns

## 🎺 นักกวีศึก (`bard`)

- Role: Support / Buffer · ranged · magic · new in the prototype
- Stats: HP 17, ATK 2, DEF 0, Speed 110, Move 1, Break Bar 11, Aggro 5, Bounty 400
- **Passive**: พวกที่ยืนติดตัว (8 ทิศ) ATK +1
- **Normal** คลื่นเสียง (mana 2): ยิงคลื่นเสียง 1 ตัวในระยะ 2 เวท ATK
- **Skill** บทเพลงฮึกเหิม (mana 3): พวก 1 ตัวในระยะ 3 ATK +2 นาน 4 Turns
- **Skill** จังหวะเจาะเกราะ (mana 2): พวก 1 ตัวในระยะ 3 Penetration +2 นาน 4 Turns
- **Ultimate** ซิมโฟนีสงคราม (mana 4, ult 5/5): ทั้งทีม ATK +2 และ Break Boost +1 นาน 4 Turns

## 💧 หมอธารา (`medic`)

- Role: Support / Healer · ranged · magic · new in the prototype
- Stats: HP 18, ATK 2, DEF 0, Speed 105, Move 1, Break Bar 11, Aggro 5, Bounty 400
- **Passive**: ฮีลจากตัวนี้ได้เพิ่ม ATK ÷ 2
- **Normal** ยิงน้ำ (mana 2): ยิงน้ำ 1 ตัวในระยะ 2 เวท ATK
- **Skill** สายธารชำระ (mana 3): ฟื้น HP 5 และ Cleanse ล้าง CC กับ DOT ให้พวก 1 ตัวในระยะ 2
- **Ultimate** ฝนชุบชีวิต (mana 4, ult 5/5): ทั้งทีมฟื้น HP 6

## 🌿 นักบวชหยก (`priest`)

- Role: Support / Healer · ranged · magic · new in the prototype
- Stats: HP 18, ATK 2, DEF 1, Speed 95, Move 1, Break Bar 12, Aggro 5, Bounty 400
- **Passive**: ต้นรอบใหญ่ ฟื้น HP 2 ให้พวกที่ยืนติดกัน
- **Normal** ยิงแสง (mana 2): ยิงแสง 1 ตัวในระยะ 2 เวท ATK
- **Skill** พรหยก (mana 3): ฟื้น HP 6 ให้พวก 1 ตัวในระยะ 3
- **Ultimate** สายธารหยก (mana 4, ult 5/5): ทั้งทีมฟื้น HP 5 และได้โล่ 4 นาน 4 Turns
