const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors({
    origin: [
        "http://localhost:5500",
        "http://127.0.0.1:5500",
        "http://localhost:3000",
        "https://emprendedores-app-omega.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Rutas
app.use("/auth", require("./routes/auth"));
app.use("/entries", require("./routes/entries"));
app.use("/inventory", require("./routes/inventory"));

app.listen(4000, () => console.log("Servidor corriendo en http://localhost:4000"));
