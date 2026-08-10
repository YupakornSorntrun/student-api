# แบบฝึกหัดเพิ่มเติม ปฏิบัติการสัปดาห์ที่ 4: เพิ่มชั้นความปลอดภัยพื้นฐานด้วย Middleware


### แบบฝึกหัดที่ 1: เขียน Middleware ตรวจสอบ Content-Type

เขียน middleware ที่ตรวจสอบว่าทุกคำขอที่มี body (POST, PUT, PATCH) ต้องมี Header `Content-Type: application/json` มิฉะนั้นให้ตอบกลับด้วย Status Code `415 Unsupported Media Type`

```javascript
function requireJson(req, res, next) {
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (
    methodsWithBody.includes(req.method) &&
    req.headers["content-type"] !== "application/json"
  ) {
    return res.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "กรุณาส่งข้อมูลในรูปแบบ application/json",
      },
    });
  }
  next();
}
```

ทดสอบด้วย Postman โดยส่งคำขอ POST แบบไม่ระบุ `Content-Type` และยืนยันว่าได้ Status Code `415`

## ผลลัพธ์ที่ได้
![POST](/images/4.1(POST).png)

![PUT](/images/4.1(PUT).png)

![PUT](/images/4.1(PATCH).png)

---

### แบบฝึกหัดที่ 2: จำกัดจำนวนคำขอด้วย Rate Limiting เบื้องต้น

ค้นคว้าและติดตั้งไลบรารี `express-rate-limit` แล้วจำกัดให้แต่ละ IP เรียก endpoint `POST /api/v1/students` ได้ไม่เกิน 5 ครั้งต่อนาที ทดสอบด้วยการเรียกคำขอซ้ำอย่างรวดเร็วผ่าน Postman (ใช้ฟีเจอร์ Runner) จนกว่าจะได้ Status Code `429 Too Many Requests`

## ผลลัพธ์ที่ได้

ติดตั้ง `npm install express-rate-limit`

![server-res](/images/4.2(1).png)
![postman-res](/images/4.2(2).png)

---

### แบบฝึกหัดที่ 3: เขียน Middleware ตรวจสอบขนาดของค่าฟิลด์

ปรับปรุง route `POST /api/v1/students` ให้ปฏิเสธคำขอที่ `name` มีความยาวเกิน 100 ตัวอักษร โดยตอบกลับ Status Code `400` พร้อมข้อความอธิบายที่ชัดเจน

## ผลลัพธ์ที่ได้

![name>100](/images/4.3.png)


---

### แบบฝึกหัดที่ 4: ทดสอบผลกระทบของลำดับ Middleware

ทดลองย้ายตำแหน่งของ `app.use(helmet())` ไปไว้หลัง route ทั้งหมดแทนที่จะไว้ก่อน แล้วสังเกตว่า Security Header ยังปรากฏใน response หรือไม่ พร้อมอธิบายผลลัพธ์ที่เกิดขึ้นโดยอ้างอิงหลักการ middleware pipeline จาก `wk04.md`

![middleware pipeline wk04](/images/4.4.png)


**สำคัญ**: หลังทดลองและบันทึกผลเสร็จแล้ว ให้ย้าย `app.use(helmet())` กลับไปไว้ตำแหน่งเดิม (ก่อน route ทั้งหมด ตามขั้นตอนที่ 2.3) ทันที ไม่เช่นนั้นโปรเจกต์จะขาดการป้องกัน Security Header ต่อเนื่องไปในสัปดาห์ถัดไป

## ผลลัพธ์ที่ได้

### [Before] ตำแหน่งของ `app.use(helmet())` อยู่ก่อน route ทั้งหมด
![helmet-Before](/images/4.4(helmet-before).png)

### [After] ย้ายตำแหน่งของ `app.use(helmet())` ไปไว้หลัง route 
![helmet-Before](/images/4.4(helmet-after).png)

อธิบายผลลัพธ์
- Security Header ไม่ปรากฏใน response 
- เพราะ helmet() ถูกวางไว้หลัง Route ทำให้ Request ถูกประมวลผลและส่ง Response กลับไปก่อนที่จะถึง helmet() 
- ตามหลัก Middleware Pipeline ของ Express ที่ทำงานตามลำดับจากบนลงล่าง ดังนั้น Middleware ที่อยู่หลัง Route จะไม่สามารถทำงานกับ Request ที่จบไปแล้วได้