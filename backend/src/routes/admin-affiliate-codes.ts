import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import * as crypto from "crypto";
import { authenticateToken, requireRole } from "../middleware/auth";
import shopifyService from "../services/ShopifyService";

const router: Router = Router();
const prisma = new PrismaClient();

// Get all affiliate codes with filtering and pagination
router.get("/", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      affiliateId,
    } = req.query;

    const filters: any = {
      isAffiliate: true, // Only fetch affiliate allowance codes
    };

    if (search) {
      filters.OR = [
        { code: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      filters.status = status;
    }

    if (affiliateId) {
      filters.affiliateId = affiliateId;
    }

    const codes = await prisma.coupon.findMany({
      where: filters,
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.coupon.count({ where: filters });

    // Add expiration status and usage info
    const codesWithStatus = codes.map((code) => {
      const isExpired = code.validUntil < new Date();
      const isUsed = code.maxUsage ? code.usage >= code.maxUsage : false;
      return {
        ...code,
        isExpired,
        isUsed,
        remainingUses: code.maxUsage ? code.maxUsage - code.usage : 0,
      };
    });

    res.json({
      codes: codesWithStatus,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching affiliate codes:", error);
    res.status(500).json({ error: "Failed to fetch affiliate codes" });
  }
});

// Get affiliate code by ID
router.get("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const code = await prisma.coupon.findUnique({
      where: { id },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!code || !code.isAffiliate) {
      return res.status(404).json({ error: "Affiliate code not found" });
    }

    const isExpired = code.validUntil < new Date();
    const isUsed = code.maxUsage ? code.usage >= code.maxUsage : false;

    res.json({
      ...code,
      isExpired,
      isUsed,
      remainingUses: code.maxUsage ? code.maxUsage - code.usage : 0,
    });
  } catch (error) {
    console.error("Error fetching affiliate code:", error);
    res.status(500).json({ error: "Failed to fetch affiliate code" });
  }
});

