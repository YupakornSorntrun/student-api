const express = require("express");
const v1Router = express.Router();
const sendError = require("../sendError");
const pool = require("../db");
const { redisClient } = require("../cache");
const { parsePagination, parseSort } = require("../middlewares/query-parser");

const {
  authenticateToken,
  authorizeRole,
} = require("../middlewares/auth");

const deprecationMiddleware = require("../middlewares/deprecation");

v1Router.use(deprecationMiddleware);

/* =====================================================
   1. GET: ดึงรายการนักศึกษาทั้งหมด
   ===================================================== */
v1Router.get(
  "/students",
  parsePagination,
  parseSort,
  async (req, res, next) => {
    const { major } = req.query;
    const { page, limit, offset } = req.pagination;
    const { field, order } = req.sort;

    const cacheKey =
      `students:page=${page}` +
      `:limit=${limit}` +
      `:major=${major || ""}` +
      `:sort=${field}` +
      `:order=${order}`;

    try {
      // =========================
      // 1. Cache Hit
      // =========================
      const cached = await redisClient.get(cacheKey);

      if (cached) {
        return res.status(200).json({
          message: "สำเร็จ (จาก cache)",
          ...JSON.parse(cached),
        });
      }

      // =========================
      // 2. Query Database
      // =========================
      let baseQuery = "SELECT * FROM students";
      let countQuery = "SELECT COUNT(*) AS total FROM students";

      const params = [];

      if (major) {
        baseQuery += " WHERE major = ?";
        countQuery += " WHERE major = ?";
        params.push(major);
      }

      baseQuery += ` ORDER BY ${field} ${order} LIMIT ? OFFSET ?`;

      const [rows] = await pool.query(
        baseQuery,
        [...params, limit, offset]
      );

      const [[{ total }]] = await pool.query(
        countQuery,
        params
      );

      const responseData = {
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };

      // =========================
      // 3. Save Cache
      // =========================
      await redisClient.set(
        cacheKey,
        JSON.stringify(responseData),
        {
          EX: 60,
        }
      );

      // =========================
      // 4. Response
      // =========================
      res.status(200).json({
        message: "สำเร็จ (จากฐานข้อมูล)",
        ...responseData,
      });
    } catch (err) {
      next(err);
    }
  }
);

/* =====================================================
   2. GET: ดึงข้อมูลนักศึกษารายบุคคลตาม id
   ===================================================== */
v1Router.get("/students/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM students WHERE id = ?",
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "NOT_FOUND",
          message: "ไม่พบข้อมูลนักศึกษา",
        },
      });
    }

    res.status(200).json({
      message: "สำเร็จ",
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
});


/* =====================================================
   แบบฝึกหัด 1
   GET: ดึงรายวิชาที่นักศึกษาลงทะเบียน
   ===================================================== */
