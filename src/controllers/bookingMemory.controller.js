const asyncHandler = require("../utils/asyncHandler");
const {
    getReviewableBookingItem,
    uploadBookingMemories,
    getVendorCompletedBookingItems,
    getVendorMemories,
    getCustomerMemories,
    deleteBookingMemory
} = require("../services/bookingMemory.services");

const getReviewableBookingItemController = asyncHandler(async (req, res) => {
    const item = await getReviewableBookingItem(
        req.user,
        req.query.vendor_id,
        req.query.service_id
    );
    res.status(200).json({ data: item });
});

const uploadBookingMemoriesController = asyncHandler(async (req, res) => {
    const memories = await uploadBookingMemories(req.user, req.params.id, req.files || []);
    res.status(201).json({ data: memories });
});

const getVendorCompletedBookingItemsController = asyncHandler(async (req, res) => {
    const items = await getVendorCompletedBookingItems(req.user);
    res.status(200).json({ data: items });
});

const getVendorMemoriesController = asyncHandler(async (req, res) => {
    const memories = await getVendorMemories(req.user);
    res.status(200).json({ data: memories });
});

const getCustomerMemoriesController = asyncHandler(async (req, res) => {
    const memories = await getCustomerMemories(req.user);
    res.status(200).json({ data: memories });
});

const deleteBookingMemoryController = asyncHandler(async (req, res) => {
    const deleted = await deleteBookingMemory(req.user, req.params.id);
    res.status(200).json({ data: deleted });
});

module.exports = {
    getReviewableBookingItemController,
    uploadBookingMemoriesController,
    getVendorCompletedBookingItemsController,
    getVendorMemoriesController,
    getCustomerMemoriesController,
    deleteBookingMemoryController
};
