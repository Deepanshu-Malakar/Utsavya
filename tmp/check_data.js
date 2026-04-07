const pool = require('./src/config/db');

async function check() {
    try {
        const res = await pool.query(`
            SELECT b.id, b.status, b.title, bi.id as item_id, bi.is_selected, u.full_name as vendor_name, vs.title as service_title
            FROM bookings b
            LEFT JOIN booking_items bi ON b.id = bi.booking_id
            LEFT JOIN vendor_services vs ON bi.service_id = vs.id
            LEFT JOIN users u ON bi.vendor_id = u.id
            ORDER BY b.created_at DESC
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

check();
