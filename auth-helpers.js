const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const SALT_ROUNDS = 10;

//plainPassword คือที่เราพิมพ์เอง
async function hashPassword(plainPassword) {
    
  //ถ้าอยากรู้ว่าจะขึ้นยังไง มีตัวแปรรับ const addpassword 
  const hashedPassword = await bcrypt.hash(
    plainPassword,
    SALT_ROUNDS
  )

  console.log("Password ที่พิมพ์:", plainPassword);
  console.log("Password หลัง Hash:", hashedPassword);

  return hashedPassword;
}

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );
}

module.exports = { hashPassword, verifyPassword, generateToken };