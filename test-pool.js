require("dotenv").config();
const pool = require("./db");

async function testQuery(label) {
  const start = Date.now();

  try {
    await pool.query("SELECT * FROM courses");

    console.log(
      `${label}: สำเร็จ ใช้เวลา ${Date.now() - start} ms`
    );
  } catch (err) {
    console.log(`${label}: เกิดข้อผิดพลาด - ${err.message}`);
  }
}

async function main() {
  const start = Date.now();

  // ยิง query 20 ครั้งพร้อมกัน
  const requests = Array.from({ length: 20 }, (_, i) =>
    testQuery(`คำขอที่ ${i + 1}`)
  );

  await Promise.all(requests);

  console.log(`ใช้เวลารวม ${Date.now() - start} ms`);

  await pool.end();
}

main();