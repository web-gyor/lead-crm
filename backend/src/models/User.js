const db = require('../config/db');

/**
 * User model for legacy callback-based database operations.
 */
const User = {
    /**
     * Retrieves a user record by their email address.
     */
    findByEmail: (email, callback) => {
        return db.query('SELECT * FROM users WHERE email = ?', [email], callback);
    },

    /**
     * Creates a new user record in the system.
     */
    create: (userData, callback) => {
        const { name, email, password, role } = userData;
        return db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, password, role],
            callback
        );
    }
};

module.exports = User;