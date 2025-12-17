"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteImage = exports.uploadImage = void 0;
const cloudinary_1 = require("cloudinary");
cloudinary_1.v2.config({
    cloud_name: 'dkblutnml',
    api_key: '739218772994437',
    api_secret: '1VUEHmzT8P-XE28-RGkKbT3Z_oM',
    secure: true
});
exports.default = cloudinary_1.v2;
const uploadImage = async (file, folder = 'trackdesk/profiles') => {
    try {
        const result = await cloudinary_1.v2.uploader.upload(file, {
            folder: folder,
            resource_type: 'image',
            transformation: [
                { width: 500, height: 500, crop: 'fill', gravity: 'face' },
                { quality: 'auto' },
                { fetch_format: 'auto' }
            ]
        });
        return {
            url: result.secure_url,
            publicId: result.public_id
        };
    }
    catch (error) {
        console.error('Cloudinary upload error:', error);
        throw new Error('Failed to upload image to Cloudinary');
    }
};
exports.uploadImage = uploadImage;
const deleteImage = async (publicId) => {
    try {
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    catch (error) {
        console.error('Cloudinary delete error:', error);
        throw new Error('Failed to delete image from Cloudinary');
    }
};
exports.deleteImage = deleteImage;
//# sourceMappingURL=cloudinary.js.map