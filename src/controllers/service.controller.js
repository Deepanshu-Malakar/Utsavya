const {
    createService,
    getVendorServicesService,
    getAllServicesService,
    getServiceDetailsService
} = require("../services/service.services");
const asyncHandler = require("../utils/asyncHandler");

const createVendorServiceController = asyncHandler(async (req, res) => {
    const service = await createService(
        req.user,
        req.body
    );
    res.status(201).json(service);
});

const getVendorServicesController = asyncHandler(async (req, res) => {
    const services = await getVendorServicesService(req.user);
    res.status(200).json(services);
});

const getAllServicesController = asyncHandler(async (req, res) => {
    const services = await getAllServicesService(req.query);
    res.status(200).json(services);
});

const getServiceDetailsController = asyncHandler(async (req, res) => {
    const service = await getServiceDetailsService(req.params.id);
    res.status(200).json(service);
});

module.exports = {
    createVendorServiceController,
    getVendorServicesController,
    getAllServicesController,
    getServiceDetailsController
};