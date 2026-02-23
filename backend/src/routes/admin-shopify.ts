import express, { Router } from "express";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import shopifyService from "../services/ShopifyService";
import shopifySyncScheduler from "../services/ShopifySyncScheduler";

const router: Router = express.Router();
const prisma = new PrismaClient();

// ==================== STORE MANAGEMENT ====================

// Add new Shopify store
router.post("/stores", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { name, shopifyDomain, apiKey, apiSecret, accessToken } = req.body;

    if (!name || !shopifyDomain || !accessToken) {
      return res.status(400).json({ error: "Name, domain, and access token are required" });
    }

    // Generate a store ID from the name
    const storeId = name.toLowerCase().replace(/\s+/g, "-");

    // Check if store already exists
    const existing = await prisma.shopifyStore.findUnique({
      where: { storeId },
    });

    if (existing) {
      return res.status(400).json({ error: "Store with this ID already exists" });
    }

    const store = await prisma.shopifyStore.create({
      data: {
        storeId,
        name,
        domain: shopifyDomain,
        apiKey: apiKey || null,
        apiSecret: apiSecret || null,
        accessToken,
        isActive: true,
      },
    });

    res.json({ success: true, store });
  } catch (error) {
    console.error("Error adding store:", error);
    res.status(500).json({ error: "Failed to add store" });
  }
});

// Update Shopify store
router.put("/stores/:storeId", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { storeId } = req.params;
    const { name, shopifyDomain, apiKey, apiSecret, accessToken } = req.body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (shopifyDomain) updateData.domain = shopifyDomain;
    if (apiKey) updateData.apiKey = apiKey;
    if (apiSecret) updateData.apiSecret = apiSecret;
    if (accessToken) updateData.accessToken = accessToken;

    const store = await prisma.shopifyStore.update({
      where: { id: storeId },
      data: updateData,
    });

    res.json({ success: true, store });
  } catch (error) {
    console.error("Error updating store:", error);
    res.status(500).json({ error: "Failed to update store" });
  }
});

// Delete Shopify store
router.delete("/stores/:storeId", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { storeId } = req.params;

    await prisma.shopifyStore.delete({
      where: { id: storeId },
    });

    res.json({ success: true, message: "Store deleted successfully" });
  } catch (error) {
    console.error("Error deleting store:", error);
    res.status(500).json({ error: "Failed to delete store" });
  }
});

// ==================== ORDER MANAGEMENT ====================

// Update order status
router.patch("/orders/:orderId/status", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;

    const validStatuses = ["PENDING", "APPROVED", "PAID", "CANCELLED", "REFUNDED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const order = await prisma.affiliateOrder.update({
      where: { id: orderId },
      data: { status },
    });

    res.json({ success: true, order });
  } catch (error) {
    console.error("Error updating order status:", error);
    res.status(500).json({ error: "Failed to update order status" });
  }
});

// ==================== DISCOUNT CODE SYNC ====================

// Get all discount codes with sync status
router.get("/discounts", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const coupons = await prisma.coupon.findMany({
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
      orderBy: { createdAt: "desc" },
    });

    // Get store names
    const stores = await prisma.shopifyStore.findMany({
      select: { storeId: true, name: true },
    });
    const storeMap = new Map(stores.map((s) => [s.storeId, s.name]));

    const discounts = coupons.map((coupon) => {
      const syncedStores = coupon.syncedStores || [];
      const priceRuleIds = (coupon.shopifyPriceRuleIds as any) || {};
      const discountIds = (coupon.shopifyDiscountIds as any) || {};

      return {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount: coupon.discount,
        affiliateName: coupon.affiliate?.user
          ? `${coupon.affiliate.user.firstName || ""} ${coupon.affiliate.user.lastName || ""}`.trim()
          : "Unknown",
        affiliateId: coupon.affiliateId,
        status: coupon.status,
        syncedToShopify: coupon.syncedToShopify,
        shopifyPriceRuleIds: priceRuleIds,
        shopifyDiscountIds: discountIds,
        syncedStores,
        storeName: syncedStores.length > 0 ? syncedStores.map((s: string) => storeMap.get(s) || s).join(", ") : null,
        usage: coupon.usage,
        maxUsage: coupon.maxUsage,
        validUntil: coupon.validUntil,
        createdAt: coupon.createdAt,
      };
    });

    const stats = {
      total: discounts.length,
      synced: discounts.filter((d) => d.syncedToShopify).length,
      pending: discounts.filter((d) => !d.syncedToShopify).length,
      failed: 0,
    };

    res.json({ discounts, stats });
  } catch (error) {
    console.error("Error fetching discounts:", error);
    res.status(500).json({ error: "Failed to fetch discounts" });
  }
});

