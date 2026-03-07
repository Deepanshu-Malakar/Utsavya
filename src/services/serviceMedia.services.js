const {
    addServiceMedia,
    getServiceMedia,
    deleteServiceMedia
} = require("../models/serviceMedia.model");


const uploadMedia = async (user, serviceId, data) => {

    if (user.role !== "vendor") {
        throw new Error("Only vendors can upload service media");
    }

    return await addServiceMedia({
        service_id: serviceId,
        media_url: data.media_url,
        media_type: data.media_type,
        uploaded_by: user.userId
    });
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