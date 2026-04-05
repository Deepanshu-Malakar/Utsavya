/**
 * --- FRONTEND INTEGRATION GUIDE: Reviews & Ratings ---
 * Base Path: /reviews
 */
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middlewares/validate.middleware");

const authenticateUser = require("../middlewares/auth.middleware");
const { createReviewController } = require("../controllers/review.controller");
const { getVendorRatingsController } = require("../controllers/review.controller");
const { getVendorReviewsController } = require("../controllers/review.controller");
const { uploadReviewMediaController } = require("../controllers/review.controller");
const upload = require("../middlewares/upload.middleware");

// Validation Schema for creating a review
const createReviewValidation = [
    body("booking_item_id").notEmpty().withMessage("Booking Item ID is required").isUUID().withMessage("Valid Booking Item ID is required"),
    body("rating").isInt({ min: 1, max: 5 }).withMessage("Rating must be an integer between 1 and 5"),
    body("comment").optional().isString().trim(),
    validate
];

// Route to create a new review
// --- FRONTEND INTEGRATION GUIDE: Create Review ---
// POST /reviews | Body: { booking_item_id, rating, comment }
// Required: Authorization: Bearer <accessToken>
router.post("/", authenticateUser, createReviewValidation, createReviewController);
// --- FRONTEND INTEGRATION GUIDE: Get Vendor Ratings ---
// GET /reviews/vendors/:id/ratings
router.get("/vendors/:id/ratings", getVendorRatingsController);

// --- FRONTEND INTEGRATION GUIDE: Get Vendor Reviews ---
// GET /reviews/vendors/:id/reviews
router.get("/vendors/:id/reviews", getVendorReviewsController);
// --- FRONTEND INTEGRATION GUIDE: Upload Review Media ---
// POST /reviews/:id/media | Body: FormData { files: [<image/video>, ...] }
// Note: Maximum 5 files allowed.
router.post("/:id/media", authenticateUser, upload.array("files", 5), uploadReviewMediaController);

module.exports = router;