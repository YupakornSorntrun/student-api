const express = require("express");
const v2Router = express.Router();
const pool = require("../db");

v2Router.get("/students", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM students"
    );

    res.status(200).json({
      items: rows,
      count: rows.length,
    });

  } catch (err) {
    next(err);
  }
});

module.exports = v2Router;