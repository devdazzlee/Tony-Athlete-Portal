"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ShopifyService_1 = __importDefault(require("../services/ShopifyService"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { page = 1, limit = 20, status, search } = req.query;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const where = {};
        if (status)
            where.status = status;
        const affiliates = await prisma.affiliateProfile.findMany({
            where,
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
            skip,
            take: parseInt(limit),
        });
        const total = await prisma.affiliateProfile.count({ where });
        const affiliatesWithStats = await Promise.all(affiliates.map(async (affiliate) => {
            const ordersWhere = { affiliateId: affiliate.id };
            const [earnings, conversions, clicks] = await Promise.all([
                prisma.affiliateOrder.aggregate({
                    where: ordersWhere,
                    _sum: { commissionAmount: true },
                }),
                prisma.affiliateOrder.count({
                    where: ordersWhere,
                }),
                prisma.affiliateClick.count({
                    where: { affiliateId: affiliate.id },
                }),
            ]);
            const conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
            const lastLoginActivity = await prisma.activity.findFirst({
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
            });
            return {
                id: affiliate.id,
                name: `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() ||
                    "Unknown",
                email: affiliate.user?.email || "No email",
                joinDate: affiliate.createdAt.toISOString().split("T")[0],
                status: affiliate.status,
                commissionRate: affiliate.commissionRate || null,
                spendingLimit: affiliate.spendingLimit || null,
                totalEarnings: earnings._sum.commissionAmount || 0,
                totalClicks: clicks,
                totalConversions: conversions,
                conversionRate: Math.round(conversionRate * 10) / 10,
                lastActivity: lastLoginActivity?.createdAt
                    ? lastLoginActivity.createdAt
                        .toISOString()
                        .replace("T", " ")
                        .split(".")[0]
                    : "Never",
                paymentMethod: affiliate.paymentMethod,
                country: "Unknown",
            };
        }));
        res.json({
            data: affiliatesWithStats,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error fetching affiliates:", error);
        res.status(500).json({ error: "Failed to fetch affiliates" });
    }
});
router.get("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                        phone: true,
                        createdAt: true,
                    },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate not found" });
        }
        const ordersWhere = { affiliateId: affiliate.id };
        const [earnings, conversions, clicks] = await Promise.all([
            prisma.affiliateOrder.aggregate({
                where: ordersWhere,
                _sum: { commissionAmount: true },
            }),
            prisma.affiliateOrder.count({
                where: ordersWhere,
            }),
            prisma.affiliateClick.count({
                where: { affiliateId: affiliate.id },
            }),
        ]);
        const lastLoginActivity = await prisma.activity.findFirst({
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
        });
        const discountCodes = await prisma.coupon.findMany({
            where: { affiliateId: affiliate.id },
            orderBy: { createdAt: "desc" },
        });
        const referralCodes = await prisma.referralCode.findMany({
            where: { affiliateId: affiliate.id },
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                code: true,
                commissionRate: true,
                type: true,
                isActive: true,
                currentUses: true,
                expiresAt: true,
                createdAt: true,
            },
        });
        const socialMedia = affiliate.socialMedia || {};
        res.json({
            affiliate: {
                ...affiliate,
                user: affiliate.user,
                stats: {
                    totalEarnings: earnings._sum.commissionAmount || 0,
                    totalConversions: conversions,
                    totalClicks: clicks,
                    conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
                    lastLogin: lastLoginActivity?.createdAt
                        ? lastLoginActivity.createdAt
                            .toISOString()
                            .replace("T", " ")
                            .split(".")[0]
                        : "Never",
                },
                referralCodes,
                discountCodes,
                socialMedia: {
                    instagram: socialMedia.instagram || null,
                    tiktok: socialMedia.tiktok || null,
                },
            },
        });
    }
    catch (error) {
        console.error("Error fetching affiliate details:", error);
        res.status(500).json({ error: "Failed to fetch affiliate details" });
    }
});
router.patch("/:id/status", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const updatedAffiliate = await prisma.affiliateProfile.update({
            where: { id },
            data: { status },
        });
        res.json({
            success: true,
            message: `Affiliate status updated to ${status}`,
            affiliate: updatedAffiliate,
        });
    }
    catch (error) {
        console.error("Error updating affiliate status:", error);
        res.status(500).json({ error: "Failed to update affiliate status" });
    }
});
router.patch("/:id/tier", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { tier, tierId, commissionRate } = req.body;
        const schema = zod_1.z.object({
            tier: zod_1.z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
            tierId: zod_1.z.string().optional(),
            commissionRate: zod_1.z
                .number()
                .min(0, "Commission rate must be at least 0%")
                .max(100, "Commission rate cannot exceed 100%. Please enter a value between 0 and 100%.")
                .optional(),
        });
        const validatedData = schema.parse({ tier, tierId, commissionRate });
        const updatedAffiliate = await prisma.affiliateProfile.update({
            where: { id },
            data: {
                tier: validatedData.tier,
                ...(validatedData.commissionRate && {
                    commissionRate: validatedData.commissionRate,
                }),
            },
        });
        if (validatedData.tierId) {
            await prisma.tierAssignment.updateMany({
                where: {
                    affiliateId: id,
                    status: "ACTIVE",
                },
                data: {
                    status: "INACTIVE",
                },
            });
            await prisma.tierAssignment.create({
                data: {
                    tierId: validatedData.tierId,
                    affiliateId: id,
                    assignedBy: req.user.id,
                    status: "ACTIVE",
                },
            });
        }
        if (validatedData.commissionRate !== undefined) {
            await prisma.referralCode.updateMany({
                where: { affiliateId: id },
                data: { commissionRate: validatedData.commissionRate },
            });
        }
        res.json({
            success: true,
            message: "Affiliate tier and commission rate updated successfully",
            affiliate: updatedAffiliate,
        });
    }
    catch (error) {
        console.error("Error updating affiliate tier:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update affiliate tier" });
    }
});
router.delete("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate not found" });
        }
        const shopifyErrors = [];
        const syncedCoupons = await prisma.coupon.findMany({
            where: {
                affiliateId: id,
                syncedToShopify: true,
            },
        });
        for (const coupon of syncedCoupons) {
            if (coupon.shopifyPriceRuleIds) {
                const priceRuleIds = coupon.shopifyPriceRuleIds;
                for (const [key, priceRuleId] of Object.entries(priceRuleIds)) {
                    const actualStoreId = key.replace(/-shipping$/, "");
                    try {
                        await ShopifyService_1.default.deletePriceRule(actualStoreId, priceRuleId);
                        console.log(`✅ Deleted Shopify price rule for "${coupon.code}" from store ${actualStoreId}`);
                    }
                    catch (err) {
                        console.error(`❌ Failed to delete Shopify price rule for "${coupon.code}" from ${actualStoreId}:`, err.message);
                        shopifyErrors.push(`${coupon.code} on ${actualStoreId}: ${err.message}`);
                    }
                }
            }
        }
        await prisma.affiliateProfile.delete({
            where: { id },
        });
        const message = shopifyErrors.length > 0
            ? `Affiliate deleted but some Shopify codes could not be removed: ${shopifyErrors.join("; ")}`
            : syncedCoupons.length > 0
                ? `Affiliate deleted and ${syncedCoupons.length} discount code${syncedCoupons.length > 1 ? "s" : ""} removed from Shopify`
                : "Affiliate deleted successfully";
        res.json({
            success: true,
            message,
            shopifyErrors: shopifyErrors.length > 0 ? shopifyErrors : undefined,
        });
    }
    catch (error) {
        console.error("Error deleting affiliate:", error);
        res.status(500).json({ error: "Failed to delete affiliate" });
    }
});
router.patch("/:id/deliverables-note", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { deliverablesNote } = req.body;
        const schema = zod_1.z.object({
            deliverablesNote: zod_1.z.string().optional().nullable(),
        });
        const validatedData = schema.parse({ deliverablesNote });
        const updatedAffiliate = await prisma.affiliateProfile.update({
            where: { id },
            data: {
                deliverablesNote: validatedData.deliverablesNote || null,
            },
        });
        res.json({
            success: true,
            message: "Deliverables note updated successfully",
            affiliate: updatedAffiliate,
        });
    }
    catch (error) {
        console.error("Error updating deliverables note:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update deliverables note" });
    }
});
router.patch("/:id/spending-limit", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { spendingLimit } = req.body;
        const schema = zod_1.z.object({
            spendingLimit: zod_1.z.number().min(0).nullable(),
        });
        const validatedData = schema.parse({ spendingLimit });
        const updatedAffiliate = await prisma.affiliateProfile.update({
            where: { id },
            data: {
                spendingLimit: validatedData.spendingLimit,
            },
        });
        res.json({
            success: true,
            message: "Spending limit updated successfully",
            affiliate: updatedAffiliate,
        });
    }
    catch (error) {
        console.error("Error updating spending limit:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update spending limit" });
    }
});
router.post("/:id/discount-code", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { code, discount, description, expiresAt, maxUsage, freeShipping } = req.body;
        const schema = zod_1.z.object({
            code: zod_1.z.string().min(3, "Code must be at least 3 characters"),
            discount: zod_1.z.string().min(1, "Discount value is required"),
            description: zod_1.z.string().optional(),
            expiresAt: zod_1.z.string().optional(),
            maxUsage: zod_1.z.number().min(1).optional(),
            freeShipping: zod_1.z.boolean().default(false),
        });
        const validatedData = schema.parse({
            code,
            discount,
            description,
            expiresAt,
            maxUsage,
            freeShipping,
        });
        const normalizedCode = validatedData.code.trim().toUpperCase().replace(/\s+/g, "-");
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id },
            include: {
                user: {
                    select: { firstName: true, lastName: true },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate not found" });
        }
        const existingCoupon = await prisma.coupon.findFirst({
            where: { code: normalizedCode },
        });
        if (existingCoupon) {
            return res.status(400).json({ error: `The code "${normalizedCode}" already exists. Please choose a different code.` });
        }
        const discountStr = validatedData.discount.trim();
        let discountType = "percentage";
        let discountValue = 0;
        if (discountStr.endsWith("%")) {
            discountType = "percentage";
            discountValue = parseFloat(discountStr.replace("%", ""));
        }
        else if (discountStr.startsWith("$")) {
            discountType = "fixed_amount";
            discountValue = parseFloat(discountStr.replace("$", ""));
        }
        else {
            discountType = "percentage";
            discountValue = parseFloat(discountStr);
        }
        if (isNaN(discountValue) || discountValue <= 0) {
            return res.status(400).json({ error: "Invalid discount value. Use formats like '10%' or '$10'." });
        }
        const validUntil = validatedData.expiresAt
            ? new Date(validatedData.expiresAt)
            : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
        const affiliateName = `${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() || "Unknown";
        const codeDescription = validatedData.description || `Discount code for ${affiliateName} - ${discountStr}`;
        let syncedToShopify = false;
        let shopifyPriceRuleIds = {};
        let shopifyDiscountIds = {};
        let syncedStores = [];
        const shopifyErrors = [];
        const stores = ShopifyService_1.default.getAllStores();
        const hasFreeShipping = validatedData.freeShipping === true;
        for (const store of stores) {
            try {
                if (hasFreeShipping && discountValue <= 0) {
                    const priceRule = await ShopifyService_1.default.createPriceRule(store.id, {
                        title: `Affiliate Code: ${normalizedCode} (Free Shipping)`,
                        valueType: "percentage",
                        value: -100,
                        targetType: "shipping_line",
                        startsAt: new Date().toISOString(),
                        endsAt: validUntil.toISOString(),
                        usageLimit: validatedData.maxUsage || undefined,
                        oncePerCustomer: true,
                    });
                    const discCode = await ShopifyService_1.default.createDiscountCode(store.id, priceRule.id, normalizedCode);
                    shopifyPriceRuleIds[store.id] = priceRule.id;
                    shopifyDiscountIds[store.id] = discCode.id;
                    syncedStores.push(store.id);
                    console.log(`✅ Synced free shipping code "${normalizedCode}" to ${store.name}`);
                }
                else if (hasFreeShipping && discountValue > 0) {
                    const shopifyValue = -discountValue;
                    const priceRule = await ShopifyService_1.default.createPriceRule(store.id, {
                        title: `Affiliate Code: ${normalizedCode}`,
                        valueType: discountType,
                        value: shopifyValue,
                        startsAt: new Date().toISOString(),
                        endsAt: validUntil.toISOString(),
                        usageLimit: validatedData.maxUsage || undefined,
                        oncePerCustomer: true,
                    });
                    const discCode = await ShopifyService_1.default.createDiscountCode(store.id, priceRule.id, normalizedCode);
                    shopifyPriceRuleIds[store.id] = priceRule.id;
                    shopifyDiscountIds[store.id] = discCode.id;
                    try {
                        const shippingRule = await ShopifyService_1.default.createPriceRule(store.id, {
                            title: `Auto Free Shipping (Affiliate: ${normalizedCode})`,
                            valueType: "percentage",
                            value: -100,
                            targetType: "shipping_line",
                            startsAt: new Date().toISOString(),
                            endsAt: validUntil.toISOString(),
                            oncePerCustomer: false,
                        });
                        shopifyPriceRuleIds[`${store.id}-shipping`] = shippingRule.id;
                        console.log(`✅ Synced discount "${normalizedCode}" + automatic free shipping to ${store.name}`);
                    }
                    catch (fsErr) {
                        console.warn(`⚠️ Discount synced but auto free shipping failed for ${store.name}:`, fsErr.message);
                        shopifyErrors.push(`${store.name} (free shipping): ${fsErr.message}`);
                    }
                    syncedStores.push(store.id);
                }
                else {
                    const shopifyValue = discountValue > 0 ? -discountValue : -0.01;
                    const priceRule = await ShopifyService_1.default.createPriceRule(store.id, {
                        title: `Affiliate Code: ${normalizedCode}`,
                        valueType: discountType,
                        value: shopifyValue,
                        startsAt: new Date().toISOString(),
                        endsAt: validUntil.toISOString(),
                        usageLimit: validatedData.maxUsage || undefined,
                        oncePerCustomer: true,
                    });
                    const discCode = await ShopifyService_1.default.createDiscountCode(store.id, priceRule.id, normalizedCode);
                    shopifyPriceRuleIds[store.id] = priceRule.id;
                    shopifyDiscountIds[store.id] = discCode.id;
                    syncedStores.push(store.id);
                    console.log(`✅ Synced discount code "${normalizedCode}" to ${store.name} (${store.country})`);
                }
            }
            catch (err) {
                console.error(`❌ Failed to sync code "${normalizedCode}" to ${store.name}:`, err.message);
                shopifyErrors.push(`${store.name}: ${err.message}`);
            }
        }
        syncedToShopify = syncedStores.length > 0;
        const coupon = await prisma.coupon.create({
            data: {
                code: normalizedCode,
                description: codeDescription,
                discount: validatedData.discount,
                affiliateId: id,
                validUntil,
                maxUsage: validatedData.maxUsage,
                status: "ACTIVE",
                isAffiliate: true,
                freeShipping: validatedData.freeShipping,
                syncedToShopify,
                shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
                shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
                syncedStores,
            },
        });
        const responseMessage = shopifyErrors.length > 0
            ? `Code created but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
            : syncedToShopify
                ? `Code "${normalizedCode}" created and synced to Shopify (${syncedStores.length} store${syncedStores.length > 1 ? "s" : ""})`
                : `Code "${normalizedCode}" created in database (Shopify sync unavailable)`;
        res.json({
            success: true,
            message: responseMessage,
            coupon,
            shopifySync: {
                synced: syncedToShopify,
                stores: syncedStores,
                errors: shopifyErrors,
            },
        });
    }
    catch (error) {
        console.error("Error creating discount code:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create discount code" });
    }
});
router.post("/:id/referral-code", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { commissionRate, expiresAt } = req.body;
        const schema = zod_1.z.object({
            commissionRate: zod_1.z.number().min(0).max(100, "Commission rate must be between 0 and 100"),
            expiresAt: zod_1.z.string().optional(),
        });
        const validatedData = schema.parse({
            commissionRate,
            expiresAt,
        });
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate not found" });
        }
        const { ReferralSystemModel } = await Promise.resolve().then(() => __importStar(require("../models/ReferralSystem")));
        const referralCode = await ReferralSystemModel.generateReferralCode(id, {
            type: "BOTH",
            commissionRate: validatedData.commissionRate,
            expiresAt: validatedData.expiresAt ? new Date(validatedData.expiresAt) : undefined,
        });
        res.json({
            success: true,
            message: "Tracking code created successfully",
            referralCode: {
                id: referralCode.id,
                code: referralCode.code,
                commissionRate: referralCode.commissionRate,
                expiresAt: referralCode.expiresAt,
            },
        });
    }
    catch (error) {
        console.error("Error creating referral code:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create tracking code" });
    }
});
router.patch("/:id/social-media", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { instagram, tiktok } = req.body;
        const schema = zod_1.z.object({
            instagram: zod_1.z.string().optional().nullable(),
            tiktok: zod_1.z.string().optional().nullable(),
        });
        const validatedData = schema.parse({ instagram, tiktok });
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate not found" });
        }
        const existingSocialMedia = affiliate.socialMedia || {};
        const updatedAffiliate = await prisma.affiliateProfile.update({
            where: { id },
            data: {
                socialMedia: {
                    ...existingSocialMedia,
                    instagram: validatedData.instagram || null,
                    tiktok: validatedData.tiktok || null,
                },
            },
        });
        res.json({
            success: true,
            message: "Social media links updated successfully",
            affiliate: updatedAffiliate,
        });
    }
    catch (error) {
        console.error("Error updating social media:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update social media links" });
    }
});
router.get("/:id/analytics", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { period = "30d" } = req.query;
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
        const [clicks, conversions, revenue, commissions] = await Promise.all([
            prisma.affiliateClick.count({
                where: {
                    affiliateId: id,
                    createdAt: { gte: startDate },
                },
            }),
            prisma.affiliateOrder.count({
                where: {
                    affiliateId: id,
                    createdAt: { gte: startDate },
                },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: id,
                    createdAt: { gte: startDate },
                },
                _sum: { orderValue: true },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: id,
                    createdAt: { gte: startDate },
                },
                _sum: { commissionAmount: true },
            }),
        ]);
        res.json({
            period,
            analytics: {
                totalClicks: clicks,
                totalConversions: conversions,
                totalRevenue: revenue._sum.orderValue || 0,
                totalCommissions: commissions._sum.commissionAmount || 0,
                conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
                averageOrderValue: conversions > 0 ? (revenue._sum.orderValue || 0) / conversions : 0,
            },
        });
    }
    catch (error) {
        console.error("Error fetching affiliate analytics:", error);
        res.status(500).json({ error: "Failed to fetch affiliate analytics" });
    }
});
router.post("/create", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN", "MANAGER"]), async (req, res) => {
    try {
        const schema = zod_1.z.object({
            email: zod_1.z.string().email(),
            password: zod_1.z.string().min(8),
            firstName: zod_1.z.string().min(1),
            lastName: zod_1.z.string().min(1),
            commissionRate: zod_1.z.number().min(0).max(100).optional().default(10),
            tier: zod_1.z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional().default("BRONZE"),
            tierId: zod_1.z.string().optional(),
            discountCode: zod_1.z.string().optional(),
            discountValue: zod_1.z.number().min(0).max(100).optional(),
            instagram: zod_1.z.string().optional(),
            tiktok: zod_1.z.string().optional(),
            spendingLimit: zod_1.z.number().min(0).nullable().optional(),
        });
        const data = schema.parse(req.body);
        const existingUser = await prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            return res.status(400).json({ error: "Email already exists" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 10);
        const result = await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    email: data.email,
                    password: hashedPassword,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    role: "AFFILIATE",
                    status: "ACTIVE",
                },
            });
            const affiliate = await tx.affiliateProfile.create({
                data: {
                    userId: user.id,
                    status: "ACTIVE",
                    tier: data.tier,
                    commissionRate: data.commissionRate,
                    paymentMethod: "PAYPAL",
                    spendingLimit: data.spendingLimit || null,
                    socialMedia: {
                        instagram: data.instagram || null,
                        tiktok: data.tiktok || null,
                    },
                },
            });
            if (data.tierId) {
                await tx.tierAssignment.create({
                    data: {
                        tierId: data.tierId,
                        affiliateId: affiliate.id,
                        assignedBy: req.user.id,
                        status: "ACTIVE",
                    },
                });
            }
            let createdCouponId = null;
            if (data.discountCode && data.discountValue !== undefined) {
                const normalizedCode = data.discountCode.trim().toUpperCase().replace(/\s+/g, "-");
                const validUntil = new Date();
                validUntil.setFullYear(validUntil.getFullYear() + 1);
                const coupon = await tx.coupon.create({
                    data: {
                        code: normalizedCode,
                        discount: data.discountValue.toString(),
                        affiliateId: affiliate.id,
                        status: "ACTIVE",
                        isAffiliate: true,
                        freeShipping: false,
                        description: `Affiliate discount code for ${data.firstName} ${data.lastName}`,
                        validUntil: validUntil,
                    },
                });
                createdCouponId = coupon.id;
            }
            return { user, affiliate, createdCouponId };
        });
        let shopifySyncResult = {
            synced: false, stores: [], errors: [],
        };
        if (result.createdCouponId && data.discountCode && data.discountValue !== undefined) {
            const normalizedCode = data.discountCode.trim().toUpperCase().replace(/\s+/g, "-");
            const validUntil = new Date();
            validUntil.setFullYear(validUntil.getFullYear() + 1);
            const shopifyPriceRuleIds = {};
            const shopifyDiscountIds = {};
            const syncedStores = [];
            const shopifyErrors = [];
            const stores = ShopifyService_1.default.getAllStores();
            for (const store of stores) {
                try {
                    const shopifyValue = data.discountValue > 0 ? -data.discountValue : -0.01;
                    const priceRule = await ShopifyService_1.default.createPriceRule(store.id, {
                        title: `Affiliate Code: ${normalizedCode}`,
                        valueType: "percentage",
                        value: shopifyValue,
                        startsAt: new Date().toISOString(),
                        endsAt: validUntil.toISOString(),
                        oncePerCustomer: true,
                    });
                    const discountCode = await ShopifyService_1.default.createDiscountCode(store.id, priceRule.id, normalizedCode);
                    shopifyPriceRuleIds[store.id] = priceRule.id;
                    shopifyDiscountIds[store.id] = discountCode.id;
                    syncedStores.push(store.id);
                    console.log(`✅ Synced new affiliate code "${normalizedCode}" to ${store.name}`);
                }
                catch (err) {
                    console.error(`❌ Failed to sync code "${normalizedCode}" to ${store.name}:`, err.message);
                    shopifyErrors.push(`${store.name}: ${err.message}`);
                }
            }
            if (syncedStores.length > 0) {
                await prisma.coupon.update({
                    where: { id: result.createdCouponId },
                    data: {
                        syncedToShopify: true,
                        shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
                        shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
                        syncedStores,
                    },
                });
            }
            shopifySyncResult = {
                synced: syncedStores.length > 0,
                stores: syncedStores,
                errors: shopifyErrors,
            };
        }
        const message = shopifySyncResult.errors.length > 0
            ? `Affiliate created but some Shopify stores failed to sync: ${shopifySyncResult.errors.join("; ")}`
            : shopifySyncResult.synced
                ? "Affiliate created and discount code synced to Shopify"
                : "Affiliate created successfully";
        res.json({
            success: true,
            message,
            affiliate: {
                id: result.affiliate.id,
                email: result.user.email,
                name: `${result.user.firstName} ${result.user.lastName}`,
                status: result.affiliate.status,
                commissionRate: result.affiliate.commissionRate,
            },
            shopifySync: shopifySyncResult,
        });
    }
    catch (error) {
        console.error("Error creating affiliate:", error?.message || error?.toString() || "Unknown error");
        if (error?.name === "ZodError") {
            return res.status(400).json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({
            error: "Failed to create affiliate",
            message: error?.message || "Unknown error occurred"
        });
    }
});
exports.default = router;
//# sourceMappingURL=admin-affiliates.js.map