const pool = require("../config/db");

const stripe = require("../config/stripe");
const { sendPaymentReceiptEmail } = require("../utils/email");

const createPayment = async (bookingId, originalAmount) => {

    const platformFee = 2; // Flat ₹2 platform fee
    const subTotal = Number(originalAmount);
    const totalAmount = subTotal + platformFee;

    // Stripe expects INR in paise (₹1 = 100 paise)
    const unitAmountPaise = Math.round(totalAmount * 100);

    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        success_url: `http://localhost:3000/booking/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `http://localhost:3000/booking/cancel`,
        custom_text: {
            submit: {
                message: "Includes flat ₹2 Utsavya Platform Fee"
            }
        },
        line_items: [
            {
                price_data: {
                    currency: 'inr',
                    product_data: {
                        name: `Booking ID: ${bookingId}`,
                        description: 'Event Management Service + Platform Fee',
                    },
                    unit_amount: unitAmountPaise, 
                },
                quantity: 1,
            },
        ],
        metadata: {
            bookingId: bookingId.toString(),
            originalAmount: subTotal.toString()
        }
    });

    const query = `
        INSERT INTO payments (booking_id, amount, stripe_session_id, status)
        VALUES ($1, $2, $3, 'initiated')
        RETURNING *
    `;

    const { rows } = await pool.query(query, [bookingId, totalAmount, session.id]);

    return {
        payment: rows[0],
        checkout_url: session.url
    };
};

const verifyStripeWebhook = async (rawBody, signature) => {
    let event;

    try {
        event = stripe.webhooks.constructEvent(
            rawBody,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        throw new Error(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const sessionId = session.id;
        const paymentIntentId = session.payment_intent;
        const bookingId = session.metadata.bookingId;

        // Update payment status
        const paymentRes = await pool.query(`
            UPDATE payments
            SET status = 'successful', 
                payment_intent_id = $2,
                updated_at = NOW()
            WHERE stripe_session_id = $1
            RETURNING *
        `, [sessionId, paymentIntentId]);

        if (paymentRes.rows.length > 0) {
            // Update booking status
            const bookingRes = await pool.query(`
                UPDATE bookings
                SET status = 'confirmed', updated_at = NOW()
                WHERE id = $1
                RETURNING customer_id
            `, [bookingId]);

            const customerId = bookingRes.rows[0].customer_id;

            // Fetch customer email to send receipt
            const userRes = await pool.query(`SELECT email FROM users WHERE id = $1`, [customerId]);
            if (userRes.rows.length > 0) {
                const amount = paymentRes.rows[0].amount;
                await sendPaymentReceiptEmail(userRes.rows[0].email, bookingId, amount).catch(console.error);
            }
        }
    }

    return { received: true };
};

module.exports = {
    createPayment,
    verifyStripeWebhook
};