// Generate new affiliate code (with optional custom code + auto-sync to Shopify)
router.post("/generate", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const generateSchema = z.object({
      affiliateId: z.string(),
      customCode: z.string().min(1).max(50).optional(), // Admin can set their own code
      allowanceAmount: z.number().min(0), // Dollar amount (e.g., 150)
      discountType: z.enum(["percentage", "fixed_amount"]).default("fixed_amount"),
      discountValue: z.number().min(0).default(0),
      freeShipping: z.boolean().default(false),
      description: z.string().optional(),
      syncToShopify: z.boolean().default(true), // Auto-sync to Shopify by default
    });

    const data = generateSchema.parse(req.body);

    // Verify affiliate exists
    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { id: data.affiliateId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }

    // Determine the code to use
    let code: string;

    if (data.customCode) {
      // Admin provided a custom code — clean it up and check uniqueness
      code = data.customCode.trim().toUpperCase().replace(/\s+/g, "-");

      const existingCode = await prisma.coupon.findFirst({
        where: { code },
      });

      if (existingCode) {
        return res.status(400).json({
          error: `The code "${code}" already exists. Please choose a different code.`,
        });
      }
    } else {
      // Auto-generate unique code
    let attempts = 0;
    const existingCodes = new Set(
      (await prisma.coupon.findMany({ select: { code: true } })).map((c) => c.code)
    );

    do {
      const randomPart = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();
      code = `AFFILIATE-${randomPart}`;
      attempts++;
    } while (existingCodes.has(code) && attempts < 10);

    if (attempts >= 10) {
      return res.status(400).json({ error: "Unable to generate unique code" });
      }
    }

    // Calculate end of current month
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Create description
    const shippingText = data.freeShipping ? " + Free Shipping" : "";
    const discountText = data.discountValue > 0 
      ? data.discountType === "percentage" 
        ? `${data.discountValue}% off${shippingText}` 
        : `$${data.discountValue} off${shippingText}`
      : data.freeShipping 
        ? "Free Shipping Only" 
        : "No Discount";

    const description = data.description || 
      `Affiliate allowance code for ${affiliate.user.firstName} ${affiliate.user.lastName} - $${data.allowanceAmount} allowance - ${discountText} - Expires ${endOfMonth.toLocaleDateString()}`;

    // ----- Sync to Shopify (both USA and Canada stores) -----
    let syncedToShopify = false;
    let shopifyPriceRuleIds: Record<string, number> = {};
    let shopifyDiscountIds: Record<string, number> = {};
    let syncedStores: string[] = [];
    const shopifyErrors: string[] = [];

    if (data.syncToShopify) {
      const stores = shopifyService.getAllStores();
      const hasFreeShipping = data.freeShipping === true;
      const hasDiscount = data.discountValue > 0;

      for (const store of stores) {
        try {
          if (hasFreeShipping && !hasDiscount) {
            // FREE SHIPPING ONLY — create a shipping_line price rule
            const priceRule = await shopifyService.createPriceRule(store.id, {
              title: `Affiliate Code: ${code} (Free Shipping)`,
              valueType: "percentage",
              value: -100,
              targetType: "shipping_line",
              startsAt: new Date().toISOString(),
              endsAt: endOfMonth.toISOString(),
              usageLimit: 1,
              oncePerCustomer: true,
            });

            const discountCode = await shopifyService.createDiscountCode(
              store.id,
              priceRule.id,
              code
            );

            shopifyPriceRuleIds[store.id] = priceRule.id;
            shopifyDiscountIds[store.id] = discountCode.id;
            syncedStores.push(store.id);

            console.log(`✅ Synced free shipping code "${code}" to ${store.name}`);
          } else if (hasFreeShipping && hasDiscount) {
            // DISCOUNT + FREE SHIPPING
            // Shopify REST API can't combine both in one price rule/code.
            // Strategy: Create the discount CODE + an AUTOMATIC free shipping rule (no code needed, auto-applies at checkout)
            const shopifyValue = -data.discountValue;

            // 1. Create the product discount code (customer enters this)
            const priceRule = await shopifyService.createPriceRule(store.id, {
              title: `Affiliate Code: ${code}`,
              valueType: data.discountType,
              value: shopifyValue,
              startsAt: new Date().toISOString(),
              endsAt: endOfMonth.toISOString(),
              usageLimit: 1,
              oncePerCustomer: true,
            });

            const discountCode = await shopifyService.createDiscountCode(
              store.id,
              priceRule.id,
              code
            );

            shopifyPriceRuleIds[store.id] = priceRule.id;
            shopifyDiscountIds[store.id] = discountCode.id;

            // 2. Create an AUTOMATIC free shipping rule (no discount code — Shopify auto-applies it at checkout)
            try {
              const shippingRule = await shopifyService.createPriceRule(store.id, {
                title: `Auto Free Shipping (Affiliate: ${code})`,
                valueType: "percentage",
                value: -100,
                targetType: "shipping_line",
                startsAt: new Date().toISOString(),
                endsAt: endOfMonth.toISOString(),
                // No usageLimit — auto-applies to all orders during the period
                oncePerCustomer: false,
              });

              // Do NOT create a discount code for this rule — it's automatic
              // Store the shipping rule ID for cleanup (keyed with -shipping suffix)
              shopifyPriceRuleIds[`${store.id}-shipping`] = shippingRule.id;

              console.log(`✅ Synced discount "${code}" + automatic free shipping to ${store.name}`);
            } catch (fsErr: any) {
              console.warn(`⚠️ Discount code synced but auto free shipping rule failed for ${store.name}:`, fsErr.message);
              shopifyErrors.push(`${store.name} (free shipping): ${fsErr.message}`);
            }

            syncedStores.push(store.id);
          } else {
            // DISCOUNT ONLY (no free shipping)
            const shopifyValue = data.discountValue > 0 ? -data.discountValue : -0.01;

            const priceRule = await shopifyService.createPriceRule(store.id, {
              title: `Affiliate Code: ${code}`,
              valueType: data.discountType,
              value: shopifyValue,
              startsAt: new Date().toISOString(),
              endsAt: endOfMonth.toISOString(),
              usageLimit: 1,
              oncePerCustomer: true,
            });

            const discountCode = await shopifyService.createDiscountCode(
              store.id,
              priceRule.id,
              code
            );

            shopifyPriceRuleIds[store.id] = priceRule.id;
            shopifyDiscountIds[store.id] = discountCode.id;
            syncedStores.push(store.id);

            console.log(`✅ Synced code "${code}" to ${store.name} (${store.country})`);
          }
        } catch (err: any) {
          console.error(`❌ Failed to sync code "${code}" to ${store.name}:`, err.message);
          shopifyErrors.push(`${store.name}: ${err.message}`);
        }
      }

      syncedToShopify = syncedStores.length > 0;
    }

    // Create the affiliate code in our database
    const affiliateCode = await prisma.coupon.create({
      data: {
        code,
        description,
        discount: data.discountValue.toString(),
        affiliateId: data.affiliateId,
        validUntil: endOfMonth,
        maxUsage: 1, // One-time use
        usage: 0,
        status: "ACTIVE",
        freeShipping: data.freeShipping,
        isAffiliate: true,
        syncedToShopify,
        shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
        shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
        syncedStores,
      },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const hasFreeShippingSync = data.freeShipping && syncedToShopify;
    const freeShippingNote = hasFreeShippingSync
      ? data.discountValue > 0
        ? `. Free shipping enabled as automatic discount on Shopify.`
        : `. Free shipping code synced.`
      : "";

    const responseMessage = shopifyErrors.length > 0
      ? `Code created but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
      : syncedToShopify
        ? `Code "${code}" created and synced to Shopify (${syncedStores.length} store${syncedStores.length > 1 ? "s" : ""})${freeShippingNote}`
        : "Affiliate code generated successfully";

    res.status(201).json({
      message: responseMessage,
      code: affiliateCode,
      shopifySync: {
        synced: syncedToShopify,
        stores: syncedStores,
        errors: shopifyErrors,
        freeShippingAutoApplied: hasFreeShippingSync && data.discountValue > 0,
      },
    });
  } catch (error) {
    console.error("Error generating affiliate code:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to generate affiliate code" });
  }
});

// Delete affiliate code (also removes from Shopify)
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const code = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!code || !code.isAffiliate) {
      return res.status(404).json({ error: "Affiliate code not found" });
    }

    // Delete from Shopify first (if synced) — handles both discount and free shipping rules
    const shopifyErrors: string[] = [];
    if (code.syncedToShopify && code.shopifyPriceRuleIds) {
      const priceRuleIds = code.shopifyPriceRuleIds as Record<string, number>;
      for (const [key, priceRuleId] of Object.entries(priceRuleIds)) {
        // Keys may be "store-usa" or "store-usa-shipping" (for free shipping rules)
        const actualStoreId = key.replace(/-shipping$/, "");
        try {
          await shopifyService.deletePriceRule(actualStoreId, priceRuleId);
          console.log(`✅ Deleted price rule ${priceRuleId} from Shopify store ${actualStoreId} (key: ${key})`);
        } catch (err: any) {
          console.error(`❌ Failed to delete price rule ${priceRuleId} from ${actualStoreId}:`, err.message);
          shopifyErrors.push(`${actualStoreId}: ${err.message}`);
        }
      }
    }

    // Delete from database
    await prisma.coupon.delete({
      where: { id },
    });

    const message = shopifyErrors.length > 0
      ? `Code deleted from database but failed to remove from some Shopify stores: ${shopifyErrors.join("; ")}`
      : code.syncedToShopify
        ? "Affiliate code deleted from database and Shopify"
        : "Affiliate code deleted successfully";

    res.json({ message, shopifyErrors });
  } catch (error) {
    console.error("Error deleting affiliate code:", error);
    res.status(500).json({ error: "Failed to delete affiliate code" });
  }
});

// Update affiliate code status (activate/deactivate) — syncs to Shopify
router.patch("/:id/status", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const statusSchema = z.object({
      status: z.enum(["ACTIVE", "INACTIVE"]),
    });

    const { status } = statusSchema.parse(req.body);

    const code = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!code || !code.isAffiliate) {
      return res.status(404).json({ error: "Affiliate code not found" });
    }

    const shopifyErrors: string[] = [];

    if (status === "INACTIVE" && code.syncedToShopify && code.shopifyPriceRuleIds) {
      // DEACTIVATING: Delete price rules from Shopify (both discount and free shipping rules)
      const priceRuleIds = code.shopifyPriceRuleIds as Record<string, number>;
      for (const [key, priceRuleId] of Object.entries(priceRuleIds)) {
        const actualStoreId = key.replace(/-shipping$/, "");
        try {
          await shopifyService.deletePriceRule(actualStoreId, priceRuleId);
          console.log(`✅ Deactivated: deleted price rule ${priceRuleId} from Shopify store ${actualStoreId} (key: ${key})`);
        } catch (err: any) {
          console.error(`❌ Failed to deactivate code on ${actualStoreId}:`, err.message);
          shopifyErrors.push(`${actualStoreId}: ${err.message}`);
        }
      }

      // Update DB: mark as not synced since we removed from Shopify
      const updatedCode = await prisma.coupon.update({
        where: { id },
        data: {
          status,
          syncedToShopify: false,
          shopifyPriceRuleIds: undefined,
          shopifyDiscountIds: undefined,
          syncedStores: [],
        },
        include: {
          affiliate: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      const message = shopifyErrors.length > 0
        ? `Code deactivated in database but failed to remove from some Shopify stores: ${shopifyErrors.join("; ")}`
        : "Code deactivated and removed from Shopify";

      return res.json({ message, code: updatedCode, shopifyErrors });
    }

    if (status === "ACTIVE" && !code.syncedToShopify) {
      // REACTIVATING: Re-create price rules on Shopify
      const shopifyPriceRuleIds: Record<string, number> = {};
      const shopifyDiscountIds: Record<string, number> = {};
      const syncedStores: string[] = [];

      const stores = shopifyService.getAllStores();
      const discountValue = parseFloat(code.discount.replace(/[^0-9.]/g, "")) || 0;
      const shopifyValue = discountValue > 0 ? -discountValue : -0.01;
      const valueType = code.discount.includes("$") ? "fixed_amount" as const : "percentage" as const;

      for (const store of stores) {
        try {
          const priceRule = await shopifyService.createPriceRule(store.id, {
            title: `Affiliate Code: ${code.code}`,
            valueType,
            value: shopifyValue,
            startsAt: new Date().toISOString(),
            endsAt: code.validUntil.toISOString(),
            usageLimit: code.maxUsage || undefined,
            oncePerCustomer: true,
          });

          const discountCode = await shopifyService.createDiscountCode(
            store.id,
            priceRule.id,
            code.code
          );

          shopifyPriceRuleIds[store.id] = priceRule.id;
          shopifyDiscountIds[store.id] = discountCode.id;
          syncedStores.push(store.id);

          console.log(`✅ Reactivated: synced code "${code.code}" to ${store.name}`);
        } catch (err: any) {
          console.error(`❌ Failed to re-sync code "${code.code}" to ${store.name}:`, err.message);
          shopifyErrors.push(`${store.name}: ${err.message}`);
        }
      }

      const syncedToShopify = syncedStores.length > 0;

      const updatedCode = await prisma.coupon.update({
        where: { id },
        data: {
          status,
          syncedToShopify,
          shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
          shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
          syncedStores,
        },
        include: {
          affiliate: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      const message = shopifyErrors.length > 0
        ? `Code reactivated but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
        : syncedToShopify
          ? `Code reactivated and synced to Shopify (${syncedStores.length} store${syncedStores.length > 1 ? "s" : ""})`
          : "Code reactivated in database (Shopify sync unavailable)";

      return res.json({ message, code: updatedCode, shopifyErrors });
    }

    // Simple status update (e.g., already synced and just toggling)
    const updatedCode = await prisma.coupon.update({
      where: { id },
      data: { status },
      include: {
        affiliate: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    res.json({
      message: "Affiliate code status updated successfully",
      code: updatedCode,
    });
  } catch (error) {
    console.error("Error updating affiliate code status:", error);
    res.status(500).json({ error: "Failed to update affiliate code status" });
  }
});

// Get statistics for affiliate codes
router.get("/stats/overview", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.query;

    const filters: any = { isAffiliate: true };
    if (affiliateId) {
      filters.affiliateId = affiliateId;
    }

    const totalCodes = await prisma.coupon.count({ where: filters });
    const activeCodes = await prisma.coupon.count({
      where: { ...filters, status: "ACTIVE" },
    });
    const usedCodes = await prisma.coupon.count({
      where: { ...filters, usage: { gt: 0 } },
    });
    const expiredCodes = await prisma.coupon.count({
      where: {
        ...filters,
        validUntil: { lt: new Date() },
      },
    });

    res.json({
      totalCodes,
      activeCodes,
      usedCodes,
      expiredCodes,
      unusedCodes: totalCodes - usedCodes,
    });
  } catch (error) {
    console.error("Error fetching affiliate code statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;

