const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "", // si no tenés contraseña, dejalo vacío
  database: "emprendedores"
});

module.exports = db;
