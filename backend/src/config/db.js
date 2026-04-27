const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // REQUIRED for Aiven
  ssl: {
    rejectUnauthorized: false
  },

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true
};

const pool = mysql.createPool(dbConfig);

// Test DB connection
async function testConnection() {
  let conn;

  try {
    conn = await pool.getConnection();
    const [result] = await conn.query('SELECT 1 AS health, DATABASE() AS db');

    console.log(`✅ Database Connected: ${result[0].db}`);
    return true;

  } catch (err) {
    console.error('❌ DB Connection Failed:', err.message);
    throw err;

  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, testConnection };