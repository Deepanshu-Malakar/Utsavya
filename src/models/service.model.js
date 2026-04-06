const pool = require("../config/db");

const createVendorService = async ({
    vendor_id,
    title,
    description,
    city,
    price,
    price_type,
    tagline
}) => {

    const query = `
        INSERT INTO vendor_services
        (vendor_id, title, description, city, price, price_type, tagline)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
    `;

    const values = [
        vendor_id,
        title,
        description,
        city,
        price,
        price_type,
        tagline
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


const updateVendorService = async (service_id, vendor_id, updates) => {
    const fields = [];
    const values = [];
    let idx = 1;

    // Allowed fields for update
    const allowedFields = ['title', 'description', 'city', 'price', 'price_type', 'is_active', 'category', 'tagline'];
    
    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            fields.push(`${key} = $${idx++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        throw new Error("No valid fields provided for update");
    }

    values.push(service_id);
    const serviceIdx = idx++;
    values.push(vendor_id);
    const vendorIdx = idx++;

    const query = `
        UPDATE vendor_services
        SET ${fields.join(', ')}, updated_at = NOW()
        WHERE id = $${serviceIdx} AND vendor_id = $${vendorIdx}
        RETURNING *
    `;

    const { rows } = await pool.query(query, values);
    return rows[0];
};

const getServiceById = async (service_id) => {
    const query = `
        SELECT *
        FROM vendor_services
        WHERE id = $1
    `;
    const { rows } = await pool.query(query, [service_id]);
    return rows[0];
};

module.exports = {
    createVendorService,
    getVendorServices,
    getAllServices,
    getServiceById,
    updateVendorService
};