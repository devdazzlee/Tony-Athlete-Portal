import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import shopifyService from "../services/ShopifyService";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get all Shopify orders for manager (read-only)
router.get(
  "/orders",
  authenticateToken,
  requireRole(["MANAGER", "ADMIN"]),
  async (req: any, res) => {
    try {
      const { page = 1, limit = 25, storeId, status } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      // Build where clause
      const where: any = {};
      if (storeId && storeId !== "all") {
        where.storeId = storeId;
      }
      if (status && status !== "all") {
        where.status = status;
      }

      // Fetch orders with affiliate info
      const [orders, total] = await Promise.all([
        prisma.affiliateOrder.findMany({
          where,
          include: {
            affiliate: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.affiliateOrder.count({ where }),
      ]);

      // Get store names
      const stores = await prisma.shopifyStore.findMany({
        select: { id: true, name: true },
      });
      const storeMap = new Map(stores.map((s) => [s.id, s.name]));

      // Build a map of discount codes to affiliate IDs for quick lookup
      // This maps all active discount codes to their affiliate IDs
      const allCoupons = await prisma.coupon.findMany({
        where: { status: "ACTIVE" },
        select: { code: true, affiliateId: true },
      });
      
      // Create map: code (uppercase) -> affiliateId
      const codeToAffiliateMap = new Map<string, string>();
      for (const coupon of allCoupons) {
        codeToAffiliateMap.set(coupon.code.toUpperCase(), coupon.affiliateId);
      }

      // Format orders for response - validate discount codes
      const formattedOrders = orders.map((order) => {
          // Check if discount code belongs to the affiliate
          const discountCodeUpper = order.referralCode?.toUpperCase() || "";
          const validAffiliateId = discountCodeUpper ? codeToAffiliateMap.get(discountCodeUpper) : null;
          
          // If discount code doesn't match the affiliate OR doesn't exist, it's a store order
          const isValidAffiliateOrder = order.affiliateId && validAffiliateId === order.affiliateId;
          
          let affiliateName = "Store Order";
          let affiliateId: string | null = null;
          
          if (isValidAffiliateOrder && order.affiliate?.user) {
            affiliateName = `${order.affiliate.user.firstName || ""} ${order.affiliate.user.lastName || ""}`.trim() || "Unknown Affiliate";
            affiliateId = order.affiliateId;
          }

          return {
            id: order.id,
            shopifyOrderId: order.shopifyOrderId,
            orderNumber: order.shopifyOrderNumber || order.orderId,
            customerEmail: order.customerEmail,
            totalAmount: order.orderValue,
            currency: order.currency,
            status: order.status,
            discountCode: order.referralCode,
            affiliateId: affiliateId,
            affiliateName: affiliateName,
            commissionAmount: isValidAffiliateOrder ? order.commissionAmount : 0,
            commissionRate: isValidAffiliateOrder ? order.commissionRate : 0,
            storeName: storeMap.get(order.storeId) || order.storeId || "Unknown Store",
            storeId: order.storeId,
            items: order.items,
            createdAt: order.createdAt,
          };
        });

      res.json({
        orders: formattedOrders,
        total,
        page: parseInt(page as string),
        totalPages: Math.ceil(total / parseInt(limit as string)),
      });
    } catch (error) {
      console.error("Error fetching Shopify orders:", error);
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  }
);

// Get Shopify stats for manager
router.get(
  "/stats",
  authenticateToken,
  requireRole(["MANAGER", "ADMIN"]),
  async (req: any, res) => {
    try {
      const { storeId } = req.query;

      const where: any = {};
      if (storeId && storeId !== "all") {
        where.storeId = storeId;
      }

      // Get aggregate stats
      const [orderStats, stores] = await Promise.all([
        prisma.affiliateOrder.aggregate({
          where,
          _sum: {
            orderValue: true,
            commissionAmount: true,
          },
          _count: true,
          _avg: {
            orderValue: true,
          },
        }),
        prisma.shopifyStore.findMany({
          select: {
            id: true,
            name: true,
          },
        }),
      ]);

      // Get breakdown by store
      const storeBreakdown = await Promise.all(
        stores.map(async (store) => {
          const storeStats = await prisma.affiliateOrder.aggregate({
            where: { storeId: store.id },
            _sum: { orderValue: true },
            _count: true,
          });
          return {
            storeName: store.name,
            orders: storeStats._count,
            revenue: storeStats._sum.orderValue || 0,
          };
        })
      );

      res.json({
        totalOrders: orderStats._count,
        totalRevenue: orderStats._sum.orderValue || 0,
        totalCommissions: orderStats._sum.commissionAmount || 0,
        averageOrderValue: orderStats._avg.orderValue || 0,
        storeBreakdown: storeBreakdown.filter((s) => s.orders > 0),
      });
    } catch (error) {
      console.error("Error fetching Shopify stats:", error);
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  }
);

// Sync orders from Shopify (manager can trigger sync)
router.post(
  "/sync",
  authenticateToken,
  requireRole(["MANAGER", "ADMIN"]),
  async (req: any, res) => {
    try {
      const stores = await prisma.shopifyStore.findMany({
        where: { isActive: true },
      });

      let totalSynced = 0;

      for (const store of stores) {
        try {
          // Get all discount codes
          const coupons = await prisma.coupon.findMany({
            where: { status: "ACTIVE" },
            select: { code: true },
          });
          const discountCodes = coupons.map((c) => c.code);

          if (discountCodes.length > 0) {
            // Fetch orders from Shopify using discount codes
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const orders = await shopifyService.getOrdersByDiscountCodesAllStores(
              discountCodes,
              {
                created_at_min: thirtyDaysAgo.toISOString(),
                limit: 100,
              }
            );
            totalSynced += orders.length;
          }

          // Update last sync time
          await prisma.shopifyStore.update({
            where: { id: store.id },
            data: { lastSyncAt: new Date() },
          });
        } catch (storeError) {
          console.error(`Error syncing store ${store.name}:`, storeError);
        }
      }

      res.json({
        success: true,
        message: `Found ${totalSynced} orders from Shopify`,
        syncedCount: totalSynced,
      });
    } catch (error) {
      console.error("Error syncing Shopify orders:", error);
      res.status(500).json({ error: "Failed to sync orders" });
    }
  }
);

// Export orders as CSV
router.get(
  "/orders/export",
  authenticateToken,
  requireRole(["MANAGER", "ADMIN"]),
  async (req: any, res) => {
    try {
      const { storeId, status } = req.query;

      const where: any = {};
      if (storeId && storeId !== "all") {
        where.storeId = storeId;
      }
      if (status && status !== "all") {
        where.status = status;
      }

      const orders = await prisma.affiliateOrder.findMany({
        where,
        include: {
          affiliate: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Get store names for export
      const stores = await prisma.shopifyStore.findMany({
        select: { id: true, name: true },
      });
      const storeMap = new Map(stores.map((s) => [s.id, s.name]));

      // Build a map of discount codes to affiliate IDs for quick lookup
      const allCoupons = await prisma.coupon.findMany({
        where: { status: "ACTIVE" },
        select: { code: true, affiliateId: true },
      });
      
      const codeToAffiliateMap = new Map<string, string>();
      for (const coupon of allCoupons) {
        codeToAffiliateMap.set(coupon.code.toUpperCase(), coupon.affiliateId);
      }

      // Generate CSV with validated affiliate names
      const headers = [
        "Order ID",
        "Date",
        "Customer Email",
        "Affiliate",
        "Discount Code",
        "Store",
        "Order Value",
        "Currency",
        "Commission",
        "Status",
      ];

      const rows = orders.map((order) => {
        // Check if discount code belongs to the affiliate
        const discountCodeUpper = order.referralCode?.toUpperCase() || "";
        const validAffiliateId = discountCodeUpper ? codeToAffiliateMap.get(discountCodeUpper) : null;
        const isValidAffiliateOrder = order.affiliateId && validAffiliateId === order.affiliateId;
        
        let affiliateName = "Store Order";
        if (isValidAffiliateOrder && order.affiliate?.user) {
          affiliateName = `${order.affiliate.user.firstName || ""} ${order.affiliate.user.lastName || ""}`.trim() || "Unknown Affiliate";
        }
        
        return [
          order.shopifyOrderNumber || order.orderId,
          order.createdAt.toISOString(),
          order.customerEmail || "",
          affiliateName,
          order.referralCode,
          storeMap.get(order.storeId) || order.storeId || "",
          order.orderValue.toFixed(2),
          order.currency,
          isValidAffiliateOrder ? order.commissionAmount.toFixed(2) : "0.00",
          order.status,
        ];
      });

      const csv = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=shopify-orders-${new Date().toISOString().split("T")[0]}.csv`
      );
      res.send(csv);
    } catch (error) {
      console.error("Error exporting orders:", error);
      res.status(500).json({ error: "Failed to export orders" });
    }
  }
);

export default router;

