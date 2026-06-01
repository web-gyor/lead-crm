const mysql = require('mysql2/promise');
require('dotenv').config();

// Determine if we are in local development
const isLocal = process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // SSL Settings: Only enable if we are NOT on localhost
  ssl: isLocal ? null : {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },

  // Connection Pool Settings - Optimized for stability
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  
  // Handling large packets (prevents "bulk operation" errors)
  maxAllowedPacket: 64 * 1024 * 1024, 

  // Date and Timezone Handling
  dateStrings: true,
  timezone: '+05:30', 

  // Stability for Render/Cloud/Local
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Create the connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Test Database Connection
 */
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Test query to verify connection and configuration
    const [result] = await conn.query('SELECT 1 AS health, DATABASE() AS db, @@session.time_zone AS tz, @@max_allowed_packet AS packet_size');

    console.log(`✅ Database Connected: ${result[0].db}`);
    console.log(`   Timezone: ${result[0].tz} | Max Packet: ${result[0].packet_size} bytes`);
    return true;

  } catch (err) {
    console.error('❌ DB Connection Failed!');
    console.error(`   Error: ${err.message}`);
    
    if (err.message.includes('ETIMEDOUT')) {
      console.error('   👉 Hint: Check your database server status or VPN/Firewall.');
    }
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, testConnection };