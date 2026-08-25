const express = require("express");
const router = express.Router();
const sendError = require("../sendError"); // นำเข้าโมดูล sendError
const pool = require("../db")


const { authenticateToken, authorizeRole } = require("../middlewares/auth");


/* 1. GET: ดึงรายการนักศึกษาทั้งหมด
    - รองรับการกรองข้อมูลตาม major ผ่าน query string
    เช่น /students?major=วิทยาการคอมพิวเตอร์ */

router.get("/", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students");
    res.status(200).json({ message: "สำเร็จ", data: rows });
  } catch (err) {
    next(err);
  }
});

/* 2. GET: ดึงข้อมูลนักศึกษารายบุคคลตาม id 
    - รองรับ ?include=courses
    */
router.get("/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนักศึกษา" },
      });
    }

    res.status(200).json({ message: "สำเร็จ", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

 // แบบฝึกหัด 1 -- GET: ใช้คำสั่ง SQL แบบ JOIN เพื่อดึงรายชื่อรายวิชาทั้งหมดที่นักศึกษาคนนั้นลงทะเบียน
router.get("/:id/courses", async (req, res, next) => {
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

/* 3. POST: เพิ่มข้อมูลนักศึกษาใหม่
    - ตรวจสอบ name ต้องเป็นข้อความที่มีความยาวอย่างน้อย 2 ตัวอักษร
    - ถ้ามีนักศึกษาชื่อซ้ำกับข้อมูลที่มีอยู่แล้ว ให้ตอบกลับด้วย Status Code 409 (Conflict) พร้อมข้อความแจ้งเตือน
*/
/*router.post("/", async (req, res, next) => {
  const { name, major, email } = req.body;

  if (!name || !major || !email) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "กรุณาระบุข้อมูลให้ครบถ้วน" },
    });
  }

  try {
    const [result] = await pool.query(
      "INSERT INTO students (name, major, email) VALUES (?, ?, ?)",
      [name, major, email]
    );
    res.status(201).json({
      message: "เพิ่มข้อมูลสำเร็จ",
      data: { id: result.insertId, name, major, email },
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
*/

// POST: Implement Route ลงทะเบียนเรียนด้วย Transaction 
router.post("/:id/enrollments", async (req, res, next) => {
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
        error: { code: "COURSE_NOT_FOUND", message: "ไม่พบรายวิชาที่ระบุ" },
      });
    }

    if (courseRows[0].seat_available <= 0) {
      await connection.rollback();
      return res.status(409).json({
        error: { code: "SEAT_FULL", message: "ที่นั่งเต็มแล้ว" },
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
    res.status(201).json({ message: "ลงทะเบียนสำเร็จ" });
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

//แบบฝึกหัด 2 -- POST: ทดสอบการลงทะเบียนแบบไม่ใช้ Transaction (Unsafe)
/*  - หาก INSERT สำเร็จ แต่ UPDATE เกิดข้อผิดพลาด
    - ข้อมูลจะไม่สอดคล้องกัน เพราะไม่มี Transaction/rollback ย้อนกลับ 

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

// 4. PUT: แก้ไขข้อมูลนักศึกษาทั้งระเบียน
/*router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, major } = req.body;
  const student = students.find((s) => s.id === id);

  if (!student) {
    return sendError(res, 404, "STUDENT_NOT_FOUND", "ไม่พบข้อมูลนักศึกษา");
  }

  if (!name || !major) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณาระบุ major ให้ครบถ้วน");
  }

  // ถ้ามีชื่อในidหนึ่ง แล้วจะเพิ่มชื่อเหมือนกัน จะขึ้นแจ้งเตือนว่ามีชื่อนี้แล้ว และ ถ้าชื่อคนนั้น id ไม่เท่ากับ id ที่จะแก้ จะขึ้นแจ้งเตือนว่ามีชื่อนี้แล้ว เช่น id:1 name:สมชาย แล้ว id ที่จะแก้เป็น id:3 name:สมชาย (แจ้ง409)
  
  const checkStudent = students.find((s) => s.name === name && s.id !== id);

  if (checkStudent) {
    return sendError(res, 409, "DUPLICATE_NAME", "นักศึกษาชื่อนี้มีอยู่แล้ว");
  }

  student.name = name;
  student.major = major;

  res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: student });
});*/

// 5. PATCH: รองรับการแก้ไขข้อมูลบางส่วน ซึ่งแตกต่างจาก PUT ที่ต้องส่งข้อมูลครบทุกฟิลด์
router.patch("/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if(!student){
    return sendError(res, 404, "STUDENT_NOT_FOUND", "ไม่พบข้อมูลนักศึกษา");
  }

  // อัปเดตเฉพาะฟิลด์ที่ส่งมา ฟิลด์อื่นคงค่าเดิมไว้
  const {name, major, email } = req.body;
  if (name !== undefined) student.name = name;
  if (major !== undefined) student.major = major;
  if (email !== undefined) student.email = email;

  res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: student});
});


// 6. DELETE: ลบข้อมูลนักศึกษา
router.delete("/:id",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res, next) => {
    try {
      const [result] = await pool.query("DELETE FROM students WHERE id = ?", [
        req.params.id,
      ]);
      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนิสิต" },
        });
      }
      res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });
    } catch (err) {
      next(err);
    }
  },
);


//แบบฝึกหัด 3 -- DELETE: ลบระเบียนใน enrollments และเพิ่มค่า seat_available ของรายวิชานั้นกลับคืน 1 ที่นั่ง
router.delete("/:id/enrollments/:courseId", async (req, res, next) => {
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

    // ยืนยันการเปลี่ยนแปลงทั้งหมด
    await connection.commit();

    res.status(200).json({
      message: "ยกเลิกการลงทะเบียนสำเร็จ",
    });
  } catch (err) {
    // ถ้าเกิดข้อผิดพลาด ให้ย้อนกลับทั้งการ DELETE และ UPDATE
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});



module.exports = router;
