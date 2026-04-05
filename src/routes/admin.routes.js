/**
 * --- FRONTEND INTEGRATION GUIDE: Admin Dashboard ---
 * Base Path: /admin
 * 
 * Note: All routes here require BOTH:
 * 1. Authorization: Bearer <accessToken>
 * 2. User role must be 'admin'
 */
const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const {
    getStatsController,
    getModerationQueueController,
    getPendingRequestsController,
    getAllUsersController,
    blockUserController,
    reviewVendorRequestController
} = require("../controllers/admin.controller");

// PROTECT ALL ROUTES FOR ADMINS ONLY
router.use(authenticateUser, authorizeRoles("admin"));

// --- FRONTEND INTEGRATION GUIDE: Admin Stats ---
// GET /admin/stats | Returns: Business overview statistics
router.get("/stats", getStatsController);
router.get("/moderation", getModerationQueueController);
// --- FRONTEND INTEGRATION GUIDE: Pending Vendor Requests ---
// GET /admin/vendor-requests | Returns: List of vendors waiting for approval
router.get("/vendor-requests", getPendingRequestsController);
router.get("/users", getAllUsersController);

router.patch("/users/:id/block", blockUserController);
// --- FRONTEND INTEGRATION GUIDE: Review Vendor Request ---
// PATCH /admin/vendor-requests/:id | Body: { status: 'approved' | 'rejected' }
router.patch("/vendor-requests/:id", reviewVendorRequestController);

module.exports = router;
