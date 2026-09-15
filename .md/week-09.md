## มีคำสั่งที่ต้องเพิ่ม

### error 
```text
Error: Cannot find module './accept'
```

### วิธีแก้
```cmd
rmdir /s /q node_modules
del package-lock.json
npm cache clean --force
npm install
npm run dev
```

## Library - ติดตั้ง Jest และ Supertest

```cmd
npm install --save-dev jest supertest
```

## คำสั่ง Run Test

```cmd
npx jest auth-helpers.test.js
```

- ใช้สำหรับ Run Test เฉพาะไฟล์ที่กำหนด

```cmd
npm run test
```

- ใช้สำหรับ Run Test ทุกไฟล์ที่ Jest ตรวจพบ เช่น **.test.js**

```cmd
npm run test:coverage
```

- รันไฟล์ Test ทั้งหมด , สร้างรายงาน Coverage(การวัดว่าเราเขียน Test ครอบคลุมโค้ดของเรามากแค่ไหน)

- Coverage คือค่าที่ใช้วัดว่า Test Case สามารถครอบคลุมและทดสอบส่วนต่าง ๆ ของโค้ดได้มากน้อยแค่ไหน

| รายการ         | หมายถึง                                 |
| -------------- | --------------------------------------- |
| **Statements** | คำสั่งในโค้ดถูก Test ไปกี่ %            |
| **Branches**   | เงื่อนไข `if/else`, `?:` ถูก Test กี่ % |
| **Functions**  | ฟังก์ชันถูกเรียกทดสอบกี่ %              |
| **Lines**      | บรรทัดโค้ดถูกทำงานผ่านตอน Test กี่ %    |
