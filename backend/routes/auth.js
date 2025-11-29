const router = require("express").Router();
const db = require("../db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const SECRET = process.env.JWT_SECRET;
if (!SECRET) {
  console.error("❌ ERROR CRÍTICO: JWT_SECRET no está definido");
  console.error("❌ Por favor configura JWT_SECRET en Render");
}

// Registro - AGREGAR FECHA DE CREACIÓN
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
    const createdAt = new Date(); // Fecha actual del servidor
    
    const result = await db.query(
      "INSERT INTO users (email, password, username, created_at) VALUES ($1, $2, $3, $4) RETURNING id, created_at",
      [email, hash, username, createdAt]
    );

    console.log("✅ Usuario registrado exitosamente, ID:", result.rows[0].id);
    res.json({ 
      success: true, 
      message: "Usuario creado exitosamente. Ahora puedes iniciar sesión.",
      created_at: result.rows[0].created_at
    });
  } catch (err) {
    console.error("❌ Error en registro:", err);
    if (err.code === '23505') {
      return res.status(400).json({ error: "El email ya está registrado" });
    }
    return res.status(500).json({ error: "Error en la base de datos: " + err.message });
  }
});

// Login - INCLUIR FECHA DE REGISTRO EN EL TOKEN
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

    if (!SECRET) {
      console.error("❌ JWT_SECRET no definido al generar token");
      return res.status(500).json({ error: "Error de configuración del servidor" });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username,
        email: user.email,
        created_at: user.created_at.toISOString() // INCLUIR FECHA DE REGISTRO
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
        email: user.email,
        created_at: user.created_at.toISOString() // FECHA DE REGISTRO
      }
    });
  } catch (err) {
    console.error("❌ Error en login:", err);
    return res.status(500).json({ error: "Error interno del servidor: " + err.message });
  }
});

// Ruta para obtener información del usuario con fecha de registro
router.get("/profile", auth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT id, username, email, created_at FROM users WHERE id = $1",
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Usuario no encontrado" });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at.toISOString()
    });
  } catch (err) {
    console.error("❌ Error obteniendo perfil:", err);
    res.status(500).json({ error: "Error interno del servidor" });
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