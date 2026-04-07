/**
 * --- FRONTEND INTEGRATION GUIDE: Bookings ---
 * Base Path: /bookings
 * 
 * Note: A 'Booking' is an event (e.g. "Wedding"). 
 * A 'Booking Item' is a specific service (e.g. "Catering") attached to that event.
 */
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
const {
    getReviewableBookingItemController,
    uploadBookingMemoriesController,
    getVendorCompletedBookingItemsController,
    getVendorMemoriesController,
    getCustomerMemoriesController,
    deleteBookingMemoryController
} = require("../controllers/bookingMemory.controller");
const upload = require("../middlewares/upload.middleware");

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
// --- FRONTEND INTEGRATION GUIDE: Create Event Booking ---
// POST /bookings | Body: { title, event_start, event_end }
// Required: Authorization: Bearer <accessToken>
router.post("/", authenticateUser, createBookingValidation, createBookingController);

// --- FRONTEND INTEGRATION GUIDE: List My Bookings ---
// GET /bookings
// Required: Authorization: Bearer <accessToken>
router.get("/", authenticateUser, getBookingsController);
router.patch("/:id", authenticateUser, updateBookingController); // NEW: Customer Edit

// Route to manage booking items (services)
// --- FRONTEND INTEGRATION GUIDE: Request Service for Booking ---
// POST /bookings/items | Body: { service_id, booking_id, vendor_id }
// Required: Authorization: Bearer <accessToken>
router.post("/items", authenticateUser, requestServiceBookingValidation, requestServiceBookingController);

// --- FRONTEND INTEGRATION GUIDE: Vendor Price Quote ---
// PATCH /bookings/items/:itemId/price | Body: { price_quoted }
// Required: Authorization: Bearer <accessToken> (Vendor only)
router.patch("/items/:itemId/price", authenticateUser, updateBookingItemPriceController);

// Select a vendor for a service
router.patch(
    "/items/:id/select",
    authenticateUser,
    selectVendorController
);


// Update booking item status
router.patch(
    "/items/:id/status",
    authenticateUser,
    updateBookingItemStatusController
);

router.get(
    "/reviewable-item",
    authenticateUser,
    getReviewableBookingItemController
);

router.get(
    "/vendor/completed-items",
    authenticateUser,
    getVendorCompletedBookingItemsController
);

router.get(
    "/vendor/memories",
    authenticateUser,
    getVendorMemoriesController
);

router.get(
    "/memories",
    authenticateUser,
    getCustomerMemoriesController
);

router.post(
    "/items/:id/memories",
    authenticateUser,
    upload.array("files", 10),
    uploadBookingMemoriesController
);

router.delete(
    "/memories/:id",
    authenticateUser,
    deleteBookingMemoryController
);

// --- FRONTEND INTEGRATION GUIDE: Get Full Booking Details ---
// GET /bookings/:id
// Required: Authorization: Bearer <accessToken>
router.get(
    "/:id",
    authenticateUser,
    getBookingDetailsController
);

// --- FRONTEND INTEGRATION GUIDE: Mark Service as Complete ---
// PATCH /bookings/items/:id/complete
// Note: This triggers the final payment/payout logic.
router.patch(
    "/items/:id/complete",
    authenticateUser,
    completeBookingController
);

// --- FRONTEND INTEGRATION GUIDE: Cancel Service ---
// PATCH /bookings/items/:id/cancel
router.patch(
    "/items/:id/cancel",
    authenticateUser,
    cancelBookingItemController
);

module.exports = router;
