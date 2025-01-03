const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Отримати всі акваріуми
router.get("/", async (req, res) => {
  try {
    const [aquariums] = await db.query("SELECT * FROM Aquariums");
    res.json({ success: true, aquariums });
  } catch (error) {
    console.error("Error fetching aquariums:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отримати конкретний акваріум за ID
router.get("/:id", async (req, res) => {
  const aquariumId = req.params.id;

  try {
    const [aquarium] = await db.query("SELECT * FROM Aquariums WHERE id = ?", [
      aquariumId,
    ]);
    if (aquarium.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Aquarium not found" });
    }
    res.json({ success: true, aquarium: aquarium[0] });
  } catch (error) {
    console.error("Error fetching aquarium:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отримати всі акваріуми для конкретного користувача
router.get("/user/:userId", async (req, res) => {
  const userId = req.params.userId;

  try {
    const [aquariums] = await db.query(
      "SELECT * FROM Aquariums WHERE user_id = ?",
      [userId]
    );
    res.json({ success: true, aquariums });
  } catch (error) {
    console.error("Error fetching user aquariums:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Створити новий акваріум
router.post("/", async (req, res) => {
  const { user_id, name, specification } = req.body;

  try {
    const [result] = await db.query(
      "INSERT INTO Aquariums (user_id, name, specification) VALUES (?, ?, ?)",
      [user_id, name, specification]
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Aquarium created successfully",
        aquariumId: result.insertId,
      });
  } catch (error) {
    console.error("Error creating aquarium:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Оновити інформацію про акваріум
router.put("/:id", async (req, res) => {
  const aquariumId = req.params.id;
  const { name, specification } = req.body;

  try {
    const [result] = await db.query(
      "UPDATE Aquariums SET name = ?, specification = ? WHERE id = ?",
      [name, specification, aquariumId]
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Aquarium not found" });
    }

    res.json({ success: true, message: "Aquarium updated successfully" });
  } catch (error) {
    console.error("Error updating aquarium:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Видалити акваріум
router.delete("/:id", async (req, res) => {
  const aquariumId = req.params.id;

  try {
    const [result] = await db.query("DELETE FROM Aquariums WHERE id = ?", [
      aquariumId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Aquarium not found" });
    }

    res.json({
      success: true,
      message: `Aquarium with ID ${aquariumId} has been deleted`,
    });
  } catch (error) {
    console.error("Error deleting aquarium:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
