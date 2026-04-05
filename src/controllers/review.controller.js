/**
 * --- FRONTEND INTEGRATION GUIDE: Review Controllers ---
 * Base Path: /reviews
 */
const { createReview } = require("../services/review.services");
const { getVendorRatings } = require("../services/review.services");
const { getVendorReviews } = require("../services/review.services");
const { uploadReviewMedia } = require("../services/review.services");
const asyncHandler = require("../utils/asyncHandler");

const createReviewController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Create Review ---
// POST /reviews | Body: { booking_item_id, rating, comment }
// Required: Authorization: Bearer <accessToken>
    const review = await createReview(req.user, req.body);
    console.log("REVIEW RESPONSE:", review);
    res.status(201).json(review);
});

const getVendorRatingsController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Vendor Ratings ---
// GET /reviews/vendors/:id/ratings
    const ratings = await getVendorRatings(req.params.id);
    console.log("RATINGS:", ratings);
    res.status(200).json(ratings);
});

const getVendorReviewsController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Vendor Reviews ---
// GET /reviews/vendors/:id/reviews
    const reviews = await getVendorReviews(
        req.params.id,
        req.query
    );
    console.log("REVIEWS:", reviews);
    res.status(200).json({ reviews });
});

// --- FRONTEND INTEGRATION GUIDE: Upload Review Media ---
// POST /reviews/:id/media | Body: FormData { files: [...] }
const uploadReviewMediaController = asyncHandler(async (req, res) => {
    const media = await uploadReviewMedia(
        req.user,
        req.params.id,
        req.files
    );
    res.status(201).json(media);
});

module.exports = {
    createReviewController,
    getVendorRatingsController,
    getVendorReviewsController,
    uploadReviewMediaController
};