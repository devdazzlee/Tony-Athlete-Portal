"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const ReferralSystem_1 = require("../models/ReferralSystem");
const prisma_1 = require("../lib/prisma");
const SystemSettingsService_1 = require("../services/SystemSettingsService");
const router = express_1.default.Router();
router.get("/codes", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "AFFILIATE") {
            return res
                .status(403)
                .json({ error: "Only affiliates can access referral codes" });
        }
        const affiliate = await prisma_1.prisma.affiliateProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const referralCodes = await ReferralSystem_1.ReferralSystemModel.getAffiliateReferralCodes(affiliate.id);
        const affiliateCoupons = await prisma_1.prisma.coupon.findMany({
            where: {
                affiliateId: affiliate.id,
                isAffiliate: true,
            },
            orderBy: { createdAt: "desc" },
        });
        const couponCodesFormatted = affiliateCoupons.map((coupon) => ({
            id: coupon.id,
            code: coupon.code,
            commissionRate: parseFloat(coupon.discount) || 0,
            productId: null,
            maxUses: coupon.maxUsage || 1,
            currentUses: coupon.usage,
            expiresAt: coupon.validUntil.toISOString(),
            isActive: coupon.status === "ACTIVE",
            createdAt: coupon.createdAt.toISOString(),
            type: "COUPON",
            description: coupon.description,
            freeShipping: coupon.freeShipping,
            syncedToShopify: coupon.syncedToShopify || false,
            syncedStores: coupon.syncedStores || [],
        }));
        const allCodes = [...referralCodes, ...couponCodesFormatted];
        res.json(allCodes);
    }
    catch (error) {
        console.error("Error fetching referral codes:", error);
        res.status(500).json({ error: "Failed to fetch referral codes" });
    }
});
router.post("/codes", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "AFFILIATE") {
            return res
                .status(403)
                .json({ error: "Only affiliates can create referral codes" });
        }
        const schema = zod_1.z.object({
            commissionRate: zod_1.z.number().min(0).max(100).optional(),
            productId: zod_1.z.string().optional(),
            expiresAt: zod_1.z.string(),
        });
        const data = schema.parse(req.body);
        const affiliate = await prisma_1.prisma.affiliateProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const defaultCommissionRate = await SystemSettingsService_1.SystemSettingsService.getDefaultCommissionRate();
        const commissionRateValue = data.commissionRate ?? defaultCommissionRate;
        if (affiliate.commissionRate !== null &&
            affiliate.commissionRate !== undefined &&
            commissionRateValue > affiliate.commissionRate) {
            return res.status(400).json({
                error: `Commission rate cannot exceed your tier limit of ${affiliate.commissionRate}%`,
            });
        }
        let expiresAtDate;
        try {
            const normalized = data.expiresAt.includes("T")
                ? data.expiresAt
                : `${data.expiresAt}T00:00:00`;
            expiresAtDate = new Date(normalized);
            if (isNaN(expiresAtDate.getTime())) {
                return res.status(400).json({
                    error: "Invalid expiration date format. Please use a valid date.",
                });
            }
        }
        catch (error) {
            return res.status(400).json({
                error: "Invalid expiration date format. Please use a valid date.",
            });
        }
        const referralCode = await ReferralSystem_1.ReferralSystemModel.generateReferralCode(affiliate.id, {
            type: "BOTH",
            commissionRate: commissionRateValue,
            productId: data.productId,
            expiresAt: expiresAtDate,
        });
        res.status(201).json(referralCode);
    }
    catch (error) {
        console.error("Error creating referral code:", error);
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
            return res.status(400).json({
                error: "Validation error",
                details: errorMessages,
            });
        }
        res.status(400).json({ error: "Failed to create referral code" });
    }
});
router.get("/stats", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "AFFILIATE") {
            return res
                .status(403)
                .json({ error: "Only affiliates can access referral stats" });
        }
        const affiliate = await prisma_1.prisma.affiliateProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const stats = await ReferralSystem_1.ReferralSystemModel.getReferralStats(affiliate.id);
        res.json(stats);
    }
    catch (error) {
        console.error("Error fetching referral stats:", error);
        res.status(500).json({ error: "Failed to fetch referral stats" });
    }
});
router.post("/shareable-links", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "AFFILIATE") {
            return res
                .status(403)
                .json({ error: "Only affiliates can generate shareable links" });
        }
        const schema = zod_1.z.object({
            platforms: zod_1.z.array(zod_1.z.string()).optional(),
        });
        const { platforms } = schema.parse(req.body);
        const affiliate = await prisma_1.prisma.affiliateProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const shareableData = await ReferralSystem_1.ReferralSystemModel.generateShareableLinks(affiliate.id, platforms);
        res.json(shareableData);
    }
    catch (error) {
        console.error("Error generating shareable links:", error);
        res.status(500).json({ error: "Failed to generate shareable links" });
    }
});
router.post("/process", async (req, res) => {
    try {
        const schema = zod_1.z.object({
            code: zod_1.z.string(),
            userId: zod_1.z.string(),
            type: zod_1.z.enum(["SIGNUP", "PURCHASE"]),
            productId: zod_1.z.string().optional(),
            orderValue: zod_1.z.number().positive().optional(),
        });
        const data = schema.parse(req.body);
        const referralUsage = await ReferralSystem_1.ReferralSystemModel.processReferral(data.code, data.userId, data.type === "PURCHASE" ? "PRODUCT" : data.type, {
            productId: data.productId,
            orderValue: data.orderValue,
        });
        res.status(201).json(referralUsage);
    }
    catch (error) {
        console.error("Error processing referral:", error);
        res
            .status(400)
            .json({ error: error.message || "Failed to process referral" });
    }
});
router.get("/validate/:code", async (req, res) => {
    try {
        const { code } = req.params;
        const referralCode = await prisma_1.prisma.referralCode.findFirst({
            where: {
                code,
                isActive: true,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
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
        });
        if (!referralCode) {
            return res
                .status(404)
                .json({ error: "Invalid or expired referral code" });
        }
        if (referralCode.maxUses &&
            referralCode.currentUses >= referralCode.maxUses) {
            return res
                .status(400)
                .json({ error: "Referral code usage limit reached" });
        }
        res.json({
            valid: true,
            code: referralCode.code,
            type: referralCode.type,
            commissionRate: referralCode.commissionRate,
            affiliateName: `${referralCode.affiliate.user.firstName} ${referralCode.affiliate.user.lastName}`,
            remainingUses: referralCode.maxUses
                ? referralCode.maxUses - referralCode.currentUses
                : null,
        });
    }
    catch (error) {
        console.error("Error validating referral code:", error);
        res.status(500).json({ error: "Failed to validate referral code" });
    }
});
router.get("/admin/stats", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can access global referral stats" });
        }
        const [totalReferralCodes, totalReferrals, totalCommissions, topAffiliates,] = await Promise.all([
            prisma_1.prisma.referralCode.count(),
            prisma_1.prisma.referralUsage.count(),
            prisma_1.prisma.referralUsage.aggregate({
                _sum: { commissionAmount: true },
            }),
            prisma_1.prisma.referralUsage.findMany({
                select: {
                    referralCodeId: true,
                    commissionAmount: true,
                    referralCode: {
                        select: {
                            code: true,
                            affiliate: {
                                select: {
                                    companyName: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { commissionAmount: "desc" },
                take: 10,
            }),
        ]);
        res.json({
            totalReferralCodes,
            totalReferrals,
            totalCommissions: totalCommissions._sum.commissionAmount || 0,
            topAffiliates,
        });
    }
    catch (error) {
        console.error("Error fetching admin referral stats:", error);
        res.status(500).json({ error: "Failed to fetch admin referral stats" });
    }
});
router.put("/codes/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "AFFILIATE") {
            return res
                .status(403)
                .json({ error: "Only affiliates can update referral codes" });
        }
        const { id } = req.params;
        const schema = zod_1.z.object({
            productId: zod_1.z.string().optional().nullable(),
            expiresAt: zod_1.z.string().optional().nullable(),
            isActive: zod_1.z.boolean().optional(),
        });
        const data = schema.parse(req.body);
        const referralCode = await prisma_1.prisma.referralCode.findUnique({
            where: { id },
            include: {
                affiliate: {
                    select: {
                        userId: true,
                        commissionRate: true,
                    },
                },
            },
        });
        if (!referralCode) {
            return res.status(404).json({ error: "Referral code not found" });
        }
        if (referralCode.affiliate.userId !== req.user.id) {
            return res.status(403).json({
                error: "You don't have permission to update this referral code",
            });
        }
        let expiresAtDate = undefined;
        if (data.expiresAt !== undefined) {
            if (data.expiresAt === null || data.expiresAt === "") {
                expiresAtDate = null;
            }
            else {
                try {
                    const normalized = data.expiresAt.includes("T")
                        ? data.expiresAt
                        : `${data.expiresAt}T00:00:00`;
                    expiresAtDate = new Date(normalized);
                    if (isNaN(expiresAtDate.getTime())) {
                        return res.status(400).json({
                            error: "Invalid expiration date format. Please use a valid date.",
                        });
                    }
                }
                catch (error) {
                    return res.status(400).json({
                        error: "Invalid expiration date format. Please use a valid date.",
                    });
                }
            }
        }
        const updateData = {};
        if (data.productId !== undefined)
            updateData.productId = data.productId;
        if (data.expiresAt !== undefined)
            updateData.expiresAt = expiresAtDate;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        const updatedCode = await prisma_1.prisma.referralCode.update({
            where: { id },
            data: updateData,
        });
        res.json(updatedCode);
    }
    catch (error) {
        console.error("Error updating referral code:", error);
        if (error instanceof zod_1.z.ZodError) {
            const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`);
            return res.status(400).json({
                error: "Validation error",
                details: errorMessages,
            });
        }
        res.status(400).json({ error: "Failed to update referral code" });
    }
});
router.delete("/codes/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "AFFILIATE") {
            return res
                .status(403)
                .json({ error: "Only affiliates can delete referral codes" });
        }
        const { id } = req.params;
        const referralCode = await prisma_1.prisma.referralCode.findUnique({
            where: { id },
            include: {
                affiliate: {
                    select: {
                        userId: true,
                    },
                },
            },
        });
        if (!referralCode) {
            return res.status(404).json({ error: "Referral code not found" });
        }
        if (referralCode.affiliate.userId !== req.user.id) {
            return res.status(403).json({
                error: "You don't have permission to delete this referral code",
            });
        }
        const usageCount = await prisma_1.prisma.referralUsage.count({
            where: { referralCodeId: id },
        });
        if (usageCount > 0) {
            return res.status(400).json({
                error: "Cannot delete referral code that has been used. You can deactivate it instead.",
            });
        }
        await prisma_1.prisma.referralCode.delete({
            where: { id },
        });
        res.json({ success: true, message: "Referral code deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting referral code:", error);
        res.status(500).json({ error: "Failed to delete referral code" });
    }
});
router.get("/analytics", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "AFFILIATE") {
            return res
                .status(403)
                .json({ error: "Only affiliates can access referral analytics" });
        }
        const { period = "30d" } = req.query;
        const affiliate = await prisma_1.prisma.affiliateProfile.findUnique({
            where: { userId: req.user.id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const now = new Date();
        let startDate;
        switch (period) {
            case "7d":
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "90d":
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        const referralCodes = await ReferralSystem_1.ReferralSystemModel.getAffiliateReferralCodes(affiliate.id);
        const identifiers = referralCodes
            .map((code) => [
            code.id,
            code.code,
            code.code.split("-")[0],
        ])
            .flat()
            .filter((value) => !!value);
        const orders = await prisma_1.prisma.affiliateOrder.findMany({
            where: {
                affiliateId: affiliate.id,
                referralCode: {
                    in: identifiers,
                },
                createdAt: {
                    gte: startDate,
                },
            },
        });
        const clicksByCode = await prisma_1.prisma.affiliateClick.groupBy({
            by: ["referralCode"],
            where: {
                affiliateId: affiliate.id,
                referralCode: { in: identifiers },
                createdAt: { gte: startDate },
            },
            _count: { id: true },
        });
        const totalReferrals = orders.length;
        const totalCommissions = orders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0);
        const totalRevenue = orders.reduce((sum, order) => sum + (order.orderValue || 0), 0);
        const totalClicks = clicksByCode.reduce((sum, aggregate) => sum + aggregate._count.id, 0);
        const topProducts = referralCodes
            .map((code) => {
            const productOrders = orders.filter((order) => order.referralCode === code.code ||
                order.referralCode === code.code.split("-")[0]);
            return {
                productId: code.productId || code.id,
                productName: code.code,
                referrals: productOrders.length,
                commissions: productOrders.reduce((sum, order) => sum + (order.commissionAmount || 0), 0),
                conversionRate: (clicksByCode.find((aggregate) => aggregate.referralCode === code.code)?._count.id || 0) > 0
                    ? (productOrders.length /
                        (clicksByCode.find((aggregate) => aggregate.referralCode === code.code)?._count.id || 1)) *
                        100
                    : 0,
            };
        })
            .sort((a, b) => b.commissions - a.commissions)
            .slice(0, 5);
        const dayDiff = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        const dailyStats = Array.from({ length: dayDiff }).map((_, index) => {
            const date = new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000);
            const ordersForDay = orders.filter((order) => order.createdAt >= new Date(date.setHours(0, 0, 0, 0)) &&
                order.createdAt <= new Date(date.setHours(23, 59, 59, 999)));
            return {
                date: new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                referrals: ordersForDay.length,
                commissions: ordersForDay.reduce((sum, order) => sum + (order.commissionAmount || 0), 0),
            };
        });
        const ordersByUtm = await prisma_1.prisma.affiliateOrder.groupBy({
            by: ["utmSource"],
            where: {
                affiliateId: affiliate.id,
                createdAt: { gte: startDate },
            },
            _sum: { commissionAmount: true },
            _count: { id: true },
        });
        const clicksByPlatform = await prisma_1.prisma.affiliateClick.groupBy({
            by: ["utmSource"],
            where: {
                affiliateId: affiliate.id,
                createdAt: { gte: startDate },
                NOT: [{ utmSource: null }, { utmSource: "" }],
            },
            _count: { id: true },
        });
        const directClicksCount = await prisma_1.prisma.affiliateClick.count({
            where: {
                affiliateId: affiliate.id,
                createdAt: { gte: startDate },
                OR: [{ utmSource: null }, { utmSource: "" }],
            },
        });
        const platformStats = [
            ...ordersByUtm.map((platform) => ({
                platform: platform.utmSource || "Unknown",
                clicks: clicksByPlatform.find((click) => click.utmSource === platform.utmSource)?._count.id || 0,
                conversions: platform._count.id,
                revenue: platform._sum.commissionAmount || 0,
            })),
        ];
        if (directClicksCount > 0) {
            platformStats.push({
                platform: "Direct",
                clicks: directClicksCount,
                conversions: orders.filter((order) => !order.utmSource ||
                    order.utmSource.trim() === "" ||
                    order.utmSource.toLowerCase() === "direct").length,
                revenue: orders
                    .filter((order) => !order.utmSource ||
                    order.utmSource.trim() === "" ||
                    order.utmSource.toLowerCase() === "direct")
                    .reduce((sum, order) => sum + (order.commissionAmount || 0), 0),
            });
        }
        const analytics = {
            totalReferrals,
            totalRevenue,
            totalCommissions,
            conversionRate: totalClicks > 0 ? (totalReferrals / totalClicks) * 100 : 0,
            topProducts,
            dailyStats,
            platformStats,
        };
        res.json(analytics);
    }
    catch (error) {
        console.error("Error fetching referral analytics:", error);
        res.status(500).json({ error: "Failed to fetch referral analytics" });
    }
});
exports.default = router;
//# sourceMappingURL=referral.js.map