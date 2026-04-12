require('dotenv').config();
const mysql = require('mysql2/promise');

const dbName = process.env.NODE_ENV === 'test'
  ? process.env.DB_NAME_TEST
  : process.env.DB_NAME;

const pool = mysql.createPool({
  host:               process.env.DB_HOST || 'localhost',
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           dbName,
  port:               parseInt(process.env.DB_PORT || '3306'),
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

module.exports = pool;
