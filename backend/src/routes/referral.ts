import express, { Router } from "express";
import { z } from "zod";
import { authenticateToken } from "../middleware/auth";
import { ReferralSystemModel } from "../models/ReferralSystem";
import { prisma } from "../lib/prisma";
import { SystemSettingsService } from "../services/SystemSettingsService";

const router: Router = express.Router();

// Get affiliate's referral codes (includes both tracking codes and affiliate allowance codes)
router.get("/codes", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "AFFILIATE") {
      return res
        .status(403)
        .json({ error: "Only affiliates can access referral codes" });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Get tracking/referral codes from ReferralCode table
    const referralCodes = await ReferralSystemModel.getAffiliateReferralCodes(
      affiliate.id
    );

    // Get affiliate allowance/discount codes from Coupon table (created by admin)
    const affiliateCoupons = await prisma.coupon.findMany({
      where: {
        affiliateId: affiliate.id,
        isAffiliate: true, // Only fetch affiliate allowance codes
      },
      orderBy: { createdAt: "desc" },
    });

    // Convert coupons to referral code format
    const couponCodesFormatted = affiliateCoupons.map((coupon) => ({
      id: coupon.id,
      code: coupon.code,
      commissionRate: parseFloat(coupon.discount) || 0, // Use discount value as display
      productId: null,
      maxUses: coupon.maxUsage || 1,
      currentUses: coupon.usage,
      expiresAt: coupon.validUntil.toISOString(),
      isActive: coupon.status === "ACTIVE",
      createdAt: coupon.createdAt.toISOString(),
      type: "COUPON", // Add type to distinguish
      description: coupon.description,
      freeShipping: coupon.freeShipping,
      syncedToShopify: coupon.syncedToShopify || false,
      syncedStores: coupon.syncedStores || [],
    }));

    // Combine both types of codes
    const allCodes = [...referralCodes, ...couponCodesFormatted];

    res.json(allCodes);
  } catch (error) {
    console.error("Error fetching referral codes:", error);
    res.status(500).json({ error: "Failed to fetch referral codes" });
  }
});

// Generate new referral code
router.post("/codes", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "AFFILIATE") {
      return res
        .status(403)
        .json({ error: "Only affiliates can create referral codes" });
    }

    const schema = z.object({
      commissionRate: z.number().min(0).max(100).optional(),
      productId: z.string().optional(),
      expiresAt: z.string(),
    });

    const data = schema.parse(req.body);

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Always use system default commission rate from settings
    const defaultCommissionRate =
      await SystemSettingsService.getDefaultCommissionRate();
    // Use provided rate, or fall back to system default (not affiliate's rate)
    const commissionRateValue =
      data.commissionRate ?? defaultCommissionRate;

    // Validate commission rate against affiliate's tier limits
    if (
      affiliate.commissionRate !== null &&
      affiliate.commissionRate !== undefined &&
      commissionRateValue > affiliate.commissionRate
    ) {
      return res.status(400).json({
        error: `Commission rate cannot exceed your tier limit of ${affiliate.commissionRate}%`,
      });
    }

    // Parse expiresAt date if provided
    let expiresAtDate: Date | undefined;
    try {
      const normalized = data.expiresAt.includes("T")
        ? data.expiresAt
        : `${data.expiresAt}T00:00:00`;
      expiresAtDate = new Date(normalized);
      if (isNaN(expiresAtDate.getTime())) {
        return res.status(400).json({
          error: "Invalid expiration date format. Please use a valid date.",
        });
      }
    } catch (error) {
      return res.status(400).json({
        error: "Invalid expiration date format. Please use a valid date.",
      });
    }

    const referralCode = await ReferralSystemModel.generateReferralCode(
      affiliate.id,
      {
        type: "BOTH", // Default to BOTH, type field is no longer exposed in UI
        commissionRate: commissionRateValue,
        productId: data.productId,
        expiresAt: expiresAtDate,
      }
    );

    res.status(201).json(referralCode);
  } catch (error) {
    console.error("Error creating referral code:", error);

    // Handle specific Zod validation errors
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      );
      return res.status(400).json({
        error: "Validation error",
        details: errorMessages,
      });
    }

    res.status(400).json({ error: "Failed to create referral code" });
  }
});

