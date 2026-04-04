const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middlewares/validate.middleware");

const authenticateUser = require("../middlewares/auth.middleware");
const { 
    createBookingController, 
    getBookingsController, 
    updateBookingController,
    updateBookingItemPriceController,
    requestServiceBookingController,
    selectVendorController,
    getBookingDetailsController,
    completeBookingController,
    updateBookingItemStatusController,
    cancelBookingItemController
} = require("../controllers/booking.controller");

// Validation Schema for creating a new booking
const createBookingValidation = [
    body("title").notEmpty().withMessage("Title is required").trim(),
    body("event_start").isISO8601().withMessage("Valid start time is required"),
    body("event_end").isISO8601().withMessage("Valid end time is required"),
    validate
];

// Validation Schema for adding a service to a booking
const requestServiceBookingValidation = [
    body("service_id").notEmpty().withMessage("Service ID is required").isUUID().withMessage("Valid Service ID is required"),
    body("booking_id").notEmpty().withMessage("Booking ID is required").isUUID().withMessage("Valid Booking ID is required"),
    body("vendor_id").notEmpty().withMessage("Vendor ID is required").isUUID().withMessage("Valid Vendor ID is required"),
    validate
];

// Route to create and manage bookings
router.post("/", authenticateUser, createBookingValidation, createBookingController);
router.get("/", authenticateUser, getBookingsController);
router.patch("/:id", authenticateUser, updateBookingController); // NEW: Customer Edit

// Route to manage booking items (services)
router.post("/items", authenticateUser, requestServiceBookingValidation, requestServiceBookingController);
router.patch("/items/:itemId/price", authenticateUser, updateBookingItemPriceController); // NEW: Vendor Price Edit

router.patch(
    "/items/:id/select",
    authenticateUser,
    selectVendorController
);


router.patch(
    "/items/:id/status",
    authenticateUser,
    updateBookingItemStatusController
);

router.get(
    "/:id",
    authenticateUser,
    getBookingDetailsController
);

router.patch(
    "/items/:id/complete",
    authenticateUser,
    completeBookingController
);

router.patch(
    "/items/:id/cancel",
    authenticateUser,
    cancelBookingItemController
);

module.exports = router;