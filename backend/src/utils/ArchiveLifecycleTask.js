const cron = require("node-cron");
const db = require("./config/db");

// Run every night at midnight
cron.schedule("0 0 * * *", async () => {
  console.log("Running Auto-Archive Task...");
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Copy old leads (365 days+) to archive
    const archiveQuery = `
      INSERT INTO archived_leads (SELECT * FROM leads WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR))
    `;
    await connection.execute(archiveQuery);

    // 2. Delete them from the active table
    const deleteQuery = `
      DELETE FROM leads WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 YEAR)
    `;
    await connection.execute(deleteQuery);

    await connection.commit();
    console.log("Archive process complete.");
  } catch (error) {
    await connection.rollback();
    console.error("Archive Failed:", error);
  } finally {
    connection.release();
  }
});