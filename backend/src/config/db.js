const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 4000,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,

  // TiDB Cloud Security Requirements
  ssl: {
    rejectUnauthorized: false,
    minVersion: 'TLSv1.2'
  },

  // Connection Pool Settings
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
  
  // Date and Timezone Handling
  dateStrings: true,
  timezone: '+05:30', // Sets connection to IST for accurate Kerala/Gulf reporting

  // Render/Production Stability
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000
};

// Create the connection pool
const pool = mysql.createPool(dbConfig);

/**
 * Test Database Connection
 * Logs success or specific failure reason
 */
async function testConnection() {
  let conn;
  try {
    conn = await pool.getConnection();
    
    // Verify connection and timezone
    const [result] = await conn.query('SELECT 1 AS health, DATABASE() AS db, @@session.time_zone AS tz');

    console.log(`✅ Database Connected: ${result[0].db} (Timezone: ${result[0].tz})`);
    return true;

  } catch (err) {
    console.error('❌ DB Connection Failed!');
    console.error(`Error Details: ${err.message}`);
    
    // Check for common TiDB Cloud issues
    if (err.message.includes('ETIMEDOUT')) {
      console.error('👉 Hint: Check TiDB Cloud IP Access List (Allow 0.0.0.0/0 for Render).');
    }
    if (err.message.includes('Access denied')) {
      console.error('👉 Hint: Verify DB_USER and DB_PASSWORD in Render Environment Variables.');
    }
    
    throw err;

  } finally {
    if (conn) conn.release();
  }
}

module.exports = { pool, testConnection };