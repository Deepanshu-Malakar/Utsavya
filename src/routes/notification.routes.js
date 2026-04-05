/**
 * --- FRONTEND INTEGRATION GUIDE: Notifications ---
 * Base Path: /notifications
 * 
 * Note: All routes here require Authorization: Bearer <accessToken>
 */
const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/auth.middleware");
const {
    getNotificationsController,
    markAsReadController
} = require("../controllers/notification.controller");

router.use(authenticateUser);

// --- FRONTEND INTEGRATION GUIDE: Get My Notifications ---
// GET /notifications
router.get("/", getNotificationsController);
// --- FRONTEND INTEGRATION GUIDE: Mark Notification as Read ---
// PATCH /notifications/:id/read
router.patch("/:id/read", markAsReadController);

module.exports = router;
