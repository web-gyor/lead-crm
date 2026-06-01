const db = require('../config/db');

/**
 * Enterprise User model for multi-branch database operations.
 * Maintained with legacy callback architecture compatibility blocks.
 */
const User = {
    /**
     * Retrieves a detailed user record by their email address, 
     * including their assigned branch status and runtime RBAC permissions.
     */
    findByEmail: (email, callback) => {
        const query = `
            SELECT 
                u.*,
                b.name as branch_name,
                b.branch_code,
                b.status as branch_status
            FROM users u
            INNER JOIN branches b ON u.branch_id = b.id
            WHERE u.email = ?
        `;

        return db.query(query, [email], (err, results) => {
            if (err) return callback(err, null);
            if (results.length === 0) return callback(null, []);

            const user = results[0];

            // If the user is a global Super Admin, skip fine-grained RBAC lookups
            if (user.is_super_admin === 1) {
                return db.query('SELECT slug FROM permissions', [], (pErr, pResults) => {
                    if (pErr) return callback(pErr, null);
                    user.permissions = pResults.map(p => p.slug);
                    return callback(null, [user]);
                });
            }

            // Otherwise, pull permissions mapped to their active roles
            const permQuery = `
                SELECT DISTINCT p.slug 
                FROM permissions p
                INNER JOIN role_permission_map rpm ON p.id = rpm.permission_id
                INNER JOIN user_roles ur ON rpm.role_id = ur.role_id
                WHERE ur.user_id = ?
            `;

            return db.query(permQuery, [user.id], (pErr, pResults) => {
                if (pErr) return callback(pErr, null);
                user.permissions = pResults.map(p => p.slug);
                return callback(null, [user]);
            });
        });
    },

    /**
     * Creates a new user record pinned to a specific branch node assignment.
     */
    create: (userData, callback) => {
        const { 
            name, 
            email, 
            password, 
            role, 
            branch_id = 1, // Default fallback to master headquarters node
            is_super_admin = 0,
            is_branch_admin = 0,
            status = 'active',
            reporting_to = null,
            designation = null,
            department = null
        } = userData;

        const query = `
            INSERT INTO users (
                name, email, password, role, branch_id, 
                is_super_admin, is_branch_admin, status, 
                reporting_to, designation, department
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
          name, email, password, role, branch_id, 
          is_super_admin, is_branch_admin, status, 
          reporting_to, designation, department
        ];

        return db.query(query, params, callback);
    }
};

module.exports = User;