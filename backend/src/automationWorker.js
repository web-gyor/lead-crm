const cron = require('node-cron');
const { pool: db } = require('./config/db'); // Use destructuring to get the pool
const { parseTemplate } = require('./utils/templateHelper');

/**
 * AUTOMATION WORKER
 * Runs every minute to check for rules that need to be triggered
 */
cron.schedule('* * * * *', async () => {
    console.log('🤖 Checking automation queue...');
    
    try {
        // Now you can use db.execute() correctly
        const [settings] = await db.execute('SELECT * FROM settings LIMIT 1');
        const globalSettings = settings[0];

        // Example logic: Check if WhatsApp is globally enabled before processing
        const whatsappEnabled =
  globalSettings.is_whatsapp_automation_enabled == 1;

const smsEnabled =
  globalSettings.is_sms_template_enabled == 1;

const emailEnabled =
  globalSettings.is_email_trigger_enabled == 1;

        // Your logic to find leads that match rules goes here...
        
    } catch (error) {
        console.error('❌ Worker Error:', error.message);
    }
});