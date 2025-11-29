const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

// CORS más permisivo para producción
app.use(cors({
    origin: [
        "https://emprendedores-app-omega.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Accept"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Middleware para manejar preflight OPTIONS requests
app.options('*', cors());

app.use(express.json());

// Debug: Verificar que las rutas se cargan
console.log("🔄 Cargando rutas...");

// Cargar rutas con manejo de errores mejorado
try {
  console.log("✅ Cargando auth...");
  const authRoutes = require("./routes/auth");
  app.use("/auth", authRoutes);
  console.log("✅ Auth cargado correctamente");
} catch (error) {
  console.error("❌ Error cargando auth:", error);
}

try {
  console.log("✅ Cargando entries...");
  const entriesRoutes = require("./routes/entries");
  app.use("/entries", entriesRoutes);
  console.log("✅ Entries cargado correctamente");
} catch (error) {
  console.error("❌ Error cargando entries:", error);
}

try {
  console.log("✅ Cargando inventory...");
  const inventoryRoutes = require("./routes/inventory");
  app.use("/inventory", inventoryRoutes);
  console.log("✅ Inventory cargado correctamente");
} catch (error) {
  console.error("❌ Error cargando inventory:", error);
}

// Ruta de health mejorada
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server funcionando en Render",
    timestamp: new Date().toISOString(),
    routes: {
      auth: ["/auth/login", "/auth/register", "/auth/debug"],
      entries: ["/entries (GET, POST)", "/entries/:id (DELETE)"],
      inventory: ["/inventory (GET, POST)", "/inventory/:id (DELETE)"]
    }
  });
});

// Ruta para listar todas las rutas disponibles (útil para debug)
app.get("/debug/routes", (req, res) => {
  const routes = [
    "GET  /health",
    "GET  /debug/routes",
    "POST /auth/login",
    "POST /auth/register", 
    "GET  /auth/debug",
    "GET  /auth/profile",
    "GET  /entries",
    "POST /entries",
    "DELETE /entries/:id",
    "GET  /inventory",
    "POST /inventory",
    "DELETE /inventory/:id"
  ];
  res.json({ routes: routes });
});

// Manejo de rutas no encontradas
app.use("*", (req, res) => {
  res.status(404).json({ 
    error: "Ruta no encontrada",
    method: req.method,
    path: req.originalUrl,
    available_routes: [
      "/health",
      "/auth/login",
      "/auth/register",
      "/entries",
      "/inventory"
    ]
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🎉 Servidor corriendo en puerto ${PORT}`);
  console.log(`🌐 Health check disponible en: http://localhost:${PORT}/health`);
  console.log(`🔍 Rutas disponibles en: http://localhost:${PORT}/debug/routes`);
});