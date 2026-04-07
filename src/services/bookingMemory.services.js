const pool = require("../config/db");
const cloudinary = require("../config/cloudinary");
const fs = require("fs-extra");

let tableReadyPromise = null;

function ensureBookingMemoriesTable() {
    if (!tableReadyPromise) {
        tableReadyPromise = pool.query(`
            CREATE TABLE IF NOT EXISTS booking_memories (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                booking_item_id UUID NOT NULL REFERENCES booking_items(id) ON DELETE CASCADE,
                media_url TEXT NOT NULL,
                media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
                uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);
    }
    return tableReadyPromise;
}

async function getReviewableBookingItem(user, vendorId, serviceId) {
    if (user.role !== "customer") {
        throw new Error("Only customers can review vendors");
    }

    if (!vendorId || !serviceId) {
        throw new Error("Vendor ID and service ID are required");
    }

    const { rows } = await pool.query(
        `
        SELECT 
            bi.id,
            bi.booking_id,
            bi.vendor_id,
            bi.service_id,
            b.title AS event_title,
            b.event_start,
            b.event_end,
            vs.title AS service_title
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        JOIN vendor_services vs ON bi.service_id = vs.id
        WHERE b.customer_id = $1
          AND bi.vendor_id = $2
          AND bi.service_id = $3
          AND bi.is_selected = TRUE
          AND bi.status = 'completed'
          AND EXISTS (
              SELECT 1
              FROM payments p
              WHERE p.booking_id = b.id
                AND p.status = 'successful'
          )
          AND NOT EXISTS (
              SELECT 1
              FROM reviews r
              WHERE r.booking_item_id = bi.id
          )
        ORDER BY b.event_end DESC NULLS LAST, b.created_at DESC
        LIMIT 1
        `,
        [user.userId, vendorId, serviceId]
    );

    return rows[0] || null;
}

async function uploadBookingMemories(user, bookingItemId, files) {
    await ensureBookingMemoriesTable();

    if (user.role !== "vendor") {
        throw new Error("Only vendors can upload event memories");
    }

    if (!files || files.length === 0) {
        throw new Error("No memory files attached");
    }

    const itemRes = await pool.query(
        `
        SELECT 
            bi.id,
            bi.booking_id,
            bi.vendor_id,
            bi.service_id,
            bi.status,
            bi.is_selected,
            b.customer_id,
            b.title AS event_title,
            b.event_start,
            b.location,
            u.full_name AS customer_name,
            vs.title AS service_title
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        JOIN users u ON b.customer_id = u.id
        JOIN vendor_services vs ON bi.service_id = vs.id
        WHERE bi.id = $1
          AND bi.vendor_id = $2
          AND bi.is_selected = TRUE
        `,
        [bookingItemId, user.userId]
    );

    if (itemRes.rows.length === 0) {
        throw new Error("Booking item not found or unauthorized");
    }

    const item = itemRes.rows[0];
    if (item.status !== "completed") {
        throw new Error("Memories can only be uploaded for completed bookings");
    }

    const uploaded = [];

    try {
        await Promise.all(files.map(async (file) => {
            const isVideo = file.mimetype.startsWith("video/");
            const result = await cloudinary.uploader.upload(file.path, {
                folder: `booking-memories/${bookingItemId}`,
                resource_type: isVideo ? "video" : "image"
            });

            await fs.unlink(file.path);

            const insertRes = await pool.query(
                `
                INSERT INTO booking_memories (booking_item_id, media_url, media_type, uploaded_by)
                VALUES ($1, $2, $3, $4)
                RETURNING *
                `,
                [bookingItemId, result.secure_url, isVideo ? "video" : "image", user.userId]
            );

            uploaded.push({
                ...insertRes.rows[0],
                event_title: item.event_title,
                event_start: item.event_start,
                location: item.location,
                customer_name: item.customer_name,
                service_title: item.service_title
            });
        }));

        return uploaded;
    } catch (error) {
        for (const file of files) {
            if (file?.path) {
                await fs.unlink(file.path).catch(() => {});
            }
        }
        throw error;
    }
}

async function getVendorCompletedBookingItems(user) {
    if (user.role !== "vendor") {
        throw new Error("Only vendors can view completed bookings");
    }

    const { rows } = await pool.query(
        `
        SELECT
            bi.id,
            bi.booking_id,
            bi.service_id,
            b.title AS event_title,
            b.event_start,
            b.location,
            u.full_name AS customer_name,
            vs.title AS service_title
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        JOIN users u ON b.customer_id = u.id
        JOIN vendor_services vs ON bi.service_id = vs.id
        WHERE bi.vendor_id = $1
          AND bi.is_selected = TRUE
          AND bi.status = 'completed'
        ORDER BY b.event_start DESC NULLS LAST, bi.updated_at DESC
        `,
        [user.userId]
    );

    return rows;
}

async function getVendorMemories(user) {
    await ensureBookingMemoriesTable();

    if (user.role !== "vendor") {
        throw new Error("Only vendors can view uploaded memories");
    }

    const { rows } = await pool.query(
        `
        SELECT
            bm.id,
            bm.booking_item_id,
            bm.media_url,
            bm.media_type,
            bm.created_at,
            b.title AS event_title,
            b.event_start,
            b.location,
            u.full_name AS customer_name,
            vs.title AS service_title
        FROM booking_memories bm
        JOIN booking_items bi ON bm.booking_item_id = bi.id
        JOIN bookings b ON bi.booking_id = b.id
        JOIN users u ON b.customer_id = u.id
        JOIN vendor_services vs ON bi.service_id = vs.id
        WHERE bi.vendor_id = $1
        ORDER BY bm.created_at DESC
        `,
        [user.userId]
    );

    return rows;
}

async function getCustomerMemories(user) {
    await ensureBookingMemoriesTable();

    if (user.role !== "customer") {
        throw new Error("Only customers can view event memories");
    }

    const { rows } = await pool.query(
        `
        SELECT
            bm.id,
            bm.booking_item_id,
            bm.media_url,
            bm.media_type,
            bm.created_at,
            b.title AS event_title,
            b.event_start,
            b.location,
            u.full_name AS vendor_name,
            vs.title AS service_title
        FROM booking_memories bm
        JOIN booking_items bi ON bm.booking_item_id = bi.id
        JOIN bookings b ON bi.booking_id = b.id
        JOIN users u ON bi.vendor_id = u.id
        JOIN vendor_services vs ON bi.service_id = vs.id
        WHERE b.customer_id = $1
          AND bi.is_selected = TRUE
          AND bi.status = 'completed'
        ORDER BY b.event_start DESC NULLS LAST, bm.created_at DESC
        `,
        [user.userId]
    );

    return rows;
}

async function deleteBookingMemory(user, memoryId) {
    await ensureBookingMemoriesTable();

    if (user.role !== "vendor") {
        throw new Error("Only vendors can delete event memories");
    }

    const { rows } = await pool.query(
        `
        DELETE FROM booking_memories bm
        USING booking_items bi
        WHERE bm.id = $1
          AND bm.booking_item_id = bi.id
          AND bi.vendor_id = $2
        RETURNING bm.*
        `,
        [memoryId, user.userId]
    );

    if (rows.length === 0) {
        throw new Error("Memory not found or unauthorized");
    }

    return rows[0];
}

module.exports = {
    getReviewableBookingItem,
    uploadBookingMemories,
    getVendorCompletedBookingItems,
    getVendorMemories,
    getCustomerMemories,
    deleteBookingMemory
};