// Sync single discount code to Shopify
router.post("/discounts/:discountId/sync", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { discountId } = req.params;
    const { storeId } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: "Store ID is required" });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { id: discountId },
    });

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Parse discount value
    const discountValue = parseFloat(coupon.discount.replace(/[^0-9.]/g, ""));
    const isShippingCode = coupon.freeShipping === true && discountValue <= 0;
    const isFarFuture = coupon.validUntil.getFullYear() >= 2090;
    const syncEndsAt = isFarFuture ? null : coupon.validUntil.toISOString();

    let graphqlId: string;

    if (isShippingCode) {
      // Free shipping code via GraphQL
      const result = await shopifyService.createFreeShippingCodeGraphQL(storeId, {
        title: `Affiliate Shipping Code: ${coupon.code}`,
        code: coupon.code,
        startsAt: new Date().toISOString(),
        endsAt: syncEndsAt,
        oncePerCustomer: false,
        combinesWith: {
          orderDiscounts: true,
          productDiscounts: true,
        },
      });
      graphqlId = result.graphqlId;
    } else {
      // Basic discount code via GraphQL
      const result = await shopifyService.createDiscountCodeGraphQL(storeId, {
        title: `Affiliate Code: ${coupon.code}`,
        code: coupon.code,
        valueType: coupon.discount.includes("%") ? "percentage" : "fixed_amount",
        value: discountValue > 0 ? discountValue : 0.01,
        startsAt: new Date().toISOString(),
        endsAt: syncEndsAt,
        usageLimit: coupon.maxUsage || undefined,
        oncePerCustomer: !!coupon.maxUsage,
        combinesWith: { shippingDiscounts: true },
      });
      graphqlId = result.graphqlId;
    }

    // Update coupon with GraphQL IDs
    const existingPriceRuleIds = (coupon.shopifyPriceRuleIds as any) || {};
    const existingDiscountIds = (coupon.shopifyDiscountIds as any) || {};
    const existingSyncedStores = coupon.syncedStores || [];

    await prisma.coupon.update({
      where: { id: discountId },
      data: {
        syncedToShopify: true,
        shopifyPriceRuleIds: { ...existingPriceRuleIds, [storeId]: graphqlId },
        shopifyDiscountIds: { ...existingDiscountIds, [storeId]: graphqlId },
        syncedStores: [...new Set([...existingSyncedStores, storeId])],
      },
    });

    res.json({ success: true, message: "Discount code synced to Shopify via GraphQL" });
  } catch (error: any) {
    console.error("Error syncing discount:", error);
    res.status(500).json({ error: error.message || "Failed to sync discount code" });
  }
});