// Get referral statistics
router.get("/stats", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "AFFILIATE") {
      return res
        .status(403)
        .json({ error: "Only affiliates can access referral stats" });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const stats = await ReferralSystemModel.getReferralStats(affiliate.id);
    res.json(stats);
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(500).json({ error: "Failed to fetch referral stats" });
  }
});

// Generate shareable links
router.post("/shareable-links", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "AFFILIATE") {
      return res
        .status(403)
        .json({ error: "Only affiliates can generate shareable links" });
    }

    const schema = z.object({
      platforms: z.array(z.string()).optional(),
    });

    const { platforms } = schema.parse(req.body);

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const shareableData = await ReferralSystemModel.generateShareableLinks(
      affiliate.id,
      platforms
    );

    res.json(shareableData);
  } catch (error) {
    console.error("Error generating shareable links:", error);
    res.status(500).json({ error: "Failed to generate shareable links" });
  }
});

// Process referral (public endpoint - called when someone uses a referral code)
router.post("/process", async (req, res) => {
  try {
    const schema = z.object({
      code: z.string(),
      userId: z.string(),
      type: z.enum(["SIGNUP", "PURCHASE"]),
      productId: z.string().optional(),
      orderValue: z.number().positive().optional(),
    });

    const data = schema.parse(req.body);

    const referralUsage = await ReferralSystemModel.processReferral(
      data.code,
      data.userId,
      data.type === "PURCHASE" ? "PRODUCT" : data.type,
      {
        productId: data.productId,
        orderValue: data.orderValue,
      }
    );

    res.status(201).json(referralUsage);
  } catch (error) {
    console.error("Error processing referral:", error);
    res
      .status(400)
      .json({ error: error.message || "Failed to process referral" });
  }
});

// Validate referral code (public endpoint)
router.get("/validate/:code", async (req, res) => {
  try {
    const { code } = req.params;

    const referralCode = await prisma.referralCode.findFirst({
      where: {
        code,
        isActive: true,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!referralCode) {
      return res
        .status(404)
        .json({ error: "Invalid or expired referral code" });
    }

    // Check if max uses reached
    if (
      referralCode.maxUses &&
      referralCode.currentUses >= referralCode.maxUses
    ) {
      return res
        .status(400)
        .json({ error: "Referral code usage limit reached" });
    }

    res.json({
      valid: true,
      code: referralCode.code,
      type: referralCode.type,
      commissionRate: referralCode.commissionRate,
      affiliateName: `${referralCode.affiliate.user.firstName} ${referralCode.affiliate.user.lastName}`,
      remainingUses: referralCode.maxUses
        ? referralCode.maxUses - referralCode.currentUses
        : null,
    });
  } catch (error) {
    console.error("Error validating referral code:", error);
    res.status(500).json({ error: "Failed to validate referral code" });
  }
});

// Admin endpoints
router.get("/admin/stats", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admins can access global referral stats" });
    }

    const [
      totalReferralCodes,
      totalReferrals,
      totalCommissions,
      topAffiliates,
    ] = await Promise.all([
      prisma.referralCode.count(),
      prisma.referralUsage.count(),
      prisma.referralUsage.aggregate({
        _sum: { commissionAmount: true },
      }),
      // Get top affiliates by commission
      prisma.referralUsage.findMany({
        select: {
          referralCodeId: true,
          commissionAmount: true,
          referralCode: {
            select: {
              code: true,
              affiliate: {
                select: {
                  companyName: true,
                },
              },
            },
          },
        },
        orderBy: { commissionAmount: "desc" },
        take: 10,
      }),
    ]);

    res.json({
      totalReferralCodes,
      totalReferrals,
      totalCommissions: totalCommissions._sum.commissionAmount || 0,
      topAffiliates,
    });
  } catch (error) {
    console.error("Error fetching admin referral stats:", error);
    res.status(500).json({ error: "Failed to fetch admin referral stats" });
  }
});

