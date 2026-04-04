const adminService = require("../services/admin.services");
const vendorService = require("../services/vendor.services");
const asyncHandler = require("../utils/asyncHandler");

const getStatsController = asyncHandler(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    res.status(200).json({
        success: true,
        data: stats
    });
});

const getModerationQueueController = asyncHandler(async (req, res) => {
    const reports = await adminService.getModerationQueue();
    res.status(200).json({
        success: true,
        data: reports
    });
});

const getPendingRequestsController = asyncHandler(async (req, res) => {
    const list = await adminService.getPendingVendorRequests();
    res.status(200).json({
        success: true,
        data: list
    });
});

const getAllUsersController = asyncHandler(async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;
    const users = await adminService.getAllUsers(limit, offset);
    res.status(200).json({
        success: true,
        data: users
    });
});

const blockUserController = asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const blocked = await adminService.blockUser(userId, req.user.userId);
    res.status(200).json({
        success: true,
        message: "User/Vendor has been blocked and deactivated",
        data: blocked
    });
});

const reviewVendorRequestController = asyncHandler(async (req, res) => {
    const requestId = req.params.id;
    const result = await vendorService.reviewVendorRequest(req.user, requestId, req.body);
    res.status(200).json({
        success: true,
        message: `Vendor request ${req.body.status} successfully`,
        data: result
    });
});

module.exports = {
    getStatsController,
    getModerationQueueController,
    getPendingRequestsController,
    getAllUsersController,
    blockUserController,
    reviewVendorRequestController
};
