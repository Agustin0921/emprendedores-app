const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET || "superclave";

// Registro
router.post("/register", (req, res) => {
  const { email, password, username } = req.body;

  console.log("Registro attempt:", { email, username });

  // Validaciones básicas
  if (!email || !password || !username) {
    return res.status(400).json({ error: "Faltan campos requeridos" });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error("Error hashing password:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    db.query(
      "INSERT INTO users (email, password, username) VALUES (?, ?, ?)",
      [email, hash, username],
      (err, result) => {
        if (err) {
          console.error("Error en registro:", err);
          if (err.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: "El usuario ya existe" });
          }
          return res.status(500).json({ error: "Error en la base de datos" });
        }
        res.json({ success: true, message: "Usuario creado exitosamente" });
      }
    );
  });
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  console.log("Login attempt:", { email });

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
    if (err) {
      console.error("Error en consulta login:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: "Credenciales inválidas" });
    }

    const user = rows[0];

    bcrypt.compare(password, user.password, (err, ok) => {
      if (err) {
        console.error("Error comparando passwords:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (!ok) {
        return res.status(401).json({ error: "Contraseña incorrecta" });
      }

      // Generar token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          email: user.email 
        },
        SECRET,
        { expiresIn: "7d" }
      );

      res.json({ 
        success: true,
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  });
});

module.exports = router;