// Update referral code
router.put("/codes/:id", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "AFFILIATE") {
      return res
        .status(403)
        .json({ error: "Only affiliates can update referral codes" });
    }

    const { id } = req.params;

    const schema = z.object({
      // commissionRate removed - only admins can change this via affiliate profile
      productId: z.string().optional().nullable(),
      expiresAt: z.string().optional().nullable(),
      isActive: z.boolean().optional(),
    });

    const data = schema.parse(req.body);

    // Find the referral code and verify ownership
    const referralCode = await prisma.referralCode.findUnique({
      where: { id },
      include: {
        affiliate: {
          select: {
            userId: true,
            commissionRate: true,
          },
        },
      },
    });

    if (!referralCode) {
      return res.status(404).json({ error: "Referral code not found" });
    }

    // Verify the affiliate owns this referral code
    if (referralCode.affiliate.userId !== req.user.id) {
      return res.status(403).json({
        error: "You don't have permission to update this referral code",
      });
    }

    // Parse expiresAt date if provided
    // Note: commissionRate is not updated here - only admins can change it via affiliate profile
    let expiresAtDate: Date | null | undefined = undefined;
    if (data.expiresAt !== undefined) {
      if (data.expiresAt === null || data.expiresAt === "") {
        expiresAtDate = null;
      } else {
        try {
          const normalized = data.expiresAt.includes("T")
            ? data.expiresAt
            : `${data.expiresAt}T00:00:00`;
          expiresAtDate = new Date(normalized);
          if (isNaN(expiresAtDate.getTime())) {
            return res.status(400).json({
              error: "Invalid expiration date format. Please use a valid date.",
            });
          }
        } catch (error) {
          return res.status(400).json({
            error: "Invalid expiration date format. Please use a valid date.",
          });
        }
      }
    }

    // Build update data
    const updateData: any = {};
    // Commission rate is not updated - only admins can change it via affiliate profile
    if (data.productId !== undefined) updateData.productId = data.productId;
    if (data.expiresAt !== undefined) updateData.expiresAt = expiresAtDate;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    // Update the referral code
    const updatedCode = await prisma.referralCode.update({
      where: { id },
      data: updateData,
    });

    res.json(updatedCode);
  } catch (error) {
    console.error("Error updating referral code:", error);

    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(
        (err) => `${err.path.join(".")}: ${err.message}`
      );
      return res.status(400).json({
        error: "Validation error",
        details: errorMessages,
      });
    }

    res.status(400).json({ error: "Failed to update referral code" });
  }
});

// Delete referral code
router.delete("/codes/:id", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "AFFILIATE") {
      return res
        .status(403)
        .json({ error: "Only affiliates can delete referral codes" });
    }

    const { id } = req.params;

    // Find the referral code and verify ownership
    const referralCode = await prisma.referralCode.findUnique({
      where: { id },
      include: {
        affiliate: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!referralCode) {
      return res.status(404).json({ error: "Referral code not found" });
    }

    // Verify the affiliate owns this referral code
    if (referralCode.affiliate.userId !== req.user.id) {
      return res.status(403).json({
        error: "You don't have permission to delete this referral code",
      });
    }

    // Check if referral code has been used
    const usageCount = await prisma.referralUsage.count({
      where: { referralCodeId: id },
    });

    if (usageCount > 0) {
      return res.status(400).json({
        error:
          "Cannot delete referral code that has been used. You can deactivate it instead.",
      });
    }

    // Delete the referral code
    await prisma.referralCode.delete({
      where: { id },
    });

    res.json({ success: true, message: "Referral code deleted successfully" });
  } catch (error) {
    console.error("Error deleting referral code:", error);
    res.status(500).json({ error: "Failed to delete referral code" });
  }
});

