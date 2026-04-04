const express = require("express");
const router = express.Router();
const authenticateUser = require("../middlewares/auth.middleware");
const {
    getNotificationsController,
    markAsReadController
} = require("../controllers/notification.controller");

router.use(authenticateUser);

router.get("/", getNotificationsController);
router.patch("/:id/read", markAsReadController);

module.exports = router;
