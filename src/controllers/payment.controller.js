/**
 * --- FRONTEND INTEGRATION GUIDE: Payment Controllers ---
 * Base Path: /payments
 */
const {
    createPayment,
    verifyStripeWebhook
} = require("../services/payment.services");
const asyncHandler = require("../utils/asyncHandler");

const createPaymentController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Initiate Payment ---
// POST /payments | Body: { booking_id, amount }
// Returns: { url: "https://checkout.stripe.com/..." }
// FE ACTION: window.location.href = res.data.url;
    const { booking_id, amount } = req.body;
    const payment = await createPayment(booking_id, amount);
    console.log("PAYMENT CREATED:", payment);
    res.status(201).json(payment);
});

const stripeWebhookController = asyncHandler(async (req, res) => {
    // Crucial: req.body MUST be raw buffer here for crypto signature to work!
    const signature = req.headers['stripe-signature'];
    const result = await verifyStripeWebhook(req.body, signature);
    res.status(200).json(result);
});

module.exports = {
    createPaymentController,
    stripeWebhookController
};