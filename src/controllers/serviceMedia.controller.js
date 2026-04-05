/**
 * --- FRONTEND INTEGRATION GUIDE: Service Media Controllers ---
 * Base Path: /services/:id/media
 */
const {
    uploadMedia,
    listMedia,
    removeMedia
} = require("../services/serviceMedia.services");
const asyncHandler = require("../utils/asyncHandler");

const uploadServiceMediaController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Upload Service Media ---
// POST /services/:id/media | Body: FormData { file: <image/video> }
// Required: Authorization: Bearer <accessToken> (Vendor only)
    const media = await uploadMedia(
        req.user,
        req.params.id,
        req.file
    );
    res.status(201).json(media);
});

const getServiceMediaController = asyncHandler(async (req, res) => {
    const media = await listMedia(req.params.id);
    res.status(200).json(media);
});

const deleteServiceMediaController = asyncHandler(async (req, res) => {
// --- FRONTEND INTEGRATION GUIDE: Remove Service Media ---
// DELETE /services/media/:mediaId
    const deleted = await removeMedia(
        req.user,
        req.params.mediaId
    );
    res.status(200).json(deleted);
});

module.exports = {
    uploadServiceMediaController,
    getServiceMediaController,
    deleteServiceMediaController
};