/**
 * --- FRONTEND INTEGRATION GUIDE: Vendor Management ---
 * Base Path: /vendors
 */
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const authenticateUser = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const validate = require("../middlewares/validate.middleware");
const {
    requestVendor,
    reviewVendorRequestController,
    searchVendorsController,
    getVendorProfileController,
    reportVendorController
} = require("../controllers/vendor.controller");

const {
    addBlockController,
    getBlocksController,
    removeBlockController
} = require("../controllers/vendorAvailability.controller");

const { getVendorBookingRequestsController } = require("../controllers/booking.controller");
const { updateBookingItemStatusController } = require("../controllers/booking.controller");

// Validation Schema for requesting vendor role
const vendorRequestValidation = [
    body("business_name").notEmpty().withMessage("Business name is required").trim(),
    body("city").notEmpty().withMessage("City is required").trim(),
    body("documents_url").notEmpty().withMessage("Documents link is required").isURL().withMessage("Documents link must be a valid URL").trim(),
    validate
];

const reportVendorValidation = [
    body("reason")
        .notEmpty()
        .withMessage("Complaint reason is required")
        .isLength({ min: 5, max: 200 })
        .withMessage("Reason must be between 5 and 200 characters")
        .trim(),
    body("details")
        .optional({ nullable: true })
        .isLength({ max: 2000 })
        .withMessage("Details cannot exceed 2000 characters")
        .trim(),
    validate
];

// Route to request becoming a vendor
// --- FRONTEND INTEGRATION GUIDE: Become a Vendor ---
// POST /vendors/request | Body: { business_name, city }
// Required: Authorization: Bearer <accessToken>
// Note: Only for users with "customer" role.
router.post(
    "/request",
    authenticateUser,
    authorizeRoles("customer"),
    vendorRequestValidation,
    requestVendor
);

router.patch(
    "/:id/review",
    authenticateUser,
    authorizeRoles("admin"),
    reviewVendorRequestController
);

// Vendor Update Booking Status
router.patch(
    "/booking-requests/:id",
    authenticateUser,
    authorizeRoles("vendor"),
    updateBookingItemStatusController
);

// View My Booking Requests
router.get(
    "/booking-requests",
    authenticateUser,
    authorizeRoles("vendor"),
    getVendorBookingRequestsController
);

router.get("/search", searchVendorsController); // Explicit search route
router.get("/", searchVendorsController);

// --- FRONTEND INTEGRATION GUIDE: Get Vendor Details ---
// GET /vendors/:id
router.get("/:id", getVendorProfileController);

// Vendor Availability Routes
// --- FRONTEND INTEGRATION GUIDE: Manage Availability ---
// POST /vendors/:id/availability | Body: { start_date, end_date, reason }
// Required: Authorization: Bearer <accessToken> (Vendor only)
router.post(
    "/:id/availability",
    authenticateUser,
    authorizeRoles("vendor", "admin"),
    addBlockController
);

router.get(
    "/:id/availability",
    getBlocksController
);

router.delete(
    "/:id/availability/:blockId",
    authenticateUser,
    authorizeRoles("vendor", "admin"),
    removeBlockController
);

router.post(
    "/:id/report",
    authenticateUser,
    authorizeRoles("customer"),
    reportVendorValidation,
    reportVendorController
);

module.exports = router;
