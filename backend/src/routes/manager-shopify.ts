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

      // Format orders for response
      const formattedOrders = orders.map((order) => ({
        id: order.id,
        shopifyOrderId: order.shopifyOrderId,
        orderNumber: order.shopifyOrderNumber || order.orderId,
        customerEmail: order.customerEmail,
        totalAmount: order.orderValue,
        currency: order.currency,
        status: order.status,
        discountCode: order.referralCode,
        affiliateId: order.affiliateId,
        affiliateName: order.affiliate?.user
          ? `${order.affiliate.user.firstName || ""} ${order.affiliate.user.lastName || ""}`.trim()
          : "Unknown",
        commissionAmount: order.commissionAmount,
        commissionRate: order.commissionRate,
        storeName: storeMap.get(order.storeId) || order.storeId || "Unknown Store",
        storeId: order.storeId,
        items: order.items,
        createdAt: order.createdAt,
      }));

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

      // Generate CSV
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

      const rows = orders.map((order) => [
        order.shopifyOrderNumber || order.orderId,
        order.createdAt.toISOString(),
        order.customerEmail || "",
        order.affiliate?.user
          ? `${order.affiliate.user.firstName || ""} ${order.affiliate.user.lastName || ""}`.trim()
          : "",
        order.referralCode,
        storeMap.get(order.storeId) || order.storeId || "",
        order.orderValue.toFixed(2),
        order.currency,
        order.commissionAmount.toFixed(2),
        order.status,
      ]);

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

