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
const multer_1 = __importDefault(require("multer"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
const auth_1 = require("../middleware/auth");
const ShopifyService_1 = __importDefault(require("../services/ShopifyService"));
const EmailService_1 = __importDefault(require("../services/EmailService"));
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
});
const normalizeCode = (code) => code.trim().toUpperCase().replace(/\s+/g, "-");
async function generateUniqueAllowanceCode(customCode) {
    if (customCode) {
        const normalized = normalizeCode(customCode);
        const existingCode = await prisma.coupon.findFirst({
            where: { code: normalized },
        });
        if (existingCode) {
            throw new Error(`The code "${normalized}" already exists. Please choose a different code.`);
        }
        return normalized;
    }
    let attempts = 0;
    const existingCodes = new Set((await prisma.coupon.findMany({ select: { code: true } })).map((c) => c.code));
    let code = "";
    do {
        const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
        code = `AFFILIATE-${randomPart}`;
        attempts++;
    } while (existingCodes.has(code) && attempts < 10);
    if (attempts >= 10) {
        throw new Error("Unable to generate unique code");
    }
    return code;
}
async function generateUniqueShippingCode(allowanceCode) {
    const base = `${allowanceCode}-SHIP`;
    let candidate = base;
    for (let attempt = 0; attempt < 5; attempt++) {
        const existingCode = await prisma.coupon.findFirst({
            where: { code: candidate },
        });
        if (!existingCode)
            return candidate;
        const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
        candidate = `${base}-${suffix}`;
    }
    throw new Error("Unable to generate unique shipping code");
}
const parseCsvBoolean = (value) => {
    if (!value)
        return false;
    return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
};
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
        try {
            code = await generateUniqueAllowanceCode(data.customCode);
        }
        catch (err) {
            return res.status(400).json({ error: err.message || "Unable to generate unique code" });
        }
        const shippingCode = data.freeShipping ? await generateUniqueShippingCode(code) : null;
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const discountText = data.discountValue > 0
            ? data.discountType === "percentage"
                ? `${data.discountValue}% off`
                : `$${data.discountValue} off`
            : "No Discount";
        const shippingNote = shippingCode ? ` + Free Shipping (use code ${shippingCode})` : "";
        const description = data.description ||
            `Affiliate allowance code for ${affiliate.user.firstName} ${affiliate.user.lastName} - $${data.allowanceAmount} allowance - ${discountText}${shippingNote} - Expires ${endOfMonth.toLocaleDateString()}`;
        const shippingDescription = shippingCode
            ? `Free shipping code for ${affiliate.user.firstName} ${affiliate.user.lastName} (paired with ${code}) - Expires ${endOfMonth.toLocaleDateString()}`
            : null;
        let allowanceSyncedToShopify = false;
        let allowanceShopifyPriceRuleIds = {};
        let allowanceShopifyDiscountIds = {};
        let allowanceSyncedStores = [];
        let shippingSyncedToShopify = false;
        let shippingShopifyPriceRuleIds = {};
        let shippingShopifyDiscountIds = {};
        let shippingSyncedStores = [];
        const shopifyErrors = [];
        if (data.syncToShopify) {
            const stores = ShopifyService_1.default.getAllStores();
            for (const store of stores) {
                try {
                    const result = await ShopifyService_1.default.createDiscountCodeGraphQL(store.id, {
                        title: `Affiliate Allowance Code: ${code}`,
                        code: code,
                        valueType: data.discountType,
                        value: data.discountValue > 0 ? data.discountValue : 0.01,
                        startsAt: new Date().toISOString(),
                        endsAt: endOfMonth.toISOString(),
                        oncePerCustomer: true,
                        combinesWith: { shippingDiscounts: true },
                    });
                    allowanceShopifyPriceRuleIds[store.id] = result.graphqlId;
                    allowanceShopifyDiscountIds[store.id] = result.graphqlId;
                    allowanceSyncedStores.push(store.id);
                    console.log(`✅ Synced allowance code "${code}" to ${store.name} via GraphQL`);
                }
                catch (err) {
                    console.error(`❌ Failed to sync allowance code "${code}" to ${store.name}:`, err.message);
                    shopifyErrors.push(`${store.name} (allowance): ${err.message}`);
                }
                if (shippingCode) {
                    try {
                        const shipResult = await ShopifyService_1.default.createFreeShippingCodeGraphQL(store.id, {
                            title: `Affiliate Shipping Code: ${shippingCode}`,
                            code: shippingCode,
                            startsAt: new Date().toISOString(),
                            endsAt: endOfMonth.toISOString(),
                            oncePerCustomer: false,
                            combinesWith: {
                                orderDiscounts: true,
                                productDiscounts: true,
                            },
                        });
                        shippingShopifyPriceRuleIds[store.id] = shipResult.graphqlId;
                        shippingShopifyDiscountIds[store.id] = shipResult.graphqlId;
                        shippingSyncedStores.push(store.id);
                        console.log(`✅ Synced shipping code "${shippingCode}" to ${store.name} via GraphQL`);
                    }
                    catch (err) {
                        console.error(`❌ Failed to sync shipping code "${shippingCode}" to ${store.name}:`, err.message);
                        shopifyErrors.push(`${store.name} (shipping): ${err.message}`);
                    }
                }
            }
            allowanceSyncedToShopify = allowanceSyncedStores.length > 0;
            shippingSyncedToShopify = shippingSyncedStores.length > 0;
        }
        const affiliateCode = await prisma.coupon.create({
            data: {
                code,
                description,
                discount: data.discountValue.toString(),
                affiliateId: data.affiliateId,
                validUntil: endOfMonth,
                maxUsage: null,
                usage: 0,
                status: "ACTIVE",
                freeShipping: false,
                isAffiliate: true,
                syncedToShopify: allowanceSyncedToShopify,
                shopifyPriceRuleIds: Object.keys(allowanceShopifyPriceRuleIds).length > 0 ? allowanceShopifyPriceRuleIds : undefined,
                shopifyDiscountIds: Object.keys(allowanceShopifyDiscountIds).length > 0 ? allowanceShopifyDiscountIds : undefined,
                syncedStores: allowanceSyncedStores,
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
        if (affiliate.user?.email) {
            try {
                const codesForEmail = [
                    {
                        code,
                        discountText: discountText,
                        allowanceAmount: data.allowanceAmount,
                        freeShipping: false,
                        expiresAt: endOfMonth,
                        description,
                    },
                ];
                if (shippingCode) {
                    codesForEmail.push({
                        code: shippingCode,
                        discountText: "Free shipping",
                        allowanceAmount: undefined,
                        freeShipping: true,
                        expiresAt: endOfMonth,
                        description: shippingDescription || undefined,
                    });
                }
                await EmailService_1.default.sendAffiliateDiscountAssignedEmail(affiliate.user.email, affiliate.user.firstName, codesForEmail);
            }
            catch (emailErr) {
                console.warn("Failed to send affiliate code email:", emailErr);
            }
        }
        else {
            console.warn("Skipping affiliate code email: affiliate missing email address");
        }
        if (shippingCode) {
            await prisma.coupon.create({
                data: {
                    code: shippingCode,
                    description: shippingDescription || `Free shipping code for ${affiliate.user.firstName} ${affiliate.user.lastName}`,
                    discount: "0",
                    affiliateId: data.affiliateId,
                    validUntil: endOfMonth,
                    maxUsage: null,
                    usage: 0,
                    status: "ACTIVE",
                    freeShipping: true,
                    isAffiliate: true,
                    syncedToShopify: shippingSyncedToShopify,
                    shopifyPriceRuleIds: Object.keys(shippingShopifyPriceRuleIds).length > 0 ? shippingShopifyPriceRuleIds : undefined,
                    shopifyDiscountIds: Object.keys(shippingShopifyDiscountIds).length > 0 ? shippingShopifyDiscountIds : undefined,
                    syncedStores: shippingSyncedStores,
                },
            });
        }
        const responseMessage = shopifyErrors.length > 0
            ? `Codes created but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
            : allowanceSyncedToShopify
                ? `Allowance code "${code}" created and synced to Shopify (${allowanceSyncedStores.length} store${allowanceSyncedStores.length > 1 ? "s" : ""})${shippingCode ? `; shipping code "${shippingCode}" ${shippingSyncedToShopify ? "synced" : "created"}` : ""}`
                : `Allowance code "${code}" created${shippingCode ? ` and shipping code "${shippingCode}" created` : ""}`;
        res.status(201).json({
            message: responseMessage,
            code: affiliateCode,
            shippingCode,
            shopifySync: {
                synced: allowanceSyncedToShopify,
                stores: allowanceSyncedStores,
                shippingSynced: shippingSyncedToShopify,
                shippingStores: shippingSyncedStores,
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
router.post("/import", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), upload.single("csvFile"), async (req, res) => {
    try {
        if (!req.file?.buffer) {
            return res.status(400).json({ error: "No CSV file provided" });
        }
        const rows = [];
        const errors = [];
        await new Promise((resolve, reject) => {
            stream_1.Readable.from(req.file.buffer)
                .pipe((0, csv_parser_1.default)())
                .on("data", (row) => rows.push(row))
                .on("end", () => resolve())
                .on("error", (err) => reject(err));
        });
        if (rows.length === 0) {
            return res.status(400).json({ error: "CSV file is empty" });
        }
        const existingCodes = new Set((await prisma.coupon.findMany({ select: { code: true } })).map((c) => c.code));
        let imported = 0;
        let shippingCreated = 0;
        for (let index = 0; index < rows.length; index++) {
            const row = rows[index];
            const rowLabel = `Row ${index + 1}`;
            try {
                const affiliateId = row.affiliateId?.trim();
                const affiliateEmail = row.affiliateEmail?.trim() || row.email?.trim();
                if (!affiliateId && !affiliateEmail) {
                    throw new Error("affiliateId or affiliateEmail is required");
                }
                const allowanceAmount = Number.parseFloat(row.allowanceAmount || row.allowance || row.amount || "");
                if (Number.isNaN(allowanceAmount)) {
                    throw new Error("allowanceAmount is required and must be a number");
                }
                const discountTypeRaw = row.discountType?.trim().toLowerCase();
                const discountType = discountTypeRaw === "percentage" ? "percentage" : "fixed_amount";
                const discountValue = Number.parseFloat(row.discountValue || "0");
                const freeShipping = parseCsvBoolean(row.freeShipping);
                const syncToShopify = row.syncToShopify === undefined
                    ? true
                    : parseCsvBoolean(row.syncToShopify);
                const customCode = row.code?.trim();
                const makeUniqueCode = () => {
                    if (customCode) {
                        const normalized = normalizeCode(customCode);
                        if (existingCodes.has(normalized)) {
                            throw new Error(`Code "${normalized}" already exists`);
                        }
                        existingCodes.add(normalized);
                        return normalized;
                    }
                    let attempts = 0;
                    let generated = "";
                    do {
                        const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
                        generated = `AFFILIATE-${randomPart}`;
                        attempts++;
                    } while (existingCodes.has(generated) && attempts < 10);
                    if (attempts >= 10) {
                        throw new Error("Unable to generate unique code");
                    }
                    existingCodes.add(generated);
                    return generated;
                };
                const allowanceCode = makeUniqueCode();
                const shippingCode = freeShipping ? await generateUniqueShippingCode(allowanceCode) : null;
                if (shippingCode) {
                    existingCodes.add(shippingCode);
                }
                const affiliate = affiliateId
                    ? await prisma.affiliateProfile.findUnique({
                        where: { id: affiliateId },
                        include: { user: true },
                    })
                    : await prisma.affiliateProfile.findFirst({
                        where: { user: { email: affiliateEmail } },
                        include: { user: true },
                    });
                if (!affiliate) {
                    throw new Error("Affiliate not found");
                }
                const now = new Date();
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                const discountText = discountValue > 0
                    ? discountType === "percentage"
                        ? `${discountValue}% off`
                        : `$${discountValue} off`
                    : "No Discount";
                const shippingNote = shippingCode ? ` + Free Shipping (use code ${shippingCode})` : "";
                const description = row.description?.trim() ||
                    `Affiliate allowance code for ${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() +
                        ` - $${allowanceAmount} allowance - ${discountText}${shippingNote} - Expires ${endOfMonth.toLocaleDateString()}`;
                const shippingDescription = shippingCode
                    ? `Free shipping code for ${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() +
                        ` (paired with ${allowanceCode}) - Expires ${endOfMonth.toLocaleDateString()}`
                    : null;
                let allowanceSyncedToShopify = false;
                let allowanceShopifyPriceRuleIds = {};
                let allowanceShopifyDiscountIds = {};
                let allowanceSyncedStores = [];
                let shippingSyncedToShopify = false;
                let shippingShopifyPriceRuleIds = {};
                let shippingShopifyDiscountIds = {};
                let shippingSyncedStores = [];
                if (syncToShopify) {
                    const stores = ShopifyService_1.default.getAllStores();
                    for (const store of stores) {
                        try {
                            const result = await ShopifyService_1.default.createDiscountCodeGraphQL(store.id, {
                                title: `Affiliate Allowance Code: ${allowanceCode}`,
                                code: allowanceCode,
                                valueType: discountType,
                                value: discountValue > 0 ? discountValue : 0.01,
                                startsAt: new Date().toISOString(),
                                endsAt: endOfMonth.toISOString(),
                                oncePerCustomer: true,
                                combinesWith: { shippingDiscounts: true },
                            });
                            allowanceShopifyPriceRuleIds[store.id] = result.graphqlId;
                            allowanceShopifyDiscountIds[store.id] = result.graphqlId;
                            allowanceSyncedStores.push(store.id);
                        }
                        catch (err) {
                            errors.push(`${rowLabel} (${store.name} allowance): ${err.message}`);
                        }
                        if (shippingCode) {
                            try {
                                const shipResult = await ShopifyService_1.default.createFreeShippingCodeGraphQL(store.id, {
                                    title: `Affiliate Shipping Code: ${shippingCode}`,
                                    code: shippingCode,
                                    startsAt: new Date().toISOString(),
                                    endsAt: endOfMonth.toISOString(),
                                    oncePerCustomer: false,
                                    combinesWith: {
                                        orderDiscounts: true,
                                        productDiscounts: true,
                                    },
                                });
                                shippingShopifyPriceRuleIds[store.id] = shipResult.graphqlId;
                                shippingShopifyDiscountIds[store.id] = shipResult.graphqlId;
                                shippingSyncedStores.push(store.id);
                            }
                            catch (err) {
                                errors.push(`${rowLabel} (${store.name} shipping): ${err.message}`);
                            }
                        }
                    }
                    allowanceSyncedToShopify = allowanceSyncedStores.length > 0;
                    shippingSyncedToShopify = shippingSyncedStores.length > 0;
                }
                await prisma.coupon.create({
                    data: {
                        code: allowanceCode,
                        description,
                        discount: discountValue.toString(),
                        affiliateId: affiliate.id,
                        validUntil: endOfMonth,
                        maxUsage: null,
                        usage: 0,
                        status: "ACTIVE",
                        freeShipping: false,
                        isAffiliate: true,
                        syncedToShopify: allowanceSyncedToShopify,
                        shopifyPriceRuleIds: Object.keys(allowanceShopifyPriceRuleIds).length > 0 ? allowanceShopifyPriceRuleIds : undefined,
                        shopifyDiscountIds: Object.keys(allowanceShopifyDiscountIds).length > 0 ? allowanceShopifyDiscountIds : undefined,
                        syncedStores: allowanceSyncedStores,
                    },
                });
                if (shippingCode) {
                    await prisma.coupon.create({
                        data: {
                            code: shippingCode,
                            description: shippingDescription || `Free shipping code for ${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim(),
                            discount: "0",
                            affiliateId: affiliate.id,
                            validUntil: endOfMonth,
                            maxUsage: null,
                            usage: 0,
                            status: "ACTIVE",
                            freeShipping: true,
                            isAffiliate: true,
                            syncedToShopify: shippingSyncedToShopify,
                            shopifyPriceRuleIds: Object.keys(shippingShopifyPriceRuleIds).length > 0 ? shippingShopifyPriceRuleIds : undefined,
                            shopifyDiscountIds: Object.keys(shippingShopifyDiscountIds).length > 0 ? shippingShopifyDiscountIds : undefined,
                            syncedStores: shippingSyncedStores,
                        },
                    });
                    shippingCreated++;
                }
                if (affiliate.user?.email) {
                    try {
                        const codesForEmail = [
                            {
                                code: allowanceCode,
                                discountText,
                                allowanceAmount,
                                freeShipping: false,
                                expiresAt: endOfMonth,
                                description,
                            },
                        ];
                        if (shippingCode) {
                            codesForEmail.push({
                                code: shippingCode,
                                discountText: "Free shipping",
                                allowanceAmount: undefined,
                                freeShipping: true,
                                expiresAt: endOfMonth,
                                description: shippingDescription || undefined,
                            });
                        }
                        await EmailService_1.default.sendAffiliateDiscountAssignedEmail(affiliate.user.email, affiliate.user.firstName || "there", codesForEmail);
                    }
                    catch (emailErr) {
                        errors.push(`${rowLabel}: Email failed - ${emailErr?.message || emailErr}`);
                    }
                }
                else {
                    errors.push(`${rowLabel}: Email skipped (affiliate missing email)`);
                }
                imported++;
            }
            catch (err) {
                errors.push(`${rowLabel}: ${err.message || "Failed to import"}`);
            }
        }
        res.status(201).json({
            message: `Imported ${imported} allowance codes${shippingCreated ? ` and ${shippingCreated} shipping codes` : ""}`,
            imported,
            shippingCreated,
            errors: errors.slice(0, 50),
        });
    }
    catch (error) {
        console.error("Error importing affiliate codes:", error);
        res.status(500).json({ error: "Failed to import affiliate codes" });
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
        const shopifyErrors = [];
        if (code.syncedToShopify && code.shopifyPriceRuleIds) {
            const ids = code.shopifyPriceRuleIds;
            for (const [key, idValue] of Object.entries(ids)) {
                const actualStoreId = key.replace(/-shipping$/, "");
                try {
                    await ShopifyService_1.default.deleteDiscountSmart(actualStoreId, idValue);
                    console.log(`✅ Deleted discount from Shopify store ${actualStoreId} (key: ${key})`);
                }
                catch (err) {
                    console.error(`❌ Failed to delete discount from ${actualStoreId}:`, err.message);
                    shopifyErrors.push(`${actualStoreId}: ${err.message}`);
                }
            }
        }
        await prisma.coupon.delete({
            where: { id },
        });
        const message = shopifyErrors.length > 0
            ? `Code deleted from database but failed to remove from some Shopify stores: ${shopifyErrors.join("; ")}`
            : code.syncedToShopify
                ? "Affiliate code deleted from database and Shopify"
                : "Affiliate code deleted successfully";
        res.json({ message, shopifyErrors });
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
        const shopifyErrors = [];
        if (status === "INACTIVE" && code.syncedToShopify && code.shopifyPriceRuleIds) {
            const ids = code.shopifyPriceRuleIds;
            for (const [key, idValue] of Object.entries(ids)) {
                const actualStoreId = key.replace(/-shipping$/, "");
                try {
                    await ShopifyService_1.default.deleteDiscountSmart(actualStoreId, idValue);
                    console.log(`✅ Deactivated: deleted discount from Shopify store ${actualStoreId} (key: ${key})`);
                }
                catch (err) {
                    console.error(`❌ Failed to deactivate code on ${actualStoreId}:`, err.message);
                    shopifyErrors.push(`${actualStoreId}: ${err.message}`);
                }
            }
            const updatedCode = await prisma.coupon.update({
                where: { id },
                data: {
                    status,
                    syncedToShopify: false,
                    shopifyPriceRuleIds: undefined,
                    shopifyDiscountIds: undefined,
                    syncedStores: [],
                },
                include: {
                    affiliate: {
                        include: {
                            user: {
                                select: { id: true, email: true, firstName: true, lastName: true },
                            },
                        },
                    },
                },
            });
            const message = shopifyErrors.length > 0
                ? `Code deactivated in database but failed to remove from some Shopify stores: ${shopifyErrors.join("; ")}`
                : "Code deactivated and removed from Shopify";
            return res.json({ message, code: updatedCode, shopifyErrors });
        }
        if (status === "ACTIVE" && !code.syncedToShopify) {
            const shopifyPriceRuleIds = {};
            const shopifyDiscountIds = {};
            const syncedStores = [];
            const stores = ShopifyService_1.default.getAllStores();
            const discountValue = parseFloat(code.discount.replace(/[^0-9.]/g, "")) || 0;
            const valueType = code.discount.includes("$") ? "fixed_amount" : "percentage";
            const hasDiscount = discountValue > 0;
            const hasFreeShipping = code.freeShipping === true;
            const oncePerCustomer = !!code.maxUsage;
            const isFarFuture = code.validUntil.getFullYear() >= 2090;
            const reactivateEndsAt = isFarFuture ? null : code.validUntil.toISOString();
            for (const store of stores) {
                try {
                    if (hasFreeShipping && !hasDiscount) {
                        const result = await ShopifyService_1.default.createFreeShippingCodeGraphQL(store.id, {
                            title: `Affiliate Shipping Code: ${code.code}`,
                            code: code.code,
                            startsAt: new Date().toISOString(),
                            endsAt: reactivateEndsAt,
                            oncePerCustomer,
                            combinesWith: {
                                orderDiscounts: true,
                                productDiscounts: true,
                            },
                        });
                        shopifyPriceRuleIds[store.id] = result.graphqlId;
                        shopifyDiscountIds[store.id] = result.graphqlId;
                        syncedStores.push(store.id);
                        console.log(`✅ Reactivated shipping code "${code.code}" on ${store.name} via GraphQL`);
                    }
                    else {
                        const result = await ShopifyService_1.default.createDiscountCodeGraphQL(store.id, {
                            title: `Affiliate Code: ${code.code}`,
                            code: code.code,
                            valueType,
                            value: hasDiscount ? discountValue : 0.01,
                            startsAt: new Date().toISOString(),
                            endsAt: reactivateEndsAt,
                            oncePerCustomer,
                            combinesWith: { shippingDiscounts: true },
                        });
                        shopifyPriceRuleIds[store.id] = result.graphqlId;
                        shopifyDiscountIds[store.id] = result.graphqlId;
                        syncedStores.push(store.id);
                        if (hasFreeShipping && hasDiscount) {
                            try {
                                const shipResult = await ShopifyService_1.default.createFreeShippingCodeGraphQL(store.id, {
                                    title: `Auto Free Shipping (Affiliate: ${code.code})`,
                                    code: `${code.code}-SHIP`,
                                    startsAt: new Date().toISOString(),
                                    endsAt: reactivateEndsAt,
                                    oncePerCustomer: false,
                                    combinesWith: {
                                        orderDiscounts: true,
                                        productDiscounts: true,
                                    },
                                });
                                shopifyPriceRuleIds[`${store.id}-shipping`] = shipResult.graphqlId;
                            }
                            catch (fsErr) {
                                console.warn(`⚠️ Failed to recreate auto free shipping for ${store.name}:`, fsErr.message);
                                shopifyErrors.push(`${store.name} (free shipping): ${fsErr.message}`);
                            }
                        }
                        console.log(`✅ Reactivated code "${code.code}" on ${store.name} via GraphQL`);
                    }
                }
                catch (err) {
                    console.error(`❌ Failed to re-sync code "${code.code}" to ${store.name}:`, err.message);
                    shopifyErrors.push(`${store.name}: ${err.message}`);
                }
            }
            const syncedToShopify = syncedStores.length > 0;
            const updatedCode = await prisma.coupon.update({
                where: { id },
                data: {
                    status,
                    syncedToShopify,
                    shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
                    shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
                    syncedStores,
                },
                include: {
                    affiliate: {
                        include: {
                            user: {
                                select: { id: true, email: true, firstName: true, lastName: true },
                            },
                        },
                    },
                },
            });
            const message = shopifyErrors.length > 0
                ? `Code reactivated but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
                : syncedToShopify
                    ? `Code reactivated and synced to Shopify (${syncedStores.length} store${syncedStores.length > 1 ? "s" : ""})`
                    : "Code reactivated in database (Shopify sync unavailable)";
            return res.json({ message, code: updatedCode, shopifyErrors });
        }
        const updatedCode = await prisma.coupon.update({
            where: { id },
            data: { status },
            include: {
                affiliate: {
                    include: {
                        user: {
                            select: { id: true, email: true, firstName: true, lastName: true },
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