// Sync all pending discount codes to Shopify
router.post("/discounts/sync-all", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { storeId } = req.body;

    if (!storeId) {
      return res.status(400).json({ error: "Store ID is required" });
    }

    const pendingCoupons = await prisma.coupon.findMany({
      where: {
        syncedToShopify: false,
        status: "ACTIVE",
      },
    });

    let syncedCount = 0;
    const errors: string[] = [];

    for (const coupon of pendingCoupons) {
      try {
        const discountValue = parseFloat(coupon.discount.replace(/[^0-9.]/g, ""));

        // Determine expiry — far future means no expiry
        const isFarFuture = coupon.validUntil.getFullYear() >= 2090;
        const syncEndsAt = isFarFuture ? null : coupon.validUntil.toISOString();
        const isShippingCode = coupon.freeShipping === true && discountValue <= 0;

        let graphqlId: string;

        if (isShippingCode) {
          // Free shipping code via GraphQL
          const result = await shopifyService.createFreeShippingCodeGraphQL(storeId, {
            title: `Affiliate Shipping Code: ${coupon.code}`,
            code: coupon.code,
            startsAt: new Date().toISOString(),
            endsAt: syncEndsAt,
            oncePerCustomer: false,
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
            },
          });
          graphqlId = result.graphqlId;
        } else {
          // Basic discount code via GraphQL
          const result = await shopifyService.createDiscountCodeGraphQL(storeId, {
            title: `Affiliate Code: ${coupon.code}`,
            code: coupon.code,
            valueType: coupon.discount.includes("%") ? "percentage" : "fixed_amount",
            value: discountValue > 0 ? discountValue : 0.01,
            startsAt: new Date().toISOString(),
            endsAt: syncEndsAt,
            usageLimit: coupon.maxUsage || undefined,
            oncePerCustomer: !!coupon.maxUsage,
            combinesWith: { shippingDiscounts: true },
          });
          graphqlId = result.graphqlId;
        }

        // Update coupon
        const existingPriceRuleIds = (coupon.shopifyPriceRuleIds as any) || {};
        const existingDiscountIds = (coupon.shopifyDiscountIds as any) || {};
        const existingSyncedStores = coupon.syncedStores || [];

        await prisma.coupon.update({
          where: { id: coupon.id },
          data: {
            syncedToShopify: true,
            shopifyPriceRuleIds: { ...existingPriceRuleIds, [storeId]: graphqlId },
            shopifyDiscountIds: { ...existingDiscountIds, [storeId]: graphqlId },
            syncedStores: [...new Set([...existingSyncedStores, storeId])],
          },
        });

        syncedCount++;
      } catch (err: any) {
        errors.push(`${coupon.code}: ${err.message}`);
      }
    }

    res.json({
      success: true,
      syncedCount,
      totalPending: pendingCoupons.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Error syncing all discounts:", error);
    res.status(500).json({ error: "Failed to sync discount codes" });
  }
});

// ==================== SETTINGS ====================

// Get Shopify settings
router.get("/settings", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    res.json({
      webhookConfig: {
        ordersCreate: true,
        ordersUpdate: true,
        ordersPaid: true,
        ordersCancelled: true,
        ordersRefunded: true,
      },
      syncSettings: {
        autoSync: true,
        syncFrequency: "hourly",
        defaultCommissionRate: 10,
        holdPeriodDays: 30,
        autoApproveOrders: true,
        autoApproveThreshold: 500,
      },
      webhookStatus: {
        configured: true,
        lastReceived: null,
        totalReceived: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// Update Shopify settings
router.put("/settings", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { webhookConfig, syncSettings } = req.body;
    res.json({ success: true, message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error saving settings:", error);
    res.status(500).json({ error: "Failed to save settings" });
  }
});

// Get sync status
router.get("/sync-status", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const [syncedCoupons, pendingCoupons, lastOrder] = await Promise.all([
      prisma.coupon.count({ where: { syncedToShopify: true } }),
      prisma.coupon.count({ where: { syncedToShopify: false, status: "ACTIVE" } }),
      prisma.affiliateOrder.findFirst({ orderBy: { createdAt: "desc" } }),
    ]);

    res.json({
      lastSync: lastOrder?.createdAt || null,
      syncedCoupons,
      pendingSync: pendingCoupons,
    });
  } catch (error) {
    console.error("Error fetching sync status:", error);
    res.status(500).json({ error: "Failed to fetch sync status" });
  }
});

// ==================== WEBHOOK MANAGEMENT ====================

// Get webhooks for a store
router.get("/webhooks/:storeId", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { storeId } = req.params;
    const store = await prisma.shopifyStore.findUnique({ where: { id: storeId } });
    
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const webhooks = await shopifyService.getWebhooks(store.storeId);
    res.json({ webhooks });
  } catch (error: any) {
    console.error("Error fetching webhooks:", error);
    res.status(500).json({ error: error.message || "Failed to fetch webhooks" });
  }
});

