import { v2 as cloudinary } from 'cloudinary';

// Cloudinary Configuration
cloudinary.config({
  cloud_name: 'dkblutnml',
  api_key: '739218772994437',
  api_secret: '1VUEHmzT8P-XE28-RGkKbT3Z_oM',
  secure: true
});

export default cloudinary;

/**
 * Upload image to Cloudinary
 * @param file - File as base64 string or file path
 * @param folder - Folder name in Cloudinary (optional)
 * @returns Upload result with secure URL
 */
export const uploadImage = async (
  file: string,
  folder: string = 'trackdesk/profiles'
): Promise<{ url: string; publicId: string }> => {
  try {
    const result = await cloudinary.uploader.upload(file, {
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
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new Error('Failed to upload image to Cloudinary');
  }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 */
export const deleteImage = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    throw new Error('Failed to delete image from Cloudinary');
  }
};

