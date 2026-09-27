// auth.test.js
// Integration Test: ทดสอบ Auth routes (register, login, me) ผ่าน Supertest
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

const pool = require("./db");
const request = require("supertest");
const app = require("./app");
const { hashPassword } = require("./auth-helpers");

afterEach(() => {
  jest.clearAllMocks();
});

// ===== POST /api/v1/auth/register =====
describe("POST /api/v1/auth/register", () => {
  test("ควรคืน 201 เมื่อข้อมูลถูกต้องและครบถ้วน", async () => {
    // Mock: INSERT สำเร็จ
    pool.query.mockResolvedValueOnce([{ insertId: 10 }]);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "newuser@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty("id");
    expect(response.body.data.email).toBe("newuser@example.com");
    expect(response.body.data.role).toBe("student");
  });

  test("ควรคืน 400 เมื่อไม่ระบุ password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "incomplete@example.com" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("ควรคืน 400 เมื่อไม่ระบุ email", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ password: "Passw0rd!" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("ควรคืน 409 เมื่อ email ซ้ำกับที่มีอยู่แล้ว", async () => {
    // Mock: INSERT ล้มเหลวเพราะ email ซ้ำ
    const dupError = new Error("Duplicate entry");
    dupError.code = "ER_DUP_ENTRY";
    pool.query.mockRejectedValueOnce(dupError);

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "existing@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DUPLICATE_EMAIL");
  });
});

// ===== POST /api/v1/auth/login =====
describe("POST /api/v1/auth/login", () => {
  test("ควรคืน 400 เมื่อไม่ระบุ email และ password", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("ควรคืน 401 เมื่อ email ไม่มีอยู่ในระบบ", async () => {
    // Mock: ไม่พบผู้ใช้
    pool.query.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "notfound@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("ควรคืน 401 เมื่อ password ไม่ถูกต้อง", async () => {
    const hashedPassword = await hashPassword("CorrectPassword123");

    // Mock: พบผู้ใช้ แต่ password ไม่ตรง
    pool.query.mockResolvedValueOnce([
      [{ id: 1, email: "user@example.com", password_hash: hashedPassword, role: "student" }],
    ]);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@example.com", password: "WrongPassword" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  test("ควรคืน 200 พร้อม token เมื่อ login สำเร็จ", async () => {
    const hashedPassword = await hashPassword("Passw0rd!");

    // Mock: พบผู้ใช้ และ password ตรง
    pool.query.mockResolvedValueOnce([
      [{ id: 1, email: "user@example.com", password_hash: hashedPassword, role: "student" }],
    ]);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "user@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });
});

// ===== POST /api/v1/auth/register (database error) =====
describe("POST /api/v1/auth/register (database error)", () => {
  test("ควรคืน 500 เมื่อ database เกิด error ที่ไม่ใช่ duplicate", async () => {
    pool.query.mockRejectedValueOnce(new Error("Connection lost"));

    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "error@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(500);
  });
});

// ===== PATCH /api/v1/auth/change-password =====
describe("PATCH /api/v1/auth/change-password", () => {
  const jwt = require("jsonwebtoken");
  const validToken = jwt.sign(
    { id: 1, email: "user@example.com", role: "student" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  test("ควรคืน 400 เมื่อไม่ระบุ oldPassword หรือ newPassword", async () => {
    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ oldPassword: "Passw0rd!" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("ควรคืน 404 เมื่อไม่พบผู้ใช้ในระบบ", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ oldPassword: "OldPassw0rd!", newPassword: "NewPassw0rd!" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("USER_NOT_FOUND");
  });

  test("ควรคืน 401 เมื่อรหัสผ่านเดิมไม่ถูกต้อง", async () => {
    const correctHash = await hashPassword("CorrectOld1");
    pool.query.mockResolvedValueOnce([
      [{ id: 1, email: "user@example.com", password_hash: correctHash, role: "student" }],
    ]);

    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ oldPassword: "WrongOldPw!", newPassword: "NewPassw0rd!" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_PASSWORD");
  });

  test("ควรคืน 200 เมื่อเปลี่ยนรหัสผ่านสำเร็จ", async () => {
    const correctHash = await hashPassword("OldPassw0rd!");
    pool.query
      .mockResolvedValueOnce([
        [{ id: 1, email: "user@example.com", password_hash: correctHash, role: "student" }],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .patch("/api/v1/auth/change-password")
      .set("Authorization", `Bearer ${validToken}`)
      .send({ oldPassword: "OldPassw0rd!", newPassword: "NewPassw0rd!" });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("เปลี่ยนรหัสผ่านสำเร็จ");
  });
});

// ===== GET /api/v2/students =====
describe("GET /api/v2/students", () => {
  test("ควรคืน 200 พร้อมรายการนักศึกษา v2 format", async () => {
    const mockStudents = [
      { id: 1, name: "สมชาย", major: "CS", email: "s@example.com" },
    ];
    pool.query.mockResolvedValueOnce([mockStudents]);

    const response = await request(app).get("/api/v2/students");

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.count).toBe(1);
  });
});

// ===== GET /api/v1/auth/me =====
describe("GET /api/v1/auth/me", () => {
  test("ควรคืน 401 เมื่อไม่แนบ Authorization header", async () => {
    const response = await request(app).get("/api/v1/auth/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("NO_TOKEN");
  });

  test("ควรคืน 200 พร้อมข้อมูลผู้ใช้เมื่อแนบ token ที่ถูกต้อง", async () => {
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      { id: 1, email: "user@example.com", role: "student" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const response = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("user@example.com");
  });
});