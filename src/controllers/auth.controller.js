const {
    registerUser,
    verifyOtp,
    loginUser,
    refreshTokenService,
    logoutService
} = require("../services/auth.services");


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
const register = async (req, res) => {
    try {
        const result = await registerUser(req.body);
        res.status(201).json(result);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


// VERIFY OTP
const verify = async (req, res) => {
    try {
        const { accessToken, refreshToken } = await verifyOtp(req.body);

        setRefreshCookie(res, refreshToken);

        res.status(200).json({ accessToken });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


// LOGIN
const login = async (req, res) => {
    try {
        const { accessToken, refreshToken } = await loginUser(req.body);

        setRefreshCookie(res, refreshToken);

        res.status(200).json({ accessToken });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};


// REFRESH
const refresh = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token" });
        }

        const { accessToken } = await refreshTokenService(refreshToken);

        res.status(200).json({ accessToken });
    } catch (error) {
        res.status(401).json({ message: error.message });
    }
};


// LOGOUT
const logout = async (req, res) => {
    try {
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
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

module.exports = {
    register,
    verify,
    login,
    refresh,
    logout
};