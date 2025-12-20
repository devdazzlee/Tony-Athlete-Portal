"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get("/overview", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const now = new Date();
        const dateRange = req.query.dateRange || "7d";
        let dateFilter;
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
                dateFilter = undefined;
                daysForDailyPerformance = 365;
                break;
            default:
                dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                daysForDailyPerformance = 7;
        }
        let previousPeriodStart;
        let previousPeriodEnd;
        let periodLabel = "";
        if (dateFilter) {
            const periodLength = now.getTime() - dateFilter.getTime();
            previousPeriodEnd = new Date(dateFilter.getTime() - 1);
            previousPeriodStart = new Date(previousPeriodEnd.getTime() - periodLength);
            previousPeriodStart.setHours(0, 0, 0, 0);
            previousPeriodEnd.setHours(23, 59, 59, 999);
            if (dateRange === "7d") {
                periodLabel = "previous 7 days";
            }
            else if (dateRange === "30d") {
                periodLabel = "previous 30 days";
            }
            else if (dateRange === "90d") {
                periodLabel = "previous 90 days";
            }
        }
        const dateWhereClause = dateFilter ? { createdAt: { gte: dateFilter } } : {};
        const previousPeriodWhereClause = previousPeriodStart && previousPeriodEnd
            ? { createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd } }
            : null;
        const affiliates = await prisma.affiliateProfile.findMany({
            include: {
                user: true,
            },
        });
        const [totalAffiliates, activeAffiliates, pendingAffiliates, totalClicks, totalConversions, totalRevenue, totalCommissions, previousClicks, previousConversions, previousRevenue, previousCommissions,] = await Promise.all([
            prisma.affiliateProfile.count(),
            prisma.affiliateProfile.count({
                where: { status: "ACTIVE" },
            }),
            prisma.affiliateProfile.count({
                where: { status: "PENDING" },
            }),
            prisma.affiliateClick.count({
                where: dateWhereClause,
            }),
            prisma.affiliateOrder.count({
                where: dateWhereClause,
            }),
            prisma.affiliateOrder.aggregate({
                where: dateWhereClause,
                _sum: { orderValue: true },
            }),
            prisma.affiliateOrder.aggregate({
                where: dateWhereClause,
                _sum: { commissionAmount: true },
            }),
            previousPeriodWhereClause
                ? prisma.affiliateClick.count({
                    where: previousPeriodWhereClause,
                })
                : Promise.resolve(0),
            previousPeriodWhereClause
                ? prisma.affiliateOrder.count({
                    where: previousPeriodWhereClause,
                })
                : Promise.resolve(0),
            previousPeriodWhereClause
                ? prisma.affiliateOrder.aggregate({
                    where: previousPeriodWhereClause,
                    _sum: { orderValue: true },
                })
                : Promise.resolve({ _sum: { orderValue: 0 } }),
            previousPeriodWhereClause
                ? prisma.affiliateOrder.aggregate({
                    where: previousPeriodWhereClause,
                    _sum: { commissionAmount: true },
                })
                : Promise.resolve({ _sum: { commissionAmount: 0 } }),
        ]);
        const calculateChange = (current, previous) => {
            if (previous === 0) {
                return current > 0 ? 100 : 0;
            }
            return ((current - previous) / previous) * 100;
        };
        const revenueChange = previousPeriodWhereClause
            ? calculateChange(totalRevenue._sum.orderValue || 0, previousRevenue._sum.orderValue || 0)
            : 0;
        const commissionsChange = previousPeriodWhereClause
            ? calculateChange(totalCommissions._sum.commissionAmount || 0, previousCommissions._sum.commissionAmount || 0)
            : 0;
        const conversionsChange = previousPeriodWhereClause
            ? calculateChange(totalConversions, previousConversions)
            : 0;
        const currentConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
        const previousConversionRate = previousClicks > 0 ? (previousConversions / previousClicks) * 100 : 0;
        const conversionRateChange = previousPeriodWhereClause
            ? calculateChange(currentConversionRate, previousConversionRate)
            : 0;
        const dailyPerformance = [];
        const daysToShow = Math.min(daysForDailyPerformance, 90);
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
        const topAffiliates = await Promise.all(affiliates.slice(0, 10).map(async (affiliate) => {
            const affiliateCoupons = await prisma.coupon.findMany({
                where: {
                    affiliateId: affiliate.id,
                    status: "ACTIVE",
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
            const affiliateCodes = [
                ...affiliateCoupons.map(c => c.code.toUpperCase()),
                ...affiliateReferralCodes.map(r => r.code.toUpperCase()),
            ];
            const ordersWhere = affiliateCodes.length > 0
                ? {
                    affiliateId: affiliate.id,
                    referralCode: { in: affiliateCodes },
                    ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
                }
                : {
                    affiliateId: affiliate.id,
                    referralCode: { in: [] },
                    ...(dateFilter ? { createdAt: { gte: dateFilter } } : {}),
                };
            const [earnings, conversions, clicks, lastLoginActivity] = await Promise.all([
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
                name: `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() ||
                    "Unknown",
                email: affiliate.user?.email || "No email",
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
        }));
        const sortedTopAffiliates = topAffiliates
            .sort((a, b) => b.totalEarnings - a.totalEarnings)
            .slice(0, 5);
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
                averageCommissionRate: totalConversions > 0
                    ? (totalCommissions._sum.commissionAmount || 0) / totalConversions
                    : 0,
                totalClicks,
                totalConversions,
                conversionRate: currentConversionRate,
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
            pendingPayouts,
            systemAlerts: [
                {
                    type: "warning",
                    title: `${pendingAffiliates} Pending Affiliate Applications`,
                    description: "Review and approve new affiliate applications to grow your program.",
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
    }
    catch (error) {
        console.error("Error fetching admin dashboard overview:", error);
        res
            .status(500)
            .json({ error: "Failed to fetch admin dashboard overview" });
    }
});
exports.default = router;
//# sourceMappingURL=admin-dashboard.js.map