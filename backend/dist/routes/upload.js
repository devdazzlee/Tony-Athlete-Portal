"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const cloudinary_1 = require("../lib/cloudinary");
const prisma_1 = require("../lib/prisma");
const router = express_1.default.Router();
const storage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith('image/')) {
            cb(new Error('Only image files are allowed!'));
            return;
        }
        cb(null, true);
    },
});
router.post('/avatar', auth_1.authenticateToken, upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userId = req.user.id;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });
        console.log("🖼️ Uploading avatar for user:", userId);
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResult = await (0, cloudinary_1.uploadImage)(base64Image, 'trackdesk/profiles');
        console.log("☁️ Cloudinary upload successful:", uploadResult.url);
        const updatedUser = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { avatar: uploadResult.url },
        });
        console.log("💾 Database updated - User avatar:", updatedUser.avatar);
        if (user?.avatar && user.avatar.includes('cloudinary.com')) {
            try {
                const urlParts = user.avatar.split('/');
                const filename = urlParts[urlParts.length - 1].split('.')[0];
                const folder = urlParts[urlParts.length - 2];
                const publicId = `${folder}/${filename}`;
                await (0, cloudinary_1.deleteImage)(publicId);
            }
            catch (error) {
                console.error('Error deleting old avatar:', error);
            }
        }
        res.json({
            success: true,
            url: uploadResult.url,
            message: 'Avatar uploaded successfully',
        });
    }
    catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({
            error: error.message || 'Failed to upload avatar',
        });
    }
});
router.post('/deliverable', auth_1.authenticateToken, upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        console.log("🖼️ Uploading deliverable photo for user:", req.user.id);
        const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
        const uploadResult = await (0, cloudinary_1.uploadImage)(base64Image, 'trackdesk/deliverables');
        console.log("☁️ Cloudinary upload successful:", uploadResult.url);
        res.json({
            success: true,
            url: uploadResult.url,
            message: 'Deliverable photo uploaded successfully',
        });
    }
    catch (error) {
        console.error('Deliverable photo upload error:', error);
        res.status(500).json({
            error: error.message || 'Failed to upload deliverable photo',
        });
    }
});
router.delete('/avatar', auth_1.authenticateToken, async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userId = req.user.id;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: { avatar: true },
        });
        if (!user?.avatar) {
            return res.status(400).json({ error: 'No avatar to delete' });
        }
        if (user.avatar.includes('cloudinary.com')) {
            try {
                const urlParts = user.avatar.split('/');
                const filename = urlParts[urlParts.length - 1].split('.')[0];
                const folder = urlParts[urlParts.length - 2];
                const publicId = `${folder}/${filename}`;
                await (0, cloudinary_1.deleteImage)(publicId);
            }
            catch (error) {
                console.error('Error deleting from Cloudinary:', error);
            }
        }
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { avatar: null },
        });
        res.json({
            success: true,
            message: 'Avatar deleted successfully',
        });
    }
    catch (error) {
        console.error('Avatar deletion error:', error);
        res.status(500).json({
            error: error.message || 'Failed to delete avatar',
        });
    }
});
exports.default = router;
//# sourceMappingURL=upload.js.map