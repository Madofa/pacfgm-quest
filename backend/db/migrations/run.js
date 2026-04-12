require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function runMigrations() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST || 'localhost',
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port:     parseInt(process.env.DB_PORT || '3306'),
    multipleStatements: true,
  });

  console.log(`Conectado a MySQL (${process.env.DB_NAME})`);

  const sqlFile = path.join(__dirname, '001_schema.sql');
  const sql = fs.readFileSync(sqlFile, 'utf8');

  await conn.query(sql);
  console.log('✓ Migración 001_schema.sql ejecutada correctamente');

  await conn.end();
}

runMigrations().catch(err => {
  console.error('Error en la migración:', err.message);
  process.exit(1);
});
