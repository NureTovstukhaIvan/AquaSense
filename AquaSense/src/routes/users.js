const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcrypt");

// Реєстрація користувача
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format" });
  }

  try {
    const [user] = await db.query("SELECT * FROM Users WHERE email = ?", [
      email,
    ]);
    if (user.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO Users (username, email, password) VALUES (?, ?, ?)",
      [username, email, hashedPassword]
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Error during user registration:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Авторизація користувача
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format" });
  }
  try {
    const [user] = await db.query("SELECT * FROM Users WHERE email = ?", [
      email,
    ]);
    if (user.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user[0].password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    res.json({
      success: true,
      message: "Login successful",
      user: { id: user[0].id, username: user[0].username },
    });
  } catch (error) {
    console.error("Error during user login:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отримання списку всіх користувачів
router.get("/", async (req, res) => {
  try {
    const [users] = await db.query(
      "SELECT id, username, email, created_at FROM Users"
    );
    res.json({ success: true, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отримання користувача за ID
router.get("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const [user] = await db.query(
      "SELECT id, username, email, created_at FROM Users WHERE id = ?",
      [userId]
    );
    if (user.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user: user[0] });
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Оновлення даних користувача
router.put("/:id", async (req, res) => {
  const userId = req.params.id;
  const { username, email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid email format" });
  }
  try {
    // Перевіряємо, чи користувач існує
    const [user] = await db.query("SELECT * FROM Users WHERE id = ?", [userId]);
    if (user.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    // Оновлюємо дані користувача
    const [result] = await db.query(
      "UPDATE Users SET username = ?, email = ? WHERE id = ?",
      [username, email, userId]
    );

    res.json({
      success: true,
      message: `User with ID ${userId} successfully updated`,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Видалення користувача
router.delete("/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const [user] = await db.query("SELECT * FROM Users WHERE id = ?", [userId]);
    if (user.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    await db.query("DELETE FROM Users WHERE id = ?", [userId]);
    res.json({
      success: true,
      message: `User with ID ${userId} has been deleted`,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