v1Router.get("/students/:id/courses", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT courses.*
       FROM courses
       JOIN enrollments ON courses.id = enrollments.course_id
       WHERE enrollments.student_id = ?`,
      [req.params.id]
    );

    res.status(200).json({
      message: "สำเร็จ",
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});


v1Router.get("/courses", async (req, res, next) => {
  const cacheKey = "courses:all";

  try {
    // 1. ตรวจสอบ Cache ก่อน
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      return res.status(200).json({
        message: "สำเร็จ (จาก cache)",
        data: JSON.parse(cached),
      });
    }

    // 2. ถ้าไม่มี Cache → Query Database
    const [rows] = await pool.query("SELECT * FROM courses");

    // 3. เก็บข้อมูลลง Redis
    await redisClient.set(cacheKey, JSON.stringify(rows), {
      EX: 120,
    });

    // 4. ส่งข้อมูลกลับ
    res.status(200).json({
      message: "สำเร็จ (จากฐานข้อมูล)",
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});


/* =====================================================
   3. POST: เพิ่มข้อมูลนักศึกษาใหม่
   ===================================================== */
v1Router.post("/students", async (req, res, next) => {
  const { name, major, email } = req.body;

  if (!name || !major || !email) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุข้อมูลให้ครบถ้วน",
      },
    });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO students (name, major, email) VALUES (?, ?, ?)",
      [name, major, email]
    );

    await redisClient.del("students:all"); // ลบ cache ของรายการนักศึกษาทั้งหมด เพื่อให้ข้อมูลใหม่ถูกดึงจากฐานข้อมูลครั้งถัดไป

    res.status(201).json({
      message: "เพิ่มข้อมูลสำเร็จ",
      data: {
        id: result.insertId,
        name,
        major,
        email,
      },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: "อีเมลนี้มีอยู่ในระบบแล้ว",
        },
      });
    }

    next(err);
  }
});


/* =====================================================
   POST: ลงทะเบียนเรียนด้วย Transaction
   ===================================================== */
v1Router.post("/students/:id/enrollments", async (req, res, next) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [courseRows] = await connection.query(
      "SELECT * FROM courses WHERE id = ? FOR UPDATE",
      [courseId]
    );

    if (courseRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: {
          code: "COURSE_NOT_FOUND",
          message: "ไม่พบรายวิชาที่ระบุ",
        },
      });
    }

    if (courseRows[0].seat_available <= 0) {
      await connection.rollback();

      return res.status(409).json({
        error: {
          code: "SEAT_FULL",
          message: "ที่นั่งเต็มแล้ว",
        },
      });
    }

    await connection.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, courseId]
    );

    await connection.query(
      "UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?",
      [courseId]
    );

    await connection.commit();

    res.status(201).json({
      message: "ลงทะเบียนสำเร็จ",
    });

  } catch (err) {
    await connection.rollback();

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "ALREADY_ENROLLED",
          message: "นักศึกษาลงทะเบียนรายวิชานี้ไปแล้ว",
        },
      });
    }

    next(err);
  } finally {
    connection.release();
  }
});


/* =====================================================
   แบบฝึกหัด 2 (สัปดาห์ก่อน)
   POST: ทดสอบการลงทะเบียนแบบไม่ใช้ Transaction
   ===================================================== */
/*
router.post("/:id/enrollments-unsafe", async (req, res, next) => {
  const studentId = req.params.id;
  const { courseId } = req.body;

  try {
    const [courseRows] = await pool.query(
      "SELECT * FROM courses WHERE id = ?",
      [courseId]
    );

    if (courseRows.length === 0) {
      return res.status(404).json({
        error: {
          code: "COURSE_NOT_FOUND",
          message: "ไม่พบรายวิชาที่ระบุ",
        },
      });
    }

    if (courseRows[0].seat_available <= 0) {
      return res.status(409).json({
        error: {
          code: "SEAT_FULL",
          message: "ที่นั่งเต็มแล้ว",
        },
      });
    }

    await pool.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, courseId]
    );

    await pool.query(
      "UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?",
      [courseId]
    );

    res.status(201).json({
      message: "ลงทะเบียนสำเร็จ",
    });

  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "ALREADY_ENROLLED",
          message: "นักศึกษาลงทะเบียนรายวิชานี้ไปแล้ว",
        },
      });
    }

    next(err);
  }
});
*/


/* =====================================================
   4. PUT: แก้ไขข้อมูลนักศึกษาทั้งระเบียน

   แบบฝึกหัดที่ 2:
   จำกัดให้ผู้ใช้แก้ไขได้เฉพาะข้อมูลของตนเอง

   - Query ข้อมูลนักศึกษาก่อน
   - เปรียบเทียบ req.user.id กับ student.user_id
   - ถ้าไม่ใช่เจ้าของ และไม่ใช่ admin → 403
   ===================================================== */
v1Router.put(
  "/students/:id",
  authenticateToken,
  async (req, res, next) => {
    const studentId = req.params.id;
    const { name, major, email } = req.body;

    try {
      // 1. ค้นหาข้อมูลนักศึกษาก่อน
      const [rows] = await pool.query(
        "SELECT * FROM students WHERE id = ?",
        [studentId]
      );

      // 2. ตรวจสอบว่าพบข้อมูลหรือไม่
      if (rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "STUDENT_NOT_FOUND",
            message: "ไม่พบข้อมูลนักศึกษา",
          },
        });
      }

      const student = rows[0];

      // 3. ตรวจสอบสิทธิ์
      // ถ้าไม่ใช่เจ้าของข้อมูล และไม่ใช่ admin
      if (
        req.user.id !== student.user_id &&
        req.user.role !== "admin"
      ) {
        return res.status(403).json({
          error: {
            code: "FORBIDDEN",
            message: "คุณไม่มีสิทธิ์แก้ไขข้อมูลนักศึกษาคนนี้",
          },
        });
      }

      // 4. ตรวจสอบข้อมูลที่ส่งมา
      if (!name || !major || !email) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "กรุณาระบุ name, major และ email ให้ครบถ้วน",
          },
        });
      }

      // 5. อัปเดตข้อมูล
      await pool.query(
        `UPDATE students
         SET name = ?, major = ?, email = ?
         WHERE id = ?`,
        [name, major, email, studentId]
      );

      // 6. ส่งผลลัพธ์
      res.status(200).json({
        message: "แก้ไขข้อมูลสำเร็จ",
        data: {
          id: Number(studentId),
          name,
          major,
          email,
          user_id: student.user_id,
        },
      });

    } catch (err) {

      // ตรวจสอบ email ซ้ำ
      if (err.code === "ER_DUP_ENTRY") {
        return res.status(409).json({
          error: {
            code: "DUPLICATE_EMAIL",
            message: "อีเมลนี้มีอยู่ในระบบแล้ว",
          },
        });
      }

      next(err);
    }
  }
);


/* =====================================================
   5. PATCH: แก้ไขข้อมูลบางส่วน

   หมายเหตุ:
   เปลี่ยนให้ใช้ MySQL แทน students.find()
   ===================================================== */
v1Router.patch("/students/:id", async (req, res, next) => {
  const studentId = req.params.id;
  const { name, major, email } = req.body;

  try {
    // ตรวจสอบว่ามีนักศึกษาหรือไม่
    const [rows] = await pool.query(
      "SELECT * FROM students WHERE id = ?",
      [studentId]
    );

    if (rows.length === 0) {
      return sendError(
        res,
        404,
        "STUDENT_NOT_FOUND",
        "ไม่พบข้อมูลนักศึกษา"
      );
    }

    const student = rows[0];

    // ใช้ค่าเดิม หากไม่ได้ส่งฟิลด์นั้นมา
    const updatedName =
      name !== undefined ? name : student.name;

    const updatedMajor =
      major !== undefined ? major : student.major;

    const updatedEmail =
      email !== undefined ? email : student.email;

    // อัปเดตข้อมูล
    await pool.query(
      `UPDATE students
       SET name = ?, major = ?, email = ?
       WHERE id = ?`,
      [
        updatedName,
        updatedMajor,
        updatedEmail,
        studentId,
      ]
    );

    res.status(200).json({
      message: "แก้ไขข้อมูลสำเร็จ",
      data: {
        id: Number(studentId),
        name: updatedName,
        major: updatedMajor,
        email: updatedEmail,
      },
    });

  } catch (err) {

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: "อีเมลนี้มีอยู่ในระบบแล้ว",
        },
      });
    }

    next(err);
  }
});


/* =====================================================
   6. DELETE: ลบข้อมูลนักศึกษา
   อนุญาตเฉพาะ admin
   ===================================================== */
v1Router.delete(
  "/students/:id",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res, next) => {
    try {
      const [result] = await pool.query(
        "DELETE FROM students WHERE id = ?",
        [req.params.id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "ไม่พบข้อมูลนิสิต",
          },
        });
      }

      res.status(200).json({
        message: "ลบข้อมูลสำเร็จ",
      });

    } catch (err) {
      next(err);
    }
  }
);


/* =====================================================
   แบบฝึกหัด 3
   DELETE: ยกเลิกการลงทะเบียน
   และคืนจำนวนที่นั่งกลับ 1 ที่นั่ง
   ===================================================== */
v1Router.delete(
  "/students/:id/enrollments/:courseId",
  async (req, res, next) => {
    const studentId = req.params.id;
    const courseId = req.params.courseId;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // ลบข้อมูลการลงทะเบียน
      const [result] = await connection.query(
        "DELETE FROM enrollments WHERE student_id = ? AND course_id = ?",
        [studentId, courseId]
      );

      // ถ้าไม่พบข้อมูลการลงทะเบียน
      if (result.affectedRows === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: {
            code: "ENROLLMENT_NOT_FOUND",
            message: "ไม่พบข้อมูลการลงทะเบียน",
          },
        });
      }

      // เพิ่มจำนวนที่นั่งกลับ 1
      await connection.query(
        "UPDATE courses SET seat_available = seat_available + 1 WHERE id = ?",
        [courseId]
      );

      // ยืนยันการเปลี่ยนแปลง
      await connection.commit();

      res.status(200).json({
        message: "ยกเลิกการลงทะเบียนสำเร็จ",
      });

    } catch (err) {
      await connection.rollback();
      next(err);

    } finally {
      connection.release();
    }
  }
);


module.exports = v1Router;