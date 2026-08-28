const express = require("express");
const router = express.Router();
const pool = require("../db");

const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("../auth-helpers");

const { authenticateToken } = require("../middlewares/auth");


// สมัครสมาชิก
router.post("/register", async (req, res, next) => {
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
      [email, passwordHash]
    );

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      data: {
        id: result.insertId,
        email,
        role: "student",
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


// Login
router.post("/login", async (req, res, next) => {
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
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const user = rows[0];

    const isPasswordValid = await verifyPassword(
      password,
      user.password_hash
    );

    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
    });

  } catch (err) {
    next(err);
  }
});

// เพิ่ม route ใหม่: เฉพาะผู้ที่ล็อกอินแล้วเท่านั้นที่ดูข้อมูลของตนเองได้
router.get("/me", authenticateToken, (req, res) => {
  res.status(200).json({ message: "สำเร็จ", data: req.user });
});


// เปลี่ยนรหัสผ่าน
router.patch(
  "/change-password",
  authenticateToken,
  async (req, res, next) => {

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "กรุณาระบุ oldPassword และ newPassword",
        },
      });
    }

    try {
      // ค้นหาผู้ใช้จาก id ใน JWT
      const [rows] = await pool.query(
        "SELECT * FROM users WHERE id = ?",
        [req.user.id]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "ไม่พบผู้ใช้งาน",
          },
        });
      }

      const user = rows[0];

      // ตรวจสอบรหัสผ่านเดิม
      const isPasswordValid = await verifyPassword(
        oldPassword,
        user.password_hash
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            code: "INVALID_PASSWORD",
            message: "รหัสผ่านเดิมไม่ถูกต้อง",
          },
        });
      }

      // เข้ารหัสรหัสผ่านใหม่
      const newPasswordHash = await hashPassword(newPassword);

      // อัปเดตฐานข้อมูล
      await pool.query(
        "UPDATE users SET password_hash = ? WHERE id = ?",
        [newPasswordHash, req.user.id]
      );

      res.status(200).json({
        message: "เปลี่ยนรหัสผ่านสำเร็จ",
      });

    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;