const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Usar JWT_SECRET correctamente
const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("❌ ERROR CRÍTICO: JWT_SECRET no está definido");
  console.error("❌ Por favor configura JWT_SECRET en Render");
}

// Registro
router.post("/register", async (req, res) => {
  const { email, password, username } = req.body;

  console.log("📝 Intentando registrar usuario:", { email, username });

  if (!email || !password || !username) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    
    const result = await db.query(
      "INSERT INTO users (email, password, username) VALUES ($1, $2, $3) RETURNING id",
      [email, hash, username]
    );

    console.log("✅ Usuario registrado exitosamente, ID:", result.rows[0].id);
    res.json({ 
      success: true, 
      message: "Usuario creado exitosamente. Ahora puedes iniciar sesión." 
    });
  } catch (err) {
    console.error("❌ Error en registro:", err);
    if (err.code === '23505') {
      return res.status(400).json({ error: "El email ya está registrado" });
    }
    return res.status(500).json({ error: "Error en la base de datos: " + err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  console.log("🔐 Intentando login para:", email);

  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña son requeridos" });
  }

  try {
    const result = await db.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      console.log("❌ Usuario no encontrado:", email);
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      console.log("❌ Contraseña incorrecta para:", email);
      return res.status(401).json({ error: "Email o contraseña incorrectos" });
    }

    // Verificar que JWT_SECRET esté definido
    if (!SECRET) {
      console.error("❌ JWT_SECRET no definido al generar token");
      return res.status(500).json({ error: "Error de configuración del servidor" });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email 
      },
      SECRET,
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
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ error: "Error interno del servidor: " + err.message });
  }
});

// Ruta de debug mejorada
router.get("/debug", async (req, res) => {
  try {
    const dbResult = await db.query("SELECT current_database(), version()");
    
    res.json({
      jwt_secret_defined: !!process.env.JWT_SECRET,
      database_url_defined: !!process.env.DATABASE_URL,
      node_env: process.env.NODE_ENV || 'not set',
      database: dbResult.rows[0],
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.json({
      error: "Error conectando a la base de datos: " + err.message,
      jwt_secret_defined: !!process.env.JWT_SECRET,
      database_url_defined: !!process.env.DATABASE_URL
    });
  }
});

module.exports = router;