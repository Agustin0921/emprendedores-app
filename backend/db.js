const { Pool } = require('pg');

console.log("🔧 Configurando conexión PostgreSQL...");
console.log("📊 DATABASE_URL:", process.env.DATABASE_URL ? "✅ Definida" : "❌ No definida");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Probar conexión
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    console.error('❌ Detalles:', err);
  } else {
    console.log('✅ Conectado a PostgreSQL en Render');
    release();
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};