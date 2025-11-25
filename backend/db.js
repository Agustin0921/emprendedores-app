// db.js TEMPORAL - usa MySQL hasta que instales pg
const mysql = require('mysql2');

console.log("🔧 Configurando conexión MySQL (temporal)...");

// Para desarrollo sin base de datos
if (!process.env.DATABASE_URL && !process.env.MYSQLHOST) {
  console.log("⚠️  Modo desarrollo - sin base de datos");
  module.exports = {
    query: (text, params, callback) => {
      console.log("📝 Query simulada:", text);
      if (callback) callback(null, []);
      return { then: (cb) => cb({ rows: [] }) };
    }
  };
  return;
}

// Si hay variables de MySQL, usar MySQL
if (process.env.MYSQLHOST) {
  const db = mysql.createPool({
    host: process.env.MYSQLHOST,
    user: process.env.MYSQLUSER,
    password: process.env.MYSQLPASSWORD,
    database: process.env.MYSQLDATABASE,
    port: parseInt(process.env.MYSQLPORT) || 3306,
  });

  module.exports = {
    query: (text, params, callback) => {
      if (callback) {
        return db.query(text, params, callback);
      }
      return new Promise((resolve, reject) => {
        db.query(text, params, (err, results) => {
          if (err) reject(err);
          else resolve(results);
        });
      });
    }
  };
} else {
  console.log("❌ No hay configuración de base de datos");
  module.exports = {
    query: () => Promise.reject(new Error("Base de datos no configurada"))
  };
}