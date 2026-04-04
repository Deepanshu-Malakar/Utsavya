const profileService = require("../services/profile.services");
const asyncHandler = require("../utils/asyncHandler");

const updateProfileController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const updates = req.body;
    const file = req.file;

    const updatedUser = await profileService.updateProfile(userId, userRole, updates, file);

    res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser
    });
});

const deleteAccountController = asyncHandler(async (req, res) => {
    const userId = req.user.userId;
    const { reason } = req.body || {};
    
    // The service now fetches the email by userId before deletion and logs the reason
    const result = await profileService.deleteAccount(userId, reason);

    res.status(200).json({
        success: true,
        message: result.message
    });
});

module.exports = {
    updateProfileController,
    deleteAccountController
};
