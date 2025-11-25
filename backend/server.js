const express = require("express");
const cors = require("cors");

const app = express();

// ✅ CORS configurado ANTES de cualquier middleware o ruta
const corsOptions = {
    origin: [
        "https://emprendedores-app-omega.vercel.app",
        "http://localhost:3000", 
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    optionsSuccessStatus: 200
};

// ✅ APLICAR CORS A TODAS LAS RUTAS
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Para preflight requests

app.use(express.json());

// ✅ RUTAS BÁSICAS (estas sí funcionan con CORS)
app.get("/", (req, res) => {
    res.json({ 
        message: "🚀 API de Finanzas funcionando!",
        version: "1.0.0",
        cors: "Configurado para Vercel"
    });
});

app.get("/health", (req, res) => {
    res.json({ 
        status: "OK", 
        message: "Server funcionando en Render",
        timestamp: new Date().toISOString(),
        cors: true
    });
});

// ✅ RUTAS DE LA APLICACIÓN (ahora con CORS aplicado)
app.use("/auth", require("./routes/auth"));
app.use("/entries", require("./routes/entries")); 
app.use("/inventory", require("./routes/inventory"));

// ✅ MANEJO DE ERRORES
app.use((err, req, res, next) => {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Error interno del servidor" });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🎉 Servidor corriendo en puerto ${PORT}`);
    console.log(`🌐 CORS configurado para todas las rutas`);
    console.log(`✅ Health: https://emprendedores-app.onrender.com/health`);
});