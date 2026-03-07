const express = require("express");
const router = express.Router();

const authenticateUser = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");

const {
    createVendorServiceController,
    getVendorServicesController,
    getAllServicesController,
    getServiceDetailsController
} = require("../controllers/service.controller");

// Vendor dashboard
router.get(
    "/vendor",
    authenticateUser,
    authorizeRoles("vendor"),
    getVendorServicesController
);

// Public services
router.get(
    "/",
    getAllServicesController
);

// Service details
router.get(
    "/:id",
    getServiceDetailsController
);

// Create service
router.post(
    "/",
    authenticateUser,
    authorizeRoles("vendor"),
    createVendorServiceController
);

router.get("/", getAllServicesController);
router.get("/:id", getServiceDetailsController);

router.post(
  "/",
  authenticateUser,
  authorizeRoles("vendor"),
  createVendorServiceController
);

router.get(
  "/vendor/me",
  authenticateUser,
  authorizeRoles("vendor"),
  getVendorServicesController
);

const {
    uploadServiceMediaController,
    getServiceMediaController,
    deleteServiceMediaController
} = require("../controllers/serviceMedia.controller");


router.post(
    "/:id/media",
    authenticateUser,
    authorizeRoles("vendor"),
    uploadServiceMediaController
);

router.get(
    "/:id/media",
    getServiceMediaController
);

router.delete(
    "/media/:mediaId",
    authenticateUser,
    authorizeRoles("vendor"),
    deleteServiceMediaController
);

module.exports = router;