const express = require("express");
const router = express.Router();
const db = require("../config/db");

// Отримати всі логи
router.get("/", async (req, res) => {
  try {
    const [logs] = await db.query("SELECT * FROM Logs");
    res.json({ success: true, logs });
  } catch (error) {
    console.error("Error fetching logs:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Отримати всі логи для конкретного датчика
router.get("/sensor/:sensorId", async (req, res) => {
  const sensorId = req.params.sensorId;

  try {
    const [logs] = await db.query("SELECT * FROM Logs WHERE sensor_id = ?", [
      sensorId,
    ]);
    res.json({ success: true, logs });
  } catch (error) {
    console.error("Error fetching logs for sensor:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Створити новий лог
router.post("/", async (req, res) => {
  const { sensor_id, message } = req.body;

  try {
    const [result] = await db.query(
      "INSERT INTO Logs (sensor_id, message) VALUES (?, ?)",
      [sensor_id, message]
    );
    res
      .status(201)
      .json({
        success: true,
        message: "Log created successfully",
        logId: result.insertId,
      });
  } catch (error) {
    console.error("Error creating log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Знайти лог за ID
router.get("/:id", async (req, res) => {
  const logId = req.params.id;

  try {
    const [log] = await db.query("SELECT * FROM Logs WHERE id = ?", [logId]);
    if (log.length === 0) {
      return res.status(404).json({ success: false, message: "Log not found" });
    }
    res.json({ success: true, log: log[0] });
  } catch (error) {
    console.error("Error fetching log by ID:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Видалити всі логи для конкретного датчика
router.delete("/sensor/:sensorId", async (req, res) => {
  const sensorId = req.params.sensorId;

  try {
    const [result] = await db.query("DELETE FROM Logs WHERE sensor_id = ?", [
      sensorId,
    ]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "No logs found for this sensor" });
    }

    res.json({
      success: true,
      message: `All logs for sensor ID ${sensorId} have been deleted`,
    });
  } catch (error) {
    console.error("Error deleting logs for sensor:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Видалити конкретний лог
router.delete("/:id", async (req, res) => {
  const logId = req.params.id;

  try {
    const [result] = await db.query("DELETE FROM Logs WHERE id = ?", [logId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Log not found" });
    }

    res.json({
      success: true,
      message: `Log with ID ${logId} has been deleted`,
    });
  } catch (error) {
    console.error("Error deleting log:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
