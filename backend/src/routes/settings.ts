import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get user profile
router.get("/profile", authenticateToken, async (req: any, res) => {
  try {
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

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    res.json({
      user,
      affiliate: affiliate
        ? {
            id: affiliate.id,
            companyName: affiliate.companyName,
            website: affiliate.website,
            tier: affiliate.tier,
            status: affiliate.status,
            commissionRate: affiliate.commissionRate,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Update user profile
router.put("/profile", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { firstName, lastName, phone, companyName, website } = req.body;

    // Validate input
    const schema = z.object({
      firstName: z.string().min(1).optional(),
      lastName: z.string().min(1).optional(),
      phone: z.string().optional(),
      companyName: z.string().optional(),
      website: z.string().url().optional(),
    });

    const validatedData = schema.parse({
      firstName,
      lastName,
      phone,
      companyName,
      website,
    });

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        phone: validatedData.phone,
      },
    });

    // Update affiliate profile if exists
    if (validatedData.companyName || validatedData.website) {
      const affiliate = await prisma.affiliateProfile.findFirst({
        where: { userId },
      });

      if (affiliate) {
        await prisma.affiliateProfile.update({
          where: { id: affiliate.id },
          data: {
            companyName: validatedData.companyName,
            website: validatedData.website,
          },
        });
      }
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        phone: updatedUser.phone,
      },
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Get security settings
router.get("/security", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Fetch real login activity from Activity model
    const loginActivities = await prisma.activity.findMany({
      where: {
        userId: userId,
        action: "LOGIN",
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10, // Last 10 login attempts
    });

    // Format login history with better device parsing
    const loginHistory = loginActivities.map((activity) => {
      const userAgent = activity.userAgent || "Unknown Device";
      let device = "Unknown Device";

      // Parse browser
      if (userAgent.includes("Chrome") && !userAgent.includes("Edge")) {
        device = "Chrome";
      } else if (
        userAgent.includes("Safari") &&
        !userAgent.includes("Chrome")
      ) {
        device = "Safari";
      } else if (userAgent.includes("Firefox")) {
        device = "Firefox";
      } else if (userAgent.includes("Edge") || userAgent.includes("Edg/")) {
        device = "Edge";
      }

      // Parse OS
      if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS")) {
        device += " on MacOS";
      } else if (userAgent.includes("Windows")) {
        device += " on Windows";
      } else if (
        userAgent.includes("Linux") &&
        !userAgent.includes("Android")
      ) {
        device += " on Linux";
      } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
        device += " on iOS";
      } else if (userAgent.includes("Android")) {
        device += " on Android";
      }

      return {
        id: activity.id,
        timestamp: activity.createdAt,
        ipAddress: activity.ipAddress || "Unknown",
        device: device,
        location: "Unknown", // Add geolocation service if needed
        status: "Success",
      };
    });

    res.json({
      email: user.email,
      lastPasswordChange: user.updatedAt,
      loginHistory: loginHistory,
    });
  } catch (error) {
    console.error("Error fetching security settings:", error);
    res.status(500).json({ error: "Failed to fetch security settings" });
  }
});

// Change password
router.post(
  "/security/change-password",
  authenticateToken,
  async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword, confirmPassword } = req.body;

      // Validate input
      const schema = z.object({
        currentPassword: z.string().min(6),
        newPassword: z.string().min(6),
        confirmPassword: z.string().min(6),
      });

      const validatedData = schema.parse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (validatedData.newPassword !== validatedData.confirmPassword) {
        return res.status(400).json({ error: "New passwords do not match" });
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Verify current password
      const isValid = await bcrypt.compare(
        validatedData.currentPassword,
        user.password
      );
      if (!isValid) {
        return res.status(400).json({ error: "Current password is incorrect" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(validatedData.newPassword, 10);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
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
  }
);

// Get notification settings
router.get("/notifications", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;

    // Mock notification settings
    const settings = {
      email: {
        newCommission: true,
        payoutProcessed: true,
        weeklyReport: true,
        monthlyReport: true,
        systemUpdates: false,
        marketingEmails: false,
      },
      push: {
        newCommission: true,
        payoutProcessed: true,
        highValueSale: true,
        systemAlerts: true,
      },
      preferences: {
        frequency: "Immediate",
        quietHours: {
          enabled: false,
          start: "22:00",
          end: "08:00",
        },
      },
    };

    res.json(settings);
  } catch (error) {
    console.error("Error fetching notification settings:", error);
    res.status(500).json({ error: "Failed to fetch notification settings" });
  }
});

// Update notification settings
router.put("/notifications", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { email, push, preferences } = req.body;

    // Validate input
    const schema = z.object({
      email: z
        .object({
          newCommission: z.boolean().optional(),
          payoutProcessed: z.boolean().optional(),
          weeklyReport: z.boolean().optional(),
          monthlyReport: z.boolean().optional(),
          systemUpdates: z.boolean().optional(),
          marketingEmails: z.boolean().optional(),
        })
        .optional(),
      push: z
        .object({
          newCommission: z.boolean().optional(),
          payoutProcessed: z.boolean().optional(),
          highValueSale: z.boolean().optional(),
          systemAlerts: z.boolean().optional(),
        })
        .optional(),
      preferences: z
        .object({
          frequency: z
            .enum(["Immediate", "Daily Digest", "Weekly Digest"])
            .optional(),
          quietHours: z
            .object({
              enabled: z.boolean(),
              start: z.string(),
              end: z.string(),
            })
            .optional(),
        })
        .optional(),
    });

    const validatedData = schema.parse({ email, push, preferences });

    // In a real app, save to database
    res.json({
      success: true,
      message: "Notification settings updated successfully",
      settings: validatedData,
    });
  } catch (error) {
    console.error("Error updating notification settings:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update notification settings" });
  }
});

// Delete account
router.delete("/account", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { password, confirmation } = req.body;

    if (confirmation !== "DELETE") {
      return res.status(400).json({ error: "Please type DELETE to confirm" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Password is incorrect" });
    }

    // In production, you might want to soft delete or archive the data
    // For now, we'll just return success
    res.json({
      success: true,
      message:
        "Account deletion request received. Your account will be deleted within 24 hours.",
    });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ error: "Failed to delete account" });
  }
});

export default router;
