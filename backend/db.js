const mysql = require("mysql2");

console.log("🔧 Configurando conexión MySQL...");
console.log("📊 Variables de entorno:", {
  host: process.env.MYSQLHOST ? "✅" : "❌",
  user: process.env.MYSQLUSER ? "✅" : "❌", 
  database: process.env.MYSQLDATABASE ? "✅" : "❌",
  port: process.env.MYSQLPORT ? "✅" : "❌"
});

const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306, // Valor por defecto
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  reconnect: true
});

// Probar conexión
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    console.error("🔍 Detalles de conexión:", {
      host: process.env.MYSQLHOST,
      user: process.env.MYSQLUSER,
      database: process.env.MYSQLDATABASE,
      port: process.env.MYSQLPORT
    });
  } else {
    console.log("✅ Conectado a MySQL en Railway");
    console.log(`📊 Base de datos: ${process.env.MYSQLDATABASE}`);
    connection.release();
  }
});

module.exports = db;