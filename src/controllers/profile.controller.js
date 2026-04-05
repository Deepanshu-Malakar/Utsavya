/**
 * --- FRONTEND INTEGRATION GUIDE: Profile Management ---
 * Base Path: /auth (via auth router)
 */
const profileService = require("../services/profile.services");
const asyncHandler = require("../utils/asyncHandler");

// UPDATE PROFILE
// --- FRONTEND INTEGRATION GUIDE: Update Profile ---
// PATCH /auth/profile | Body: FormData (for images) or JSON
// Required: Authorization: Bearer <accessToken>
// Allowed Fields: { full_name, phone, profile_image }
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

// --- FRONTEND INTEGRATION GUIDE: Delete Account ---
// DELETE /auth/profile | Body: { reason: "Optional" }
// Required: Authorization: Bearer <accessToken>
// Note: This permanently deletes all user data and Cloudinary media!
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
