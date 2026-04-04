const notificationService = require("../services/notification.services");
const asyncHandler = require("../utils/asyncHandler");

const getNotificationsController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const notifications = await notificationService.getUserNotifications(userId, limit, offset);
    res.status(200).json({
        success: true,
        data: notifications
    });
});

const markAsReadController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const notificationId = req.params.id;
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
    markAsReadController
};
