const notificationService = require("../services/notification.services");
const asyncHandler = require("../utils/asyncHandler");

const getNotificationsController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    // Standardize on unread notifications for now as per test requirements
    const notifications = await notificationService.getUnreadNotifications(userId);
    res.status(200).json({
        success: true,
        data: notifications
    });
});

const getUnreadNotificationsController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notifications = await notificationService.getUnreadNotifications(userId);
    res.status(200).json({ success: true, data: notifications });
});

const markAsReadController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;
    if (!notificationId) {
        return res.status(400).json({ success: false, message: "Notification ID is required" });
    }
    const notification = await notificationService.markAsRead(notificationId, userId);
    if (!notification) {
        return res.status(404).json({
            success: false,
            message: "Notification not found"
        });
    }
    res.status(200).json({
        success: true,
        data: notification
    });
});

module.exports = {
    getNotificationsController,
    getUnreadNotificationsController,
    markAsReadController
};
