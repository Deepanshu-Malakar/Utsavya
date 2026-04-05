/**
 * --- FRONTEND INTEGRATION GUIDE: Service Controllers ---
 * Base Path: /services
 */
const {
    createService,
    getVendorServicesService,
    getAllServicesService,
    getServiceDetailsService
} = require("../services/service.services");
const asyncHandler = require("../utils/asyncHandler");

const createVendorServiceController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Create Service ---
// POST /services | Body: { title, city, price, price_type, category, description }
// Required: Authorization: Bearer <accessToken> (Vendor only)
    const service = await createService(
        req.user,
        req.body
    );
    res.status(201).json(service);
});

const getVendorServicesController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: My Services (Vendor Own) ---
// GET /services/vendor
// Required: Authorization: Bearer <accessToken>
    const services = await getVendorServicesService(req.user);
    res.status(200).json(services);
});

const getAllServicesController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Browse Services ---
// GET /services?city=...&category=...
    const services = await getAllServicesService(req.query);
    res.status(200).json(services);
});

const getServiceDetailsController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Service Details ---
// GET /services/:id
    const service = await getServiceDetailsService(req.params.id);
    res.status(200).json(service);
});

module.exports = {
    createVendorServiceController,
    getVendorServicesController,
    getAllServicesController,
    getServiceDetailsController
};