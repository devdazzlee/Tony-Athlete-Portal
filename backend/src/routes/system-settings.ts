import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { SystemSettingsService } from "../services/SystemSettingsService";

const router: Router = express.Router();
const prisma = new PrismaClient();

const ACCOUNT_ID = "default"; // For multi-tenancy in the future

// Get system settings
router.get("/", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can view system settings" });
    }

    let settings = await prisma.systemSettings.findUnique({
      where: { accountId: ACCOUNT_ID },
    });

    // If no settings exist, create default settings with commission settings
    if (!settings) {
      settings = await prisma.systemSettings.create({
        data: {
          accountId: ACCOUNT_ID,
          general: {
            programName: "TC Nutrition Athlete Portal",
            programDescription: "Professional affiliate management platform",
            timezone: "America/New_York",
            currency: "USD",
            language: "en",
            commissionSettings: {
              defaultRate: 15,
              minimumPayout: 50.0,
              payoutFrequency: "Monthly",
              approvalPeriod: 30,
              cookieDuration: 30,
            },
          },
          security: {
            twoFactorRequired: false,
            ipWhitelist: false,
            sessionTimeout: 30,
            passwordPolicy: "strong",
            auditLogging: true,
          },
          currencies: {
            defaultCurrency: "USD",
            supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
          },
          notifications: {
            emailNotifications: true,
            adminAlerts: true,
            affiliateWelcome: true,
            payoutNotifications: true,
            systemMaintenance: true,
          },
          integrations: {},
          performance: {},
          compliance: {},
        },
      });
    }

    // Get commission settings directly from database
    let commissionSettings = null;
    
    if (
      settings.general &&
      typeof settings.general === "object" &&
      "commissionSettings" in settings.general
    ) {
      commissionSettings = (settings.general as any).commissionSettings;
    }

    // If commission settings don't exist in database, initialize them
    // Also update if defaultRate is 10% or less (old default) to 15%
    if (!commissionSettings || (commissionSettings.defaultRate && commissionSettings.defaultRate <= 10)) {
      const existingGeneral =
        settings.general && typeof settings.general === "object"
          ? (settings.general as Record<string, any>)
          : {};

      // Preserve existing values if they exist, but update defaultRate to 15% if it's 10% or less
      const updatedCommissionSettings = commissionSettings ? {
        ...commissionSettings,
        defaultRate: commissionSettings.defaultRate <= 10 ? 15 : commissionSettings.defaultRate,
      } : {
        defaultRate: 15,
        minimumPayout: 50.0,
        payoutFrequency: "Monthly",
        approvalPeriod: 30,
        cookieDuration: 30,
      };

      settings = await prisma.systemSettings.update({
        where: { accountId: ACCOUNT_ID },
        data: {
          general: {
            ...existingGeneral,
            commissionSettings: updatedCommissionSettings,
          },
        },
      });

      commissionSettings = (settings.general as any).commissionSettings;
    }

    // Get affiliate settings
    const affiliateSettings = {
      autoApprove: false,
      requireApproval: true,
      maxAffiliates: 1000,
      allowSelfReferrals: false,
      tierBasedCommissions: true,
    };

    res.json({
      general: settings.general,
      commission: commissionSettings,
      affiliate: affiliateSettings,
      security: settings.security,
      notifications: settings.notifications,
    });
  } catch (error) {
    console.error("Error fetching system settings:", error);
    res.status(500).json({ error: "Failed to fetch system settings" });
  }
});

// Update general settings
router.put("/general", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Only admins can update settings" });
    }

    const schema = z.object({
      programName: z.string().min(1, "Program name is required"),
      programDescription: z.string().optional(),
      timezone: z.string().optional(),
      currency: z.string().optional(),
      language: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const settings = await prisma.systemSettings.upsert({
      where: { accountId: ACCOUNT_ID },
      update: {
        general: data,
      },
      create: {
        accountId: ACCOUNT_ID,
        general: data,
        security: {},
        currencies: {},
        notifications: {},
        integrations: {},
        performance: {},
        compliance: {},
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        action: "settings_updated",
        resource: "general_settings",
        details: {
          timestamp: new Date().toISOString(),
          changes: data,
        },
      },
    });

    res.json({
      success: true,
      message: "General settings updated successfully",
      settings: settings.general,
    });
  } catch (error) {
    console.error("Error updating general settings:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update general settings" });
  }
});

