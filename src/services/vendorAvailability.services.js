const pool = require("../config/db");

const addUnavailabilityBlock = async (vendorId, startTime, endTime, reason) => {
    // Validate inputs
    if (new Date(endTime) <= new Date(startTime)) {
        throw new Error("end_time must be completely after start_time");
    }

    const query = `
        INSERT INTO vendor_availability (vendor_id, start_time, end_time, reason)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const { rows } = await pool.query(query, [vendorId, startTime, endTime, reason]);
    return rows[0];
};

const getVendorBlocks = async (vendorId) => {
    const query = `
        SELECT * FROM vendor_availability
        WHERE vendor_id = $1
        ORDER BY start_time ASC
    `;
    const { rows } = await pool.query(query, [vendorId]);
    return rows;
};

const removeUnavailabilityBlock = async (vendorId, blockId) => {
    const query = `
        DELETE FROM vendor_availability
        WHERE id = $1 AND vendor_id = $2
        RETURNING *
    `;
    const { rows } = await pool.query(query, [blockId, vendorId]);
    if (rows.length === 0) {
        throw new Error("Block not found or unauthorized to delete");
    }
    return rows[0];
};

const checkVendorAvailability = async (vendorId, eventStart, eventEnd) => {
    // 1. Check for manual blocks created by the vendor
    const blockQuery = `
        SELECT id FROM vendor_availability
        WHERE vendor_id = $1
        AND start_time < $3
        AND end_time > $2
        LIMIT 1
    `;
    const blockRes = await pool.query(blockQuery, [vendorId, eventStart, eventEnd]);
    
    if (blockRes.rows.length > 0) {
        return { isAvailable: false, reason: "Vendor is manually blocked off during this time." };
    }

    // 2. Check for conflicting Accepted bookings
    const bookingQuery = `
        SELECT bi.id 
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        WHERE bi.vendor_id = $1
        AND bi.status IN ('accepted', 'completed')
        AND b.event_start < $3
        AND b.event_end > $2
        LIMIT 1
    `;
    const bookingRes = await pool.query(bookingQuery, [vendorId, eventStart, eventEnd]);

    if (bookingRes.rows.length > 0) {
        return { isAvailable: false, reason: "Vendor is already booked and accepted for another event during this time." };
    }

    return { isAvailable: true, reason: "Available" };
};

module.exports = {
    addUnavailabilityBlock,
    getVendorBlocks,
    removeUnavailabilityBlock,
    checkVendorAvailability
};
