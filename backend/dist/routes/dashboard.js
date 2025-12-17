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
router.get("/overview", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                user: true,
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const [totalClicks, totalConversions, totalCommissions, recentActivity] = await Promise.all([
            prisma.affiliateClick.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: thirtyDaysAgo },
                },
            }),
            prisma.affiliateOrder.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: thirtyDaysAgo },
                },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: thirtyDaysAgo },
                },
                _sum: { commissionAmount: true },
            }),
            prisma.affiliateOrder.findMany({
                where: {
                    affiliateId: affiliate.id,
                },
                orderBy: { createdAt: "desc" },
                take: 10,
            }),
        ]);
        const pendingCommissions = await prisma.affiliateOrder.aggregate({
            where: {
                affiliateId: affiliate.id,
                status: "PENDING",
                commissionAmount: { gt: 0 },
            },
            _sum: { commissionAmount: true },
        });
        const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
        const referralCodes = await prisma.referralCode.findMany({
            where: { affiliateId: affiliate.id },
        });
        const topLinks = await Promise.all(referralCodes.map(async (code) => {
            const clicks = await prisma.affiliateClick.count({
                where: {
                    affiliateId: affiliate.id,
                    referralCode: code.code,
                },
            });
            const conversions = await prisma.affiliateOrder.count({
                where: {
                    affiliateId: affiliate.id,
                    referralCode: code.code,
                },
            });
            const earnings = await prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    referralCode: code.code,
                },
                _sum: { commissionAmount: true },
            });
            return {
                id: code.id,
                name: code.code,
                clicks,
                conversions,
                earnings: earnings._sum.commissionAmount || 0,
                status: code.isActive ? "Active" : "Inactive",
            };
        }));
        const sortedTopLinks = topLinks
            .sort((a, b) => b.earnings - a.earnings)
            .slice(0, 5);
        const dailyStats = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));
            const dayClicks = await prisma.affiliateClick.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                },
            });
            const dayConversions = await prisma.affiliateOrder.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                },
            });
            const dayCommissions = await prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                },
                _sum: { commissionAmount: true },
            });
            dailyStats.push({
                date: startOfDay.toISOString().split("T")[0],
                clicks: dayClicks,
                conversions: dayConversions,
                referrals: dayClicks,
                commissions: dayCommissions._sum.commissionAmount || 0,
            });
        }
        const overview = {
            totalReferrals: totalClicks,
            totalClicks,
            totalConversions,
            totalCommissions: totalCommissions._sum.commissionAmount || 0,
            pendingCommissions: pendingCommissions._sum.commissionAmount || 0,
            conversionRate: Math.round(conversionRate * 10) / 10,
            activeCodes: referralCodes.filter((code) => code.isActive).length,
            totalCodes: referralCodes.length,
            topLinks: sortedTopLinks,
            recentActivity: recentActivity.map((activity) => ({
                id: activity.id,
                type: "conversion",
                description: `New order conversion`,
                amount: `+$${activity.commissionAmount?.toFixed(2) || "0.00"}`,
                time: formatTimeAgo(activity.createdAt),
                status: "success",
            })),
            dailyStats,
        };
        res.json(overview);
    }
    catch (error) {
        console.error("Error fetching dashboard overview:", error);
        res.status(500).json({ error: "Failed to fetch dashboard overview" });
    }
});
router.get("/real-time-stats", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const now = new Date();
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const [activeUsers, liveClicks, liveConversions, liveRevenue] = await Promise.all([
            prisma.affiliateClick
                .groupBy({
                by: ["ipAddress"],
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: oneHourAgo },
                },
            })
                .then((result) => result.length),
            prisma.affiliateClick.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: oneHourAgo },
                },
            }),
            prisma.affiliateOrder.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: oneHourAgo },
                },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: oneHourAgo },
                },
                _sum: { commissionAmount: true },
            }),
        ]);
        res.json({
            activeUsers,
            liveClicks,
            liveConversions,
            liveRevenue: liveRevenue._sum.commissionAmount || 0,
            timestamp: now,
        });
    }
    catch (error) {
        console.error("Error fetching real-time stats:", error);
        res.status(500).json({ error: "Failed to fetch real-time stats" });
    }
});
router.get("/recent-activity", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 10;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const referralCodes = await prisma.referralCode.findMany({
            where: { affiliateId: affiliate.id },
        });
        const recentActivity = await prisma.referralUsage.findMany({
            where: {
                referralCodeId: { in: referralCodes.map((code) => code.id) },
            },
            include: {
                referralCode: true,
            },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
        const formattedActivity = recentActivity.map((activity) => ({
            id: activity.id,
            type: "conversion",
            description: `New ${activity.type.toLowerCase()} conversion`,
            amount: `+$${activity.commissionAmount?.toFixed(2) || "0.00"}`,
            time: formatTimeAgo(activity.createdAt),
            status: "success",
            details: {
                referralCode: activity.referralCode.code,
                type: activity.type,
                commissionAmount: activity.commissionAmount,
            },
        }));
        res.json(formattedActivity);
    }
    catch (error) {
        console.error("Error fetching recent activity:", error);
        res.status(500).json({ error: "Failed to fetch recent activity" });
    }
});
router.get("/top-links", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 5;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const referralCodes = await prisma.referralCode.findMany({
            where: { affiliateId: affiliate.id },
        });
        const topLinks = await Promise.all(referralCodes.map(async (code) => {
            const conversions = await prisma.referralUsage.count({
                where: { referralCodeId: code.id },
            });
            const earnings = await prisma.referralUsage.aggregate({
                where: { referralCodeId: code.id },
                _sum: { commissionAmount: true },
            });
            return {
                id: code.id,
                name: code.code,
                clicks: code.currentUses || 0,
                conversions,
                earnings: earnings._sum.commissionAmount || 0,
                status: code.isActive ? "Active" : "Inactive",
                commissionRate: code.commissionRate,
                type: code.type,
            };
        }));
        const sortedTopLinks = topLinks
            .sort((a, b) => b.earnings - a.earnings)
            .slice(0, limit);
        res.json(sortedTopLinks);
    }
    catch (error) {
        console.error("Error fetching top links:", error);
        res.status(500).json({ error: "Failed to fetch top links" });
    }
});
function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 60) {
        return `${diffInSeconds} seconds ago`;
    }
    else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }
    else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }
    else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? "s" : ""} ago`;
    }
}
exports.default = router;
//# sourceMappingURL=dashboard.js.map