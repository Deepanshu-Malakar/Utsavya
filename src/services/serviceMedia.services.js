const {
    addServiceMedia,
    getServiceMedia,
    deleteServiceMedia
} = require("../models/serviceMedia.model");


const cloudinary = require("../config/cloudinary");
const fs = require("fs-extra");

const uploadMedia = async (user, serviceId, file) => {

    if (user.role !== "vendor") {
        throw new Error("Only vendors can upload service media");
    }

    if (!file) {
        throw new Error("No media file attached");
    }

    try {
        // Upload to Cloudinary
        const result = await cloudinary.uploader.upload(file.path, {
            folder: `services/${serviceId}`,
            resource_type: file.mimetype.startsWith('video/') ? 'video' : 'image'
        });

        // Clean up temp file
        await fs.unlink(file.path);

        return await addServiceMedia({
            service_id: serviceId,
            media_url: result.secure_url,
            media_type: file.mimetype.startsWith('video/') ? 'video' : 'image',
            uploaded_by: user.userId
        });
        
    } catch (error) {
        if (file && file.path) await fs.unlink(file.path).catch(console.error);
        throw error;
    }
};


const listMedia = async (serviceId) => {

    return await getServiceMedia(serviceId);
};


const removeMedia = async (user, mediaId) => {

    if (user.role !== "vendor") {
        throw new Error("Only vendors can delete media");
    }

    const deleted = await deleteServiceMedia(mediaId, user.userId);

    if (!deleted) {
        throw new Error("Media not found or not owned by vendor");
    }

    return deleted;
};

module.exports = {
    uploadMedia,
    listMedia,
    removeMedia
};