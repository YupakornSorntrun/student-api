// auth-middleware.test.js
require("dotenv").config();
const request = require("supertest");
const app = require("./app");

describe("RBAC middleware", () => {
  test("ควรคืน 403 เมื่อ role ไม่มีสิทธิ์เข้าถึง route", async () => {
    // ใช้ token ของ student ที่สร้างไว้จาก test ก่อนหน้า หรือ register + login ใหม่
    // เรียก DELETE /api/v1/students/:id ด้วย token role student
    // expect(response.status).toBe(403)
  });

  test("ควรคืน 401 เมื่อ token ผิดรูปแบบ (แก้ไขตัวอักษรบางส่วน)", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid.token.here");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
  });
});