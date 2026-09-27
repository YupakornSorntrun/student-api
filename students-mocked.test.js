// students-mocked.test.js
// Integration Test: ทดสอบ Students CRUD routes ผ่าน Supertest
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
const jwt = require("jsonwebtoken");

afterEach(() => {
  jest.clearAllMocks();
});

// ===== GET /api/v1/students =====
describe("GET /api/v1/students", () => {
  test("ควรคืน 200 พร้อมรายการนักศึกษา", async () => {
    const mockStudents = [
      { id: 1, name: "สมชาย ใจดี", major: "วิทยาการคอมพิวเตอร์", email: "somchai@example.com" },
    ];

    // Mock: query students → คืนข้อมูล, query count → คืน total
    pool.query
      .mockResolvedValueOnce([mockStudents])
      .mockResolvedValueOnce([[{ total: 1 }]]);

    const response = await request(app).get("/api/v1/students");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("สมชาย ใจดี");
  });
});

// ===== GET /api/v1/students/:id =====
describe("GET /api/v1/students/:id", () => {
  test("ควรคืน 200 เมื่อพบนักศึกษา", async () => {
    pool.query.mockResolvedValueOnce([
      [{ id: 1, name: "สมชาย ใจดี", major: "วิทยาการคอมพิวเตอร์", email: "somchai@example.com" }],
    ]);

    const response = await request(app).get("/api/v1/students/1");

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("สมชาย ใจดี");
  });

  test("ควรคืน 404 เมื่อไม่พบนักศึกษา", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const response = await request(app).get("/api/v1/students/999");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

// ===== POST /api/v1/students =====
describe("POST /api/v1/students", () => {
  test("ควรคืน 201 เมื่อเพิ่มข้อมูลสำเร็จ", async () => {
    pool.query.mockResolvedValueOnce([{ insertId: 5 }]);

    const response = await request(app)
      .post("/api/v1/students")
      .send({ name: "ทดสอบ", major: "CS", email: "test@example.com" });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe(5);
    expect(response.body.data.name).toBe("ทดสอบ");
  });

  test("ควรคืน 400 เมื่อไม่ระบุข้อมูลครบ", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .send({ name: "ทดสอบ" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("ควรคืน 409 เมื่อ email ซ้ำ", async () => {
    const dupError = new Error("Duplicate entry");
    dupError.code = "ER_DUP_ENTRY";
    pool.query.mockRejectedValueOnce(dupError);

    const response = await request(app)
      .post("/api/v1/students")
      .send({ name: "ทดสอบ", major: "CS", email: "dup@example.com" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("DUPLICATE_EMAIL");
  });
});

// ===== PATCH /api/v1/students/:id =====
describe("PATCH /api/v1/students/:id", () => {
  test("ควรคืน 200 เมื่อแก้ไขข้อมูลบางส่วนสำเร็จ", async () => {
    // Mock: SELECT → พบนักศึกษา, UPDATE → สำเร็จ
    pool.query
      .mockResolvedValueOnce([
        [{ id: 1, name: "สมชาย", major: "CS", email: "old@example.com" }],
      ])
      .mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .patch("/api/v1/students/1")
      .send({ name: "สมชาย แก้ไขแล้ว" });

    expect(response.status).toBe(200);
    expect(response.body.data.name).toBe("สมชาย แก้ไขแล้ว");
    // ฟิลด์ที่ไม่ได้ส่งมาควรใช้ค่าเดิม
    expect(response.body.data.major).toBe("CS");
  });

  test("ควรคืน 404 เมื่อไม่พบนักศึกษา", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .patch("/api/v1/students/999")
      .send({ name: "ใหม่" });

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("STUDENT_NOT_FOUND");
  });
});

// ===== DELETE /api/v1/students/:id (ต้อง admin) =====
describe("DELETE /api/v1/students/:id", () => {
  test("ควรคืน 200 เมื่อ admin ลบสำเร็จ", async () => {
    const adminToken = jwt.sign(
      { id: 1, email: "admin@example.com", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    pool.query.mockResolvedValueOnce([{ affectedRows: 1 }]);

    const response = await request(app)
      .delete("/api/v1/students/1")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("ลบข้อมูลสำเร็จ");
  });

  test("ควรคืน 404 เมื่อไม่พบนักศึกษาที่ต้องการลบ", async () => {
    const adminToken = jwt.sign(
      { id: 1, email: "admin@example.com", role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    pool.query.mockResolvedValueOnce([{ affectedRows: 0 }]);

    const response = await request(app)
      .delete("/api/v1/students/999")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
  });
});

// ===== GET / (root) =====
describe("GET /", () => {
  test("ควรคืน 200 พร้อมข้อความ", async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Student API พร้อมใช้งาน");
  });
});

// ===== 404 route =====
describe("Route ที่ไม่มีอยู่", () => {
  test("ควรคืน 404 เมื่อเรียก route ที่ไม่มีอยู่", async () => {
    const response = await request(app).get("/api/v1/nonexistent");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
