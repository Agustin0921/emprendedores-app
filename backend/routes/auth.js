const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Manejar JWT_SECRET faltante
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("❌ ADVERTENCIA: JWT_SECRET no está definido en las variables de entorno");
  // Usar una clave por defecto solo para desarrollo
  const defaultSecret = "clave_temporal_para_desarrollo_cambiar_en_produccion";
  console.warn("⚠️ Usando clave temporal. AGREGA JWT_SECRET en Railway.");
}

// Registro
router.post("/register", (req, res) => {
  const { email, password, username } = req.body;

  console.log("📝 Intentando registrar usuario:", { email, username });

  // Validaciones básicas
  if (!email || !password || !username) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error("❌ Error hashing password:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    db.query(
      "INSERT INTO users (email, password, username) VALUES ($1, $2, $3)",
      [email, hash, username],
      (err, result) => {
        if (err) {
          console.error("❌ Error en registro:", err);
          if (err.code === '23505') { // Código de duplicado en PostgreSQL
            return res.status(400).json({ error: "El email ya está registrado" });
          }
          return res.status(500).json({ error: "Error en la base de datos" });
        }
        // ...
      }
    );
  });
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  console.log("🔐 Intentando login para:", email);

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  db.query("SELECT * FROM users WHERE email = ?", [email], (err, rows) => {
    if (err) {
      console.error("❌ Error en consulta login:", err);
      return res.status(500).json({ error: "Error interno del servidor" });
    }

    if (rows.length === 0) {
      console.log("❌ Usuario no encontrado:", email);
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const user = rows[0];

    bcrypt.compare(password, user.password, (err, ok) => {
      if (err) {
        console.error("❌ Error comparando passwords:", err);
        return res.status(500).json({ error: "Error interno del servidor" });
      }

      if (!ok) {
        console.log("❌ Contraseña incorrecta para:", email);
        return res.status(401).json({ error: "Email o contraseña incorrectos" });
      }

      // Generar token
      const token = jwt.sign(
        { 
          id: user.id, 
          username: user.username,
          email: user.email 
        },
        SECRET || defaultSecret,
        { expiresIn: "7d" }
      );

      console.log("✅ Login exitoso para:", email);
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

// Ruta para verificar variables de entorno (solo para desarrollo)
router.get("/debug", (req, res) => {
  res.json({
    jwt_secret_defined: !!process.env.JWT_SECRET,
    mysql_host: process.env.MYSQLHOST ? "✅ Definido" : "❌ Faltante",
    mysql_user: process.env.MYSQLUSER ? "✅ Definido" : "❌ Faltante", 
    mysql_database: process.env.MYSQLDATABASE ? "✅ Definido" : "❌ Faltante",
    mysql_port: process.env.MYSQLPORT ? "✅ Definido" : "❌ Faltante"
  });
});

module.exports = router;