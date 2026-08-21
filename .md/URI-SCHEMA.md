# ตาราง URI Schema (ของโปรเจกต์ `student-api` ทั้งหมด)


## 1. routes students.js 

| Method | URI | คำอธิบาย | Status Code ที่เป็นไปได้ |
| --- | --- | --- | --- |
| GET | `/api/v1/students` | ดึงรายชื่อนักศึกษาทั้งหมด | 200 |
| GET | `/api/v1/students/{id}` | ดึงข้อมูลนักศึกษารายบุคคล (รองรับ `?include=courses`) | 200, 404 |
| POST | `/api/v1/students` | เพิ่มนักศึกษาใหม่ | 201, 400, 409 |
| PUT | `/api/v1/students/{id}` | แก้ไขข้อมูลนักศึกษาทั้งระเบียน | 200, 400, 404 |
| PATCH | `/api/v1/students/{id}` | แก้ไขข้อมูลนักศึกษาบางส่วน | 200, 404 |
| DELETE | `/api/v1/students/{id}` | ลบนักศึกษา | 200, 404 |


## 2. routes courses.js 

| Method | URI | คำอธิบาย | Status Code ที่เป็นไปได้ |
| --- | --- | --- | --- |
| GET | `/api/v1/courses` | ดึงรายวิชาทั้งหมด | 200 |
| GET | `/api/v1/courses/{id}` | ดึงข้อมูลรายวิชาตามรหัสวิชา | 200, 404 |
| POST | `/api/v1/courses` | เพิ่มรายวิชาใหม่ | 201, 400, |
| PUT | `/api/v1/courses/{id}` | แก้ไขข้อมูลรายวิชาทั้งระเบียน | 200, 400, 404 |
| DELETE | `/api/v1/courses/{id}` | ลบรายวิชา | 200, 404 |
