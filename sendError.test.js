// sendError.test.js
// Unit Test: ทดสอบ sendError helper function โดยตรง (ไม่ผ่าน HTTP)

const sendError = require("./sendError");

describe("sendError", () => {
  test("ควรส่ง response ด้วย status code และโครงสร้าง error ที่ถูกต้อง", () => {
    // สร้าง mock ของ res object
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    sendError(res, 404, "NOT_FOUND", "ไม่พบข้อมูล");

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "ไม่พบข้อมูล" },
    });
  });

  test("ควรส่ง status 400 พร้อม VALIDATION_ERROR ได้", () => {
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    sendError(res, 400, "VALIDATION_ERROR", "กรุณาระบุข้อมูลให้ครบ");

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "VALIDATION_ERROR", message: "กรุณาระบุข้อมูลให้ครบ" },
    });
  });
});
