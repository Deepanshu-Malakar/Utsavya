const pool = require("../config/db");
const { checkVendorAvailability } = require("./vendorAvailability.services");
const { sendNoticeEmail } = require("../utils/email");

const createBooking = async (customerId, data) => {

    const {
        title,
        event_start,
        event_end,
        location,
        guest_count
    } = data;

    const bookingReference = `EVT-${Date.now()}`;

    const query = `
        INSERT INTO bookings
        (booking_reference, customer_id, title, event_start, event_end, location, guest_count)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *;
    `;

    const values = [
        bookingReference,
        customerId,
        title,
        event_start,
        event_end,
        location,
        guest_count
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
};

const getUserBookings = async (customerId) => {

    const query = `
        SELECT b.*, 
        (
            SELECT json_agg(json_build_object(
                'id', bi.id,
                'vendor_name', u.full_name,
                'service_title', vs.title,
                'status', bi.status,
                'price', bi.price_quote
            ))
            FROM booking_items bi
            JOIN vendor_services vs ON bi.service_id = vs.id
            JOIN users u ON bi.vendor_id = u.id
            WHERE bi.booking_id = b.id AND bi.is_selected = TRUE
        ) as vendors
        FROM bookings b
        WHERE b.customer_id = $1
        ORDER BY b.created_at DESC
    `;

    const { rows } = await pool.query(query, [customerId]);

    return rows;
};

const requestServiceBooking = async (user, data) => {

    if (user.role !== "customer") {
        throw new Error("Only customers can request services");
    }

    const {
        booking_id,
        service_id,
        vendor_id
    } = data;

    // Grab the event dates to check availability
    const bookingRes = await pool.query(
        "SELECT event_start, event_end FROM bookings WHERE id = $1 AND customer_id = $2",
        [booking_id, user.userId]
    );

    if (bookingRes.rows.length === 0) {
        throw new Error("Booking not found or unauthorized");
    }

    const { event_start, event_end } = bookingRes.rows[0];

    // Check availability before allowing the request
    const availability = await checkVendorAvailability(vendor_id, event_start, event_end);
    if (!availability.isAvailable) {
        throw new Error(`Vendor is unavailable: ${availability.reason}`);
    }

    const serviceRes = await pool.query("SELECT title, price FROM vendor_services WHERE id = $1", [service_id]);
    if (serviceRes.rows.length === 0) {
        throw new Error("Service not found");
    }
    const initialPrice = serviceRes.rows[0].price || 0;

    const query = `
        INSERT INTO booking_items
        (booking_id, service_id, vendor_id, price_quote)
        VALUES ($1,$2,$3,$4)
        RETURNING *;
    `;

    const values = [booking_id, service_id, vendor_id, initialPrice];

    const { rows } = await pool.query(query, values);
    const item = rows[0];

    // 📧 Notification: Notify Vendor
    const vendorRes = await pool.query("SELECT email FROM users WHERE id = $1", [vendor_id]);
    
    if (vendorRes.rows.length > 0) {
        await sendNoticeEmail(
            vendorRes.rows[0].email,
            "New Booking Request",
            "You have a new request!",
            `A customer has requested your service: "${serviceRes.rows[0].title}". Please check your dashboard to accept or reject.`
        ).catch(console.error);
    }

    return item;
};

const getVendorBookingRequests = async (user) => {

    if (user.role !== "vendor") {
        throw new Error("Only vendors can view booking requests");
    }

    const query = `
        SELECT 
            bi.*,
            b.title,
            b.event_start,
            b.event_end,
            b.location,
            b.guest_count
        FROM booking_items bi
        JOIN bookings b ON bi.booking_id = b.id
        WHERE bi.vendor_id = $1
        ORDER BY bi.created_at DESC
    `;

    const { rows } = await pool.query(query, [user.userId]);

    return rows;
};

const updateBookingItemStatus = async (user, itemId, data) => {

    if (user.role !== "vendor") {
        throw new Error("Only vendors can update booking requests");
    }

    const { status, price_quote } = data;

    if (!["accepted", "rejected"].includes(status)) {
        throw new Error("Invalid status");
    }

    const query = `
        UPDATE booking_items
        SET status = $1,
            price_quote = COALESCE($2, price_quote),
            updated_at = NOW()
        WHERE id = $3
        AND vendor_id = $4
        RETURNING *;
    `;

    const values = [status, price_quote, itemId, user.userId];

    const { rows } = await pool.query(query, values);

    if (rows.length === 0) {
        throw new Error("Request not found or unauthorized");
    }

    const item = rows[0];

    // 📧 Notification: Notify Customer
    const customerRes = await pool.query(
        "SELECT email FROM users WHERE id = (SELECT customer_id FROM bookings WHERE id = $1)",
        [item.booking_id]
    );
    const serviceRes = await pool.query("SELECT title FROM vendor_services WHERE id = $1", [item.service_id]);

    if (customerRes.rows.length > 0) {
        await sendNoticeEmail(
            customerRes.rows[0].email,
            `Booking ${status.toUpperCase()}`,
            `Your booking was ${status}`,
            `The vendor has ${status} your request for "${serviceRes.rows[0].title}". ${status === 'accepted' ? 'Please proceed to payment.' : ''}`
        ).catch(console.error);
    }

    return item;
};

const selectVendorForService = async (user, itemId) => {

    if (user.role !== "customer") {
        throw new Error("Only customers can select vendor");
    }

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        // 1️⃣ Get booking item
        const itemResult = await client.query(
            `SELECT * FROM booking_items WHERE id = $1`,
            [itemId]
        );

        if (itemResult.rows.length === 0) {
            throw new Error("Booking item not found");
        }

        const item = itemResult.rows[0];

        // 2️⃣ Check ownership (VERY IMPORTANT)
        const bookingResult = await client.query(
            `SELECT * FROM bookings WHERE id = $1`,
            [item.booking_id]
        );

        if (bookingResult.rows[0].customer_id !== user.userId) {
            throw new Error("Unauthorized");
        }

        // 3️⃣ Mark selected vendor
        await client.query(
            `
            UPDATE booking_items
            SET is_selected = TRUE,
                status = 'accepted',
                updated_at = NOW()
            WHERE id = $1
            `,
            [itemId]
        );

        // 4️⃣ Cancel all others
        await client.query(
            `
            UPDATE booking_items
            SET status = 'cancelled',
                cancelled_by = 'customer',
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE booking_id = $1
            AND service_id = $2
            AND id != $3
            `,
            [item.booking_id, item.service_id, itemId]
        );

        await client.query("COMMIT");

        return { message: "Vendor selected successfully" };

    } catch (error) {

        await client.query("ROLLBACK");
        throw error;

    } finally {
        client.release();
    }
};

