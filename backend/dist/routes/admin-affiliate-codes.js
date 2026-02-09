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
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const crypto = __importStar(require("crypto"));
const auth_1 = require("../middleware/auth");
const ShopifyService_1 = __importDefault(require("../services/ShopifyService"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status, affiliateId, } = req.query;
        const filters = {
            isAffiliate: true,
        };
        if (search) {
            filters.OR = [
                { code: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }
        if (status && status !== "all") {
            filters.status = status;
        }
        if (affiliateId) {
            filters.affiliateId = affiliateId;
        }
        const codes = await prisma.coupon.findMany({
            where: filters,
            include: {
                affiliate: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        const total = await prisma.coupon.count({ where: filters });
        const codesWithStatus = codes.map((code) => {
            const isExpired = code.validUntil < new Date();
            const isUsed = code.maxUsage ? code.usage >= code.maxUsage : false;
            return {
                ...code,
                isExpired,
                isUsed,
                remainingUses: code.maxUsage ? code.maxUsage - code.usage : 0,
            };
        });
        res.json({
            codes: codesWithStatus,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error fetching affiliate codes:", error);
        res.status(500).json({ error: "Failed to fetch affiliate codes" });
    }
});
router.get("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const code = await prisma.coupon.findUnique({
            where: { id },
            include: {
                affiliate: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        if (!code || !code.isAffiliate) {
            return res.status(404).json({ error: "Affiliate code not found" });
        }
        const isExpired = code.validUntil < new Date();
        const isUsed = code.maxUsage ? code.usage >= code.maxUsage : false;
        res.json({
            ...code,
            isExpired,
            isUsed,
            remainingUses: code.maxUsage ? code.maxUsage - code.usage : 0,
        });
    }
    catch (error) {
        console.error("Error fetching affiliate code:", error);
        res.status(500).json({ error: "Failed to fetch affiliate code" });
    }
});
router.post("/generate", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const generateSchema = zod_1.z.object({
            affiliateId: zod_1.z.string(),
            customCode: zod_1.z.string().min(1).max(50).optional(),
            allowanceAmount: zod_1.z.number().min(0),
            discountType: zod_1.z.enum(["percentage", "fixed_amount"]).default("fixed_amount"),
            discountValue: zod_1.z.number().min(0).default(0),
            freeShipping: zod_1.z.boolean().default(false),
            description: zod_1.z.string().optional(),
            syncToShopify: zod_1.z.boolean().default(true),
        });
        const data = generateSchema.parse(req.body);
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id: data.affiliateId },
            include: {
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate not found" });
        }
        let code;
        if (data.customCode) {
            code = data.customCode.trim().toUpperCase().replace(/\s+/g, "-");
            const existingCode = await prisma.coupon.findFirst({
                where: { code },
            });
            if (existingCode) {
                return res.status(400).json({
                    error: `The code "${code}" already exists. Please choose a different code.`,
                });
            }
        }
        else {
            let attempts = 0;
            const existingCodes = new Set((await prisma.coupon.findMany({ select: { code: true } })).map((c) => c.code));
            do {
                const randomPart = crypto
                    .randomBytes(4)
                    .toString("hex")
                    .toUpperCase();
                code = `AFFILIATE-${randomPart}`;
                attempts++;
            } while (existingCodes.has(code) && attempts < 10);
            if (attempts >= 10) {
                return res.status(400).json({ error: "Unable to generate unique code" });
            }
        }
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const shippingText = data.freeShipping ? " + Free Shipping" : "";
        const discountText = data.discountValue > 0
            ? data.discountType === "percentage"
                ? `${data.discountValue}% off${shippingText}`
                : `$${data.discountValue} off${shippingText}`
            : data.freeShipping
                ? "Free Shipping Only"
                : "No Discount";
        const description = data.description ||
            `Affiliate allowance code for ${affiliate.user.firstName} ${affiliate.user.lastName} - $${data.allowanceAmount} allowance - ${discountText} - Expires ${endOfMonth.toLocaleDateString()}`;
        let syncedToShopify = false;
        let shopifyPriceRuleIds = {};
        let shopifyDiscountIds = {};
        let syncedStores = [];
        const shopifyErrors = [];
        if (data.syncToShopify) {
            const stores = ShopifyService_1.default.getAllStores();
            for (const store of stores) {
                try {
                    const shopifyValue = data.discountValue > 0 ? -data.discountValue : -0.01;
                    const priceRule = await ShopifyService_1.default.createPriceRule(store.id, {
                        title: `Affiliate Code: ${code}`,
                        valueType: data.discountType,
                        value: shopifyValue,
                        startsAt: new Date().toISOString(),
                        endsAt: endOfMonth.toISOString(),
                        usageLimit: 1,
                        oncePerCustomer: true,
                    });
                    const discountCode = await ShopifyService_1.default.createDiscountCode(store.id, priceRule.id, code);
                    shopifyPriceRuleIds[store.id] = priceRule.id;
                    shopifyDiscountIds[store.id] = discountCode.id;
                    syncedStores.push(store.id);
                    console.log(`✅ Synced code "${code}" to ${store.name} (${store.country})`);
                }
                catch (err) {
                    console.error(`❌ Failed to sync code "${code}" to ${store.name}:`, err.message);
                    shopifyErrors.push(`${store.name}: ${err.message}`);
                }
            }
            syncedToShopify = syncedStores.length > 0;
        }
        const affiliateCode = await prisma.coupon.create({
            data: {
                code,
                description,
                discount: data.discountValue.toString(),
                affiliateId: data.affiliateId,
                validUntil: endOfMonth,
                maxUsage: 1,
                usage: 0,
                status: "ACTIVE",
                freeShipping: data.freeShipping,
                isAffiliate: true,
                syncedToShopify,
                shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
                shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
                syncedStores,
            },
            include: {
                affiliate: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        const responseMessage = shopifyErrors.length > 0
            ? `Code created but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
            : syncedToShopify
                ? `Code "${code}" created and synced to Shopify (${syncedStores.length} store${syncedStores.length > 1 ? "s" : ""})`
                : "Affiliate code generated successfully";
        res.status(201).json({
            message: responseMessage,
            code: affiliateCode,
            shopifySync: {
                synced: syncedToShopify,
                stores: syncedStores,
                errors: shopifyErrors,
            },
        });
    }
    catch (error) {
        console.error("Error generating affiliate code:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: "Invalid request data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to generate affiliate code" });
    }
});
router.delete("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const code = await prisma.coupon.findUnique({
            where: { id },
        });
        if (!code || !code.isAffiliate) {
            return res.status(404).json({ error: "Affiliate code not found" });
        }
        await prisma.coupon.delete({
            where: { id },
        });
        res.json({ message: "Affiliate code deleted successfully" });
    }
    catch (error) {
        console.error("Error deleting affiliate code:", error);
        res.status(500).json({ error: "Failed to delete affiliate code" });
    }
});
router.patch("/:id/status", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const statusSchema = zod_1.z.object({
            status: zod_1.z.enum(["ACTIVE", "INACTIVE"]),
        });
        const { status } = statusSchema.parse(req.body);
        const code = await prisma.coupon.findUnique({
            where: { id },
        });
        if (!code || !code.isAffiliate) {
            return res.status(404).json({ error: "Affiliate code not found" });
        }
        const updatedCode = await prisma.coupon.update({
            where: { id },
            data: { status },
            include: {
                affiliate: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                email: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                },
            },
        });
        res.json({
            message: "Affiliate code status updated successfully",
            code: updatedCode,
        });
    }
    catch (error) {
        console.error("Error updating affiliate code status:", error);
        res.status(500).json({ error: "Failed to update affiliate code status" });
    }
});
router.get("/stats/overview", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { affiliateId } = req.query;
        const filters = { isAffiliate: true };
        if (affiliateId) {
            filters.affiliateId = affiliateId;
        }
        const totalCodes = await prisma.coupon.count({ where: filters });
        const activeCodes = await prisma.coupon.count({
            where: { ...filters, status: "ACTIVE" },
        });
        const usedCodes = await prisma.coupon.count({
            where: { ...filters, usage: { gt: 0 } },
        });
        const expiredCodes = await prisma.coupon.count({
            where: {
                ...filters,
                validUntil: { lt: new Date() },
            },
        });
        res.json({
            totalCodes,
            activeCodes,
            usedCodes,
            expiredCodes,
            unusedCodes: totalCodes - usedCodes,
        });
    }
    catch (error) {
        console.error("Error fetching affiliate code statistics:", error);
        res.status(500).json({ error: "Failed to fetch statistics" });
    }
});
exports.default = router;
//# sourceMappingURL=admin-affiliate-codes.js.map