const router = require("express").Router();
const db = require("../db");
const jwt = require("jsonwebtoken");
const SECRET = "superclave";

function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.json({ error: "Token inválido" });
    req.user = user;
    next();
  });
}

router.post("/", auth, (req, res) => {
  const { name, qty, price } = req.body;

  db.query(
    "INSERT INTO inventory (user_id, name, qty, price) VALUES (?, ?, ?, ?)",
    [req.user.id, name, qty, price],
    (err) => {
      if (err) return res.json({ error: err });
      res.json({ success: true });
    }
  );
});

router.get("/", auth, (req, res) => {
  db.query(
    "SELECT * FROM inventory WHERE user_id = ?",
    [req.user.id],
    (err, rows) => {
      if (err) return res.json({ error: err });
      res.json(rows);
    }
  );
});

// ELIMINAR ITEM
router.delete("/:id", auth, (req, res) => {
  db.query(
    "DELETE FROM inventory WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
    (err) => {
      if (err) return res.json({ error: "No se pudo eliminar" });
      res.json({ success: true });
    }
  );
});


module.exports = router;
