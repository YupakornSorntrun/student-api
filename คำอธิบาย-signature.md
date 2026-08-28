## อธิบายว่าเหตุใด Token ที่ถูกแก้ไขแม้เพียงตัวอักษรเดียวจึงถูกปฏิเสธ

### ข้อมูลอ้างอิงจาก `wk06.md`

JWT ประกอบด้วย 3 ส่วน คั่นด้วยจุด (`.`) ในรูปแบบ

```text
Header.Payload.Signature
```

โดยแต่ละส่วนมีหน้าที่ดังนี้

- **Header** ระบุอัลกอริทึมที่ใช้สร้าง Signature เช่น `HS256`
- **Payload** เก็บข้อมูลของผู้ใช้ เช่น `{"id": 1, "role": "student"}`
- **Signature** ถูกคำนวณจาก Header + Payload + Secret Key เพื่อยืนยันว่า Token ไม่ถูกแก้ไข

ตัวอย่างโครงสร้าง:

```text
Header
.
Payload
.
Signature
```

---

### คำอธิบาย

* อ้างอิงหลักการ Signature ใน `wk06.md` JWT ประกอบด้วย 3 ส่วน คือ `Header.Payload.Signature` โดย Signature ถูกสร้างจาก Header และ Payload ร่วมกับ Secret Key ของเซิร์ฟเวอร์

* แม้ Token จะเป็นข้อความที่ดูเหมือนตัวอักษรสุ่ม แต่ส่วน Header และ Payload สามารถถอดรหัสเพื่ออ่านข้อมูลได้ หากมีการแก้ไขข้อมูลหรือเปลี่ยนตัวอักษรใน Header หรือ Payload ข้อมูลของ Token จะเปลี่ยนไป แต่ Signature เดิมยังเป็น Signature ที่สร้างจากข้อมูลก่อนถูกแก้ไข ( เนื่องจากผู้แก้ไขไม่มี Secret Key จึงไม่สามารถสร้าง Signature ใหม่ที่ถูกต้องได้ เมื่อเซิร์ฟเวอร์ตรวจสอบจึงพบว่า Signature ไม่ตรงกับข้อมูลใน Token และปฏิเสธการใช้งานทันที )

ตัวอย่างให้เห็นภาพ:

```text
Token เดิม

Header . Payload(student) . Signature เดิม
```

หากมีการแก้ไข Payload:

```text
Header . Payload(admin) . Signature เดิม
                  ↑
              ข้อมูลเปลี่ยน
```

เมื่อเซิร์ฟเวอร์ตรวจสอบ Signature จะพบว่า Signature เดิมไม่สามารถใช้ยืนยันข้อมูล `Payload(admin)` ได้ จึงถือว่า Token ถูกดัดแปลงและปฏิเสธการใช้งานทันที