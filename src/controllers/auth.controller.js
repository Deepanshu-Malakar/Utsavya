/**
 * --- FRONTEND INTEGRATION GUIDE: Auth Overview ---
 * 1. The backend uses 'HttpOnly' cookies for the refreshToken (Security Best Practice).
 * 2. The frontend MUST store the 'accessToken' in memory/application state.
 * 3. Include accessToken in headers for protected routes: { Authorization: 'Bearer <token>' }
 */
const {
    registerUser,
    verifyOtp,
    loginUser,
    googleAuthService,
    refreshTokenService,
    logoutService
} = require("../services/auth.services");
const asyncHandler = require("../utils/asyncHandler");

// Helper to set refresh token cookie
const setRefreshCookie = (res, refreshToken) => {
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
};

// REGISTER
// --- FRONTEND INTEGRATION GUIDE: Registration ---
// POST /auth/register
// Result: { message: "OTP sent to your email" }
const register = asyncHandler(async (req, res) => {
    const result = await registerUser(req.body);
    res.status(201).json(result);
});

// VERIFY OTP
// --- FRONTEND INTEGRATION GUIDE: OTP Verification ---
// POST /auth/verify-otp | Body: { email, otp }
// Result: { accessToken: "..." }
// Note: Store accessToken and use it for Bearer headers.
const verify = asyncHandler(async (req, res) => {
    const { accessToken, refreshToken } = await verifyOtp(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken });
});

// LOGIN
// --- FRONTEND INTEGRATION GUIDE: Manual Login ---
// POST /auth/login | Body: { email, password }
// Result: { accessToken: "..." }
const login = asyncHandler(async (req, res) => {
    const { accessToken, refreshToken } = await loginUser(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken });
});

// GOOGLE AUTH
// --- FRONTEND INTEGRATION GUIDE: Google OAuth ---
// POST /auth/google | Body: { idToken }
// Note: The idToken comes from the @react-oauth/google or similar library.
// Result: { accessToken: "..." }
const googleAuth = asyncHandler(async (req, res) => {
    const { idToken } = req.body;
    const { accessToken, refreshToken } = await googleAuthService(idToken);
    setRefreshCookie(res, refreshToken);
    res.status(200).json({ accessToken });
});

// GOOGLE CLIENT CONFIG
const getGoogleClientConfig = asyncHandler(async (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(500).json({ message: "Google OAuth is not configured" });
    }
    res.status(200).json({ clientId: process.env.GOOGLE_CLIENT_ID });
});


// REFRESH
// --- FRONTEND INTEGRATION GUIDE: Silent Refresh ---
// POST /auth/refresh | Body: None
// Note: Call this automatically every 14 mins to get a fresh accessToken.
// Result: { accessToken: "..." }
const refresh = asyncHandler(async (req, res) => {
    const oldRefreshToken = req.cookies.refreshToken;
    if (!oldRefreshToken) {
        return res.status(401).json({ message: "No refresh token" });
    }
    
    try {
        const { accessToken, refreshToken: newRefreshToken } = await refreshTokenService(oldRefreshToken);
        
        // Rotate the cookie with the new token
        setRefreshCookie(res, newRefreshToken);
        
        res.status(200).json({ accessToken });
    } catch (error) {
        // If rotation fails (e.g., token already consumed), clear the cookie to force re-login
        res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "strict",
            secure: process.env.NODE_ENV === "production"
        });
        res.status(401).json({ message: error.message });
    }
});

// LOGOUT
const logout = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        return res.status(400).json({ message: "No refresh token" });
    }
    await logoutService(refreshToken);
    res.clearCookie("refreshToken", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production"
    });
    res.status(200).json({ message: "Logged out successfully" });
});

module.exports = {
    register,
    verify,
    login,
    googleAuth,
    getGoogleClientConfig,
    refresh,
    logout
};
