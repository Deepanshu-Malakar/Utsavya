const pool = require("../config/db");

const addServiceMedia = async ({
    service_id,
    media_url,
    media_type,
    uploaded_by
}) => {

    const query = `
        INSERT INTO service_media
        (service_id, media_url, media_type, uploaded_by)
        VALUES ($1,$2,$3,$4)
        RETURNING *
    `;

    const values = [
        service_id,
        media_url,
        media_type,
        uploaded_by
    ];

    const { rows } = await pool.query(query, values);

    return rows[0];
};


const getServiceMedia = async (service_id) => {

    const query = `
        SELECT *
        FROM service_media
        WHERE service_id = $1
        ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, [service_id]);

    return rows;
};


const deleteServiceMedia = async (media_id, vendor_id) => {

    const query = `
        DELETE FROM service_media
        USING vendor_services
        WHERE service_media.id = $1
        AND service_media.service_id = vendor_services.id
        AND vendor_services.vendor_id = $2
        RETURNING service_media.*
    `;

    const { rows } = await pool.query(query, [media_id, vendor_id]);

    return rows[0];
};

module.exports = {
    addServiceMedia,
    getServiceMedia,
    deleteServiceMedia
};