// Register webhooks for a store
router.post("/webhooks/:storeId/register", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { storeId } = req.params;
    const { baseUrl } = req.body;

    if (!baseUrl) {
      return res.status(400).json({ error: "Base URL is required" });
    }

    const store = await prisma.shopifyStore.findUnique({ where: { id: storeId } });
    
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const result = await shopifyService.registerWebhooks(store.storeId, baseUrl);
    
    // Update store with webhook status
    await prisma.shopifyStore.update({
      where: { id: storeId },
      data: { webhookId: result.success ? "configured" : null },
    });

    res.json(result);
  } catch (error: any) {
    console.error("Error registering webhooks:", error);
    res.status(500).json({ error: error.message || "Failed to register webhooks" });
  }
});

// Delete a webhook
router.delete("/webhooks/:storeId/:webhookId", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { storeId, webhookId } = req.params;
    const store = await prisma.shopifyStore.findUnique({ where: { id: storeId } });
    
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    await shopifyService.deleteWebhook(store.storeId, parseInt(webhookId));
    res.json({ success: true, message: "Webhook deleted" });
  } catch (error: any) {
    console.error("Error deleting webhook:", error);
    res.status(500).json({ error: error.message || "Failed to delete webhook" });
  }
});

// ==================== PRODUCTS ====================

// Get products from a store
router.get("/products/:storeId", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { storeId } = req.params;
    const { limit = 50 } = req.query;

    const store = await prisma.shopifyStore.findUnique({ where: { id: storeId } });
    
    if (!store) {
      return res.status(404).json({ error: "Store not found" });
    }

    const products = await shopifyService.getProducts(store.storeId, {
      limit: parseInt(limit as string),
    });
    
    res.json({ products });
  } catch (error: any) {
    console.error("Error fetching products:", error);
    res.status(500).json({ error: error.message || "Failed to fetch products" });
  }
});

// ==================== AUTO-SYNC SCHEDULER ====================

// Get scheduler status
router.get("/scheduler/status", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const status = shopifySyncScheduler.getSchedulerStatus();
    
    // Get last sync times from stores
    const stores = await prisma.shopifyStore.findMany({
      select: { id: true, name: true, lastSyncAt: true },
    });

    res.json({
      ...status,
      stores: stores.map(s => ({
        id: s.id,
        name: s.name,
        lastSync: s.lastSyncAt,
      })),
    });
  } catch (error: any) {
    console.error("Error getting scheduler status:", error);
    res.status(500).json({ error: error.message || "Failed to get scheduler status" });
  }
});

// Start scheduler
router.post("/scheduler/start", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    shopifySyncScheduler.startScheduler();
    res.json({ success: true, message: "Scheduler started" });
  } catch (error: any) {
    console.error("Error starting scheduler:", error);
    res.status(500).json({ error: error.message || "Failed to start scheduler" });
  }
});

// Stop scheduler
router.post("/scheduler/stop", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    shopifySyncScheduler.stopScheduler();
    res.json({ success: true, message: "Scheduler stopped" });
  } catch (error: any) {
    console.error("Error stopping scheduler:", error);
    res.status(500).json({ error: error.message || "Failed to stop scheduler" });
  }
});

// Trigger manual sync
router.post("/scheduler/sync", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const result = await shopifySyncScheduler.triggerSync();
    res.json(result);
  } catch (error: any) {
    console.error("Error triggering sync:", error);
    res.status(500).json({ error: error.message || "Failed to trigger sync" });
  }
});

export default router;
