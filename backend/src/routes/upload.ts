import express, { Response, Router } from 'express';
import multer from 'multer';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { uploadImage, deleteImage } from '../lib/cloudinary';
import { prisma } from '../lib/prisma';

const router: Router = express.Router();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept images only
    if (!file.mimetype.startsWith('image/')) {
      cb(new Error('Only image files are allowed!'));
      return;
    }
    cb(null, true);
  },
});

/**
 * Upload profile avatar
 * POST /api/upload/avatar
 */
router.post(
  '/avatar',
  authenticateToken,
  upload.single('avatar') as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userId = req.user.id;

      // Get user's current avatar to delete old one
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      console.log("🖼️ Uploading avatar for user:", userId);

      // Upload new image to Cloudinary
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadResult = await uploadImage(base64Image, 'tc-nutrition/profiles');
      
      console.log("☁️ Cloudinary upload successful:", uploadResult.url);

      // Update user avatar in database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: uploadResult.url },
      });
      
      console.log("💾 Database updated - User avatar:", updatedUser.avatar);

      // Delete old avatar from Cloudinary if it exists
      if (user?.avatar && user.avatar.includes('cloudinary.com')) {
        try {
          // Extract public_id from URL
          const urlParts = user.avatar.split('/');
          const filename = urlParts[urlParts.length - 1].split('.')[0];
          const folder = urlParts[urlParts.length - 2];
          const publicId = `${folder}/${filename}`;
          await deleteImage(publicId);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
          // Continue even if deletion fails
        }
      }

      res.json({
        success: true,
        url: uploadResult.url,
        message: 'Avatar uploaded successfully',
      });
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      res.status(500).json({
        error: error.message || 'Failed to upload avatar',
      });
    }
  }
);

/**
 * Upload deliverable photo
 * POST /api/upload/deliverable
 */
router.post(
  '/deliverable',
  authenticateToken,
  upload.single('photo') as any,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      console.log("🖼️ Uploading deliverable photo for user:", req.user.id);

      // Upload image to Cloudinary
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadResult = await uploadImage(base64Image, 'tc-nutrition/deliverables');
      
      console.log("☁️ Cloudinary upload successful:", uploadResult.url);

      res.json({
        success: true,
        url: uploadResult.url,
        message: 'Deliverable photo uploaded successfully',
      });
    } catch (error: any) {
      console.error('Deliverable photo upload error:', error);
      res.status(500).json({
        error: error.message || 'Failed to upload deliverable photo',
      });
    }
  }
);

/**
 * Delete profile avatar
 * DELETE /api/upload/avatar
 */
router.delete('/avatar', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userId = req.user.id;

    // Get user's current avatar
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    if (!user?.avatar) {
      return res.status(400).json({ error: 'No avatar to delete' });
    }

    // Delete from Cloudinary if it's a Cloudinary URL
    if (user.avatar.includes('cloudinary.com')) {
      try {
        const urlParts = user.avatar.split('/');
        const filename = urlParts[urlParts.length - 1].split('.')[0];
        const folder = urlParts[urlParts.length - 2];
        const publicId = `${folder}/${filename}`;
        await deleteImage(publicId);
      } catch (error) {
        console.error('Error deleting from Cloudinary:', error);
      }
    }

    // Remove avatar from database
    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    res.json({
      success: true,
      message: 'Avatar deleted successfully',
    });
  } catch (error: any) {
    console.error('Avatar deletion error:', error);
    res.status(500).json({
      error: error.message || 'Failed to delete avatar',
    });
  }
});

export default router;

