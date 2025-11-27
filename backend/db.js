const { Pool } = require('pg');

console.log("🔧 Configurando conexión PostgreSQL...");
console.log("📊 DATABASE_URL:", process.env.DATABASE_URL ? "✅ Definida" : "❌ No definida");

// Mostrar parte de la URL para debug (sin password)
if (process.env.DATABASE_URL) {
  const dbUrl = process.env.DATABASE_URL;
  const safeUrl = dbUrl.replace(/:[^:@]+@/, ':****@');
  console.log("🔗 Database URL:", safeUrl);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Probar conexión más detallada
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    console.error('❌ Error details:', err);
  } else {
    console.log('✅ Conectado a PostgreSQL en Render');
    
    // Verificar tablas
    client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `, (err, result) => {
      if (err) {
        console.error('❌ Error verificando tablas:', err);
      } else {
        console.log('📊 Tablas existentes:', result.rows.map(row => row.table_name));
      }
      release();
    });
  }
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};