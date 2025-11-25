const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = "superclave";

// Registro
router.post("/register", (req, res) => {
  const { email, password, username } = req.body;   // ← AGREGADO

  bcrypt.hash(password, 10, (err, hash) => {
    db.query(
      "INSERT INTO users (email, password, username) VALUES (?, ?, ?)",
      [email, hash, username],   // ← AHORA SÍ EXISTE
      (err) => {
        if (err) return res.json({ error: "El usuario ya existe" });
        res.json({ success: true });
      }
    );
  });
});


// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
    if (rows.length === 0) return res.json({ error: "Credenciales inválidas" });

    const user = rows[0]; // ← aquí definimos "user"

    bcrypt.compare(password, user.password, (err, ok) => {
      if (!ok) return res.json({ error: "Contraseña incorrecta" });

      // TOKEN con username incluido
      const token = jwt.sign(
        { id: user.id, username: user.username }, // ← YA existe "user"
        SECRET,
        { expiresIn: "7d" }
      );

      res.json({ token });
    });
  });
});


module.exports = router;
