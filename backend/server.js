const express = require("express");
const cors = require("cors");
// ⚠️ QUITA: require("dotenv").config();

const app = express();

app.use(cors({
    origin: [
        "https://emprendedores-app-omega.vercel.app",
        /\.vercel\.app$/,
        "http://localhost:3000",
        "http://127.0.0.1:5500", 
        "http://localhost:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use(express.json());

// ==== RUTAS ====
app.use("/auth", require("./routes/auth"));
app.use("/entries", require("./routes/entries"));
app.use("/inventory", require("./routes/inventory"));

// Ruta de health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    message: "Server funcionando en Railway",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development"
  });
});

// Ruta raíz
app.get("/", (req, res) => {
  res.json({ 
    message: "🚀 API de Finanzas para Emprendedores",
    version: "1.0.0",
    status: "Online"
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🎉 Servidor corriendo en puerto ${PORT}`);
  console.log(`🏥 Health check: /health`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});