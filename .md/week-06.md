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