const router = require("express").Router();
const db = require("../db");
const jwt = require("jsonwebtoken");

const SECRET = "superclave";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.json({ error: "No autorizado" });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

router.post("/", auth, (req, res) => {
  const { type, amount, note } = req.body;
  db.query(
    "INSERT INTO entries (user_id, type, amount, note) VALUES (?, ?, ?, ?)",
    [req.user.id, type, amount, note],
    (err) => {
      if (err) return res.json({ error: err });
      res.json({ success: true });
    }
  );
});

router.get("/", auth, (req, res) => {
  db.query(
    "SELECT * FROM entries WHERE user_id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.json({ error: err });
      res.json(rows);
    }
  );
});

module.exports = router;
