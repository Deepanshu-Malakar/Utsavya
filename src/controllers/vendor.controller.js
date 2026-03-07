const { submitVendorRequest } = require("../services/vendor.services");
const { reviewVendorRequest } = require("../services/vendor.services");

const requestVendor = async (req, res) => {
    try {

        const vendorRequest = await submitVendorRequest(
            req.user,
            req.body
        );

        res.status(201).json(vendorRequest);

    } catch (error) {
        res.status(400).json({
            message: error.message
        });
    }
};

const reviewVendorRequestController = async (req, res) => {

    try {

        const request = await reviewVendorRequest(
            req.user,
            req.params.id,
            req.body
        );

        res.status(200).json(request);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
};

module.exports = {
    requestVendor,
    reviewVendorRequestController
};