// auth-middleware.test.js
// Integration Test: ทดสอบ Authentication และ RBAC middleware ผ่าน Supertest
// Mock ทั้ง database และ Redis เพื่อไม่ต้องเชื่อมต่อจริง

require("dotenv").config();
jest.mock("./db");
jest.mock("./cache", () => ({
  redisClient: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue("OK"),
    del: jest.fn().mockResolvedValue(1),
  },
  connectRedis: jest.fn().mockResolvedValue(),
}));

const request = require("supertest");
const app = require("./app");
const jwt = require("jsonwebtoken");

describe("RBAC middleware", () => {
  test("ควรคืน 401 เมื่อไม่แนบ token", async () => {
    const response = await request(app)
      .delete("/api/v1/students/1");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NO_TOKEN");
  });

  test("ควรคืน 401 เมื่อ token ผิดรูปแบบ (แก้ไขตัวอักษรบางส่วน)", async () => {
    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", "Bearer invalid.token.here");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_TOKEN");
  });

  test("ควรคืน 403 เมื่อ role student พยายามลบนักศึกษา (เฉพาะ admin)", async () => {
    // สร้าง token ของ student
    const studentToken = jwt.sign(
      { id: 99, email: "student@example.com", role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const response = await request(app)
      .delete("/api/v1/students/1")
      .set("Authorization", `Bearer ${studentToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });
});