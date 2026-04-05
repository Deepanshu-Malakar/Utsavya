/**
 * --- FRONTEND INTEGRATION GUIDE ---
 * Authentication & Profile Management
 * Base Path: /auth
 * 
 * Headers: { 'Authorization': 'Bearer <accessToken>' } (For protected routes)
 */
const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const validate = require("../middlewares/validate.middleware");

const {
    register,
    verify,
    login,
    googleAuth,
    refresh,
    logout
} = require("../controllers/auth.controller");

const { updateProfileController, deleteAccountController } = require("../controllers/profile.controller");
const { forgotPasswordController, resetPasswordController } = require("../controllers/passwordReset.controller");
const authenticateUser = require("../middlewares/auth.middleware");
const upload = require("../middlewares/upload.middleware");

// Rate Limiters
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: process.env.NODE_ENV === "test" ? 100 : 5, 
    message: { message: "Too many login/verification attempts from this IP. Please try again after 15 minutes." }
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: process.env.NODE_ENV === "test" ? 100 : 10,
    message: { message: "Too many accounts created from this IP. Please try again after an hour." }
});

// Validation Schemas
const registerValidation = [
    body("full_name").notEmpty().withMessage("Full name is required").trim(),
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
    validate
];

const verifyValidation = [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("otp").notEmpty().withMessage("OTP is required").isLength({ min: 6, max: 6 }).withMessage("OTP must be exactly 6 characters"),
    validate
];

const loginValidation = [
    body("email").isEmail().withMessage("Valid email is required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
    validate
];

const googleValidation = [
    body("idToken").notEmpty().withMessage("Google ID Token is required"),
    validate
];

// Auth Routes
// --- FRONTEND INTEGRATION GUIDE: Registration ---
// POST /auth/register | Body: { full_name, email, password }
router.post("/register", registerLimiter, registerValidation, register);

// --- FRONTEND INTEGRATION GUIDE: Email Verification ---
// POST /auth/verify-otp | Body: { email, otp }
// Note: Sets secure cookie and returns { accessToken }
router.post("/verify-otp", authLimiter, verifyValidation, verify);

// --- FRONTEND INTEGRATION GUIDE: Manual Login ---
// POST /auth/login | Body: { email, password }
// Note: Sets secure cookie and returns { accessToken }
router.post("/login", authLimiter, loginValidation, login);

// --- FRONTEND INTEGRATION GUIDE: Google OAuth Login ---
// POST /auth/google | Body: { idToken }
// Note: Get idToken after user selects account in your frontend. 
// Sets secure cookie and returns { accessToken }
router.post("/google", googleValidation, googleAuth);

// --- FRONTEND INTEGRATION GUIDE: Token Refresh ---
// POST /auth/refresh | No Body | Returns { accessToken }
// Note: Call this automatically every 14 mins or on 401 error.
router.post("/refresh", refresh);

// --- FRONTEND INTEGRATION GUIDE: Logout ---
// POST /auth/logout | Clears cookies/session
router.post("/logout", logout);

// Profile & Password Reset
// --- FRONTEND INTEGRATION GUIDE: Profile Management ---
// PATCH /auth/profile | Body: { full_name, phone, profile_image (file) }
// Headers: { 'Authorization': 'Bearer <accessToken>' }
router.patch("/profile", authenticateUser, upload.single("profile_image"), updateProfileController);

// --- FRONTEND INTEGRATION GUIDE: Delete Account ---
// DELETE /auth/profile | Body: { reason: "Optional" }
router.delete("/profile", authenticateUser, deleteAccountController);

// --- FRONTEND INTEGRATION GUIDE: Password Recovery ---
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

module.exports = router;