// Get referral analytics
router.get("/analytics", authenticateToken, async (req: any, res) => {
  try {
    if (req.user.role !== "AFFILIATE") {
      return res
        .status(403)
        .json({ error: "Only affiliates can access referral analytics" });
    }

    const { period = "30d" } = req.query;

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId: req.user.id },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get analytics data
    const referralCodes = await ReferralSystemModel.getAffiliateReferralCodes(
      affiliate.id
    );

    const identifiers = referralCodes
      .map((code) => [
        code.id,
        code.code,
        code.code.split("-")[0],
      ])
      .flat()
      .filter((value): value is string => !!value);

    // Get orders as conversions
    const orders = await prisma.affiliateOrder.findMany({
      where: {
        affiliateId: affiliate.id,
        referralCode: {
          in: identifiers,
        },
        createdAt: {
          gte: startDate,
        },
      },
    });

    const clicksByCode = await prisma.affiliateClick.groupBy({
      by: ["referralCode"],
      where: {
        affiliateId: affiliate.id,
        referralCode: { in: identifiers },
        createdAt: { gte: startDate },
      },
      _count: { id: true },
    });

    // Calculate analytics
    const totalReferrals = orders.length;
    const totalCommissions = orders.reduce(
      (sum, order) => sum + (order.commissionAmount || 0),
      0
    );
    const totalRevenue = orders.reduce(
      (sum, order) => sum + (order.orderValue || 0),
      0
    );

    const totalClicks = clicksByCode.reduce(
      (sum, aggregate) => sum + aggregate._count.id,
      0
    );

    const topProducts = referralCodes
      .map((code) => {
        const productOrders = orders.filter(
          (order) =>
            order.referralCode === code.code ||
            order.referralCode === code.code.split("-")[0]
        );

        return {
          productId: code.productId || code.id,
          productName: code.code,
          referrals: productOrders.length,
          commissions: productOrders.reduce(
            (sum, order) => sum + (order.commissionAmount || 0),
            0
          ),
          conversionRate:
            (clicksByCode.find(
              (aggregate) => aggregate.referralCode === code.code
            )?._count.id || 0) > 0
              ? (productOrders.length /
                  (clicksByCode.find(
                    (aggregate) => aggregate.referralCode === code.code
                  )?._count.id || 1)) *
                100
              : 0,
        };
      })
      .sort((a, b) => b.commissions - a.commissions)
      .slice(0, 5);

    const dayDiff = Math.ceil(
      (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const dailyStats = Array.from({ length: dayDiff }).map((_, index) => {
      const date = new Date(
        startDate.getTime() + index * 24 * 60 * 60 * 1000
      );
      const ordersForDay = orders.filter(
        (order) =>
          order.createdAt >= new Date(date.setHours(0, 0, 0, 0)) &&
          order.createdAt <= new Date(date.setHours(23, 59, 59, 999))
      );

      return {
        date: new Date(
          startDate.getTime() + index * 24 * 60 * 60 * 1000
        ).toISOString().split("T")[0],
        referrals: ordersForDay.length,
        commissions: ordersForDay.reduce(
          (sum, order) => sum + (order.commissionAmount || 0),
          0
        ),
      };
    });

    const ordersByUtm = await prisma.affiliateOrder.groupBy({
      by: ["utmSource"],
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
      },
      _sum: { commissionAmount: true },
      _count: { id: true },
    });

    const clicksByPlatform = await prisma.affiliateClick.groupBy({
      by: ["utmSource"],
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
        NOT: [{ utmSource: null }, { utmSource: "" }],
      },
      _count: { id: true },
    });

    const directClicksCount = await prisma.affiliateClick.count({
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
        OR: [{ utmSource: null }, { utmSource: "" }],
      },
    });

    const platformStats = [
      ...ordersByUtm.map((platform) => ({
        platform: platform.utmSource || "Unknown",
        clicks:
          clicksByPlatform.find(
            (click) => click.utmSource === platform.utmSource
          )?._count.id || 0,
        conversions: platform._count.id,
        revenue: platform._sum.commissionAmount || 0,
      })),
    ];

    if (directClicksCount > 0) {
      platformStats.push({
        platform: "Direct",
        clicks: directClicksCount,
        conversions: orders.filter(
          (order) =>
            !order.utmSource ||
            order.utmSource.trim() === "" ||
            order.utmSource.toLowerCase() === "direct"
        ).length,
        revenue: orders
          .filter(
            (order) =>
              !order.utmSource ||
              order.utmSource.trim() === "" ||
              order.utmSource.toLowerCase() === "direct"
          )
          .reduce((sum, order) => sum + (order.commissionAmount || 0), 0),
      });
    }

    const analytics = {
      totalReferrals,
      totalRevenue,
      totalCommissions,
      conversionRate:
        totalClicks > 0 ? (totalReferrals / totalClicks) * 100 : 0,
      topProducts,
      dailyStats,
      platformStats,
    };

    res.json(analytics);
  } catch (error) {
    console.error("Error fetching referral analytics:", error);
    res.status(500).json({ error: "Failed to fetch referral analytics" });
  }
});

export default router;