// Preview commission settings impact
router.post("/commission/preview", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can preview commission settings" });
    }

    const schema = z.object({
      defaultRate: z.number().min(0).max(100, "Rate must be between 0 and 100"),
    });

    const data = schema.parse(req.body);

    // Get current commission settings
    const currentSettings = await prisma.systemSettings.findUnique({
      where: { accountId: ACCOUNT_ID },
    });

    let currentDefaultRate = 15; // Default fallback
    if (
      currentSettings?.general &&
      typeof currentSettings.general === "object" &&
      "commissionSettings" in currentSettings.general
    ) {
      const general = currentSettings.general as any;
      if (general.commissionSettings?.defaultRate) {
        currentDefaultRate = general.commissionSettings.defaultRate;
      }
    }

    // Find affiliates that are using the current default rate (will be affected)
    const affectedAffiliates = await prisma.affiliateProfile.findMany({
      where: {
        commissionRate: currentDefaultRate,
        tier: "BRONZE", // Only BRONZE tier affiliates use default rates
      },
      select: {
        id: true,
        userId: true,
        commissionRate: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Get total affiliates count for context
    const totalAffiliates = await prisma.affiliateProfile.count();

    res.json({
      success: true,
      preview: {
        currentDefaultRate,
        newDefaultRate: data.defaultRate,
        affectedAffiliates: affectedAffiliates.length,
        totalAffiliates,
        affectedAffiliateList: affectedAffiliates.map((affiliate) => ({
          id: affiliate.id,
          name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
          email: affiliate.user.email,
          currentRate: affiliate.commissionRate,
          newRate: data.defaultRate,
        })),
      },
    });
  } catch (error) {
    console.error("Error previewing commission settings:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to preview commission settings" });
  }
});

// Update commission settings
router.put("/commission", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can update commission settings" });
    }

    const schema = z.object({
      defaultRate: z
        .number()
        .min(0, "Commission rate must be greater than or equal to 0%")
        .max(100, "Commission rate must be less than or equal to 100%"),
      minimumPayout: z.number().min(0, "Minimum payout must be positive"),
      payoutFrequency: z.enum(["Weekly", "Bi-Weekly", "Monthly", "Quarterly"]),
      approvalPeriod: z.number().min(0, "Approval period must be positive"),
      cookieDuration: z
        .number()
        .min(1, "Cookie duration must be at least 1 day"),
      updateAffiliates: z.boolean().optional(), // New field to control affiliate updates
    });

    const data = schema.parse(req.body);

    // Get current commission settings to determine which affiliates will be affected
    const currentSettings = await prisma.systemSettings.findUnique({
      where: { accountId: ACCOUNT_ID },
    });

    let currentDefaultRate = 15; // Default fallback
    if (
      currentSettings?.general &&
      typeof currentSettings.general === "object" &&
      "commissionSettings" in currentSettings.general
    ) {
      const general = currentSettings.general as any;
      if (general.commissionSettings?.defaultRate) {
        currentDefaultRate = general.commissionSettings.defaultRate;
      }
    }

    // Find ALL affiliates that will be affected when updating commission rates
    const affectedAffiliates = await prisma.affiliateProfile.findMany({
      select: {
        id: true,
        userId: true,
        commissionRate: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    // Store commission settings in SystemSettings
    const existingSettings = await prisma.systemSettings.findUnique({
      where: { accountId: ACCOUNT_ID },
    });

    const existingGeneral =
      existingSettings?.general && typeof existingSettings.general === "object"
        ? (existingSettings.general as Record<string, any>)
        : {};

    const settings = await prisma.systemSettings.upsert({
      where: { accountId: ACCOUNT_ID },
      update: {
        general: {
          ...existingGeneral,
          commissionSettings: {
            defaultRate: data.defaultRate,
            minimumPayout: data.minimumPayout,
            payoutFrequency: data.payoutFrequency,
            approvalPeriod: data.approvalPeriod,
            cookieDuration: data.cookieDuration,
          },
        },
      },
      create: {
        accountId: ACCOUNT_ID,
        general: {
          commissionSettings: {
            defaultRate: data.defaultRate,
            minimumPayout: data.minimumPayout,
            payoutFrequency: data.payoutFrequency,
            approvalPeriod: data.approvalPeriod,
            cookieDuration: data.cookieDuration,
          },
        },
        security: {},
        currencies: {},
        notifications: {},
        integrations: {},
        performance: {},
        compliance: {},
      },
    });

    SystemSettingsService.clearCache();

    let updatedAffiliates = 0;

    // Update ALL affiliate rates if explicitly requested
    if (data.updateAffiliates && affectedAffiliates.length > 0) {
      // Update ALL affiliates to use the new default rate
      const updateResult = await prisma.affiliateProfile.updateMany({
        where: {
          id: {
            in: affectedAffiliates.map((affiliate) => affiliate.id),
          },
        },
        data: {
          commissionRate: data.defaultRate,
        },
      });

      updatedAffiliates = updateResult.count;

      // Update all referral codes for all affiliates to use the new commission rate
      await prisma.referralCode.updateMany({
        where: {
          affiliateId: {
            in: affectedAffiliates.map((affiliate) => affiliate.id),
          },
        },
        data: {
          commissionRate: data.defaultRate,
        },
      });

      // Log individual affiliate updates for all updated affiliates
      for (const affiliate of affectedAffiliates) {
        await prisma.activity.create({
          data: {
            userId: req.user.id,
            action: "affiliate_commission_updated",
            resource: "affiliate_profile",
            details: {
              timestamp: new Date().toISOString(),
              affiliateId: affiliate.id,
              affiliateEmail: affiliate.user.email,
              oldRate: affiliate.commissionRate,
              newRate: data.defaultRate,
              reason: "Default commission rate change - all affiliates updated",
            },
          },
        });
      }
    }

    // Log commission settings update
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        action: "commission_settings_updated",
        resource: "commission_settings",
        details: {
          timestamp: new Date().toISOString(),
          changes: {
            defaultRate: data.defaultRate,
            minimumPayout: data.minimumPayout,
            payoutFrequency: data.payoutFrequency,
            approvalPeriod: data.approvalPeriod,
            cookieDuration: data.cookieDuration,
          },
          affectedAffiliates: affectedAffiliates.length,
          updatedAffiliates: updatedAffiliates,
          updateAffiliates: data.updateAffiliates || false,
        },
      },
    });

    res.json({
      success: true,
      message: "Commission settings updated successfully",
      settings: {
        defaultRate: data.defaultRate,
        minimumPayout: data.minimumPayout,
        payoutFrequency: data.payoutFrequency,
        approvalPeriod: data.approvalPeriod,
        cookieDuration: data.cookieDuration,
      },
      impact: {
        affectedAffiliates: affectedAffiliates.length,
        updatedAffiliates: updatedAffiliates,
        affectedAffiliateList: affectedAffiliates.map((affiliate) => ({
          id: affiliate.id,
          name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
          email: affiliate.user.email,
          currentRate: affiliate.commissionRate,
          newRate: data.defaultRate,
        })),
      },
    });
  } catch (error) {
    console.error("Error updating commission settings:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update commission settings" });
  }
});

