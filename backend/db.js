const mysql = require("mysql2");

console.log("🔧 Configurando conexión MySQL...");

const dbConfig = {
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: parseInt(process.env.MYSQLPORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Quita 'reconnect' que causa el warning
  acquireTimeout: 60000, // 60 segundos timeout
  connectTimeout: 60000, // 60 segundos para conexión
  timeout: 60000, // 60 segundos timeout general
};

console.log("📊 Configuración DB:", {
  host: dbConfig.host,
  user: dbConfig.user,
  database: dbConfig.database,
  port: dbConfig.port
});

const db = mysql.createPool(dbConfig);

// Probar conexión
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Error conectando a MySQL:", err.message);
    console.error("🔍 Código de error:", err.code);
  } else {
    console.log("✅ Conectado a MySQL en Railway");
    connection.release();
  }
});

// Manejar errores de pool
db.on('error', (err) => {
  console.error('❌ Error de MySQL Pool:', err);
});

db.on('acquire', (connection) => {
  console.log('🔗 Conexión adquirida del pool');
});

db.on('release', (connection) => {
  console.log('🔄 Conexión liberada al pool');
});

module.exports = db;