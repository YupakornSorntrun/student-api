// query-parser.test.js
// Unit Test: ทดสอบ parsePagination และ parseSort middleware โดยตรง

const { parsePagination, parseSort } = require("./middlewares/query-parser");

describe("parsePagination", () => {
  test("ควรใช้ค่า default เมื่อไม่ส่ง query params", () => {
    const req = { query: {} };
    const res = {};
    const next = jest.fn();

    parsePagination(req, res, next);

    expect(req.pagination.page).toBe(1);
    expect(req.pagination.limit).toBe(10);
    expect(req.pagination.offset).toBe(0);
    expect(next).toHaveBeenCalled();
  });

  test("ควรคำนวณ offset ถูกต้องเมื่อระบุ page=2 limit=5", () => {
    const req = { query: { page: "2", limit: "5" } };
    const res = {};
    const next = jest.fn();

    parsePagination(req, res, next);

    expect(req.pagination.page).toBe(2);
    expect(req.pagination.limit).toBe(5);
    expect(req.pagination.offset).toBe(5); // (2-1) * 5 = 5
    expect(next).toHaveBeenCalled();
  });

  test("ควรจำกัด limit ไม่เกิน 100", () => {
    const req = { query: { limit: "999" } };
    const res = {};
    const next = jest.fn();

    parsePagination(req, res, next);

    expect(req.pagination.limit).toBe(100);
  });

  test("ควรใช้ page = 1 เมื่อส่ง page เป็นค่าลบ", () => {
    const req = { query: { page: "-5" } };
    const res = {};
    const next = jest.fn();

    parsePagination(req, res, next);

    expect(req.pagination.page).toBe(1);
  });
});

describe("parseSort", () => {
  test("ควรใช้ค่า default sort=id order=ASC เมื่อไม่ส่ง query params", () => {
    const req = { query: {} };
    const res = {};
    const next = jest.fn();

    parseSort(req, res, next);

    expect(req.sort.field).toBe("id");
    expect(req.sort.order).toBe("ASC");
    expect(next).toHaveBeenCalled();
  });

  test("ควรใช้ sort field ที่อนุญาตได้ เช่น name", () => {
    const req = { query: { sort: "name" } };
    const res = {};
    const next = jest.fn();

    parseSort(req, res, next);

    expect(req.sort.field).toBe("name");
  });

  test("ควร fallback เป็น id เมื่อส่ง sort field ที่ไม่อนุญาต", () => {
    const req = { query: { sort: "password" } };
    const res = {};
    const next = jest.fn();

    parseSort(req, res, next);

    expect(req.sort.field).toBe("id");
  });

  test("ควรใช้ DESC เมื่อระบุ order=desc", () => {
    const req = { query: { order: "desc" } };
    const res = {};
    const next = jest.fn();

    parseSort(req, res, next);

    expect(req.sort.order).toBe("DESC");
  });
});
