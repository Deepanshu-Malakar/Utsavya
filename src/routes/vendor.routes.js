const express = require("express");
const router = express.Router();

const authenticateUser = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const {
    requestVendor,
    reviewVendorRequestController
} = require("../controllers/vendor.controller");

router.post(
    "/request",
    authenticateUser,
    authorizeRoles("customer"),
    requestVendor
);

router.patch(
    "/:id/review",
    authenticateUser,
    authorizeRoles("admin"),
    reviewVendorRequestController
);

module.exports = router;