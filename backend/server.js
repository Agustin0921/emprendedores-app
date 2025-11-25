const express = require("express");
const cors = require("cors");
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

// Necesario para que Express responda automáticamente los preflight OPTIONS
app.options("*", cors());

app.use(express.json());

// ==== RUTAS ====
app.use("/auth", require("./routes/auth"));
app.use("/entries", require("./routes/entries"));
app.use("/inventory", require("./routes/inventory"));

// ======================

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto " + PORT));
