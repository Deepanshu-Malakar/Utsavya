const {
    createVendorRequest,
    getVendorRequestById,
    updateVendorRequestStatus,
    promoteUserToVendor
} = require("../models/vendor.model");

const submitVendorRequest = async (user, data) => {

    if (user.role !== "customer") {
        throw new Error("Only customers can request vendor access");
    }

    const vendorRequest = await createVendorRequest({
        user_id: user.userId,
        ...data
    });

    return vendorRequest;
};

const reviewVendorRequest = async (adminUser, requestId, data) => {

    if (adminUser.role !== "admin") {
        throw new Error("Only admins can review vendor requests");
    }

    const request = await getVendorRequestById(requestId);

    if (!request) {
        throw new Error("Vendor request not found");
    }

    if (request.status !== "pending") {
        throw new Error("Request already reviewed");
    }

    const updatedRequest = await updateVendorRequestStatus({
        request_id: requestId,
        status: data.status,
        admin_note: data.admin_note,
        admin_id: adminUser.userId
    });

    if (!updatedRequest) {
        throw new Error("Failed to update request");
    }

    if (data.status === "approved") {
        await promoteUserToVendor(request.user_id);
    }

    return updatedRequest;
};

module.exports = {
    submitVendorRequest,
    reviewVendorRequest
};