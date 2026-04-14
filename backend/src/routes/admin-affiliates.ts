import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import bcrypt from "bcryptjs";
import shopifyService from "../services/ShopifyService";
import emailService from "../services/EmailService";

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
          // Query orders by affiliateId only — the affiliateId on each order already
          // correctly links it to the right affiliate. No need to cross-check referralCode.
          const ordersWhere = { affiliateId: affiliate.id };

          const [earnings, conversions, clicks] = await Promise.all([
            // Get earnings from AffiliateOrder table
            prisma.affiliateOrder.aggregate({
              where: ordersWhere,
              _sum: { commissionAmount: true },
            }),

            // Get conversions from AffiliateOrder table
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

      // Query orders by affiliateId only — the affiliateId on each order already
      // correctly links it to the right affiliate. No need to cross-check referralCode.
      const ordersWhere = { affiliateId: affiliate.id };

      const [earnings, conversions, clicks] = await Promise.all([
        // Get earnings from AffiliateOrder table
        prisma.affiliateOrder.aggregate({
          where: ordersWhere,
          _sum: { commissionAmount: true },
        }),

        // Get conversions from AffiliateOrder table
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
            other: socialMedia.other || null,
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
          const ids = coupon.shopifyPriceRuleIds as Record<string, any>;
          for (const [key, idValue] of Object.entries(ids)) {
            const actualStoreId = key.replace(/-shipping$/, "");
            try {
              await shopifyService.deleteDiscountSmart(actualStoreId, idValue);
              console.log(`✅ Deleted Shopify discount for "${coupon.code}" from store ${actualStoreId}`);
            } catch (err: any) {
              console.error(`❌ Failed to delete Shopify discount for "${coupon.code}" from ${actualStoreId}:`, err.message);
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
            select: { firstName: true, lastName: true, email: true },
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
      // If no expiry date is set, the code should NOT expire
      const hasExpiry = !!validatedData.expiresAt;
      const validUntil = hasExpiry
        ? new Date(validatedData.expiresAt!)
        : new Date('2099-12-31T23:59:59.999Z'); // Far future = no expiry
      const shopifyEndsAt = hasExpiry ? validUntil.toISOString() : null; // null = no expiry in Shopify

      const affiliateName = `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() || "Unknown";
      const codeDescription = validatedData.description || `Discount code for ${affiliateName} - ${discountStr}`;

      // ----- Sync to Shopify via GraphQL (all stores) -----
      // GraphQL is the ONLY way to properly set combinesWith — REST silently ignores it
      let syncedToShopify = false;
      let shopifyPriceRuleIds: Record<string, any> = {};
      let shopifyDiscountIds: Record<string, any> = {};
      let syncedStores: string[] = [];
      const shopifyErrors: string[] = [];

      const stores = shopifyService.getAllStores();
      const hasFreeShipping = validatedData.freeShipping === true;

      for (const store of stores) {
        try {
          if (hasFreeShipping && discountValue <= 0) {
            // FREE SHIPPING ONLY — create via GraphQL
            const result = await shopifyService.createFreeShippingCodeGraphQL(store.id, {
              title: `Affiliate Code: ${normalizedCode} (Free Shipping)`,
              code: normalizedCode,
              startsAt: new Date().toISOString(),
              endsAt: shopifyEndsAt,
              oncePerCustomer: false,
              combinesWith: {
                orderDiscounts: true,
                productDiscounts: true,
              },
            });

            shopifyPriceRuleIds[store.id] = result.graphqlId;
            shopifyDiscountIds[store.id] = result.graphqlId;
            syncedStores.push(store.id);
          } else if (hasFreeShipping && discountValue > 0) {
            // DISCOUNT + FREE SHIPPING — need two codes on Shopify

            // 1. Create product discount code via GraphQL
            const discResult = await shopifyService.createDiscountCodeGraphQL(store.id, {
              title: `Affiliate Code: ${normalizedCode}`,
              code: normalizedCode,
              valueType: discountType,
              value: discountValue,
              startsAt: new Date().toISOString(),
              endsAt: shopifyEndsAt,
              oncePerCustomer: false,
              combinesWith: { shippingDiscounts: true },
            });

            shopifyPriceRuleIds[store.id] = discResult.graphqlId;
            shopifyDiscountIds[store.id] = discResult.graphqlId;

            // 2. Create separate free shipping code via GraphQL
            try {
              const shipResult = await shopifyService.createFreeShippingCodeGraphQL(store.id, {
                title: `Auto Free Shipping (Affiliate: ${normalizedCode})`,
                code: `${normalizedCode}-SHIP`,
                startsAt: new Date().toISOString(),
                endsAt: shopifyEndsAt,
                oncePerCustomer: false,
                combinesWith: {
                  orderDiscounts: true,
                  productDiscounts: true,
                },
              });

              shopifyPriceRuleIds[`${store.id}-shipping`] = shipResult.graphqlId;
            } catch (fsErr: any) {
              console.warn(`⚠️ Discount synced but auto free shipping failed for ${store.name}:`, fsErr.message);
              shopifyErrors.push(`${store.name} (free shipping): ${fsErr.message}`);
            }

            syncedStores.push(store.id);
          } else {
            // DISCOUNT ONLY (no free shipping) — for follower codes, unlimited use, no expiry
            const result = await shopifyService.createDiscountCodeGraphQL(store.id, {
              title: `Affiliate Code: ${normalizedCode}`,
              code: normalizedCode,
              valueType: discountType,
              value: discountValue,
              startsAt: new Date().toISOString(),
              endsAt: shopifyEndsAt,
              oncePerCustomer: false,
              combinesWith: { shippingDiscounts: true },
            });

            shopifyPriceRuleIds[store.id] = result.graphqlId;
            shopifyDiscountIds[store.id] = result.graphqlId;
            syncedStores.push(store.id);
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
          maxUsage: undefined,
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

      // Notify affiliate about the new discount code
      if (affiliate.user?.email) {
        try {
          await emailService.sendAffiliateDiscountAssignedEmail(
            affiliate.user.email,
            affiliate.user.firstName,
            [
              {
                code: normalizedCode,
                discountText: discountStr,
                freeShipping: validatedData.freeShipping,
                allowanceAmount: undefined,
                expiresAt: validUntil,
                description: codeDescription,
              },
            ]
          );
        } catch (emailErr) {
          console.warn("Failed to send affiliate discount email:", emailErr);
          // Don't fail response on email issue
        }
      } else {
        console.warn("Skipping email: affiliate missing email address");
      }

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
      const { instagram, tiktok, other } = req.body;

      // Validate input
      const schema = z.object({
        instagram: z.string().optional().nullable(),
        tiktok: z.string().optional().nullable(),
        other: z.string().optional().nullable(),
      });

      const validatedData = schema.parse({ instagram, tiktok, other });

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
            other: validatedData.other || null,
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

// Update affiliate password (admin only)
router.patch(
  "/:id/password",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const schema = z.object({
        password: z.string().min(8, "Password must be at least 8 characters"),
        confirmPassword: z.string().min(8).optional(),
      });

      const data = schema.parse(req.body);

      if (data.confirmPassword && data.password !== data.confirmPassword) {
        return res.status(400).json({ error: "Passwords do not match" });
      }

      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { id },
        select: { userId: true },
      });

      if (!affiliate) {
        return res.status(404).json({ error: "Affiliate not found" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 10);

      await prisma.user.update({
        where: { id: affiliate.userId },
        data: { password: hashedPassword },
      });

      res.json({ success: true, message: "Affiliate password updated successfully" });
    } catch (error) {
      console.error("Error updating affiliate password:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update affiliate password" });
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
        other: z.string().optional(),
        spendingLimit: z.number().min(0).nullable().optional(),
        deliverablesNote: z.string().optional(),
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
            deliverablesNote: data.deliverablesNote || null,
            socialMedia: {
              instagram: data.instagram || null,
              tiktok: data.tiktok || null,
              other: data.other || null,
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
        // Follower discount codes should NOT expire by default
        let createdCouponId: string | null = null;
        if (data.discountCode && data.discountValue !== undefined) {
          const normalizedCode = data.discountCode.trim().toUpperCase().replace(/\s+/g, "-");
          const validUntil = new Date('2099-12-31T23:59:59.999Z'); // No expiry for follower codes
          
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

        const shopifyPriceRuleIds: Record<string, any> = {};
        const shopifyDiscountIds: Record<string, any> = {};
        const syncedStores: string[] = [];
        const shopifyErrors: string[] = [];

        const stores = shopifyService.getAllStores();

        for (const store of stores) {
          try {
            // Follower discount codes: no expiry, unlimited use — created via GraphQL
            const result2 = await shopifyService.createDiscountCodeGraphQL(store.id, {
              title: `Affiliate Code: ${normalizedCode}`,
              code: normalizedCode,
              valueType: "percentage",
              value: data.discountValue > 0 ? data.discountValue : 0.01,
              startsAt: new Date().toISOString(),
              endsAt: null, // No expiry for follower codes
              oncePerCustomer: false,
              combinesWith: { shippingDiscounts: true },
            });

            shopifyPriceRuleIds[store.id] = result2.graphqlId;
            shopifyDiscountIds[store.id] = result2.graphqlId;
            syncedStores.push(store.id);

            console.log(`✅ Synced new affiliate code "${normalizedCode}" to ${store.name} via GraphQL`);
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
