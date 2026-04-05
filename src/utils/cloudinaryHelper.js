/**
 * Extracts the public_id from a Cloudinary URL.
 */
const extractPublicId = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null;
    
    const parts = url.split('/');
    const uploadIndex = parts.indexOf('upload');
    
    if (uploadIndex === -1) return null;
    
    // Public ID starts after the 'upload' segment
    let publicIdSegments = parts.slice(uploadIndex + 1);
    
    // If the next segment is a version string (v + digits), skip it
    if (publicIdSegments.length > 0 && 
        publicIdSegments[0].startsWith('v') && 
        /^\d+$/.test(publicIdSegments[0].slice(1))) {
        publicIdSegments = publicIdSegments.slice(1);
    }

    if (publicIdSegments.length === 0) return null;

    const publicIdWithExtension = publicIdSegments.join('/');
    
    // Remove the file extension
    return publicIdWithExtension.split('.').slice(0, -1).join('.');
};

module.exports = {
    extractPublicId
};
