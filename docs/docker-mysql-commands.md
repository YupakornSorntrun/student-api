# คำสั่งที่ใช้กับ Docker และ MySQL

เอกสารนี้สรุปคำสั่งสำหรับตรวจสอบ Docker, เข้าใช้งาน MySQL ที่รันใน Docker และนำไฟล์ SQL เข้า Database โดยกำหนด `utf8mb4` เพื่อรองรับภาษาไทย

---

## 1. คำสั่งที่รันใน Docker / Command Prompt

### ตรวจสอบว่า Container ทำงานอยู่หรือไม่

```cmd
docker ps
```

ตรวจสอบว่ามี Container ชื่อ `mysql_db` และสถานะเป็น `Up` ก่อนใช้งาน

---

### เข้า MySQL ที่อยู่ใน Docker

เพื่อให้รองรับการแสดงภาษาไทย ให้ใช้คำสั่ง:

```cmd
docker exec -it mysql_db mysql -u root -p --default-character-set=utf8mb4
```

เมื่อระบบแสดงข้อความ:

```text
Enter password:
```

ให้กรอกรหัสผ่าน:

```text
changeme_root_password
```

ถ้าเข้าใช้งานสำเร็จ จะเห็น:

```text
mysql>
```

> `--default-character-set=utf8mb4` ใช้กำหนด character set ของการเชื่อมต่อครั้งนี้ เพื่อให้สามารถรับและแสดงภาษาไทยได้ถูกต้อง

---

### นำไฟล์ SQL เข้า Database

ใช้คำสั่งต่อไปนี้จากโฟลเดอร์ที่มีไฟล์ `schema.sql` หรือ `seed.sql`

#### นำ `schema.sql` เข้าไปสร้างโครงสร้าง Database และ Table

```cmd
docker exec -i mysql_db mysql -u root -pchangeme_root_password -D student_api < schema.sql
```

#### นำ `seed.sql` เข้าไปเพิ่มข้อมูลตัวอย่าง

```cmd
docker exec -i mysql_db mysql -u root -pchangeme_root_password --default-character-set=utf8mb4 -D student_api < seed.sql
```

> `--default-character-set=utf8mb4` ช่วยให้ MySQL อ่านข้อมูลภาษาไทยจากไฟล์ `seed.sql` ได้ถูกต้อง และป้องกันปัญหาภาษาไทยกลายเป็น `????`

### ความแตกต่างระหว่าง `schema.sql` และ `seed.sql`

| ไฟล์ | ใช้ทำอะไร |
| --- | --- |
| `schema.sql` | สร้าง Database, Table, Column, Key และโครงสร้างข้อมูล |
| `seed.sql` | เพิ่มข้อมูลเริ่มต้นหรือข้อมูลตัวอย่างลงใน Table ที่สร้างแล้ว |

โดยปกติให้รัน `schema.sql` ก่อน แล้วจึงรัน `seed.sql`

> หากมี Database หรือ Table อยู่แล้ว การรัน `schema.sql` ซ้ำอาจเกิดข้อผิดพลาด เช่น `Table already exists` ขึ้นอยู่กับคำสั่งที่เขียนในไฟล์

---

## 2. คำสั่งที่รันใน MySQL

เมื่อเห็นข้อความ:

```text
mysql>
```

จึงใช้คำสั่ง SQL ด้านล่างได้

SQL ไม่บังคับตัวพิมพ์เล็กหรือใหญ่ แต่ควรเขียนชื่อให้ถูกต้อง และจบคำสั่งด้วยเครื่องหมาย `;`

### ดู Database ทั้งหมด

```sql
SHOW DATABASES;
```

---

### เลือก Database ที่ต้องการใช้งาน

```sql
USE student_api;
```

ถ้าสำเร็จจะแสดง:

```text
Database changed
```

---

### ดู Table ทั้งหมดใน Database ที่เลือก

```sql
SHOW TABLES;
```

---

### ดูข้อมูลใน Table

```sql
SELECT * FROM students;
```

ตัวอย่าง Table อื่น:

```sql
SELECT * FROM courses;
```

```sql
SELECT * FROM enrollments;
```

---

### ดูโครงสร้างของ Table

```sql
DESCRIBE students;
```

หรือใช้คำสั่งแบบย่อ:

```sql
DESC students;
```

---

### ตรวจสอบ Character Set ของ Table

ใช้ตรวจสอบว่า Table รองรับภาษาไทยหรือไม่:

```sql
SHOW CREATE TABLE students;
```

ควรพบ:

```text
DEFAULT CHARSET=utf8mb4
```

สามารถตรวจสอบ Column เพิ่มเติมได้ด้วย:

```sql
SHOW FULL COLUMNS FROM students;
```

Column ที่เก็บข้อความควรมี Collation ที่ขึ้นต้นด้วย:

```text
utf8mb4
```

---

### ตรวจสอบ Character Set ของ MySQL Connection

```sql
SHOW VARIABLES LIKE 'character_set%';
```

เมื่อเข้า MySQL ด้วย:

```cmd
docker exec -it mysql_db mysql -u root -p --default-character-set=utf8mb4
```

ค่าที่เกี่ยวข้องกับการเชื่อมต่อควรเป็น `utf8mb4` เช่น:

```text
character_set_client
character_set_connection
character_set_results
```

---

## 3. หมายเหตุเรื่องภาษาไทย

Database และ Table ควรใช้ `utf8mb4` เพื่อรองรับภาษาไทยและอักขระพิเศษ

ตัวอย่าง:

```sql
CREATE DATABASE IF NOT EXISTS student_api
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

สำหรับการนำข้อมูลจาก `seed.sql` เข้า MySQL ให้ใช้:

```cmd
docker exec -i mysql_db mysql -u root -pchangeme_root_password --default-character-set=utf8mb4 -D student_api < seed.sql
```

และเมื่อต้องการเข้า MySQL เพื่อดูข้อมูลภาษาไทย ให้ใช้:

```cmd
docker exec -it mysql_db mysql -u root -p --default-character-set=utf8mb4
```

> ไม่จำเป็นต้องเปลี่ยนการตั้งค่า MySQL แบบถาวร เพียงกำหนด `utf8mb4` ในตอนเชื่อมต่อหรือ import ไฟล์ SQL ก็เพียงพอสำหรับการใช้งานนี้

---

## 4. ลำดับการทำงานโดยสรุป

### ครั้งแรก

```text
1. docker ps
        ↓
2. รัน schema.sql
        ↓
3. รัน seed.sql ด้วย utf8mb4
        ↓
4. เข้า MySQL ด้วย utf8mb4
        ↓
5. USE student_api;
        ↓
6. SHOW TABLES;
        ↓
7. SELECT * FROM students;
```

### คำสั่งหลักที่ใช้บ่อย

```cmd
docker ps
```

```cmd
docker exec -it mysql_db mysql -u root -p --default-character-set=utf8mb4
```

```cmd
docker exec -i mysql_db mysql -u root -pchangeme_root_password -D student_api < schema.sql
```

```cmd
docker exec -i mysql_db mysql -u root -pchangeme_root_password --default-character-set=utf8mb4 -D student_api < seed.sql
```