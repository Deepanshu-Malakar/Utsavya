const pool = require("../config/db");
const stripe = require("../config/stripe");
const { sendNoticeEmail } = require("../utils/email");

const cancelBookingItem = async (user, itemId, reason) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Get the booking item and associated payment details
        const itemQuery = `
            SELECT 
                bi.*, 
                b.customer_id, 
                u.email as customer_email,
                v.email as vendor_email,
                p.id as payment_id,
                p.payment_intent_id,
                p.amount as paid_amount,
                vs.title as service_title
            FROM booking_items bi
            JOIN bookings b ON bi.booking_id = b.id
            JOIN users u ON b.customer_id = u.id
            JOIN users v ON bi.vendor_id = v.id
            JOIN vendor_services vs ON bi.service_id = vs.id
            LEFT JOIN payments p ON p.booking_id = b.id AND p.status = 'successful'
            WHERE bi.id = $1
        `;
        const itemRes = await client.query(itemQuery, [itemId]);
        if (itemRes.rows.length === 0) throw new Error("Booking item not found");

        const item = itemRes.rows[0];

        // 2. Authorization Check
        const isCustomer = user.userId === item.customer_id;
        const isVendor = user.userId === item.vendor_id;
        if (!isCustomer && !isVendor && user.role !== 'admin') {
            throw new Error("Unauthorized to cancel this booking item");
        }

        if (item.status === 'cancelled' || item.status === 'completed') {
            throw new Error(`Cannot cancel a booking item that is already ${item.status}`);
        }

        // 3. Refund Logic (if paid)
        let refundData = null;
        if (item.payment_intent_id) {
            const cancelledBy = isVendor ? 'vendor' : 'customer';
            // Calculate Refund: 100% for Vendor cancel, 95% for Customer cancel (5% penalty)
            const refundPercent = cancelledBy === 'vendor' ? 1.0 : 0.95;
            const refundAmount = Math.floor(item.paid_amount * refundPercent * 100) / 100;

            try {
                const stripeRefund = await stripe.refunds.create({
                    payment_intent: item.payment_intent_id,
                    amount: Math.round(refundAmount * 100) // stripe expects paise
                });

                // Record Refund in DB
                const refundRes = await client.query(`
                    INSERT INTO refunds (payment_id, amount, stripe_refund_id, status)
                    VALUES ($1, $2, $3, 'successful')
                    RETURNING *
                `, [item.payment_id, refundAmount, stripeRefund.id]);
                
                refundData = refundRes.rows[0];
            } catch (stripeErr) {
                console.error("Stripe Refund Failed:", stripeErr.message);
                throw new Error("Stripe refund failed: " + stripeErr.message);
            }
        }

        // 4. Update Booking Item Status
        const cancelledBy = isVendor ? 'vendor' : 'customer';
        await client.query(`
            UPDATE booking_items
            SET status = 'cancelled',
                cancelled_by = $2,
                cancel_reason = $3,
                cancelled_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
        `, [itemId, cancelledBy, reason]);

        await client.query("COMMIT");

        // 5. Send Notification Emails
        const recipientEmail = isVendor ? item.customer_email : item.vendor_email;
        const subject = `Booking Cancelled: ${item.service_title}`;
        const title = "Booking Cancellation Notice";
        const body = `The booking for "${item.service_title}" has been cancelled by the ${cancelledBy}. Reason: ${reason || 'Not specified'}. ${refundData ? `A refund of ₹${refundData.amount} has been processed.` : ''}`;
        
        await sendNoticeEmail(recipientEmail, subject, title, body).catch(console.error);

        return {
            success: true,
            message: "Booking item cancelled successfully",
            refund: refundData
        };

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    cancelBookingItem
};
