const express = require("express");
const cors = require("cors");

const app = express();

// CORS
app.use(cors({
    origin: [
        "https://emprendedores-app-omega.vercel.app",
        "http://localhost:3000",
        "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.options('*', cors());
app.use(express.json());

// Debug: Verificar que las rutas se cargan
console.log("🔄 Cargando rutas...");

try {
  console.log("✅ Cargando auth...");
  app.use("/auth", require("./routes/auth"));
  console.log("✅ Auth cargado");
} catch (error) {
  console.error("❌ Error cargando auth:", error);
}

try {
  console.log("✅ Cargando entries...");
  app.use("/entries", require("./routes/entries"));
  console.log("✅ Entries cargado");
} catch (error) {
  console.error("❌ Error cargando entries:", error);
}

try {
  console.log("✅ Cargando inventory...");
  app.use("/inventory", require("./routes/inventory"));
  console.log("✅ Inventory cargado");
} catch (error) {
  console.error("❌ Error cargando inventory:", error);
}

// Ruta de health
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server funcionando en Render",
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`🎉 Servidor corriendo en puerto ${PORT}`);
});