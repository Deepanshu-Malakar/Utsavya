const pool = require("../config/db");

const createVendorRequest = async ({
    user_id,
    business_name,
    business_description,
    city,
    documents_url
}) => {

    const query = `
        INSERT INTO vendor_requests
        (user_id, business_name, business_description, city, documents_url)
        VALUES ($1,$2,$3,$4,$5)
        RETURNING *
    `;

    const values = [
        user_id,
        business_name,
        business_description,
        city,
        documents_url
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
};

const getVendorRequestById = async (requestId) => {

    const query = `
        SELECT *
        FROM vendor_requests
        WHERE id = $1
    `;

    const { rows } = await pool.query(query, [requestId]);
    return rows[0];
};

const updateVendorRequestStatus = async ({
    request_id,
    status,
    admin_note,
    admin_id
}) => {

    const query = `
        UPDATE vendor_requests
        SET status = $1,
            admin_note = $2,
            reviewed_by = $3,
            reviewed_at = NOW()
        WHERE id = $4
        AND status = 'pending'
        RETURNING *
    `;

    const values = [
        status,
        admin_note,
        admin_id,
        request_id
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
};

const promoteUserToVendor = async (userId) => {

    const query = `
        UPDATE users
        SET role = 'vendor'
        WHERE id = $1
    `;

    await pool.query(query, [userId]);
};

module.exports = {
    createVendorRequest,
    getVendorRequestById,
    updateVendorRequestStatus,
    promoteUserToVendor
};