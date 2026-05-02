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
      const dateRange = req.query.dateRange || "7d"; // Default to 7 days

      // Calculate date filter based on dateRange parameter
      let dateFilter: Date | undefined;
      let daysForDailyPerformance = 7;
      
      switch (dateRange) {
        case "7d":
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          daysForDailyPerformance = 7;
          break;
        case "30d":
          dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          daysForDailyPerformance = 30;
          break;
        case "90d":
          dateFilter = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          daysForDailyPerformance = 90;
          break;
        case "all":
          dateFilter = undefined; // No date filter for all time
          daysForDailyPerformance = 365; // Show last year for daily performance
          break;
        default:
          dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          daysForDailyPerformance = 7;
      }

      // Calculate previous period dates for comparison (skip for "all" time)
      let previousPeriodStart: Date | undefined;
      let previousPeriodEnd: Date | undefined;
      let periodLabel = "";

      if (dateFilter) {
        const periodLength = now.getTime() - dateFilter.getTime();
        previousPeriodEnd = new Date(dateFilter.getTime() - 1); // Just before current period starts
        previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);
        previousPeriodStart.setHours(0, 0, 0, 0);
        previousPeriodEnd.setHours(23, 59, 59, 999);

        // Set period label for comparison
        if (dateRange === "7d") {
          periodLabel = "previous 7 days";
        } else if (dateRange === "30d") {
          periodLabel = "previous 30 days";
        } else if (dateRange === "90d") {
          periodLabel = "previous 90 days";
        }
      }

      // Build where clause for date filtering
      const dateWhereClause = dateFilter ? { createdAt: { gte: dateFilter } } : {};
      const previousPeriodWhereClause = previousPeriodStart && previousPeriodEnd
        ? { createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd } }
        : null;

      // Get all affiliates
      const affiliates = await prisma.affiliateProfile.findMany({
        include: {
          user: true,
        },
      });

      // Calculate program statistics using correct tables for current period
      const [
        totalAffiliates,
        activeAffiliates,
        pendingAffiliates,
        totalClicks,
        totalConversions,
        totalRevenue,
        totalCommissions,
        // Previous period statistics (if applicable)
        previousClicks,
        previousConversions,
        previousRevenue,
        previousCommissions,
      ] = await Promise.all([
        prisma.affiliateProfile.count(),

        prisma.affiliateProfile.count({
          where: { status: "ACTIVE" },
        }),

        prisma.affiliateProfile.count({
          where: { status: "PENDING" },
        }),

        // Current period - Total clicks
        prisma.affiliateClick.count({
          where: dateWhereClause,
        }),

        // Current period - Total conversions (orders)
        prisma.affiliateOrder.count({
          where: dateWhereClause,
        }),

        // Current period - Total revenue from orders
        prisma.affiliateOrder.aggregate({
          where: dateWhereClause,
          _sum: { orderValue: true },
        }),

        // Current period - Total commissions from orders
        prisma.affiliateOrder.aggregate({
          where: dateWhereClause,
          _sum: { commissionAmount: true },
        }),

        // Previous period - Total clicks
        previousPeriodWhereClause
          ? prisma.affiliateClick.count({
              where: previousPeriodWhereClause,
            })
          : Promise.resolve(0),

        // Previous period - Total conversions
        previousPeriodWhereClause
          ? prisma.affiliateOrder.count({
              where: previousPeriodWhereClause,
            })
          : Promise.resolve(0),

        // Previous period - Total revenue
        previousPeriodWhereClause
          ? prisma.affiliateOrder.aggregate({
              where: previousPeriodWhereClause,
              _sum: { orderValue: true },
            })
          : Promise.resolve({ _sum: { orderValue: 0 } }),

        // Previous period - Total commissions
        previousPeriodWhereClause
          ? prisma.affiliateOrder.aggregate({
              where: previousPeriodWhereClause,
              _sum: { commissionAmount: true },
            })
          : Promise.resolve({ _sum: { commissionAmount: 0 } }),
      ]);

      // Calculate percentage changes
      const calculateChange = (current: number, previous: number) => {
        if (previous === 0) {
          return current > 0 ? 100 : 0;
        }
        return ((current - previous) / previous) * 100;
      };

      const revenueChange = previousPeriodWhereClause
        ? calculateChange(
            totalRevenue._sum.orderValue || 0,
            previousRevenue._sum.orderValue || 0
          )
        : 0;

      const commissionsChange = previousPeriodWhereClause
        ? calculateChange(
            totalCommissions._sum.commissionAmount || 0,
            previousCommissions._sum.commissionAmount || 0
          )
        : 0;

      const conversionsChange = previousPeriodWhereClause
        ? calculateChange(totalConversions, previousConversions)
        : 0;

      // For conversion rate, calculate both current and previous rates
      const currentConversionRate =
        totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
      const previousConversionRate =
        previousClicks > 0 ? (previousConversions / previousClicks) * 100 : 0;
      const conversionRateChange = previousPeriodWhereClause
        ? calculateChange(currentConversionRate, previousConversionRate)
        : 0;

      // Get daily performance data based on date range
      const dailyPerformance = [];
      const daysToShow = Math.min(daysForDailyPerformance, 90); // Limit to 90 days max for performance
      for (let i = daysToShow - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

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
          // Get affiliate's discount codes for display purposes
          const affiliateCoupons = await prisma.coupon.findMany({
            where: {
              affiliateId: affiliate.id,
              status: "ACTIVE",
              validUntil: { gt: new Date() },
            },
            select: { code: true },
          });
          const affiliateReferralCodes = await prisma.referralCode.findMany({
            where: {
              affiliateId: affiliate.id,
              isActive: true,
            },
            select: { code: true },
          });

          // Query orders by affiliateId only — the affiliateId on each order already
          // correctly links it to the right affiliate. No need to cross-check referralCode.
          const ordersWhere = {
            affiliateId: affiliate.id,
            ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
          };

          const [earnings, conversions, clicks, lastLoginActivity] =
            await Promise.all([
              prisma.affiliateOrder.aggregate({
                where: ordersWhere,
                _sum: { commissionAmount: true },
              }),

              prisma.affiliateOrder.count({
                where: ordersWhere,
              }),

              prisma.affiliateClick.count({
                where: {
                  affiliateId: affiliate.id,
                  ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
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
            commissionRate: affiliate.commissionRate || 0,
            spendingLimit: affiliate.spendingLimit || null,
            totalEarnings: earnings._sum.commissionAmount || 0,
            totalConversions: conversions,
            totalClicks: clicks,
            discountCodes: affiliateCoupons.map(c => c.code),
            referralCodes: affiliateReferralCodes.map(r => r.code),
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

      // Get real pending payouts from database
      const formatPaymentMethod = (method: string): string => {
        const methodMap: Record<string, string> = {
          PAYPAL: "PayPal",
          STRIPE: "Stripe",
          BANK_TRANSFER: "Bank Transfer",
          CRYPTO: "Crypto",
          WISE: "Wise",
        };
        return methodMap[method] || method;
      };

      const dbPendingPayouts = await prisma.payout.findMany({
        where: { status: "PENDING" },
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
        take: 10,
      });

      const pendingPayouts = dbPendingPayouts.map((payout) => ({
        id: payout.id,
        affiliate: payout.affiliate?.user
          ? `${payout.affiliate.user.firstName} ${payout.affiliate.user.lastName}`
          : "Unknown",
        amount: payout.amount,
        method: formatPaymentMethod(payout.method),
        status: "pending",
        requestDate: payout.createdAt.toISOString().split("T")[0],
        email: payout.affiliate?.user?.email || "",
      }));

      const approvedUnpaidCommissions = await prisma.affiliateOrder.groupBy({
        by: ["affiliateId"],
        where: { status: "APPROVED" },
        _sum: { commissionAmount: true },
        _count: { id: true },
      });

      const affiliateIds = approvedUnpaidCommissions.map((row) => row.affiliateId);
      const approvedAffiliates = await prisma.affiliateProfile.findMany({
        where: { id: { in: affiliateIds } },
        include: {
          user: {
            select: { firstName: true, lastName: true, email: true },
          },
        },
      });

      const commissionPendingPayouts = approvedUnpaidCommissions
        .filter((row) => (row._sum.commissionAmount || 0) > 0)
        .map((row) => {
          const aff = approvedAffiliates.find((a) => a.id === row.affiliateId);
          return {
            id: `COMM-APPROVED-${row.affiliateId}`,
            affiliate: aff?.user
              ? `${aff.user.firstName} ${aff.user.lastName}`
              : "Unknown",
            amount: row._sum.commissionAmount || 0,
            method: "Commission Balance",
            status: "pending",
            requestDate: new Date().toISOString().split("T")[0],
            email: aff?.user?.email || "",
          };
        });

      const mergedPendingPayouts = [...pendingPayouts, ...commissionPendingPayouts];

      const [newDeliverablesCount, feedbackCount] = await Promise.all([
        prisma.activity.count({
          where: {
            action: "deliverable_submitted",
            OR: [{ status: "PENDING" }, { status: null }],
          },
        }),
        prisma.activity.count({
          where: { action: "feedback_submitted" },
        }),
      ]);

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
          conversionRate: currentConversionRate,
          // Period comparisons
          changes: previousPeriodWhereClause
            ? {
                revenue: {
                  value: Math.abs(revenueChange),
                  type: revenueChange >= 0 ? "increase" : "decrease",
                  period: periodLabel || "previous period",
                },
                commissions: {
                  value: Math.abs(commissionsChange),
                  type: commissionsChange >= 0 ? "increase" : "decrease",
                  period: periodLabel || "previous period",
                },
                conversions: {
                  value: Math.abs(conversionsChange),
                  type: conversionsChange >= 0 ? "increase" : "decrease",
                  period: periodLabel || "previous period",
                },
                conversionRate: {
                  value: Math.abs(conversionRateChange),
                  type: conversionRateChange >= 0 ? "increase" : "decrease",
                  period: periodLabel || "previous period",
                },
              }
            : null,
        },
        dailyPerformance,
        topAffiliates: sortedTopAffiliates,
        pendingPayouts: mergedPendingPayouts,
        systemAlerts: [
          {
            type: "warning",
            title: `${newDeliverablesCount} new deliverable submissions`,
            description: "Review pending deliverables from affiliates.",
            time: "Live",
            actionUrl: "/admin/deliverables?status=PENDING",
          },
          {
            type: "info",
            title: `${feedbackCount} general feedback submissions`,
            description: "Review feedback sent from affiliates.",
            time: "Live",
            actionUrl: "/admin/feedback",
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
