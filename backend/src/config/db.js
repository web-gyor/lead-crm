// 🎯 TARGET FILE: backend/src/config/db.js

const mysql = require('mysql2/promise');
require('dotenv').config();

const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  ssl: isLocal ? null : {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },

  // 🚀 FIXED: Scale up your allocation limits to handle parallel multi-user requests smoothly
  waitForConnections: true,
  connectionLimit: 45, // Raised from 10 to eliminate page mounting delays
  queueLimit: 0,
  namedPlaceholders: true,
  
  maxAllowedPacket: 64 * 1024 * 1024, 

  // 🚀 FIXED: Remove 'dateStrings: true' to let the database parse binary dates instantly
  timezone: '+05:30', 

  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

const pool = mysql.createPool(dbConfig);

async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    const [result] = await conn.query('SELECT 1 AS health, DATABASE() AS db, @@session.time_zone AS tz, @@max_allowed_packet AS packet_size');
    console.log(`✅ Database Connected: ${result[0].db}`);
    console.log(`   Timezone: ${result[0].tz} | Max Packet: ${result[0].packet_size} bytes`);
    return true;
  } catch (err) {
    console.error('❌ DB Connection Failed!', err.message);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, testConnection };