// Get system status
router.get("/status", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can view system status" });
    }

    // Check database connection
    const isDatabaseHealthy = await prisma.$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => false);

    // Get system stats
    const [totalAffiliates, totalOrders, totalCommissions] = await Promise.all([
      prisma.affiliateProfile.count(),
      prisma.affiliateOrder.count(),
      prisma.affiliateOrder.aggregate({
        _sum: { commissionAmount: true },
      }),
    ]);

    // Get recent activity
    const recentActivity = await prisma.activity.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      select: {
        action: true,
        createdAt: true,
      },
    });

    // Check payment system (mock for now)
    const isPaymentSystemHealthy = true; // In production, ping payment gateway

    // Get last backup time (mock for now)
    const lastBackupTime = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

    // Calculate uptime (mock for now)
    const uptimePercentage = 99.9;

    res.json({
      systemHealth: {
        status: isDatabaseHealthy ? "operational" : "down",
        database: isDatabaseHealthy,
        paymentSystem: isPaymentSystemHealthy,
        uptime: uptimePercentage,
      },
      statistics: {
        totalAffiliates,
        totalOrders,
        totalCommissions: totalCommissions._sum.commissionAmount || 0,
      },
      lastBackup: {
        timestamp: lastBackupTime,
        status: "success",
      },
      recentActivity: recentActivity.map((activity) => ({
        action: activity.action,
        timestamp: activity.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching system status:", error);
    res.status(500).json({ error: "Failed to fetch system status" });
  }
});

// Update system status settings (maintenance mode, etc.)
router.put("/status", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can update system status" });
    }

    const schema = z.object({
      maintenanceMode: z.boolean().optional(),
      maintenanceMessage: z.string().optional(),
    });

    const data = schema.parse(req.body);

    const settings = await prisma.systemSettings.upsert({
      where: { accountId: ACCOUNT_ID },
      update: {
        performance: {
          maintenanceMode: data.maintenanceMode,
          maintenanceMessage: data.maintenanceMessage,
        },
      },
      create: {
        accountId: ACCOUNT_ID,
        general: {},
        security: {},
        currencies: {},
        notifications: {},
        integrations: {},
        performance: {
          maintenanceMode: data.maintenanceMode,
          maintenanceMessage: data.maintenanceMessage,
        },
        compliance: {},
      },
    });

    // Log activity
    await prisma.activity.create({
      data: {
        userId: req.user.id,
        action: "system_status_updated",
        resource: "system_status",
        details: {
          timestamp: new Date().toISOString(),
          changes: data,
        },
      },
    });

    res.json({
      success: true,
      message: "System status updated successfully",
      settings: settings.performance,
    });
  } catch (error) {
    console.error("Error updating system status:", error);
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: "Invalid input data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update system status" });
  }
});

export default router;
