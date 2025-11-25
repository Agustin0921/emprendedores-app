const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({
    origin: [
        "http://localhost:3000",
        "http://127.0.0.1:5500",
        "http://localhost:5500",
        /\.vercel\.app$/   // ACEPTA CUALQUIER SUBDOMINIO DE VERCEL
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
}));

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", req.headers.origin);
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    next();
});

app.options("*", (req, res) => {
    res.sendStatus(200);
});

app.use(express.json());

// Rutas
app.use("/auth", require("./routes/auth"));
app.use("/entries", require("./routes/entries"));
app.use("/inventory", require("./routes/inventory"));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log("Servidor corriendo en puerto " + PORT));
