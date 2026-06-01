const { pool } = require('./src/config/db');


const roles = [
  "Branch Admin",
  "Manager",
  "Counselor",
  "Telecaller"
];

const allFeatures = [
  "dashboard.view",
  "dashboard.stats",
  "leads.view",
  "leads.create",
  "leads.edit",
  "leads.delete",
  "comms.whatsapp",
  "comms.sms",
  "comms.email",
  "master.branches",
  "master.courses",
  "master.countries",
  "admin.users",
  "admin.export",
  "admin.settings"
];

async function seedPermissions() {
  try {
    console.log("🌱 Starting Permission Seeding...\n");

    for (const role of roles) {
      console.log(`Seeding permissions for: ${role}`);

      for (const slug of allFeatures) {
        let can_view = 0, can_create = 0, can_edit = 0, can_delete = 0, can_export = 0;

        switch(role) {
          case "Branch Admin":
            can_view = 1;
            can_create = 1;
            can_edit = 1;
            can_delete = 1;
            can_export = 1;
            break;

          case "Manager":
            can_view = 1;
            can_create = 1;
            can_edit = 1;
            can_delete = 0;        // Cannot delete leads
            can_export = 1;
            break;

          case "Counselor":
            can_view = 1;
            can_create = 1;
            can_edit = 1;
            can_delete = 0;
            can_export = 0;        // No export
            break;

          case "Telecaller":
            can_view = 1;
            can_create = 1;
            can_edit = 0;          // Can only create & view
            can_delete = 0;
            can_export = 0;
            break;
        }

        // Special restrictions
        if (slug.includes("admin.users") || slug.includes("admin.settings")) {
          if (role !== "Branch Admin") {
            can_view = 0; can_create = 0; can_edit = 0; can_delete = 0; can_export = 0;
          }
        }

        if (slug.includes("master.branches") && role !== "Branch Admin") {
          can_view = 0; can_create = 0; can_edit = 0;
        }

        await pool.query(
          `INSERT INTO Permissions 
           (name, slug, can_view, can_create, can_edit, can_delete, can_export, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
           ON DUPLICATE KEY UPDATE 
             can_view = VALUES(can_view),
             can_create = VALUES(can_create),
             can_edit = VALUES(can_edit),
             can_delete = VALUES(can_delete),
             can_export = VALUES(can_export),
             updated_at = NOW()`,
          [role, slug, can_view, can_create, can_edit, can_delete, can_export]
        );
      }
    }

    console.log("\n✅ Permission seeding completed successfully!");
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
  } finally {
    process.exit();
  }
}

seedPermissions();