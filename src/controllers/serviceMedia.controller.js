const {
    uploadMedia,
    listMedia,
    removeMedia
} = require("../services/serviceMedia.services");


const uploadServiceMediaController = async (req, res) => {

    try {

        const media = await uploadMedia(
            req.user,
            req.params.id,
            req.body
        );

        res.status(201).json(media);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
};


const getServiceMediaController = async (req, res) => {

    try {

        const media = await listMedia(req.params.id);

        res.status(200).json(media);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
};


const deleteServiceMediaController = async (req, res) => {

    try {

        const deleted = await removeMedia(
            req.user,
            req.params.mediaId
        );

        res.status(200).json(deleted);

    } catch (error) {

        res.status(400).json({
            message: error.message
        });

    }
};

module.exports = {
    uploadServiceMediaController,
    getServiceMediaController,
    deleteServiceMediaController
};