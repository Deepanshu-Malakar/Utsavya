/**
 * --- FRONTEND INTEGRATION GUIDE: Payments (Stripe) ---
 * Base Path: /payments
 */
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middlewares/validate.middleware");

const {
    createPaymentController,
    verifyPaymentController
} = require("../controllers/payment.controller");

const authenticateUser = require("../middlewares/auth.middleware");

// Validation Schema for creating a payment
const createPaymentValidation = [
    body("booking_id").notEmpty().withMessage("Booking ID is required").isUUID().withMessage("Valid Booking ID is required"),
    body("amount").isNumeric().withMessage("Valid amount is required"),
    validate
];

// Route to initiate a payment
// --- FRONTEND INTEGRATION GUIDE: Initiate Payment ---
// POST /payments | Body: { booking_id, amount }
// Required: Authorization: Bearer <accessToken>
// Note: This returns a Stripe Checkout URL. The frontend should 
// redirect the user to that URL.
router.post("/", authenticateUser, createPaymentValidation, createPaymentController);

// --- FRONTEND INTEGRATION GUIDE: Verify Payment Status (Success Redirect) ---
// GET /payments/verify/:bookingId
// Required: Authorization: Bearer <accessToken>
router.get("/verify/:bookingId", authenticateUser, verifyPaymentController);

// Webhook endpoint is mapped in src/index.js directly to avoid body-parser conflicts!

module.exports = router;