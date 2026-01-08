import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get all affiliates
router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { page = 1, limit = 20, status, tier, search } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build where clause
      const where: any = {};
      if (status) where.status = status;
      if (tier) where.tier = tier;

      const affiliates = await prisma.affiliateProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: parseInt(limit as string),
      });

      const total = await prisma.affiliateProfile.count({ where });

      // Get performance data for each affiliate using correct tables
      const affiliatesWithStats = await Promise.all(
        affiliates.map(async (affiliate) => {
          // Get affiliate's discount codes
          const affiliateCoupons = await prisma.coupon.findMany({
            where: {
              affiliateId: affiliate.id,
              status: "ACTIVE",
            },
          });
          const affiliateCodes = affiliateCoupons.map(c => c.code);
          
          // Build where clause - must match affiliateId AND referralCode must be in affiliate's codes
          const ordersWhere = affiliateCodes.length > 0 
            ? {
                affiliateId: affiliate.id,
                referralCode: { in: affiliateCodes },
              }
            : {
                affiliateId: affiliate.id,
                referralCode: { in: [] }, // Empty array returns no results
              };

          const [earnings, conversions, clicks] = await Promise.all([
            // Get earnings from AffiliateOrder table - only orders with matching discount codes
            prisma.affiliateOrder.aggregate({
              where: ordersWhere,
              _sum: { commissionAmount: true },
            }),

            // Get conversions from AffiliateOrder table - only orders with matching discount codes
            prisma.affiliateOrder.count({
              where: ordersWhere,
            }),

            // Get clicks from AffiliateClick table
            prisma.affiliateClick.count({
              where: { affiliateId: affiliate.id },
            }),
          ]);

          const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;

          // Get last login from Activity table
          const lastLoginActivity = await prisma.activity.findFirst({
            where: {
              userId: affiliate.userId,
              action: "user_login",
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              createdAt: true,
            },
          });

          return {
            id: affiliate.id,
            name:
              `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() ||
              "Unknown",
            email: affiliate.user?.email || "No email",
            joinDate: affiliate.createdAt.toISOString().split("T")[0],
            status: affiliate.status,
            tier: affiliate.tier,
            commissionRate: affiliate.commissionRate || null,
            totalEarnings: earnings._sum.commissionAmount || 0,
            totalClicks: clicks,
            totalConversions: conversions,
            conversionRate: Math.round(conversionRate * 10) / 10,
            lastActivity: lastLoginActivity?.createdAt
              ? lastLoginActivity.createdAt
                  .toISOString()
                  .replace("T", " ")
                  .split(".")[0]
              : "Never",
            paymentMethod: affiliate.paymentMethod,
            country: "Unknown", // Add to schema if needed
          };
        })
      );

      res.json({
        data: affiliatesWithStats,
        pagination: {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          total,
          pages: Math.ceil(total / parseInt(limit as string)),
        },
      });
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      res.status(500).json({ error: "Failed to fetch affiliates" });
    }
  }
);

// Get affiliate details
router.get(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              phone: true,
              createdAt: true,
            },
          },
        },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Get affiliate's discount codes
      const affiliateCoupons = await prisma.coupon.findMany({
        where: {
          affiliateId: affiliate.id,
          status: "ACTIVE",
        },
      });
      const affiliateCodes = affiliateCoupons.map(c => c.code);
      
      // Build where clause - must match affiliateId AND referralCode must be in affiliate's codes
      const ordersWhere = affiliateCodes.length > 0 
        ? {
            affiliateId: affiliate.id,
            referralCode: { in: affiliateCodes },
          }
        : {
            affiliateId: affiliate.id,
            referralCode: { in: [] },
          };

      const [earnings, conversions, clicks] = await Promise.all([
        // Get earnings from AffiliateOrder table - only orders with matching discount codes
        prisma.affiliateOrder.aggregate({
          where: ordersWhere,
          _sum: { commissionAmount: true },
        }),

        // Get conversions from AffiliateOrder table - only orders with matching discount codes
        prisma.affiliateOrder.count({
          where: ordersWhere,
        }),

        // Get clicks from AffiliateClick table
        prisma.affiliateClick.count({
          where: { affiliateId: affiliate.id },
        }),
      ]);

      // Get last login from Activity table
      const lastLoginActivity = await prisma.activity.findFirst({
        where: {
          userId: affiliate.userId,
          action: "user_login",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
        },
      });

      // Get discount codes for this affiliate
      const discountCodes = await prisma.coupon.findMany({
        where: { affiliateId: affiliate.id },
        orderBy: { createdAt: "desc" },
      });

      // Get referral codes for this affiliate
      const referralCodes = await prisma.referralCode.findMany({
        where: { affiliateId: affiliate.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          commissionRate: true,
          type: true,
          isActive: true,
          currentUses: true,
          expiresAt: true,
          createdAt: true,
        },
      });

      // Get social media from affiliate profile
      const socialMedia = (affiliate.socialMedia as any) || {};

      res.json({
        affiliate: {
          ...affiliate,
          user: affiliate.user,
          stats: {
            totalEarnings: earnings._sum.commissionAmount || 0,
            totalConversions: conversions,
            totalClicks: clicks,
            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
            lastLogin: lastLoginActivity?.createdAt
              ? lastLoginActivity.createdAt
                  .toISOString()
                  .replace("T", " ")
                  .split(".")[0]
              : "Never",
          },
          referralCodes,
          discountCodes,
          socialMedia: {
            instagram: socialMedia.instagram || null,
            tiktok: socialMedia.tiktok || null,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching affiliate details:", error);
      res.status(500).json({ error: "Failed to fetch affiliate details" });
    }
  }
);

// Update affiliate status
router.patch(
  "/:id/status",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      // Validate status
      const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const updatedAffiliate = await prisma.affiliateProfile.update({
        where: { id },
        data: { status },
      });

      res.json({
        success: true,
        message: `Affiliate status updated to ${status}`,
        affiliate: updatedAffiliate,
      });
    } catch (error) {
      console.error("Error updating affiliate status:", error);
      res.status(500).json({ error: "Failed to update affiliate status" });
    }
  }
);

// Update affiliate tier and commission rate
router.patch(
  "/:id/tier",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { tier, commissionRate } = req.body;

      // Validate input
      const schema = z.object({
        tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
        commissionRate: z
          .number()
          .min(0, "Commission rate must be at least 0%")
          .max(
            100,
            "Commission rate cannot exceed 100%. Please enter a value between 0 and 100%."
          )
          .optional(),
      });

      const validatedData = schema.parse({ tier, commissionRate });

      const updatedAffiliate = await prisma.affiliateProfile.update({
        where: { id },
        data: {
          tier: validatedData.tier,
          ...(validatedData.commissionRate && {
            commissionRate: validatedData.commissionRate,
          }),
          // ...(validatedData.commissionRate !== undefined &&
          //   {
          //     // Update commission rate in referral codes
          //   }),
        },
      });

      // If commission rate is provided, update all affiliate's referral codes
      if (validatedData.commissionRate !== undefined) {
        await prisma.referralCode.updateMany({
          where: { affiliateId: id },
          data: { commissionRate: validatedData.commissionRate },
        });
      }

      res.json({
        success: true,
        message: "Affiliate tier and commission rate updated successfully",
        affiliate: updatedAffiliate,
      });
    } catch (error) {
      console.error("Error updating affiliate tier:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update affiliate tier" });
    }
  }
);

// Delete affiliate
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Delete affiliate (cascades to referral codes and usages)
      await prisma.affiliateProfile.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Affiliate deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      res.status(500).json({ error: "Failed to delete affiliate" });
    }
  }
);

// Update affiliate deliverables note
router.patch(
  "/:id/deliverables-note",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { deliverablesNote } = req.body;

      // Validate input
      const schema = z.object({
        deliverablesNote: z.string().optional().nullable(),
      });

      const validatedData = schema.parse({ deliverablesNote });

      const updatedAffiliate = await prisma.affiliateProfile.update({
        where: { id },
        data: {
          deliverablesNote: validatedData.deliverablesNote || null,
        },
      });

      res.json({
        success: true,
        message: "Deliverables note updated successfully",
        affiliate: updatedAffiliate,
      });
    } catch (error) {
      console.error("Error updating deliverables note:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update deliverables note" });
    }
  }
);

// Update affiliate spending limit (Product Allowance)
router.patch(
  "/:id/spending-limit",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { spendingLimit } = req.body;

      const schema = z.object({
        spendingLimit: z.number().min(0).nullable(),
      });

      const validatedData = schema.parse({ spendingLimit });

      const updatedAffiliate = await prisma.affiliateProfile.update({
        where: { id },
        data: {
          spendingLimit: validatedData.spendingLimit,
        },
      });

      res.json({
        success: true,
        message: "Spending limit updated successfully",
        affiliate: updatedAffiliate,
      });
    } catch (error) {
      console.error("Error updating spending limit:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update spending limit" });
    }
  }
);

// Create/assign discount code to affiliate
router.post(
  "/:id/discount-code",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { code, discount, description, expiresAt, maxUsage } = req.body;

      // Validate input
      const schema = z.object({
        code: z.string().min(3, "Code must be at least 3 characters"),
        discount: z.string().min(1, "Discount value is required"),
        description: z.string().optional(),
        expiresAt: z.string().optional(),
        maxUsage: z.number().min(1).optional(),
      });

      const validatedData = schema.parse({
        code,
        discount,
        description,
        expiresAt,
        maxUsage,
      });

      // Check if affiliate exists
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Check if coupon code already exists
      const existingCoupon = await prisma.coupon.findUnique({
        where: { code: validatedData.code },
      });

      if (existingCoupon) {
        return res.status(400).json({ error: "Coupon code already exists" });
      }

      // Create coupon
      const coupon = await prisma.coupon.create({
        data: {
          code: validatedData.code,
          description: validatedData.description || "",
          discount: validatedData.discount,
          affiliateId: id,
          validUntil: validatedData.expiresAt
            ? new Date(validatedData.expiresAt)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Default 1 year
          maxUsage: validatedData.maxUsage,
          status: "ACTIVE",
        },
      });

      res.json({
        success: true,
        message: "Discount code assigned successfully",
        coupon,
      });
    } catch (error) {
      console.error("Error creating discount code:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create discount code" });
    }
  }
);

// Create/assign referral code (tracking code) to affiliate
router.post(
  "/:id/referral-code",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { commissionRate, expiresAt } = req.body;

      // Validate input
      const schema = z.object({
        commissionRate: z.number().min(0).max(100, "Commission rate must be between 0 and 100"),
        expiresAt: z.string().optional(),
      });

      const validatedData = schema.parse({
        commissionRate,
        expiresAt,
      });

      // Check if affiliate exists
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Use ReferralSystemModel to generate referral code
      const { ReferralSystemModel } = await import("../models/ReferralSystem");
      
      const referralCode = await ReferralSystemModel.generateReferralCode(
        id,
        {
          type: "BOTH",
          commissionRate: validatedData.commissionRate,
          expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        }
      );

      res.json({
        success: true,
        message: "Tracking code created successfully",
        referralCode: {
          id: referralCode.id,
          code: referralCode.code,
          commissionRate: referralCode.commissionRate,
          expiresAt: referralCode.expiresAt,
        },
      });
    } catch (error) {
      console.error("Error creating referral code:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tracking code" });
    }
  }
);

// Update social media links for affiliate
router.patch(
  "/:id/social-media",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { instagram, tiktok } = req.body;

      // Validate input
      const schema = z.object({
        instagram: z.string().optional().nullable(),
        tiktok: z.string().optional().nullable(),
      });

      const validatedData = schema.parse({ instagram, tiktok });

      // Check if affiliate exists
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Get existing social media data
      const existingSocialMedia = (affiliate.socialMedia as any) || {};

      // Update social media
      const updatedAffiliate = await prisma.affiliateProfile.update({
        where: { id },
        data: {
          socialMedia: {
            ...existingSocialMedia,
            instagram: validatedData.instagram || null,
            tiktok: validatedData.tiktok || null,
          },
        },
      });

      res.json({
        success: true,
        message: "Social media links updated successfully",
        affiliate: updatedAffiliate,
      });
    } catch (error) {
      console.error("Error updating social media:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update social media links" });
    }
  }
);

// Get affiliate analytics
router.get(
  "/:id/analytics",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { period = "30d" } = req.query;

      // Calculate date range
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

      const [clicks, conversions, revenue, commissions] = await Promise.all([
        // Get clicks from AffiliateClick table
        prisma.affiliateClick.count({
          where: {
            affiliateId: id,
            createdAt: { gte: startDate },
          },
        }),

        // Get conversions from AffiliateOrder table
        prisma.affiliateOrder.count({
          where: {
            affiliateId: id,
            createdAt: { gte: startDate },
          },
        }),

        // Get revenue from AffiliateOrder table
        prisma.affiliateOrder.aggregate({
          where: {
            affiliateId: id,
            createdAt: { gte: startDate },
          },
          _sum: { orderValue: true },
        }),

        // Get commissions from AffiliateOrder table
        prisma.affiliateOrder.aggregate({
          where: {
            affiliateId: id,
            createdAt: { gte: startDate },
          },
          _sum: { commissionAmount: true },
        }),
      ]);

      res.json({
        period,
        analytics: {
          totalClicks: clicks,
          totalConversions: conversions,
          totalRevenue: revenue._sum.orderValue || 0,
          totalCommissions: commissions._sum.commissionAmount || 0,
          conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
          averageOrderValue:
            conversions > 0 ? (revenue._sum.orderValue || 0) / conversions : 0,
        },
      });
    } catch (error) {
      console.error("Error fetching affiliate analytics:", error);
      res.status(500).json({ error: "Failed to fetch affiliate analytics" });
    }
  }
);

// Create new affiliate
router.post(
  "/create",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        commissionRate: z.number().min(0).max(100).optional().default(10),
        tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional().default("BRONZE"),
        discountCode: z.string().optional(),
        discountValue: z.number().min(0).max(100).optional(),
        instagram: z.string().optional(),
        tiktok: z.string().optional(),
      });

      const data = schema.parse(req.body);

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      // Create user and affiliate profile in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: data.email,
            password: hashedPassword,
            firstName: data.firstName,
            lastName: data.lastName,
            role: "AFFILIATE",
            status: "ACTIVE",
          },
        });

        // Create affiliate profile
        const affiliate = await tx.affiliateProfile.create({
          data: {
            userId: user.id,
            status: "ACTIVE",
            tier: data.tier,
            commissionRate: data.commissionRate,
            socialMedia: {
              instagram: data.instagram || null,
              tiktok: data.tiktok || null,
            },
          },
        });

        // Create discount code if provided
        if (data.discountCode && data.discountValue !== undefined) {
          await tx.coupon.create({
            data: {
              code: data.discountCode.toUpperCase(),
              discount: data.discountValue.toString(),
              affiliateId: affiliate.id,
              status: "ACTIVE",
              isAffiliate: true,
              freeShipping: false,
              description: `Affiliate discount code for ${data.firstName} ${data.lastName}`,
            },
          });
        }

        return { user, affiliate };
      });

      res.json({
        success: true,
        message: "Affiliate created successfully",
        affiliate: {
          id: result.affiliate.id,
          email: result.user.email,
          name: `${result.user.firstName} ${result.user.lastName}`,
          status: result.affiliate.status,
          tier: result.affiliate.tier,
          commissionRate: result.affiliate.commissionRate,
        },
      });
    } catch (error: any) {
      console.error("Error creating affiliate:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create affiliate" });
    }
  }
);

export default router;
