import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import { uploadImage, deleteImage } from "../lib/cloudinary";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Configure multer for avatar uploads - use memory storage for serverless environments
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Get admin profile
router.get("/profile", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can access this profile" });
    }

    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        createdAt: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const admin = await prisma.adminProfile.findFirst({
      where: { userId },
    });

    res.json({
      user,
      admin: admin
        ? {
            id: admin.id,
            permissions: admin.permissions,
            department: admin.department,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching admin profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Update admin profile
router.put("/profile", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can update this profile" });
    }

    const userId = req.user.id;
    const schema = z.object({
      firstName: z.string().min(1, "First name is required"),
      lastName: z.string().min(1, "Last name is required"),
      phone: z.string().optional(),
      department: z.string().optional(),
    });

    const { firstName, lastName, phone, department } = schema.parse(req.body);

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName,
        lastName,
        phone,
      },
    });

    // Update or create admin profile
    await prisma.adminProfile.upsert({
      where: { userId },
      update: {
        department,
      },
      create: {
        userId,
        department,
        permissions: ["READ", "WRITE", "DELETE"], // Default admin permissions
      },
    });

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
        role: updatedUser.role,
      },
    });
  } catch (error) {
    console.error("Error updating admin profile:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Upload admin avatar
router.post(
  "/profile/avatar",
  authenticateToken,
  upload.single("avatar"),
  async (req: any, res) => {
    try {
      if (req.user.role !== "ADMIN") {
        return res
          .status(403)
          .json({ error: "Only admins can upload avatars" });
      }

      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = req.user.id;

      // Get current user to delete old avatar
      const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { avatar: true },
      });

      // Upload to Cloudinary using buffer
      const base64Image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploadResult = await uploadImage(base64Image, 'tc-nutrition/admin/profiles');

      // Delete old avatar from Cloudinary if it exists
      if (currentUser?.avatar && currentUser.avatar.includes('cloudinary.com')) {
        try {
          const urlParts = currentUser.avatar.split('/');
          const filename = urlParts[urlParts.length - 1].split('.')[0];
          const folder = urlParts[urlParts.length - 2];
          const publicId = `${folder}/${filename}`;
          await deleteImage(publicId);
        } catch (error) {
          console.error('Error deleting old avatar:', error);
        }
      }

      // Update user avatar with Cloudinary URL
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { avatar: uploadResult.url },
      });

      res.json({
        success: true,
        message: "Avatar uploaded successfully",
        avatar: uploadResult.url,
      });
    } catch (error) {
      console.error("Error uploading avatar:", error);
      res.status(500).json({ error: "Failed to upload avatar" });
    }
  }
);

// Remove admin avatar
router.delete("/profile/avatar", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can remove avatars" });
    }

    const userId = req.user.id;

    // Get current user to find avatar path
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { avatar: true },
    });

    // Remove avatar from database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatar: null },
    });

    // Delete avatar file if it exists
    if (user?.avatar) {
      const avatarPath = path.join(__dirname, "../../", user.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    res.json({
      success: true,
      message: "Avatar removed successfully",
    });
  } catch (error) {
    console.error("Error removing avatar:", error);
    res.status(500).json({ error: "Failed to remove avatar" });
  }
});

// Change password
router.put("/security/password", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can change password" });
    }

    const userId = req.user.id;
    const schema = z.object({
      currentPassword: z.string().min(1, "Current password is required"),
      newPassword: z
        .string()
        .min(8, "New password must be at least 8 characters"),
      confirmPassword: z.string().min(1, "Confirm password is required"),
    });

    const { currentPassword, newPassword, confirmPassword } = schema.parse(
      req.body
    );

    // Verify passwords match
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId,
        action: "password_changed",
        resource: "security",
        details: {
          timestamp: new Date().toISOString(),
          userEmail: user.email,
        },
      },
    });

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to change password" });
  }
});

export default router;
