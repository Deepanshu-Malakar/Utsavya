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
    validate
];

// Route to request becoming a vendor
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

router.patch(
    "/booking-requests/:id",
    authenticateUser,
    authorizeRoles("vendor"),
    updateBookingItemStatusController
);

router.get(
    "/booking-requests",
    authenticateUser,
    authorizeRoles("vendor"),
    getVendorBookingRequestsController
);

router.get("/search", searchVendorsController); // Explicit search route
router.get("/", searchVendorsController);
router.get("/:id", getVendorProfileController);

// Vendor Availability Routes
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
    reportVendorController
);

module.exports = router;