import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import shopifyService from "../services/ShopifyService";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get all affiliates
router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { page = 1, limit = 20, status, search } = req.query;

      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build where clause
      const where: any = {};
      if (status) where.status = status;

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
          // Get affiliate's discount codes (normalize to uppercase for case-insensitive matching)
          const affiliateCoupons = await prisma.coupon.findMany({
            where: {
              affiliateId: affiliate.id,
              status: "ACTIVE",
            },
          });
          // Include both original and uppercase variants for case-insensitive matching
          const affiliateCodesRaw = affiliateCoupons.map(c => c.code);
          const affiliateCodes = [
            ...new Set([
              ...affiliateCodesRaw,
              ...affiliateCodesRaw.map(c => c.toUpperCase()),
              ...affiliateCodesRaw.map(c => c.toLowerCase()),
            ])
          ];
          
          // Build where clause - must match affiliateId AND referralCode must be in affiliate's codes
          const ordersWhere = affiliateCodes.length > 0 
            ? {
                affiliateId: affiliate.id,
                referralCode: { in: affiliateCodes, mode: "insensitive" as const },
              }
            : {
                affiliateId: affiliate.id,
                referralCode: { in: [] as string[] },
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
            commissionRate: affiliate.commissionRate || null,
            spendingLimit: affiliate.spendingLimit || null,
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

      // Get affiliate's discount codes (normalize for case-insensitive matching)
      const affiliateCoupons = await prisma.coupon.findMany({
        where: {
          affiliateId: affiliate.id,
          status: "ACTIVE",
        },
      });
      const affiliateCodesRaw = affiliateCoupons.map(c => c.code);
      const affiliateCodes = [
        ...new Set([
          ...affiliateCodesRaw,
          ...affiliateCodesRaw.map(c => c.toUpperCase()),
          ...affiliateCodesRaw.map(c => c.toLowerCase()),
        ])
      ];
      
      // Build where clause - must match affiliateId AND referralCode must be in affiliate's codes
      const ordersWhere = affiliateCodes.length > 0 
        ? {
            affiliateId: affiliate.id,
            referralCode: { in: affiliateCodes, mode: "insensitive" as const },
          }
        : {
            affiliateId: affiliate.id,
            referralCode: { in: [] as string[] },
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
      const { tier, tierId, commissionRate } = req.body;

      // Validate input
      const schema = z.object({
        tier: z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
        tierId: z.string().optional(),
        commissionRate: z
          .number()
          .min(0, "Commission rate must be at least 0%")
          .max(
            100,
            "Commission rate cannot exceed 100%. Please enter a value between 0 and 100%."
          )
          .optional(),
      });

      const validatedData = schema.parse({ tier, tierId, commissionRate });

      const updatedAffiliate = await prisma.affiliateProfile.update({
        where: { id },
        data: {
          tier: validatedData.tier,
          ...(validatedData.commissionRate && {
            commissionRate: validatedData.commissionRate,
          }),
        },
      });

      // If tierId is provided, create or update tier assignment
      if (validatedData.tierId) {
        // Deactivate existing tier assignments
        await prisma.tierAssignment.updateMany({
          where: {
            affiliateId: id,
            status: "ACTIVE",
          },
          data: {
            status: "INACTIVE",
          },
        });

        // Create new tier assignment
        await prisma.tierAssignment.create({
          data: {
            tierId: validatedData.tierId,
            affiliateId: id,
            assignedBy: req.user.id,
            status: "ACTIVE",
          },
        });
      }

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

// Delete affiliate (also removes their discount codes from Shopify)
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

      // Clean up Shopify discount codes BEFORE deleting from DB
      const shopifyErrors: string[] = [];
      const syncedCoupons = await prisma.coupon.findMany({
        where: {
          affiliateId: id,
          syncedToShopify: true,
        },
      });

      for (const coupon of syncedCoupons) {
        if (coupon.shopifyPriceRuleIds) {
          const priceRuleIds = coupon.shopifyPriceRuleIds as Record<string, number>;
          for (const [key, priceRuleId] of Object.entries(priceRuleIds)) {
            const actualStoreId = key.replace(/-shipping$/, "");
            try {
              await shopifyService.deletePriceRule(actualStoreId, priceRuleId);
              console.log(`✅ Deleted Shopify price rule for "${coupon.code}" from store ${actualStoreId}`);
            } catch (err: any) {
              console.error(`❌ Failed to delete Shopify price rule for "${coupon.code}" from ${actualStoreId}:`, err.message);
              shopifyErrors.push(`${coupon.code} on ${actualStoreId}: ${err.message}`);
            }
          }
        }
      }

      // Delete affiliate (cascades to referral codes, coupons, and usages)
      await prisma.affiliateProfile.delete({
        where: { id },
      });

      const message = shopifyErrors.length > 0
        ? `Affiliate deleted but some Shopify codes could not be removed: ${shopifyErrors.join("; ")}`
        : syncedCoupons.length > 0
          ? `Affiliate deleted and ${syncedCoupons.length} discount code${syncedCoupons.length > 1 ? "s" : ""} removed from Shopify`
          : "Affiliate deleted successfully";

      res.json({
        success: true,
        message,
        shopifyErrors: shopifyErrors.length > 0 ? shopifyErrors : undefined,
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

// Create/assign discount code to affiliate (with auto-sync to Shopify)
router.post(
  "/:id/discount-code",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { code, discount, description, expiresAt, maxUsage, freeShipping } = req.body;

      // Validate input
      const schema = z.object({
        code: z.string().min(3, "Code must be at least 3 characters"),
        discount: z.string().min(1, "Discount value is required"),
        description: z.string().optional(),
        expiresAt: z.string().optional(),
        maxUsage: z.number().min(1).optional(),
        freeShipping: z.boolean().default(false),
      });

      const validatedData = schema.parse({
        code,
        discount,
        description,
        expiresAt,
        maxUsage,
        freeShipping,
      });

      // Normalize code to uppercase
      const normalizedCode = validatedData.code.trim().toUpperCase().replace(/\s+/g, "-");

      // Check if affiliate exists
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id },
        include: {
          user: {
            select: { firstName: true, lastName: true },
          },
        },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      // Check if coupon code already exists
      const existingCoupon = await prisma.coupon.findFirst({
        where: { code: normalizedCode },
      });

      if (existingCoupon) {
        return res.status(400).json({ error: `The code "${normalizedCode}" already exists. Please choose a different code.` });
      }

      // Parse discount value — supports "10%", "$10", or plain number
      const discountStr = validatedData.discount.trim();
      let discountType: "percentage" | "fixed_amount" = "percentage";
      let discountValue = 0;

      if (discountStr.endsWith("%")) {
        discountType = "percentage";
        discountValue = parseFloat(discountStr.replace("%", ""));
      } else if (discountStr.startsWith("$")) {
        discountType = "fixed_amount";
        discountValue = parseFloat(discountStr.replace("$", ""));
      } else {
        // Default to percentage if just a number
        discountType = "percentage";
        discountValue = parseFloat(discountStr);
      }

      if (isNaN(discountValue) || discountValue <= 0) {
        return res.status(400).json({ error: "Invalid discount value. Use formats like '10%' or '$10'." });
      }

      // Calculate expiration
      const validUntil = validatedData.expiresAt
        ? new Date(validatedData.expiresAt)
        : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Default 1 year

      const affiliateName = `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() || "Unknown";
      const codeDescription = validatedData.description || `Discount code for ${affiliateName} - ${discountStr}`;

      // ----- Sync to Shopify (all stores) -----
      let syncedToShopify = false;
      let shopifyPriceRuleIds: Record<string, number> = {};
      let shopifyDiscountIds: Record<string, number> = {};
      let syncedStores: string[] = [];
      const shopifyErrors: string[] = [];

      const stores = shopifyService.getAllStores();
      const hasFreeShipping = validatedData.freeShipping === true;

      for (const store of stores) {
        try {
          if (hasFreeShipping && discountValue <= 0) {
            // FREE SHIPPING ONLY — create shipping_line price rule
            const priceRule = await shopifyService.createPriceRule(store.id, {
              title: `Affiliate Code: ${normalizedCode} (Free Shipping)`,
              valueType: "percentage",
              value: -100,
              targetType: "shipping_line",
              startsAt: new Date().toISOString(),
              endsAt: validUntil.toISOString(),
              usageLimit: validatedData.maxUsage || undefined,
              oncePerCustomer: true,
            });

            const discCode = await shopifyService.createDiscountCode(
              store.id,
              priceRule.id,
              normalizedCode
            );

            shopifyPriceRuleIds[store.id] = priceRule.id;
            shopifyDiscountIds[store.id] = discCode.id;
            syncedStores.push(store.id);

            console.log(`✅ Synced free shipping code "${normalizedCode}" to ${store.name}`);
          } else if (hasFreeShipping && discountValue > 0) {
            // DISCOUNT + FREE SHIPPING — need two price rules on Shopify
            const shopifyValue = -discountValue;

            // 1. Create product discount code
            const priceRule = await shopifyService.createPriceRule(store.id, {
              title: `Affiliate Code: ${normalizedCode}`,
              valueType: discountType,
              value: shopifyValue,
              startsAt: new Date().toISOString(),
              endsAt: validUntil.toISOString(),
              usageLimit: validatedData.maxUsage || undefined,
              oncePerCustomer: true,
            });

            const discCode = await shopifyService.createDiscountCode(
              store.id,
              priceRule.id,
              normalizedCode
            );

            shopifyPriceRuleIds[store.id] = priceRule.id;
            shopifyDiscountIds[store.id] = discCode.id;

            // 2. Create AUTOMATIC free shipping rule (no code — Shopify auto-applies at checkout)
            try {
              const shippingRule = await shopifyService.createPriceRule(store.id, {
                title: `Auto Free Shipping (Affiliate: ${normalizedCode})`,
                valueType: "percentage",
                value: -100,
                targetType: "shipping_line",
                startsAt: new Date().toISOString(),
                endsAt: validUntil.toISOString(),
                // No usageLimit — auto-applies to all orders during the period
                oncePerCustomer: false,
              });

              // Do NOT create a discount code — this is an automatic discount
              shopifyPriceRuleIds[`${store.id}-shipping`] = shippingRule.id;

              console.log(`✅ Synced discount "${normalizedCode}" + automatic free shipping to ${store.name}`);
            } catch (fsErr: any) {
              console.warn(`⚠️ Discount synced but auto free shipping failed for ${store.name}:`, fsErr.message);
              shopifyErrors.push(`${store.name} (free shipping): ${fsErr.message}`);
            }

            syncedStores.push(store.id);
          } else {
            // DISCOUNT ONLY (no free shipping)
            const shopifyValue = discountValue > 0 ? -discountValue : -0.01;

            const priceRule = await shopifyService.createPriceRule(store.id, {
              title: `Affiliate Code: ${normalizedCode}`,
              valueType: discountType,
              value: shopifyValue,
              startsAt: new Date().toISOString(),
              endsAt: validUntil.toISOString(),
              usageLimit: validatedData.maxUsage || undefined,
              oncePerCustomer: true,
            });

            const discCode = await shopifyService.createDiscountCode(
              store.id,
              priceRule.id,
              normalizedCode
            );

            shopifyPriceRuleIds[store.id] = priceRule.id;
            shopifyDiscountIds[store.id] = discCode.id;
            syncedStores.push(store.id);

            console.log(`✅ Synced discount code "${normalizedCode}" to ${store.name} (${store.country})`);
          }
        } catch (err: any) {
          console.error(`❌ Failed to sync code "${normalizedCode}" to ${store.name}:`, err.message);
          shopifyErrors.push(`${store.name}: ${err.message}`);
        }
      }

      syncedToShopify = syncedStores.length > 0;

      // Create coupon in database with Shopify sync data
      const coupon = await prisma.coupon.create({
        data: {
          code: normalizedCode,
          description: codeDescription,
          discount: validatedData.discount,
          affiliateId: id,
          validUntil,
          maxUsage: validatedData.maxUsage,
          status: "ACTIVE",
          isAffiliate: true,
          freeShipping: validatedData.freeShipping,
          syncedToShopify,
          shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
          shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
          syncedStores,
        },
      });

      const responseMessage = shopifyErrors.length > 0
        ? `Code created but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
        : syncedToShopify
          ? `Code "${normalizedCode}" created and synced to Shopify (${syncedStores.length} store${syncedStores.length > 1 ? "s" : ""})`
          : `Code "${normalizedCode}" created in database (Shopify sync unavailable)`;

      res.json({
        success: true,
        message: responseMessage,
        coupon,
        shopifySync: {
          synced: syncedToShopify,
          stores: syncedStores,
          errors: shopifyErrors,
        },
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
        tierId: z.string().optional(),
        discountCode: z.string().optional(),
        discountValue: z.number().min(0).max(100).optional(),
        instagram: z.string().optional(),
        tiktok: z.string().optional(),
        spendingLimit: z.number().min(0).nullable().optional(),
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
            paymentMethod: "PAYPAL", // Default payment method
            spendingLimit: data.spendingLimit || null,
            socialMedia: {
              instagram: data.instagram || null,
              tiktok: data.tiktok || null,
            },
          },
        });

        // Create tier assignment if tierId is provided
        if (data.tierId) {
          await tx.tierAssignment.create({
            data: {
              tierId: data.tierId,
              affiliateId: affiliate.id,
              assignedBy: req.user.id,
              status: "ACTIVE",
            },
          });
        }

        // Create discount code if provided (DB only inside transaction)
        let createdCouponId: string | null = null;
        if (data.discountCode && data.discountValue !== undefined) {
          const normalizedCode = data.discountCode.trim().toUpperCase().replace(/\s+/g, "-");
          const validUntil = new Date();
          validUntil.setFullYear(validUntil.getFullYear() + 1);
          
          const coupon = await tx.coupon.create({
            data: {
              code: normalizedCode,
              discount: data.discountValue.toString(),
              affiliateId: affiliate.id,
              status: "ACTIVE",
              isAffiliate: true,
              freeShipping: false,
              description: `Affiliate discount code for ${data.firstName} ${data.lastName}`,
              validUntil: validUntil,
            },
          });
          createdCouponId = coupon.id;
        }

        return { user, affiliate, createdCouponId };
      });

      // Sync discount code to Shopify AFTER transaction succeeds
      let shopifySyncResult: { synced: boolean; stores: string[]; errors: string[] } = {
        synced: false, stores: [], errors: [],
      };

      if (result.createdCouponId && data.discountCode && data.discountValue !== undefined) {
        const normalizedCode = data.discountCode.trim().toUpperCase().replace(/\s+/g, "-");
        const validUntil = new Date();
        validUntil.setFullYear(validUntil.getFullYear() + 1);

        const shopifyPriceRuleIds: Record<string, number> = {};
        const shopifyDiscountIds: Record<string, number> = {};
        const syncedStores: string[] = [];
        const shopifyErrors: string[] = [];

        const stores = shopifyService.getAllStores();

        for (const store of stores) {
          try {
            const shopifyValue = data.discountValue > 0 ? -data.discountValue : -0.01;

            const priceRule = await shopifyService.createPriceRule(store.id, {
              title: `Affiliate Code: ${normalizedCode}`,
              valueType: "percentage",
              value: shopifyValue,
              startsAt: new Date().toISOString(),
              endsAt: validUntil.toISOString(),
              oncePerCustomer: true,
            });

            const discountCode = await shopifyService.createDiscountCode(
              store.id,
              priceRule.id,
              normalizedCode
            );

            shopifyPriceRuleIds[store.id] = priceRule.id;
            shopifyDiscountIds[store.id] = discountCode.id;
            syncedStores.push(store.id);

            console.log(`✅ Synced new affiliate code "${normalizedCode}" to ${store.name}`);
          } catch (err: any) {
            console.error(`❌ Failed to sync code "${normalizedCode}" to ${store.name}:`, err.message);
            shopifyErrors.push(`${store.name}: ${err.message}`);
          }
        }

        // Update coupon with Shopify sync data
        if (syncedStores.length > 0) {
          await prisma.coupon.update({
            where: { id: result.createdCouponId },
            data: {
              syncedToShopify: true,
              shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
              shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
              syncedStores,
            },
          });
        }

        shopifySyncResult = {
          synced: syncedStores.length > 0,
          stores: syncedStores,
          errors: shopifyErrors,
        };
      }

      const message = shopifySyncResult.errors.length > 0
        ? `Affiliate created but some Shopify stores failed to sync: ${shopifySyncResult.errors.join("; ")}`
        : shopifySyncResult.synced
          ? "Affiliate created and discount code synced to Shopify"
          : "Affiliate created successfully";

      res.json({
        success: true,
        message,
        affiliate: {
          id: result.affiliate.id,
          email: result.user.email,
          name: `${result.user.firstName} ${result.user.lastName}`,
          status: result.affiliate.status,
          commissionRate: result.affiliate.commissionRate,
        },
        shopifySync: shopifySyncResult,
      });
    } catch (error: any) {
      console.error("Error creating affiliate:", error?.message || error?.toString() || "Unknown error");
      if (error?.name === "ZodError") {
        return res.status(400).json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ 
        error: "Failed to create affiliate",
        message: error?.message || "Unknown error occurred"
      });
    }
  }
);

export default router;
