const {
    createVendorService,
    getVendorServices,
    getAllServices,
    getServiceById,
    updateVendorService
} = require("../models/service.model");

const createService = async (user, data) => {

    if (user.role !== "vendor") {
        throw new Error("Only vendors can create services");
    }

    const service = await createVendorService({
        vendor_id: user.userId,
        ...data
    });

    return service;
};

const getVendorServicesService = async (user) => {

    if (user.role !== "vendor") {
        throw new Error("Only vendors can view their services");
    }

    return await getVendorServices(user.userId);
};

const getAllServicesService = async (queryParams = {}) => {

    const limit = parseInt(queryParams.limit) || 10;
    const offset = parseInt(queryParams.offset) || 0;

    return await getAllServices(limit, offset);
};

const getServiceDetailsService = async (serviceId) => {

    const service = await getServiceById(serviceId);

    if (!service) {
        throw new Error("Service not found");
    }

    return service;
};

const updateVendorServiceService = async (user, serviceId, data) => {
    if (user.role !== "vendor") {
        throw new Error("Only vendors can update services");
    }

    const updated = await updateVendorService(serviceId, user.userId, data);
    
    if (!updated) {
        throw new Error("Service not found or unauthorized");
    }

    return updated;
};

module.exports = {
    createService,
    getVendorServicesService,
    getAllServicesService,
    getServiceDetailsService,
    updateVendorServiceService
};