## week-06

```js
//plainPassword คือที่เราพิมพ์เอง
async function hashPassword(plainPassword) {
  //ถ้าอยากรู้ว่าจะขึ้นยังไง มีตัวแปรรับ const addpassword 
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}
```

plainPassword = 'abc' //ตั้งเอง
hashPassword = 'sgdh5htr' //มั่วๆ

verifyPassword('abc', 'sgdh5htr') // ตีความว่าเอาpasswordที่เราตั้งมาเข้ารหัสอีกครั้ง


## แบบฝึกหัด 

1. เพิ่มคอลัมน์เชื่อมโยงในตาราง `students` เพื่ออ้างอิงเจ้าของบัญชี

   ```sql
   ALTER TABLE students ADD COLUMN user_id INT NULL;
   ALTER TABLE students ADD FOREIGN KEY (user_id) REFERENCES users(id);
   ```

2. กำหนดค่า `user_id` ให้กับระเบียนนิสิตทดสอบด้วยตนเองผ่าน MySQL command line (จำลองขั้นตอนที่ admin ผูกบัญชี login เข้ากับระเบียนนิสิตที่มีอยู่แล้ว) เช่น

   ```sql
   UPDATE students SET user_id = 1 WHERE id = 1;
   ```