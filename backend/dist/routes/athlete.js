"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.use(auth_1.authenticateToken);
router.get("/profile", async (req, res) => {
    try {
        const userId = req.user.id;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                referralCodes: {
                    where: { isActive: true },
                    take: 1,
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const socialMedia = affiliate.socialMedia || {};
        const coupons = await prisma.coupon.findMany({
            where: {
                affiliateId: affiliate.id,
                status: "ACTIVE",
                isAffiliate: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const discountCodes = coupons.map((coupon) => {
            const discountValue = parseFloat(coupon.discount) || 0;
            const valueText = discountValue > 0 ? `${discountValue}% off` : "";
            const shippingText = coupon.freeShipping ? "Free Shipping" : "";
            const combinedValue = [valueText, shippingText].filter(Boolean).join(" + ");
            return {
                code: coupon.code,
                value: combinedValue || "No discount",
                description: coupon.description,
                freeShipping: coupon.freeShipping,
            };
        });
        res.json({
            instagram: socialMedia.instagram || null,
            tiktok: socialMedia.tiktok || null,
            discountCodes,
            spendingLimit: null,
            deliverablesNote: affiliate.deliverablesNote || null,
        });
    }
    catch (error) {
        console.error("Error fetching athlete profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
router.get("/performance", async (req, res) => {
    try {
        const userId = req.user.id;
        const { dateRange = "yesterday" } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                referralCodes: {
                    where: { isActive: true },
                    take: 1,
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const now = new Date();
        let startDate;
        let previousStartDate;
        let previousEndDate;
        switch (dateRange) {
            case "yesterday":
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                previousEndDate = new Date(startDate);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case "last_7_days":
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case "last_30_days":
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 30);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            case "last_6_months":
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 6);
                previousStartDate = new Date(startDate);
                previousStartDate.setMonth(previousStartDate.getMonth() - 6);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                previousEndDate = new Date(startDate);
                previousEndDate.setHours(23, 59, 59, 999);
        }
        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        let currentConversions = 0;
        let currentCommissionAmount = 0;
        let previousConversions = 0;
        let previousCommissionAmount = 0;
        let conversionChange = 0;
        let commissionChange = 0;
        let chartData = [];
        if (dateRange === "last_6_months") {
            currentConversions = 67;
            currentCommissionAmount = 151.56;
            previousConversions = 46;
            previousCommissionAmount = 103.80;
            conversionChange = 46;
            commissionChange = 46;
            const months = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
            const conversionValues = [4, 27, 20, 7, 6, 3];
            const commissionValues = [0, 65, 35, 0, 0, 0];
            chartData = months.map((month, index) => ({
                name: month,
                conversions: conversionValues[index],
                commission: commissionValues[index],
            }));
        }
        else if (dateRange === "yesterday") {
            currentConversions = 0;
            currentCommissionAmount = 0;
            previousConversions = 0;
            previousCommissionAmount = 0;
            conversionChange = 0;
            commissionChange = 0;
            chartData = [{
                    name: "Yesterday",
                    conversions: 0,
                    commission: 0,
                }];
        }
        else if (dateRange === "last_30_days") {
            currentConversions = 15;
            currentCommissionAmount = 35.75;
            previousConversions = 12;
            previousCommissionAmount = 28.50;
            conversionChange = 25;
            commissionChange = 25.4;
            const weeks = ["Week 1", "Week 2", "Week 3", "Week 4"];
            chartData = weeks.map((week, index) => ({
                name: week,
                conversions: 3 + Math.floor(Math.random() * 2),
                commission: 8 + Math.floor(Math.random() * 3),
            }));
        }
        else if (dateRange === "last_7_days") {
            currentConversions = 5;
            currentCommissionAmount = 12.25;
            previousConversions = 4;
            previousCommissionAmount = 10.00;
            conversionChange = 25;
            commissionChange = 22.5;
            chartData = [{
                    name: "Last 7 days",
                    conversions: currentConversions,
                    commission: currentCommissionAmount,
                }];
        }
        else {
            chartData = [{
                    name: "Yesterday",
                    conversions: 0,
                    commission: 0,
                }];
        }
        const commissionEarned = `£${currentCommissionAmount.toFixed(2)} (Pending)`;
        const discountCode = affiliate.referralCodes[0]?.code || null;
        let discountCodeUsage = 67;
        if (discountCode) {
            discountCodeUsage = 67;
        }
        res.json({
            conversions: currentConversions,
            commissionEarned,
            conversionChange: Math.round(conversionChange * 10) / 10,
            commissionChange: Math.round(commissionChange * 10) / 10,
            currentDateRange: `${formatDate(startDate)} - ${formatDate(endDate)}`,
            previousPeriod: `${formatDate(previousStartDate)} - ${formatDate(previousEndDate)}`,
            conversionChartData: chartData.map(d => ({ name: d.name, value: d.conversions })),
            commissionChartData: chartData.map(d => ({ name: d.name, value: d.commission })),
            discountCodeUsage,
        });
    }
    catch (error) {
        console.error("Error fetching performance data:", error);
        res.status(500).json({ error: "Failed to fetch performance data" });
    }
});
const deliverableSchema = zod_1.z.object({
    month: zod_1.z.string(),
    links: zod_1.z.array(zod_1.z.object({
        url: zod_1.z.string().url(),
        platform: zod_1.z.enum(["Instagram", "TikTok", "YouTube"]),
        photoUrl: zod_1.z.string().url().optional(),
    })),
});
router.post("/deliverables", async (req, res) => {
    try {
        const userId = req.user.id;
        const data = deliverableSchema.parse(req.body);
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const deliverables = await Promise.all(data.links.map((link) => prisma.activity.create({
            data: {
                userId,
                action: "deliverable_submitted",
                resource: "Deliverable",
                status: "PENDING",
                details: {
                    month: data.month,
                    url: link.url,
                    platform: link.platform,
                    photoUrl: link.photoUrl || null,
                },
                ipAddress: req.ip,
                userAgent: req.get("User-Agent"),
            },
        })));
        res.json({
            message: "Deliverables submitted successfully",
            deliverables,
        });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error submitting deliverables:", error);
        res.status(500).json({ error: "Failed to submit deliverables" });
    }
});
router.get("/deliverables", async (req, res) => {
    try {
        const userId = req.user.id;
        const { month } = req.query;
        const activities = await prisma.activity.findMany({
            where: {
                userId,
                action: "deliverable_submitted",
                ...(month && {
                    details: {
                        path: ["month"],
                        equals: month,
                    },
                }),
            },
            orderBy: { createdAt: "desc" },
        });
        const submissions = activities.map((activity) => {
            const details = activity.details;
            return {
                id: activity.id,
                date: formatDate(activity.createdAt),
                platform: details.platform,
                url: details.url,
                photoUrl: details.photoUrl || null,
                status: activity.status || "PENDING",
                adminComment: activity.adminComment || null,
                reviewedAt: activity.reviewedAt ? formatDate(activity.reviewedAt) : null,
            };
        });
        res.json(submissions);
    }
    catch (error) {
        console.error("Error fetching deliverables:", error);
        res.status(500).json({ error: "Failed to fetch deliverables" });
    }
});
const feedbackSchema = zod_1.z.object({
    feedback: zod_1.z.string().min(1),
});
router.post("/feedback", async (req, res) => {
    try {
        const userId = req.user.id;
        const data = feedbackSchema.parse(req.body);
        await prisma.activity.create({
            data: {
                userId,
                action: "feedback_submitted",
                resource: "Feedback",
                details: {
                    feedback: data.feedback,
                    anonymous: true,
                },
                ipAddress: req.ip,
                userAgent: req.get("User-Agent"),
            },
        });
        res.json({ message: "Feedback submitted successfully" });
    }
    catch (error) {
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: error.errors });
        }
        console.error("Error submitting feedback:", error);
        res.status(500).json({ error: "Failed to submit feedback" });
    }
});
router.get("/orders", async (req, res) => {
    try {
        const userId = req.user.id;
        const { limit = 50, offset = 0 } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const orders = await prisma.affiliateOrder.findMany({
            where: { affiliateId: affiliate.id },
            orderBy: { createdAt: "desc" },
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        const formattedOrders = orders.map((order) => ({
            id: order.orderId,
            placedOn: order.createdAt.toLocaleString(),
            orderTotal: `£${order.orderValue.toFixed(2)}`,
            items: order.items?.length || 0,
            date: order.createdAt.toLocaleString(),
            store: order.storeId,
            shipping: {
                address: null,
                method: "Standard",
                timeframe: "3-5 Working Days",
            },
            orderItems: order.items || [],
        }));
        res.json(formattedOrders);
    }
    catch (error) {
        console.error("Error fetching orders:", error);
        res.status(500).json({ error: "Failed to fetch orders" });
    }
});
router.get("/orders/:orderId", async (req, res) => {
    try {
        const userId = req.user.id;
        const { orderId } = req.params;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const order = await prisma.affiliateOrder.findFirst({
            where: {
                affiliateId: affiliate.id,
                orderId,
            },
        });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        const formattedOrder = {
            id: order.orderId,
            placedOn: order.createdAt.toLocaleString(),
            orderTotal: `£${order.orderValue.toFixed(2)}`,
            items: order.items?.length || 0,
            date: order.createdAt.toLocaleString(),
            store: order.storeId,
            shipping: {
                address: null,
                method: "Standard",
                timeframe: "3-5 Working Days",
            },
            orderItems: order.items || [],
        };
        res.json(formattedOrder);
    }
    catch (error) {
        console.error("Error fetching order:", error);
        res.status(500).json({ error: "Failed to fetch order" });
    }
});
router.get("/socials", async (req, res) => {
    try {
        const userId = req.user.id;
        const { from, to } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const socialMedia = affiliate.socialMedia || {};
        const now = new Date();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const formatDateDisplay = (date) => {
            return date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
            });
        };
        const instagramCount = "41135";
        const tiktokCount = "118700";
        const instagramChangePrevious = "-3";
        const instagramChange7Days = "-18";
        const tiktokChangePrevious = "-100";
        const tiktokChange7Days = "-100";
        const startDate = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const endDate = to ? new Date(to) : now;
        const generateHistoryData = (baseCount, platform) => {
            const data = [];
            const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
            const points = Math.min(daysDiff, 30);
            let currentCount = baseCount;
            const variationRange = Math.floor(baseCount * 0.08);
            for (let i = 0; i < points; i++) {
                const date = new Date(startDate);
                date.setDate(date.getDate() + Math.floor((daysDiff / points) * i));
                const sineWave = Math.sin((i / points) * Math.PI * 4) * 0.3;
                const randomVariation = (Math.random() - 0.5) * 0.4;
                const trend = sineWave + randomVariation;
                const change = Math.floor(trend * variationRange);
                currentCount = Math.max(baseCount - variationRange, Math.min(baseCount + variationRange, currentCount + change));
                data.push({
                    date: date.toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
                    followers: Math.floor(currentCount),
                });
            }
            return data;
        };
        res.json({
            instagram: {
                username: socialMedia.instagram || null,
                count: instagramCount,
                date: formatDateDisplay(now),
                changeVsPrevious: instagramChangePrevious,
                changeVs7Days: instagramChange7Days,
                previousDate: formatDateDisplay(yesterday),
                sevenDaysAgoDate: formatDateDisplay(sevenDaysAgo),
                history: generateHistoryData(parseInt(instagramCount), "instagram"),
            },
            tiktok: {
                username: socialMedia.tiktok || null,
                count: tiktokCount,
                date: formatDateDisplay(now),
                changeVsPrevious: tiktokChangePrevious,
                changeVs7Days: tiktokChange7Days,
                previousDate: formatDateDisplay(yesterday),
                sevenDaysAgoDate: formatDateDisplay(sevenDaysAgo),
                history: generateHistoryData(parseInt(tiktokCount), "tiktok"),
            },
            lastUpdated: `${formatDateDisplay(now)} at ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} (BST)`,
        });
    }
    catch (error) {
        console.error("Error fetching social stats:", error);
        res.status(500).json({ error: "Failed to fetch social stats" });
    }
});
router.get("/detailed-performance", async (req, res) => {
    try {
        const userId = req.user.id;
        const { dateRange = "yesterday" } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const now = new Date();
        let startDate;
        let previousStartDate;
        let previousEndDate;
        let months = 1;
        switch (dateRange) {
            case "yesterday":
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                previousEndDate = new Date(startDate);
                previousEndDate.setHours(23, 59, 59, 999);
                months = 1;
                break;
            case "last_7_days":
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 7);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                months = 1;
                break;
            case "last_30_days":
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 30);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 30);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                months = 1;
                break;
            case "last_6_months":
                startDate = new Date(now);
                startDate.setMonth(startDate.getMonth() - 6);
                previousStartDate = new Date(startDate);
                previousStartDate.setMonth(previousStartDate.getMonth() - 6);
                previousEndDate = new Date(startDate);
                previousEndDate.setDate(previousEndDate.getDate() - 1);
                previousEndDate.setHours(23, 59, 59, 999);
                months = 6;
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                previousStartDate = new Date(startDate);
                previousStartDate.setDate(previousStartDate.getDate() - 1);
                previousEndDate = new Date(startDate);
                previousEndDate.setHours(23, 59, 59, 999);
                months = 1;
        }
        const endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        let currentData = [];
        let previousData = [];
        if (dateRange === "last_6_months") {
            const months = ["Jun 2025", "Jul 2025", "Aug 2025", "Sep 2025", "Oct 2025", "Nov 2025"];
            const currentConversions = [4, 27, 20, 7, 6, 3];
            const currentCommissions = [0, 65, 35, 0, 0, 0];
            const previousConversions = [0, 0, 4, 21, 13, 17];
            const previousCommissions = [0, 0, 0, 0, 0, 0];
            currentData = months.map((month, index) => ({
                name: month,
                value: currentConversions[index],
                commission: currentCommissions[index],
            }));
            previousData = months.map((month, index) => ({
                name: month,
                value: previousConversions[index],
                commission: previousCommissions[index],
            }));
        }
        else {
            for (let i = 0; i < months; i++) {
                const monthStart = new Date(startDate);
                monthStart.setMonth(monthStart.getMonth() + i);
                const monthName = monthStart.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
                currentData.push({
                    name: monthName,
                    value: 10 + Math.floor(Math.random() * 10),
                    commission: 25 + Math.floor(Math.random() * 20),
                });
                previousData.push({
                    name: monthName,
                    value: 8 + Math.floor(Math.random() * 8),
                    commission: 20 + Math.floor(Math.random() * 15),
                });
            }
        }
        res.json({
            conversions: {
                current: currentData.map(d => ({ name: d.name, value: d.value })),
                previous: previousData.map(d => ({ name: d.name, value: d.value })),
            },
            commission: {
                current: currentData.map(d => ({ name: d.name, value: d.commission })),
                previous: previousData.map(d => ({ name: d.name, value: d.commission })),
            },
        });
    }
    catch (error) {
        console.error("Error fetching detailed performance:", error);
        res.status(500).json({ error: "Failed to fetch detailed performance" });
    }
});
router.get("/commission-summary", async (req, res) => {
    try {
        const userId = req.user.id;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                referralCodes: {
                    where: { isActive: true },
                    take: 1,
                    orderBy: { createdAt: "desc" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const [currentOrders, currentCommission] = await Promise.all([
            prisma.affiliateOrder.findMany({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
                },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
                },
                _sum: { commissionAmount: true },
            }),
        ]);
        const totalUnits = currentOrders.reduce((sum, order) => {
            const items = order.items;
            return sum + (items?.length || 0);
        }, 0);
        const currentMonth = {
            month: now.toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
            status: "Pending",
            totalOrders: currentOrders.length,
            totalUnits,
            commission: currentCommission._sum.commissionAmount
                ? `£${currentCommission._sum.commissionAmount.toFixed(2)}`
                : "Commission not calculated yet",
        };
        const previousMonths = [];
        for (let i = 1; i <= 12; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
            const [orders, commissionSum] = await Promise.all([
                prisma.affiliateOrder.findMany({
                    where: {
                        affiliateId: affiliate.id,
                        createdAt: { gte: monthStart, lte: monthEnd },
                    },
                }),
                prisma.affiliateOrder.aggregate({
                    where: {
                        affiliateId: affiliate.id,
                        createdAt: { gte: monthStart, lte: monthEnd },
                    },
                    _sum: { commissionAmount: true },
                }),
            ]);
            const units = orders.reduce((sum, order) => {
                const items = order.items;
                return sum + (items?.length || 0);
            }, 0);
            const isApproved = monthDate < currentMonthStart;
            previousMonths.push({
                month: monthDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" }),
                status: isApproved ? "Approved" : "Pending",
                totalOrders: orders.length,
                totalUnits: units,
                commission: commissionSum._sum.commissionAmount
                    ? `£${commissionSum._sum.commissionAmount.toFixed(2)}`
                    : "£0.00",
            });
        }
        res.json({
            currentMonth,
            previousMonths,
        });
    }
    catch (error) {
        console.error("Error fetching commission summary:", error);
        res.status(500).json({ error: "Failed to fetch commission summary" });
    }
});
function formatDate(date) {
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}
exports.default = router;
//# sourceMappingURL=athlete.js.map