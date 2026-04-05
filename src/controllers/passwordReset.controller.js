/**
 * --- FRONTEND INTEGRATION GUIDE: Password Recovery ---
 * Base Path: /auth (via auth router)
 */
const passwordResetService = require("../services/passwordReset.services");
const asyncHandler = require("../utils/asyncHandler");

const forgotPasswordController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Forgot Password ---
// POST /auth/forgot-password | Body: { email }
// Result: { success: true, message: "OTP sent to your email" }
    const { email } = req.body;
    const result = await passwordResetService.forgotPassword(email);
    res.status(200).json({
        success: true,
        message: result.message,
        testOtp: result.testOtp // Only returned in test mode
    });
});

const resetPasswordController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Reset Password ---
// POST /auth/reset-password | Body: { email, otp, newPassword }
// Result: { success: true, message: "Password updated" }
    const { email, otp, newPassword } = req.body;
    const result = await passwordResetService.resetPassword(email, otp, newPassword);
    res.status(200).json({
        success: true,
        message: result.message
    });
});

module.exports = {
    forgotPasswordController,
    resetPasswordController
};
