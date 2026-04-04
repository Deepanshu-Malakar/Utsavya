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
router.post("/register", registerLimiter, registerValidation, register);
router.post("/verify-otp", authLimiter, verifyValidation, verify);
router.post("/login", authLimiter, loginValidation, login);
router.post("/google", googleValidation, googleAuth);
router.post("/refresh", refresh);
router.post("/logout", logout);

// Profile & Password Reset
router.patch("/profile", authenticateUser, upload.single("profile_image"), updateProfileController);
router.delete("/profile", authenticateUser, deleteAccountController);
router.post("/forgot-password", forgotPasswordController);
router.post("/reset-password", resetPasswordController);

module.exports = router;