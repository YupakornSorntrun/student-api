# 📋 สรุปผลการทำ Lab 10: OpenAPI/Swagger และ Postman/Newman (ฉบับร่าง)

---

## ส่วนที่ 2: เพิ่ม Swagger Doc ตามโค้ดจริง

1. **ติดตั้งเครื่องมือ:** ทำการติดตั้งแพ็กเกจ `swagger-ui-express` และ `js-yaml`
2. **สร้างเอกสาร OpenAPI:** สร้างไฟล์ `openapi.yaml` โดยประกาศโครงสร้าง Endpoint ทั้งหมด 6 รายการที่อ้างอิงจากโค้ดจริง ได้แก่:
   - **Auth:** `POST /register`, `POST /login`, `GET /me`
   - **Students:** `GET /students`, `POST /students`, `PUT /students/{id}`, `DELETE /students/{id}`
   - *หมายเหตุ: กำหนดระบบความปลอดภัยแบบ JWT (Bearer) และ Status Code ให้ตรงกับความเป็นจริง*
3. **เชื่อม Swagger เข้ากับระบบ:** แก้ไขไฟล์ `app.js` ให้อ่านไฟล์ `openapi.yaml` และแสดงผลผ่านหน้า UI ที่ Path `/api-docs`

---

## ส่วนที่ 3: Export/Import Postman Collection และรัน Newman CLI

1. **สร้าง Collection และ Environment:** สร้างโฟลเดอร์รวบรวม API จำนวน 7 Requests และสร้าง Environment `student-api-dev` เพื่อเก็บค่าตัวแปร `baseUrl`
2. **จัดการ Token อัตโนมัติ:** เพิ่มสคริปต์ในแท็บ `After response` ของ `POST /login` เพื่อดึงค่า Token เข้าไปเก็บในตัวแปร `authToken` อัตโนมัติ ทำให้ API อื่นๆ สามารถดึงไปใช้ยืนยันตัวตนได้ทันที
3. **เขียน Test Scripts:** เขียนสคริปต์ `pm.test` เพื่อตรวจสอบ Status Code และข้อมูลเบื้องต้นของแต่ละ Request จำนวน 2 เงื่อนไข (Assertions) ต่อ 1 Request
4. **ทดสอบอัตโนมัติด้วย Newman:** Export ไฟล์เป็น `postman_collection.json` และ `environment.json` จากนั้นนำไปรันผ่าน CLI ด้วยคำสั่ง `newman run postman_collection.json -e environment.json` ผลลัพธ์สำเร็จผ่านทุกการทดสอบ (Failed = 0)

---
**สถานะ:** การฝึกซ้อมบน `student-api` เสร็จสมบูรณ์ (พร้อมนำกระบวนการนี้ไปทำจริงในโปรเจกต์โครงงานระยะ 2 ต่อไป)
