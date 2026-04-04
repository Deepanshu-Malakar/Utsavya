const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const validate = require("../middlewares/validate.middleware");

const authenticateUser = require("../middlewares/auth.middleware");
const authorizeRoles = require("../middlewares/role.middleware");
const upload = require("../middlewares/upload.middleware");

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

// Validation Schema for creating a vendor service
const createServiceValidation = [
    body("title").notEmpty().withMessage("Service title is required").trim(),
    body("city").notEmpty().withMessage("City is required").trim(),
    body("price").isNumeric().withMessage("Valid price is required"),
    body("price_type").notEmpty().withMessage("Price type is required"),
    validate
];

// Route to Create service
router.post(
    "/",
    authenticateUser,
    authorizeRoles("vendor"),
    createServiceValidation,
    createVendorServiceController
);

router.get("/", getAllServicesController);
router.get("/:id", getServiceDetailsController);

// additional specific routes from duplicate block above:
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
    upload.single("file"),
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