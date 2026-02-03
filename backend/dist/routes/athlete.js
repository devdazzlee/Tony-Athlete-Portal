"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const ShopifyService_1 = __importDefault(require("../services/ShopifyService"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const DEFAULT_COMMISSION_RATE = 0.10;
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
                tierAssignments: {
                    where: {
                        status: "ACTIVE",
                    },
                    include: {
                        tier: true,
                    },
                    orderBy: {
                        assignedAt: "desc",
                    },
                    take: 1,
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
        const activeTierAssignment = affiliate.tierAssignments?.[0];
        const assignedTier = activeTierAssignment?.tier;
        let tierBenefits = [];
        if (assignedTier?.benefits) {
            try {
                tierBenefits = typeof assignedTier.benefits === 'string'
                    ? JSON.parse(assignedTier.benefits)
                    : assignedTier.benefits;
            }
            catch (e) {
                tierBenefits = [];
            }
        }
        res.json({
            instagram: socialMedia.instagram || null,
            tiktok: socialMedia.tiktok || null,
            discountCodes,
            spendingLimit: affiliate.spendingLimit ? `$${affiliate.spendingLimit.toFixed(2)}` : "Not Set",
            deliverablesNote: affiliate.deliverablesNote || null,
            tier: assignedTier ? {
                name: assignedTier.name,
                description: assignedTier.description,
                level: assignedTier.level,
                commissionRate: assignedTier.commissionRate,
                benefits: tierBenefits,
            } : null,
            tierName: assignedTier?.name || affiliate.tier,
            commissionRate: affiliate.commissionRate || (assignedTier?.commissionRate || 0),
        });
    }
    catch (error) {
        console.error("Error fetching athlete profile:", error);
        res.status(500).json({ error: "Failed to fetch profile" });
    }
});
router.get("/coupons", async (req, res) => {
    try {
        const userId = req.user.id;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const coupons = await prisma.coupon.findMany({
            where: {
                affiliateId: affiliate.id,
                status: "ACTIVE",
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        res.json({
            coupons: coupons.map((coupon) => ({
                id: coupon.id,
                code: coupon.code,
                discount: coupon.discount,
                description: coupon.description,
                freeShipping: coupon.freeShipping,
                status: coupon.status,
            })),
        });
    }
    catch (error) {
        console.error("Error fetching coupons:", error);
        res.status(500).json({ error: "Failed to fetch coupons" });
    }
});
router.get("/performance", async (req, res) => {
    try {
        const userId = req.user.id;
        const { dateRange = "yesterday" } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                coupons: {
                    where: { status: "ACTIVE" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const affiliateCodes = affiliate.coupons.map(c => c.code);
        if (affiliateCodes.length === 0) {
            return res.json({
                conversions: 0,
                commissionEarned: "$0.00",
                conversionChange: 0,
                commissionChange: 0,
                currentDateRange: "",
                previousPeriod: "",
                conversionChartData: [],
                commissionChartData: [],
                discountCodeUsage: 0,
            });
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
        const commissionRate = (affiliate.commissionRate || 10) / 100;
        const currentOrdersWhere = {
            affiliateId: affiliate.id,
            referralCode: { in: affiliateCodes },
            orderCreatedAt: { gte: startDate, lte: endDate },
            status: { not: "CANCELLED" },
        };
        const previousOrdersWhere = {
            affiliateId: affiliate.id,
            referralCode: { in: affiliateCodes },
            orderCreatedAt: { gte: previousStartDate, lte: previousEndDate },
            status: { not: "CANCELLED" },
        };
        const [currentOrders, previousOrders] = await Promise.all([
            prisma.affiliateOrder.findMany({
                where: currentOrdersWhere,
                orderBy: { orderCreatedAt: "asc" },
            }),
            prisma.affiliateOrder.findMany({
                where: previousOrdersWhere,
            }),
        ]);
        const currentConversions = currentOrders.length;
        const currentCommissionAmount = currentOrders.reduce((sum, order) => sum + order.commissionAmount, 0);
        const previousConversions = previousOrders.length;
        const previousCommissionAmount = previousOrders.reduce((sum, order) => sum + order.commissionAmount, 0);
        const conversionChange = previousConversions > 0
            ? ((currentConversions - previousConversions) / previousConversions) * 100
            : currentConversions > 0 ? 100 : 0;
        const commissionChange = previousCommissionAmount > 0
            ? ((currentCommissionAmount - previousCommissionAmount) / previousCommissionAmount) * 100
            : currentCommissionAmount > 0 ? 100 : 0;
        let chartData = [];
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 7) {
            const grouped = new Map();
            currentOrders.forEach(order => {
                const date = new Date(order.orderCreatedAt || order.createdAt);
                const key = date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" });
                if (!grouped.has(key))
                    grouped.set(key, []);
                grouped.get(key).push(order);
            });
            chartData = Array.from(grouped.entries()).map(([name, dayOrders]) => ({
                name,
                conversions: dayOrders.length,
                commission: dayOrders.reduce((sum, o) => sum + o.commissionAmount, 0),
            }));
        }
        else if (daysDiff <= 60) {
            const grouped = new Map();
            currentOrders.forEach(order => {
                const date = new Date(order.orderCreatedAt || order.createdAt);
                const weekNum = Math.ceil(((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) / 7);
                const key = `Week ${weekNum}`;
                if (!grouped.has(key))
                    grouped.set(key, []);
                grouped.get(key).push(order);
            });
            chartData = Array.from(grouped.entries()).map(([name, weekOrders]) => ({
                name,
                conversions: weekOrders.length,
                commission: weekOrders.reduce((sum, o) => sum + o.commissionAmount, 0),
            }));
        }
        else {
            const grouped = new Map();
            currentOrders.forEach(order => {
                const date = new Date(order.orderCreatedAt || order.createdAt);
                const key = date.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
                if (!grouped.has(key))
                    grouped.set(key, []);
                grouped.get(key).push(order);
            });
            chartData = Array.from(grouped.entries()).map(([name, monthOrders]) => ({
                name,
                conversions: monthOrders.length,
                commission: monthOrders.reduce((sum, o) => sum + o.commissionAmount, 0),
            }));
        }
        const currency = currentOrders[0]?.currency || "USD";
        const currencySymbol = currency === "CAD" ? "CA$" : currency === "GBP" ? "£" : "$";
        const hasPendingOrders = currentOrders.some(o => o.status === "PENDING");
        const commissionEarned = `${currencySymbol}${currentCommissionAmount.toFixed(2)}${hasPendingOrders ? " (Pending)" : ""}`;
        const discountCodeUsage = await prisma.affiliateOrder.count({
            where: { affiliateId: affiliate.id },
        });
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
    name: zod_1.z.string().optional(),
    email: zod_1.z.preprocess((val) => (val === "" ? undefined : val), zod_1.z.string().email().optional()),
});
router.post("/feedback", async (req, res) => {
    try {
        const userId = req.user.id;
        const data = feedbackSchema.parse(req.body);
        const hasName = data.name && data.name.trim().length > 0;
        const hasEmail = data.email && data.email.trim().length > 0;
        const isAnonymous = !hasName && !hasEmail;
        await prisma.activity.create({
            data: {
                userId,
                action: "feedback_submitted",
                resource: "Feedback",
                details: {
                    feedback: data.feedback,
                    anonymous: isAnonymous,
                    name: hasName ? data.name?.trim() : undefined,
                    email: hasEmail ? data.email?.trim() : undefined,
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
        const { limit = 50, offset = 0, storeId } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                coupons: {
                    where: { status: "ACTIVE" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const affiliateCodes = affiliate.coupons.map(c => c.code);
        if (affiliateCodes.length === 0) {
            return res.json([]);
        }
        const whereClause = {
            affiliateId: affiliate.id,
            referralCode: { in: affiliateCodes },
        };
        if (storeId && storeId !== "all") {
            whereClause.storeId = storeId;
        }
        const orders = await prisma.affiliateOrder.findMany({
            where: whereClause,
            orderBy: { orderCreatedAt: "desc" },
            take: parseInt(limit),
            skip: parseInt(offset),
        });
        const stores = ShopifyService_1.default.getAllStores();
        const storeMap = new Map(stores.map(s => [s.id, s.name]));
        const formattedOrders = orders.map((order) => {
            const currencySymbol = order.currency === "CAD" ? "CA$" : order.currency === "GBP" ? "£" : "$";
            const storeName = storeMap.get(order.storeId) || order.storeId;
            const shippingAddress = order.shippingAddress;
            return {
                id: order.orderId,
                shopifyOrderNumber: order.shopifyOrderNumber,
                placedOn: (order.orderCreatedAt || order.createdAt).toLocaleString(),
                orderTotal: `${currencySymbol}${order.orderValue.toFixed(2)}`,
                orderValue: order.orderValue,
                currency: order.currency,
                items: order.items?.length || 0,
                date: (order.orderCreatedAt || order.createdAt).toLocaleString(),
                storeId: order.storeId,
                store: storeName,
                status: order.status,
                financialStatus: order.financialStatus,
                fulfillmentStatus: order.fulfillmentStatus,
                commission: `${currencySymbol}${order.commissionAmount.toFixed(2)}`,
                commissionAmount: order.commissionAmount,
                discountCode: order.referralCode,
                customerEmail: order.customerEmail,
                customerName: order.customerName,
                shipping: {
                    address: shippingAddress ?
                        `${shippingAddress.address1 || ""} ${shippingAddress.address2 || ""}, ${shippingAddress.city || ""}, ${shippingAddress.province || ""} ${shippingAddress.zip || ""}, ${shippingAddress.country || ""}`.trim()
                        : null,
                    method: "Standard",
                    timeframe: "3-5 Working Days",
                },
                orderItems: order.items || [],
            };
        });
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
        const affiliateCodes = (await prisma.coupon.findMany({
            where: {
                affiliateId: affiliate.id,
                status: "ACTIVE",
            },
        })).map(c => c.code);
        if (affiliateCodes.length === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        const order = await prisma.affiliateOrder.findFirst({
            where: {
                affiliateId: affiliate.id,
                referralCode: { in: affiliateCodes },
                orderId,
            },
        });
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        const stores = ShopifyService_1.default.getAllStores();
        const store = stores.find(s => s.id === order.storeId);
        const storeName = store?.name || order.storeId;
        const currencySymbol = order.currency === "CAD" ? "CA$" : order.currency === "GBP" ? "£" : "$";
        const shippingAddress = order.shippingAddress;
        const formattedOrder = {
            id: order.orderId,
            shopifyOrderNumber: order.shopifyOrderNumber,
            placedOn: (order.orderCreatedAt || order.createdAt).toLocaleString(),
            orderTotal: `${currencySymbol}${order.orderValue.toFixed(2)}`,
            subtotal: order.subtotalPrice ? `${currencySymbol}${order.subtotalPrice.toFixed(2)}` : null,
            tax: order.totalTax ? `${currencySymbol}${order.totalTax.toFixed(2)}` : null,
            orderValue: order.orderValue,
            currency: order.currency,
            items: order.items?.length || 0,
            date: (order.orderCreatedAt || order.createdAt).toLocaleString(),
            storeId: order.storeId,
            store: storeName,
            status: order.status,
            financialStatus: order.financialStatus,
            fulfillmentStatus: order.fulfillmentStatus,
            commission: `${currencySymbol}${order.commissionAmount.toFixed(2)}`,
            commissionAmount: order.commissionAmount,
            commissionRate: `${order.commissionRate}%`,
            discountCode: order.referralCode,
            discountCodes: order.discountCodes,
            customerEmail: order.customerEmail,
            customerName: order.customerName,
            shipping: {
                address: shippingAddress ?
                    `${shippingAddress.address1 || ""} ${shippingAddress.address2 || ""}, ${shippingAddress.city || ""}, ${shippingAddress.province || ""} ${shippingAddress.zip || ""}, ${shippingAddress.country || ""}`.trim()
                    : null,
                firstName: shippingAddress?.first_name,
                lastName: shippingAddress?.last_name,
                city: shippingAddress?.city,
                province: shippingAddress?.province,
                country: shippingAddress?.country,
                zip: shippingAddress?.zip,
                method: "Standard",
                timeframe: "3-5 Working Days",
            },
            orderItems: (order.items || []).map((item) => ({
                name: item.title,
                variant: item.variant_title,
                quantity: item.quantity,
                price: `${currencySymbol}${parseFloat(item.price).toFixed(2)}`,
                sku: item.sku,
            })),
            note: order.note,
            tags: order.tags,
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
                coupons: {
                    where: { status: "ACTIVE" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const affiliateCodes = affiliate.coupons.map(c => c.code);
        if (affiliateCodes.length === 0) {
            return res.json({
                currentMonth: {
                    month: new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" }),
                    status: "Pending",
                    totalOrders: 0,
                    totalUnits: 0,
                    commission: "£0.00",
                },
                previousMonths: [],
            });
        }
        const now = new Date();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const currentMonthWhere = {
            affiliateId: affiliate.id,
            referralCode: { in: affiliateCodes },
            createdAt: { gte: currentMonthStart, lte: currentMonthEnd },
        };
        const [currentOrders, currentCommission] = await Promise.all([
            prisma.affiliateOrder.findMany({
                where: currentMonthWhere,
            }),
            prisma.affiliateOrder.aggregate({
                where: currentMonthWhere,
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
            const monthWhere = {
                affiliateId: affiliate.id,
                referralCode: { in: affiliateCodes },
                createdAt: { gte: monthStart, lte: monthEnd },
            };
            const [orders, commissionSum] = await Promise.all([
                prisma.affiliateOrder.findMany({
                    where: monthWhere,
                }),
                prisma.affiliateOrder.aggregate({
                    where: monthWhere,
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
router.get("/stores", async (req, res) => {
    try {
        const stores = ShopifyService_1.default.getAllStores();
        const storesWithStatus = await Promise.all(stores.map(async (store) => {
            try {
                const connection = await ShopifyService_1.default.testConnection(store.id);
                return {
                    id: store.id,
                    name: store.name,
                    domain: store.domain,
                    currency: store.currency,
                    country: store.country,
                    connected: connection.success,
                    shopName: connection.shop?.name,
                };
            }
            catch (error) {
                return {
                    id: store.id,
                    name: store.name,
                    domain: store.domain,
                    currency: store.currency,
                    country: store.country,
                    connected: false,
                };
            }
        }));
        res.json({ stores: storesWithStatus });
    }
    catch (error) {
        console.error("Error fetching stores:", error);
        res.status(500).json({ error: "Failed to fetch stores" });
    }
});
router.get("/shop", async (req, res) => {
    try {
        const userId = req.user.id;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                coupons: {
                    where: { status: "ACTIVE" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const affiliateCodes = affiliate.coupons.map(c => c.code);
        if (affiliateCodes.length === 0) {
            return res.json({
                stores: [],
                orderStats: [],
                recentOrders: [],
                discountCodes: [],
            });
        }
        const stores = ShopifyService_1.default.getAllStores();
        const storesInfo = await Promise.all(stores.map(async (store) => {
            try {
                const connection = await ShopifyService_1.default.testConnection(store.id);
                return {
                    id: store.id,
                    name: store.name,
                    domain: store.domain,
                    currency: store.currency,
                    country: store.country,
                    connected: connection.success,
                    shopName: connection.shop?.name,
                };
            }
            catch (error) {
                return {
                    id: store.id,
                    name: store.name,
                    domain: store.domain,
                    currency: store.currency,
                    country: store.country,
                    connected: false,
                };
            }
        }));
        const ordersWhere = {
            affiliateId: affiliate.id,
            referralCode: { in: affiliateCodes },
        };
        const recentOrders = await prisma.affiliateOrder.findMany({
            where: ordersWhere,
            orderBy: { orderCreatedAt: "desc" },
            take: 10,
        });
        const orderStats = await Promise.all(stores.map(async (store) => {
            const storeOrdersWhere = {
                ...ordersWhere,
                storeId: store.id,
            };
            const [count, sum] = await Promise.all([
                prisma.affiliateOrder.count({
                    where: storeOrdersWhere,
                }),
                prisma.affiliateOrder.aggregate({
                    where: storeOrdersWhere,
                    _sum: { commissionAmount: true },
                }),
            ]);
            const currencySymbol = store.currency === "CAD" ? "CA$" : store.currency === "GBP" ? "£" : "$";
            return {
                storeId: store.id,
                storeName: store.name,
                totalOrders: count,
                totalCommission: sum._sum.commissionAmount || 0,
                formattedCommission: `${currencySymbol}${(sum._sum.commissionAmount || 0).toFixed(2)}`,
            };
        }));
        const storeMap = new Map(stores.map(s => [s.id, s]));
        const formattedOrders = recentOrders.map((order) => {
            const store = storeMap.get(order.storeId);
            const currencySymbol = order.currency === "CAD" ? "CA$" : order.currency === "GBP" ? "£" : "$";
            return {
                id: order.orderId,
                shopifyOrderNumber: order.shopifyOrderNumber,
                date: (order.orderCreatedAt || order.createdAt).toLocaleString(),
                orderTotal: `${currencySymbol}${order.orderValue.toFixed(2)}`,
                commission: `${currencySymbol}${order.commissionAmount.toFixed(2)}`,
                store: store?.name || order.storeId,
                status: order.status,
                financialStatus: order.financialStatus,
            };
        });
        res.json({
            stores: storesInfo,
            orderStats,
            recentOrders: formattedOrders,
            discountCodes: affiliate.coupons.map(c => ({
                code: c.code,
                discount: c.discount,
                status: c.status,
            })),
        });
    }
    catch (error) {
        console.error("Error fetching shop data:", error);
        res.status(500).json({ error: "Failed to fetch shop data" });
    }
});
router.get("/shop/products/:storeId", async (req, res) => {
    try {
        const userId = req.user.id;
        const { storeId } = req.params;
        const { limit = 50 } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const stores = ShopifyService_1.default.getAllStores();
        const store = stores.find(s => s.id === storeId);
        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }
        const allProducts = await ShopifyService_1.default.getProducts(store.id, {
            limit: parseInt(limit),
        });
        const products = allProducts.filter((product) => product.status === "active" && product.published_at !== null);
        const coupons = await prisma.coupon.findMany({
            where: {
                affiliateId: affiliate.id,
                status: "ACTIVE",
            },
            select: {
                code: true,
                discount: true,
            },
        });
        res.json({
            products,
            discountCodes: coupons,
            store: {
                id: store.id,
                name: store.name,
                domain: store.domain,
            },
        });
    }
    catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: error.message || "Failed to fetch products" });
    }
});
router.post("/sync-orders", async (req, res) => {
    try {
        const userId = req.user.id;
        const { days = 30, testMode = false } = req.body;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                coupons: {
                    where: { status: "ACTIVE" },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        if (!testMode && affiliate.coupons.length === 0) {
            return res.json({ message: "No discount codes found", synced: 0 });
        }
        const discountCodes = affiliate.coupons.map(c => c.code);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - Number(days));
        const orders = await ShopifyService_1.default.getOrdersByDiscountCodesAllStores(discountCodes, {
            created_at_min: startDate.toISOString(),
            testMode,
            limit: testMode ? 50 : 250,
        });
        let synced = 0;
        let skipped = 0;
        const affiliateCodesMap = new Map(affiliate.coupons.map(c => [c.code.toUpperCase(), c.code]));
        for (const order of orders) {
            const existingOrder = await prisma.affiliateOrder.findUnique({
                where: { orderId: order.id.toString() },
            });
            if (existingOrder) {
                skipped++;
                continue;
            }
            const matchedCodeUpper = order.matchedCode?.toUpperCase();
            if (!matchedCodeUpper || !affiliateCodesMap.has(matchedCodeUpper)) {
                skipped++;
                continue;
            }
            const actualCode = affiliateCodesMap.get(matchedCodeUpper);
            const orderValue = parseFloat(order.total_price);
            const commissionRate = (affiliate.commissionRate || 10) / 100;
            const commissionAmount = orderValue * commissionRate;
            await prisma.affiliateOrder.create({
                data: {
                    affiliateId: affiliate.id,
                    referralCode: actualCode,
                    storeId: order.storeId,
                    orderId: order.id.toString(),
                    shopifyOrderId: order.id.toString(),
                    shopifyOrderNumber: order.name,
                    orderValue,
                    subtotalPrice: parseFloat(order.subtotal_price),
                    totalTax: parseFloat(order.total_tax),
                    currency: order.currency,
                    customerEmail: order.email || order.customer?.email,
                    customerName: order.customer
                        ? `${order.customer.first_name} ${order.customer.last_name}`.trim()
                        : null,
                    commissionAmount,
                    commissionRate: commissionRate * 100,
                    status: "PENDING",
                    financialStatus: order.financial_status,
                    fulfillmentStatus: order.fulfillment_status,
                    items: order.line_items,
                    shippingAddress: order.shipping_address,
                    discountCodes: order.discount_codes,
                    referringSite: order.referring_site,
                    orderCreatedAt: new Date(order.created_at),
                },
            });
            synced++;
        }
        res.json({
            message: "Sync completed",
            synced,
            skipped,
            total: orders.length,
        });
    }
    catch (error) {
        console.error("Error syncing orders:", error);
        res.status(500).json({ error: "Failed to sync orders" });
    }
});
router.post("/orders/create", async (req, res) => {
    try {
        const userId = req.user.id;
        const schema = zod_1.z.object({
            storeId: zod_1.z.string(),
            email: zod_1.z.string().email(),
            lineItems: zod_1.z.array(zod_1.z.object({
                variant_id: zod_1.z.number(),
                quantity: zod_1.z.number().positive(),
            })),
            shippingAddress: zod_1.z.object({
                first_name: zod_1.z.string(),
                last_name: zod_1.z.string(),
                address1: zod_1.z.string(),
                address2: zod_1.z.string().optional(),
                city: zod_1.z.string(),
                province: zod_1.z.string(),
                zip: zod_1.z.string(),
                country: zod_1.z.string(),
                phone: zod_1.z.string(),
            }),
            note: zod_1.z.string().optional(),
            discountCode: zod_1.z.string().optional(),
        });
        const data = schema.parse(req.body);
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const store = ShopifyService_1.default.getStore(data.storeId);
        if (!store) {
            return res.status(404).json({ error: "Store not found" });
        }
        const orderData = {
            email: data.email,
            line_items: data.lineItems,
            shipping_address: data.shippingAddress,
            billing_address: data.shippingAddress,
            financial_status: "pending",
            send_receipt: true,
            send_fulfillment_receipt: true,
            note: data.note || `Order placed by affiliate: ${affiliate.id}`,
            tags: `affiliate,${affiliate.id}`,
        };
        if (data.discountCode) {
            orderData.discount_codes = [{ code: data.discountCode, amount: "0.00", type: "percentage" }];
        }
        const shopifyOrder = await ShopifyService_1.default.createOrder(data.storeId, orderData);
        if (!shopifyOrder || !shopifyOrder.id) {
            throw new Error("Failed to create order in Shopify");
        }
        const orderTotal = parseFloat(shopifyOrder.total_price || "0");
        const commissionRate = affiliate.commissionRate || 10;
        const commissionAmount = (orderTotal * commissionRate) / 100;
        const affiliateOrder = await prisma.affiliateOrder.create({
            data: {
                affiliateId: affiliate.id,
                referralCode: data.discountCode || "DIRECT_ORDER",
                storeId: data.storeId,
                orderId: `shopify-${shopifyOrder.id}`,
                shopifyOrderId: shopifyOrder.id.toString(),
                shopifyOrderNumber: shopifyOrder.name || `#${shopifyOrder.order_number}`,
                orderValue: orderTotal,
                subtotalPrice: parseFloat(shopifyOrder.subtotal_price || "0"),
                totalTax: parseFloat(shopifyOrder.total_tax || "0"),
                currency: store.currency || "USD",
                customerEmail: data.email,
                customerName: `${data.shippingAddress.first_name} ${data.shippingAddress.last_name}`,
                commissionAmount,
                commissionRate,
                status: "PENDING",
                financialStatus: shopifyOrder.financial_status || "pending",
                fulfillmentStatus: shopifyOrder.fulfillment_status,
                items: shopifyOrder.line_items || [],
                shippingAddress: data.shippingAddress,
                discountCodes: shopifyOrder.discount_codes || [],
                note: data.note,
                orderCreatedAt: shopifyOrder.created_at ? new Date(shopifyOrder.created_at) : new Date(),
            },
        });
        await prisma.affiliateProfile.update({
            where: { id: affiliate.id },
            data: {
                totalConversions: { increment: 1 },
                totalEarnings: { increment: commissionAmount },
            },
        });
        res.json({
            success: true,
            message: "Order created successfully",
            orderId: affiliateOrder.id,
            orderNumber: shopifyOrder.name || `#${shopifyOrder.order_number}`,
            shopifyOrderId: shopifyOrder.id,
            commissionAmount,
        });
    }
    catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({
            error: "Failed to create order",
            details: error.message
        });
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