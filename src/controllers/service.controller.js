const {
    createService,
    getVendorServicesService,
    getAllServicesService,
    getServiceDetailsService
} = require("../services/service.services");

const createVendorServiceController = async (req, res) => {

    try {

        const service = await createService(
            req.user,
            req.body
        );

        res.status(201).json(service);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
};

const getVendorServicesController = async (req, res) => {

    try {

        const services = await getVendorServicesService(req.user);

        res.status(200).json(services);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
};

const getAllServicesController = async (req, res) => {

    try {

        const services = await getAllServicesService();

        res.status(200).json(services);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
};

const getServiceDetailsController = async (req, res) => {

    try {

        const service = await getServiceDetailsService(req.params.id);

        res.status(200).json(service);

    } catch (error) {

        res.status(404).json({
            message: error.message
        });

    }
};

module.exports = {
    createVendorServiceController,
    getVendorServicesController,
    getAllServicesController,
    getServiceDetailsController
};