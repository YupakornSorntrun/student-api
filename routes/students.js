const express = require("express");
const router = express.Router();
const sendError = require("../sendError"); // นำเข้าโมดูล sendError

//ใช้ข้อมูลจากไฟล์ใน data
const students = require("../data/studentsData") // ตรง ../ --> ย้อนออกไป 1 ชั้นก่อน
const courses = require("../data/coursesData")

let nextId = 3;


/* 1. GET: ดึงรายการนักศึกษาทั้งหมด
    - รองรับการกรองข้อมูลตาม major ผ่าน query string
    เช่น /students?major=วิทยาการคอมพิวเตอร์ */

router.get("/", (req, res) => {
  const { major } = req.query;
  let filteredStudents = students;

  if (major) {
    filteredStudents = students.filter((s) => s.major === major);
    res.status(200).json({ message: "สำเร็จ", data: filteredStudents });
  }

  res.status(200).json({ message: "สำเร็จ", data: students });
});

/* 2. GET: ดึงข้อมูลนักศึกษารายบุคคลตาม id 
    - รองรับ ?include=courses
    */
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

    if (!student) {
    // ใช้ sendError แทน res.status().json()
    return sendError(res, 404, "STUDENT_NOT_FOUND", "ไม่พบข้อมูลนักศึกษา");
  }

  // ตรวจสอบว่าต้องการแนบข้อมูลรายวิชาหรือไม่
  if (req.query.include === "courses") {

  //คำสั่ง filter = เป็น array วนลูปทุกตัว กรองข้อมูล เงื่อนไขจริงส่งตัวนั้นกลับมา
  const studentCourses = courses.filter((c) =>
    student.courseIds.includes(c.id), //id=101 includes เอาไอดีจาก courseIds มาตรวจดูใน courses ว่ามีไหมเป็นจริงส่งข้อมูลกลับ
  );

    return res.status(200).json({
      message: "สำเร็จ",
      data: {
        ...student,
        courses: studentCourses,
      },
    });

  }

  res.status(200).json({ message: "สำเร็จ", data: student });
});


/* 3. POST: เพิ่มข้อมูลนักศึกษาใหม่
    - ตรวจสอบ name ต้องเป็นข้อความที่มีความยาวอย่างน้อย 2 ตัวอักษร
    - ถ้ามีนักศึกษาชื่อซ้ำกับข้อมูลที่มีอยู่แล้ว ให้ตอบกลับด้วย Status Code 409 (Conflict) พร้อมข้อความแจ้งเตือน
*/
router.post("/", (req, res) => {
  const { name, major, email} = req.body;

  if (
    typeof name !== "string" ||
    typeof major !== "string" ||
    typeof email !== "string" 
  )
  {
    return sendError(res,400,"VALIDATION_ERROR",
"ข้อมูลต้องเป็นข้อความทั้งหมด"
  );

  }

  if (!name || !major || !email) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณาระบุ name, major และ email ให้ครบถ้วน")

  }

   if (!name || name.length < 2) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณาระบุ name อย่างน้อย 2 ตัวอักษร");

  }

  if (name.length > 100) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณาระบุ name ไม่เกิน 100 ตัวอักษร");

  }

  const duplicated = students.find((s) => s.email === email);
  if (duplicated) {
    return sendError(res, 409, "DUPLICATE_EMAIL", "อีเมลนี้มีอยู่ในระบบแล้ว");
  
  }

  
  const checkStudent = students.find((s) => s.name === name);
  if (checkStudent) {
    return sendError(res, 409, "DUPLICATE_NAME", "นักศึกษาชื่อนี้มีอยู่แล้ว");
  }

  const newStudent = { id: nextId++, name, major, email };
  students.push(newStudent);

  res.status(201).json({ message: "เพิ่มข้อมูลสำเร็จ", data: newStudent });
});

// 4. PUT: แก้ไขข้อมูลนักศึกษาทั้งระเบียน
router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, major } = req.body;
  const student = students.find((s) => s.id === id);

  if (!student) {
    return sendError(res, 404, "STUDENT_NOT_FOUND", "ไม่พบข้อมูลนักศึกษา");
  }

  if (!name || !major) {
    return sendError(res, 400, "VALIDATION_ERROR", "กรุณาระบุ major ให้ครบถ้วน");
  }

  /* ถ้ามีชื่อในidหนึ่ง แล้วจะเพิ่มชื่อเหมือนกัน จะขึ้นแจ้งเตือนว่ามีชื่อนี้แล้ว
    และ ถ้าชื่อคนนั้น id ไม่เท่ากับ id ที่จะแก้ จะขึ้นแจ้งเตือนว่ามีชื่อนี้แล้ว

    เช่น id:1 name:สมชาย แล้ว id ที่จะแก้เป็น id:3 name:สมชาย (แจ้ง409)

  */
  const checkStudent = students.find((s) => s.name === name && s.id !== id);

  if (checkStudent) {
    return sendError(res, 409, "DUPLICATE_NAME", "นักศึกษาชื่อนี้มีอยู่แล้ว");
  }

  student.name = name;
  student.major = major;

  res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: student });
});

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
router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = students.findIndex((s) => s.id === id);

  if (index === -1) {
    return sendError(res, 404, "STUDENT_NOT_FOUND", "ไม่พบข้อมูลนักศึกษา");
  }

  students.splice(index, 1);

  res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });
});




module.exports = router;
