const { submitVendorRequest, reviewVendorRequest, getVendorProfile, searchVendors, reportVendor } = require("../services/vendor.services");
const asyncHandler = require("../utils/asyncHandler");

const requestVendor = asyncHandler(async (req, res) => {
    const vendorRequest = await submitVendorRequest(
        req.user,
        req.body
    );
    res.status(201).json(vendorRequest);
});

const reviewVendorRequestController = asyncHandler(async (req, res) => {
    const request = await reviewVendorRequest(
        req.user,
        req.params.id,
        req.body
    );
    res.status(200).json(request);
});

const getVendorProfileController = asyncHandler(async (req, res) => {
    const profile = await getVendorProfile(req.params.id);
    console.log("VENDOR PROFILE:", profile);
    res.status(200).json(profile);
});

const searchVendorsController = asyncHandler(async (req, res) => {
    const vendors = await searchVendors(req.query);
    console.log("SEARCH RESULT:", vendors);
    res.status(200).json({ vendors });
});

const reportVendorController = asyncHandler(async (req, res) => {
    const report = await reportVendor(req.user.userId, req.params.id, req.body);
    res.status(201).json({
        success: true,
        message: "Vendor has been reported to administrators",
        data: report
    });
});

module.exports = {
    requestVendor,
    reviewVendorRequestController,
    getVendorProfileController,
    searchVendorsController,
    reportVendorController
};