const getBookingDetails = async (user, bookingId) => {

    // Get booking
    const bookingQuery = `
        SELECT *
        FROM bookings
        WHERE id = $1
    `;

    const bookingResult = await pool.query(bookingQuery, [bookingId]);

    if (bookingResult.rows.length === 0) {
        throw new Error("Booking not found");
    }

    const booking = bookingResult.rows[0];

    // Ownership check
    if (booking.customer_id !== user.userId) {
        throw new Error("Unauthorized");
    }

    // Get items with joins
    const itemsQuery = `
        SELECT 
            bi.*,
            vs.title AS service_title,
            vs.price AS service_price,
            u.full_name AS vendor_name
        FROM booking_items bi
        JOIN vendor_services vs ON bi.service_id = vs.id
        JOIN users u ON bi.vendor_id = u.id
        WHERE bi.booking_id = $1
        ORDER BY bi.created_at ASC
    `;

    const itemsResult = await pool.query(itemsQuery, [bookingId]);

    // Structure response
    return {
        ...booking,
        items: itemsResult.rows
    };
};

// src/services/booking.services.js

const completeBookingItem = async (user, itemId) => {
    const paymentCheck = await pool.query(`
    SELECT p.status
    FROM payments p
    JOIN bookings b ON p.booking_id = b.id
    JOIN booking_items bi ON bi.booking_id = b.id
    WHERE bi.id = $1
`, [itemId]);

    if (
        paymentCheck.rows.length === 0 ||
        paymentCheck.rows[0].status !== "successful"
    ) {
        throw new Error("Cannot complete unpaid booking");
    }

    if (user.role !== "vendor") {
        throw new Error("Only vendor can mark complete");
    }

    const query = `
        UPDATE booking_items
        SET status = 'completed',
            updated_at = NOW()
        WHERE id = $1
        AND vendor_id = $2
        AND is_selected = TRUE
        RETURNING *;
    `;

    const { rows } = await pool.query(query, [itemId, user.userId]);

    if (rows.length === 0) {
        throw new Error("Unauthorized or invalid booking");
    }
    const item = rows[0];

    // 📧 Notification: Notify Customer
    const customerRes = await pool.query(
        "SELECT email FROM users WHERE id = (SELECT customer_id FROM bookings WHERE id = $1)",
        [item.booking_id]
    );
    const serviceRes = await pool.query("SELECT title FROM vendor_services WHERE id = $1", [item.service_id]);

    if (customerRes.rows.length > 0) {
        await sendNoticeEmail(
            customerRes.rows[0].email,
            "Service Completed",
            "Your service is complete!",
            `The vendor has marked your service "${serviceRes.rows[0].title}" as completed. We hope you enjoyed it!`
        ).catch(console.error);
    }

    return item;
};

