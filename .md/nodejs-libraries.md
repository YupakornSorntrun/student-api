# การติดตั้งไลบรารีที่จำเป็นสำหรับโปรเจกต์ Node.js

เอกสารนี้สรุปคำสั่งติดตั้งไลบรารี (package) ที่ใช้ในแต่ละสัปดาห์ของโปรเจกต์ Node.js

> ก่อนติดตั้ง ให้เปิด Terminal ในโฟลเดอร์โปรเจกต์ และตรวจสอบว่าได้สร้างโปรเจกต์แล้วด้วยคำสั่ง `npm init -y`

## Wk-01: ติดตั้งสภาพแวดล้อมการพัฒนา

### ติดตั้ง Express

```cmd
npm install express
```

`express` คือไลบรารีสำหรับสร้าง Web Server และ API เช่น การสร้าง Route `/students` หรือ `/courses`

### ติดตั้ง Nodemon สำหรับพัฒนา

```cmd
npm install --save-dev nodemon
```

`nodemon` จะคอยตรวจสอบไฟล์ในโปรเจกต์ เมื่อแก้ไขและบันทึกไฟล์ ระบบจะรีสตาร์ต Server ให้อัตโนมัติ จึงไม่ต้องหยุดและรัน Server ใหม่ทุกครั้ง

`--save-dev` หมายถึงติดตั้งไว้ใช้เฉพาะระหว่างพัฒนา ไม่ใช่ไลบรารีหลักที่ต้องใช้ตอนนำโปรเจกต์ขึ้นใช้งานจริง

ตัวอย่างการตั้งค่าใน `package.json`:

```json
{
  "scripts": {
    "dev": "nodemon index.js"
  }
}
```

จากนั้นรัน Server ด้วย:

```cmd
npm run dev
```

---

## Wk-02: ทดลองสร้าง GraphQL เทียบกับ REST Endpoint

```cmd
npm install express-graphql graphql
```

| ไลบรารี | ใช้ทำอะไร |
| --- | --- |
| `graphql` | เป็นแกนหลักสำหรับกำหนด Schema, Query และรูปแบบข้อมูลของ GraphQL |
| `express-graphql` | ช่วยเชื่อม GraphQL เข้ากับ Express เพื่อสร้าง Endpoint เช่น `/graphql` |

หลังติดตั้ง สามารถเปิด Endpoint เดียว เช่น `/graphql` เพื่อให้ผู้ใช้ระบุข้อมูลที่ต้องการได้ ต่างจาก REST ที่มักแยก Endpoint ตามทรัพยากร เช่น `/students` และ `/courses`

---

## Wk-04: เพิ่มความปลอดภัย การเข้าถึงข้ามโดเมน และบันทึกการเรียก API

```cmd
npm install helmet cors morgan dotenv
```

| ไลบรารี | ใช้ทำอะไร |
| --- | --- |
| `helmet` | เพิ่ม HTTP headers ด้านความปลอดภัยให้ Express |
| `cors` | อนุญาตหรือกำหนดการเรียก API จากเว็บไซต์คนละโดเมนหรือคนละพอร์ต |
| `morgan` | แสดงบันทึก (log) ของทุก request เช่น method, URL และสถานะตอบกลับ |
| `dotenv` | อ่านค่าตัวแปรจากไฟล์ `.env` เช่น รหัสผ่านฐานข้อมูล หรือหมายเลขพอร์ต |

ตัวอย่างการใช้งานเบื้องต้นในไฟล์ `index.js`:

```js
require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
```

> ไม่ควรอัปโหลดไฟล์ `.env` ที่มีรหัสผ่านหรือข้อมูลลับขึ้น Git ให้เพิ่ม `.env` ลงในไฟล์ `.gitignore`

---

## Wk-05: ติดตั้งไลบรารีและเชื่อมต่อฐานข้อมูล MySQL

### 1. ติดตั้ง `mysql2`

```cmd
npm install mysql2
```

`mysql2` คือไลบรารีสำหรับเชื่อมต่อ Node.js กับฐานข้อมูล MySQL สามารถใช้รันคำสั่ง SQL เช่น `SELECT`, `INSERT`, `UPDATE` และ `DELETE`

---

### 2. เพิ่มค่าการเชื่อมต่อในไฟล์ `.env`

สร้างไฟล์ชื่อ `.env` ไว้ในโฟลเดอร์หลักของโปรเจกต์ แล้วเพิ่มข้อมูลดังนี้:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=student_api
```

เปลี่ยน `your_password` เป็นรหัสผ่าน MySQL ของตนเอง

หาก MySQL รันอยู่ใน Docker และตั้งรหัสผ่านตามเอกสาร Docker ก่อนหน้านี้ สามารถใช้ตัวอย่างนี้ได้:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=changeme_root_password
DB_NAME=student_api
```

> ไม่ควรอัปโหลดไฟล์ `.env` ที่มีรหัสผ่านหรือข้อมูลลับขึ้น Git ให้เพิ่ม `.env` ลงในไฟล์ `.gitignore`

---

### 3. สร้างไฟล์เชื่อมต่อฐานข้อมูล `db.js`

สร้างไฟล์ชื่อ `db.js` แล้ววางโค้ดนี้:

```js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
```

ความหมายของค่าหลักใน `db.js`:

| ค่า | ความหมาย |
| --- | --- |
| `host`, `user`, `password`, `database` | อ่านค่าการเชื่อมต่อจากไฟล์ `.env` |
| `createPool()` | สร้างกลุ่มการเชื่อมต่อ เพื่อให้ API หลายคำขอใช้ฐานข้อมูลได้อย่างมีประสิทธิภาพ |
| `connectionLimit: 10` | อนุญาตให้มีการเชื่อมต่อใน pool สูงสุด 10 การเชื่อมต่อ |
| `queueLimit: 0` | ให้คำขอที่รอการเชื่อมต่อเข้าคิวได้ไม่จำกัด |

---

### 4. ให้แอปอ่านไฟล์ `.env`

ในไฟล์เริ่มต้นของ Server เช่น `index.js` หรือ `app.js` ให้ใส่บรรทัดนี้ไว้ด้านบนสุด ก่อนเรียกใช้ `db.js` หรือไฟล์ Route:

```js
require('dotenv').config();
```

> ต้องติดตั้ง `dotenv` ก่อนด้วยคำสั่ง `npm install dotenv` ซึ่งได้ติดตั้งไว้ใน Wk-04 แล้ว

---

### ข้อควรระวังเมื่อใช้ Nodemon

เมื่อแก้ค่าในไฟล์ `.env` เช่น เปลี่ยนรหัสผ่านฐานข้อมูล ควรหยุด Server แล้วรันใหม่เสมอ เพราะค่าจาก `.env` จะถูกโหลดตอนที่แอปเริ่มทำงาน

1. กด `Ctrl+C` เพื่อหยุด Server
2. รันคำสั่งนี้อีกครั้ง

```cmd
npm run dev
```

โดยค่าเริ่มต้น `nodemon` มักเฝ้าดูไฟล์โค้ดเป็นหลัก จึงไม่ควรคาดหวังให้การแก้ `.env` ทำให้ Server รีสตาร์ตเอง หากต้องการให้เฝ้าดู `.env` ด้วย ต้องตั้งค่า `nodemon` เพิ่มเติม

---

## สรุปรวมคำสั่งติดตั้ง

หากต้องการติดตั้งทุกไลบรารีครั้งเดียว ให้ใช้:

```cmd
npm install express express-graphql graphql helmet cors morgan dotenv mysql2
npm install --save-dev nodemon
```
