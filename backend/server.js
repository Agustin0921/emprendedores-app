const express = require("express");
const cors = require("cors");

const app = express();

// Configuración CORS COMPLETA para Render
app.use(cors({
    origin: [
        "https://emprendedores-app-omega.vercel.app",
        "https://emprendedores-app-omega.vercel.app/",
        /\.vercel\.app$/,
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204
}));

// Middleware para manejar preflight OPTIONS
app.options('*', cors());

app.use(express.json());

// Ruta de health check
app.get("/health", (req, res) => {
    res.json({ 
        status: "OK", 
        message: "Server funcionando en Render",
        timestamp: new Date().toISOString()
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

// ==== RUTAS ====
app.use("/auth", require("./routes/auth"));
app.use("/entries", require("./routes/entries"));
app.use("/inventory", require("./routes/inventory"));

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal!' });
});

// Ruta 404
app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🎉 Servidor corriendo en puerto ${PORT}`);
    console.log(`🏥 Health check: /health`);
    console.log(`🌐 CORS configurado para Vercel`);
});