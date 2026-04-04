const pool = require("../config/db");

const createVendorService = async ({
    vendor_id,
    title,
    description,
    city,
    price,
    price_type
}) => {

    const query = `
        INSERT INTO vendor_services
        (vendor_id, title, description, city, price, price_type)
        VALUES ($1,$2,$3,$4,$5,$6)
        RETURNING *
    `;

    const values = [
        vendor_id,
        title,
        description,
        city,
        price,
        price_type
    ];

    const { rows } = await pool.query(query, values);
    return rows[0];
};

const getVendorServices = async (vendor_id) => {

    const query = `
        SELECT *
        FROM vendor_services
        WHERE vendor_id = $1
        ORDER BY created_at DESC
    `;

    const { rows } = await pool.query(query, [vendor_id]);

    return rows;
};


const getAllServices = async (limit = 10, offset = 0) => {

    const query = `
        SELECT *
        FROM vendor_services
        WHERE is_active = TRUE
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
    `;

    const { rows } = await pool.query(query, [limit, offset]);

    return rows;
};


const getServiceById = async (service_id) => {

    const query = `
        SELECT *
        FROM vendor_services
        WHERE id = $1
        AND is_active = TRUE
    `;

    const { rows } = await pool.query(query, [service_id]);

    return rows[0];
};

module.exports = {
    createVendorService,
    getVendorServices,
    getAllServices,
    getServiceById
};