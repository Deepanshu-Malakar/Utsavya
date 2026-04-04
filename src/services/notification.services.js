const pool = require("../config/db");

/**
 * Unified Notification Utility
 * Writes to the 'notifications' table for in-app bell icons.
 */
const createNotification = async (userId, title, message, type = "info") => {
    const query = `
        INSERT INTO notifications (user_id, title, message, type, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [userId, title, message, type]);
    return rows[0];
};

const getUnreadNotifications = async (userId) => {
    const query = `
        SELECT * FROM notifications 
        WHERE user_id = $1 AND is_read = FALSE 
        ORDER BY created_at DESC;
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows;
};

const markAsRead = async (notificationId, userId) => {
    const query = `
        UPDATE notifications 
        SET is_read = TRUE 
        WHERE id = $1 AND user_id = $2
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [notificationId, userId]);
    return rows[0];
};

module.exports = {
    createNotification,
    getUnreadNotifications,
    markAsRead
};
