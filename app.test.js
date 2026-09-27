// app.test.js
// ทดสอบ Error Handling Middleware ใน app.js เพื่อเพิ่ม Branch Coverage

const request = require("supertest");
const app = require("./app");

describe("app.js Error Handler", () => {
  test("ควรใช้ status 400 และแสดง err.type เมื่อส่งข้อมูล JSON ผิดรูปแบบ", async () => {
    // การส่ง JSON ที่ผิด Syntax จะทำให้ express.json() โยน Error
    // ซึ่ง Error นี้จะมีคุณสมบัติ err.status = 400 และ err.type = 'entity.parse.failed'
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "test@example.com", "password": }'); // จำลอง JSON พัง (ลืมใส่ค่าหลัง password)

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("entity.parse.failed");
    expect(response.body.error).toHaveProperty("message");
  });
});
