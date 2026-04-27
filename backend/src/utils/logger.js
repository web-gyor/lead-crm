// utils/logger.js
const logActivity = async (userId, action, leadId, desc, oldVal, newVal) => {
  await db.query(
    "INSERT INTO activity_logs (user_id, action_type, lead_id, description, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, action, leadId, desc, oldVal, newVal]
  );
};