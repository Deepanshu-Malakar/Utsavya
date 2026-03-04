const express = require("express");
const router = express.Router();

const {
    register,
    verify,
    login,
    refresh,
    logout
} = require("../controllers/auth.controller");


// Auth Routes
router.post("/register", register);
router.post("/verify-otp", verify);
router.post("/login", login);
router.post("/refresh", refresh);
router.post("/logout", logout);


module.exports = router;