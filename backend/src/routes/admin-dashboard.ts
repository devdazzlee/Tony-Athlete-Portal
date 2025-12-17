import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Admin Dashboard Overview
router.get(
  "/overview",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all affiliates
      const affiliates = await prisma.affiliateProfile.findMany({
        include: {
          user: true,
        },
      });

      // Calculate program statistics using correct tables
      const [
        totalAffiliates,
        activeAffiliates,
        pendingAffiliates,
        totalClicks,
        totalConversions,
        totalRevenue,
        totalCommissions,
      ] = await Promise.all([
        prisma.affiliateProfile.count(),

        prisma.affiliateProfile.count({
          where: { status: "ACTIVE" },
        }),

        prisma.affiliateProfile.count({
          where: { status: "PENDING" },
        }),

        // Total clicks in last 30 days
        prisma.affiliateClick.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),

        // Total conversions (orders) in last 30 days
        prisma.affiliateOrder.count({
          where: { createdAt: { gte: thirtyDaysAgo } },
        }),

        // Total revenue from orders in last 30 days
        prisma.affiliateOrder.aggregate({
          where: { createdAt: { gte: thirtyDaysAgo } },
          _sum: { orderValue: true },
        }),

        // Total commissions from orders in last 30 days
        prisma.affiliateOrder.aggregate({
          where: { createdAt: { gte: thirtyDaysAgo } },
          _sum: { commissionAmount: true },
        }),
      ]);

      // Get daily performance data for last 7 days
      const dailyPerformance = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const endOfDay = new Date(date.setHours(23, 59, 59, 999));

        const [clicks, conversions, revenue] = await Promise.all([
          prisma.affiliateClick.count({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),

          prisma.affiliateOrder.count({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
          }),

          prisma.affiliateOrder.aggregate({
            where: {
              createdAt: { gte: startOfDay, lte: endOfDay },
            },
            _sum: { orderValue: true },
          }),
        ]);

        dailyPerformance.push({
          date: startOfDay.toISOString().split("T")[0],
          totalClicks: clicks,
          conversions,
          revenue: revenue._sum.orderValue || 0,
        });
      }

      // Get top performing affiliates using correct tables
      const topAffiliates = await Promise.all(
        affiliates.slice(0, 10).map(async (affiliate) => {
          const [earnings, conversions, clicks, lastLoginActivity] =
            await Promise.all([
              prisma.affiliateOrder.aggregate({
                where: {
                  affiliateId: affiliate.id,
                  createdAt: { gte: thirtyDaysAgo },
                },
                _sum: { commissionAmount: true },
              }),

              prisma.affiliateOrder.count({
                where: {
                  affiliateId: affiliate.id,
                  createdAt: { gte: thirtyDaysAgo },
                },
              }),

              prisma.affiliateClick.count({
                where: {
                  affiliateId: affiliate.id,
                  createdAt: { gte: thirtyDaysAgo },
                },
              }),

              // Get last login from Activity table
              prisma.activity.findFirst({
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
              }),
            ]);

          return {
            id: affiliate.id,
            name:
              `${(affiliate as any).user?.firstName || ""} ${(affiliate as any).user?.lastName || ""}`.trim() ||
              "Unknown",
            email: (affiliate as any).user?.email || "No email",
            status: affiliate.status,
            tier: affiliate.tier,
            totalEarnings: earnings._sum.commissionAmount || 0,
            totalConversions: conversions,
            totalClicks: clicks,
            lastActivity: lastLoginActivity?.createdAt
              ? lastLoginActivity.createdAt
                  .toISOString()
                  .replace("T", " ")
                  .split(".")[0]
              : "Never",
          };
        })
      );

      // Sort by earnings
      const sortedTopAffiliates = topAffiliates
        .sort((a, b) => b.totalEarnings - a.totalEarnings)
        .slice(0, 5);

      // Get pending payouts (mock for now)
      const pendingPayouts = [
        {
          id: "PAY-001",
          affiliate: sortedTopAffiliates[0]?.name || "Affiliate 1",
          amount: 250.0,
          method: "PayPal",
          status: "pending",
          requestDate: new Date().toISOString().split("T")[0],
          email: sortedTopAffiliates[0]?.email || "affiliate@example.com",
        },
      ];

      res.json({
        statistics: {
          totalAffiliates,
          activeAffiliates,
          pendingAffiliates,
          totalRevenue: totalRevenue._sum.orderValue || 0,
          totalCommissions: totalCommissions._sum.commissionAmount || 0,
          averageCommissionRate:
            totalConversions > 0
              ? (totalCommissions._sum.commissionAmount || 0) / totalConversions
              : 0,
          totalClicks,
          totalConversions,
          conversionRate:
            totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        },
        dailyPerformance,
        topAffiliates: sortedTopAffiliates,
        pendingPayouts,
        systemAlerts: [
          {
            type: "warning",
            title: `${pendingAffiliates} Pending Affiliate Applications`,
            description:
              "Review and approve new affiliate applications to grow your program.",
            time: "2 hours ago",
          },
          {
            type: "info",
            title: "Monthly Payout Processing",
            description: `Process monthly payouts for ${activeAffiliates} affiliates.`,
            time: "1 day ago",
          },
        ],
      });
    } catch (error) {
      console.error("Error fetching admin dashboard overview:", error);
      res
        .status(500)
        .json({ error: "Failed to fetch admin dashboard overview" });
    }
  }
);

export default router;