const updateBooking = async (user, bookingId, updates) => {
    if (user.role !== "customer") {
        throw new Error("Only customers can update booking details");
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Fetch current booking and lock for update
        const bookingRes = await client.query(
            "SELECT * FROM bookings WHERE id = $1 AND customer_id = $2 FOR UPDATE",
            [bookingId, user.userId]
        );

        if (bookingRes.rows.length === 0) {
            throw new Error("Booking not found or unauthorized");
        }

        const current = bookingRes.rows[0];

        // 2. Status Guard: Cannot edit if confirmed/completed
        if (!['planning', 'pending'].includes(current.status)) {
            throw new Error(`Cannot edit booking in ${current.status} status`);
        }

        const { title, event_start, event_end, location, guest_count } = updates;
        const dateChanged = (event_start && event_start !== current.event_start.toISOString()) || 
                            (event_end && event_end !== current.event_end.toISOString());
        const scaleChanged = guest_count !== undefined && parseInt(guest_count) !== current.guest_count;

        // 3. Update the booking table
        const updateQuery = `
            UPDATE bookings
            SET title = COALESCE($1, title),
                event_start = COALESCE($2, event_start),
                event_end = COALESCE($3, event_end),
                location = COALESCE($4, location),
                guest_count = COALESCE($5, guest_count),
                updated_at = NOW()
            WHERE id = $6
            RETURNING *;
        `;
        const updatedBookingRes = await client.query(updateQuery, [
            title, event_start, event_end, location, guest_count, bookingId
        ]);
        const updated = updatedBookingRes.rows[0];

        const suggestions = {};
        const { createNotification } = require("./notification.services");

        // 4. Handle Cascading Impacts if Date or Scale changed
        if (dateChanged || scaleChanged) {
            const itemsRes = await client.query(
                `SELECT bi.*, u.email as vendor_email, vs.title as service_title, vs.category, vs.city, bi.price_quote as current_quote 
                 FROM booking_items bi 
                 JOIN users u ON bi.vendor_id = u.id 
                 JOIN vendor_services vs ON bi.service_id = vs.id 
                 WHERE bi.booking_id = $1`,
                [bookingId]
            );

            const { getSimilarVendors } = require("./vendor.services");

            for (const item of itemsRes.rows) {
                let newStatus = 'pending';
                let cancelReason = null;

                // If date changed, re-verify availability
                if (dateChanged) {
                    const availability = await checkVendorAvailability(item.vendor_id, updated.event_start, updated.event_end);
                    if (!availability.isAvailable) {
                        newStatus = 'cancelled';
                        cancelReason = `System: Date Conflict (${availability.reason})`;

                        // 🔍 SMART RECOVERY: Suggest similar vendors
                        const recommended = await getSimilarVendors(item.vendor_id, {
                            category: item.category,
                            city: item.city,
                            targetPrice: item.current_quote,
                            limit: 3
                        });
                        suggestions[item.id] = recommended;

                        await createNotification(
                            user.userId,
                            "Vendor Conflict Detected",
                            `Vendor "${item.service_title}" is unavailable on the new date. We've found replacements for you!`,
                            "booking"
                        ).catch(console.error);
                    }
                }

                // Reset item state to ensure both sides re-align on new terms
                await client.query(
                    `UPDATE booking_items 
                     SET status = $1, is_selected = FALSE, cancel_reason = $2, updated_at = NOW() 
                     WHERE id = $3`,
                    [newStatus, cancelReason, item.id]
                );

                // 📧 Notify Vendor (Email + In-App)
                await createNotification(
                    item.vendor_id,
                    "Action Required: Booking Plan Updated",
                    `The event "${current.title}" has been updated. Please review the new terms and re-confirm.`,
                    "booking"
                ).catch(console.error);

                await sendNoticeEmail(
                    item.vendor_email,
                    "Action Required: Booking Plan Updated",
                    "A customer has updated their event plan",
                    `The event "${current.title}" has been updated (Date: ${dateChanged ? 'CHANGED' : 'SAME'} | Guests: ${scaleChanged ? 'CHANGED' : 'SAME'}). Please review the new details and re-confirm your service "${item.service_title}" status.`
                ).catch(console.error);
            }
        }

        await client.query("COMMIT");
        return { booking: updated, suggestions };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

const updateBookingItemPrice = async (user, itemId, newPrice) => {
    if (user.role !== "vendor") {
        throw new Error("Only vendors can update price quotes");
    }

    const query = `
        UPDATE booking_items
        SET price_quote = $1,
            status = 'accepted',
            updated_at = NOW()
        WHERE id = $2 AND vendor_id = $3
        RETURNING *;
    `;
    const { rows } = await pool.query(query, [newPrice, itemId, user.userId]);
    
    if (rows.length === 0) throw new Error("Item not found or unauthorized");
    
    // Notify Customer of price change
    const customerRes = await pool.query(
        "SELECT email FROM users WHERE id = (SELECT customer_id FROM bookings WHERE id = (SELECT booking_id FROM booking_items WHERE id = $1))",
        [itemId]
    );
    if (customerRes.rows.length > 0) {
        await sendNoticeEmail(
            customerRes.rows[0].email,
            "Price Quote Updated",
            "Quote Update Received",
            `A vendor has updated the price quote for a service in your booking. Please review it in your dashboard.`
        ).catch(console.error);
    }

    return rows[0];
};

module.exports = {
    createBooking,
    getUserBookings,
    requestServiceBooking,
    getVendorBookingRequests,
    updateBookingItemStatus,
    selectVendorForService,
    getBookingDetails,
    completeBookingItem,
    updateBooking,
    updateBookingItemPrice
};