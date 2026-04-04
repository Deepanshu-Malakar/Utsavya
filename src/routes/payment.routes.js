const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middlewares/validate.middleware");

const {
    createPaymentController
} = require("../controllers/payment.controller");

const authenticateUser = require("../middlewares/auth.middleware");

// Validation Schema for creating a payment
const createPaymentValidation = [
    body("booking_id").notEmpty().withMessage("Booking ID is required").isUUID().withMessage("Valid Booking ID is required"),
    body("amount").isNumeric().withMessage("Valid amount is required"),
    validate
];

// Route to initiate a payment
router.post("/", authenticateUser, createPaymentValidation, createPaymentController);

// Webhook endpoint is mapped in src/index.js directly to avoid body-parser conflicts!

module.exports = router;