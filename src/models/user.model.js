const pool = require('../config/db');

const createUser = async ({ full_name, email }) => {
    const query = `
        INSERT INTO users (full_name, email)
        VALUES ($1, $2)
        RETURNING id, full_name, email, role, is_email_verified, created_at
    `;

    const values = [full_name, email];

    const { rows } = await pool.query(query, values);
    return rows[0];
};

const findUserByEmail = async (email) => {
    const query = `
        SELECT *
        FROM users
        WHERE email = $1
    `;

    const { rows } = await pool.query(query, [email]);
    return rows[0];
};

const updateLastLogin = async (userId) => {
    const query = `
        UPDATE users
        SET last_login = NOW()
        WHERE id = $1
    `;

    await pool.query(query, [userId]);
};

const verifyUserEmail = async (userId) => {
    const query = `
        UPDATE users
        SET is_email_verified = true,
            email_verified_at = NOW()
        WHERE id = $1
    `;

    await pool.query(query, [userId]);
};

module.exports = {
    createUser,
    findUserByEmail,
    updateLastLogin,
    verifyUserEmail
};