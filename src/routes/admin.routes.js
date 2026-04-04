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

router.get("/stats", getStatsController);
router.get("/moderation", getModerationQueueController);
router.get("/vendor-requests", getPendingRequestsController);
router.get("/users", getAllUsersController);

router.patch("/users/:id/block", blockUserController);
router.patch("/vendor-requests/:id", reviewVendorRequestController);

module.exports = router;
