const cron = require('node-cron');
const pool = require('../config/db');

// Run every 30 minutes
cron.schedule('*/30 * * * *', async () => {
    console.log("🔄 Checking LinkedIn for new leads...");
    
    // 1. Get all clients who have LinkedIn active
    const [integrations] = await pool.query(
        "SELECT * FROM client_integrations WHERE source_key = 'linkedin' AND is_active = 1"
    );

    for (const integration of integrations) {
        const config = JSON.parse(integration.config_data);
        // Logic: 
        // 1. Auth with config.client_id / config.client_secret
        // 2. Fetch leads from /leadForms/{form_id}/responses
        // 3. Insert new ones into `leads` table
    }
});