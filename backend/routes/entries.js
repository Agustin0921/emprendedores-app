const router = require("express").Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "superclave";

function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No autorizado - Token faltante" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No autorizado - Formato de token inválido" });
    }

    jwt.verify(token, SECRET, (err, user) => {
      if (err) {
        console.error("❌ Error verificando token:", err);
        return res.status(401).json({ error: "Token inválido" });
      }
      req.user = user;
      next();
    });
  } catch (error) {
    console.error("❌ Error en middleware auth:", error);
    return res.status(500).json({ error: "Error de autenticación" });
  }
}

router.post("/", auth, async (req, res) => {
  const { type, amount, note } = req.body;
  try {
    await db.query(
      "INSERT INTO entries (user_id, type, amount, note) VALUES ($1, $2, $3, $4)",
      [req.user.id, type, amount, note]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("Error en entries:", err);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM entries WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error en entries:", err);
    res.status(500).json({ error: "Error en la base de datos" });
  }
});

module.exports = router;