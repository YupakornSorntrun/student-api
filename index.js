require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const studentsRouter = require("./routes/students");
//const coursesRouter = require("./routes/courses");
//const enrollmentsRouter = require("./routes/enrollments");
//const { graphqlHTTP } = require("express-graphql");
//const schema = require("./schema");
//const query = require("./resolvers");

const app = express();
const PORT = process.env.PORT || 3000;

const pool = require("./db");

/*
app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: query,
    graphiql: true, // เปิดใช้งานหน้าทดสอบ GraphiQL ผ่านเบราว์เซอร์
  }),
); 
*/

// ลำดับ middleware มีความสำคัญ: security header → CORS → logger → body parser
// (ลำดับนี้ต่างจากแผนภาพตัวอย่างในหัวข้อ 1.2 ของ wk04.md ซึ่งวาง Logger ไว้ก่อน Helmet
// ทั้งสองลำดับใช้ได้ ตราบใดที่ Error-Handling Middleware ยังอยู่ท้ายสุดเสมอ)
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  })
);
app.use(morgan("dev"));

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

app.use(requireJson);

app.use(express.json({ limit: "10kb" }));

app.use("/api/v1/students", studentsRouter);
//app.use("/api/v1/courses", coursesRouter);
//app.use("/api/v1", enrollmentsRouter);


app.get("/", (req, res) => {
  res.status(200).json({ message: "Student API พร้อมใช้งาน" });
});

const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("./auth-helpers");
const { authenticateToken } = require("./middlewares/auth");

app.post("/api/v1/auth/register", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ email และ password",
      },
    });
  }

  try {
    const passwordHash = await hashPassword(password);
    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'student')",
      [email, passwordHash],
    );

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      data: { id: result.insertId, email, role: "student" },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: { code: "DUPLICATE_EMAIL", message: "อีเมลนี้มีอยู่ในระบบแล้ว" },
      });
    }
    next(err);
  }
});

app.post("/api/v1/auth/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ email และ password",
      },
    });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const user = rows[0];
    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const token = generateToken(user);
    res.status(200).json({ message: "เข้าสู่ระบบสำเร็จ", token });
  } catch (err) {
    next(err);
  }
});

app.get("/api/v1/auth/me", authenticateToken, (req,res) =>{
  res.status(200).json({ message: "สำเร็จ", data: req.user });
});

// 404: ไม่พบ route ที่ร้องขอ (ต้องอยู่หลัง route ทั้งหมด)
app.use((req, res) => {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "ไม่พบเส้นทางที่ร้องขอ" },
  });
});

// Error-handling middleware (ต้องมีพารามิเตอร์ 4 ตัวเสมอ)
app.use((err, req, res, next) => {
  console.error(err.stack);
  // ใช้ err.status/err.statusCode หากมี (เช่น PayloadTooLargeError จาก express.json ที่ส่งมาเป็น 413)
  // เพื่อไม่ให้ error ที่มีรหัสสถานะของตัวเองถูกกลบด้วย 500 เสมอไป
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : err.type || "ERROR",
      message: statusCode === 500 ? "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ" : err.message,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server กำลังทำงานที่พอร์ต ${PORT} (${process.env.NODE_ENV})`);
});
