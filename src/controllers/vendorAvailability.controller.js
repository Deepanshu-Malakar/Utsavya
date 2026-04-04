const {
    addUnavailabilityBlock,
    getVendorBlocks,
    removeUnavailabilityBlock
} = require("../services/vendorAvailability.services");
const asyncHandler = require("../utils/asyncHandler");

const addBlockController = asyncHandler(async (req, res) => {
    // Both vendor and admins can add blocks for a vendor, assuming route checks authentication and ID
    const { start_time, end_time, reason } = req.body;
    
    // We get the vendor ID from the params
    const vendorId = req.params.id;
    
    // Security Check: Make sure the logged-in user is either an admin or the vendor themselves
    if (req.user.role !== 'admin' && req.user.userId !== vendorId) {
        return res.status(403).json({ message: "Forbidden: You do not have permission to modify this vendor's calendar." });
    }

    const block = await addUnavailabilityBlock(vendorId, start_time, end_time, reason);
    res.status(201).json({
        message: "Vendor availability block successfully added",
        block
    });
});

const getBlocksController = asyncHandler(async (req, res) => {
    const vendorId = req.params.id;
    const blocks = await getVendorBlocks(vendorId);
    
    res.status(200).json({
        blocks
    });
});

const removeBlockController = asyncHandler(async (req, res) => {
    const vendorId = req.params.id;
    const blockId = req.params.blockId;

    if (req.user.role !== 'admin' && req.user.userId !== vendorId) {
        return res.status(403).json({ message: "Forbidden: You do not have permission to modify this vendor's calendar." });
    }

    const removed = await removeUnavailabilityBlock(vendorId, blockId);
    res.status(200).json({
        message: "Blocks successfully removed",
        block: removed
    });
});

module.exports = {
    addBlockController,
    getBlocksController,
    removeBlockController
};
