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
const ALLOWED_PAYMENT_METHODS = [
    "PAYPAL",
    "STRIPE",
    "BANK_TRANSFER",
    "CRYPTO",
    "WISE",
];
function normalizePaymentMethod(method) {
    const normalized = method.toUpperCase().replace(/\s+/g, "_");
    if (!ALLOWED_PAYMENT_METHODS.includes(normalized)) {
        throw new Error("Invalid payout method");
    }
    return normalized;
}
function parseBankAccountData(bankAccount) {
    if (!bankAccount) {
        return {
            bankDetails: null,
            payoutFrequency: null,
            minimumPayout: null,
        };
    }
    try {
        const parsed = JSON.parse(bankAccount);
        if (parsed && typeof parsed === "object") {
            return {
                bankDetails: parsed.bankDetails || parsed || null,
                payoutFrequency: parsed.payoutFrequency || null,
                minimumPayout: typeof parsed.minimumPayout === "number"
                    ? parsed.minimumPayout
                    : null,
            };
        }
    }
    catch (error) {
        console.warn("Failed to parse bank account settings", error);
    }
    return {
        bankDetails: null,
        payoutFrequency: null,
        minimumPayout: null,
    };
}
async function buildAffiliatePayoutSettings(affiliate) {
    const bankData = parseBankAccountData(affiliate.bankAccount);
    const [lastPayout, nextPendingOrder] = await Promise.all([
        prisma.payout.findFirst({
            where: { affiliateId: affiliate.id, status: "COMPLETED" },
            orderBy: { processedAt: "desc" },
        }),
        prisma.affiliateOrder.findFirst({
            where: {
                affiliateId: affiliate.id,
                commissionAmount: { gt: 0 },
                status: {
                    in: ["PENDING", "APPROVED"],
                },
            },
            orderBy: { createdAt: "asc" },
        }),
    ]);
    const nextPayoutDate = nextPendingOrder
        ? new Date(nextPendingOrder.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
        : null;
    return {
        minimumPayout: bankData.minimumPayout ?? 50.0,
        payoutMethod: formatPayoutMethod(affiliate.paymentMethod),
        payoutEmail: affiliate.paymentEmail || affiliate.user?.email || "",
        payoutFrequency: bankData.payoutFrequency || "Monthly",
        bankDetails: bankData.bankDetails,
        lastPayoutDate: lastPayout?.processedAt || lastPayout?.createdAt || null,
        nextPayoutDate: nextPayoutDate ? nextPayoutDate.toISOString() : null,
        taxInfo: {
            taxId: affiliate.taxId || "",
            businessName: affiliate.companyName || "",
            address: affiliate.address || null,
        },
        notifications: {
            payoutProcessed: true,
            payoutPending: true,
            payoutFailed: true,
        },
    };
}
router.get("/pending", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 20, status = "PENDING", period = "30d", } = req.query;
        const statusParam = typeof status === "string" ? status.toUpperCase() : "PENDING";
        const periodParam = typeof period === "string" ? period.toLowerCase() : "30d";
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                user: true,
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const periodDaysMap = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "180d": 180,
            all: 0,
        };
        const periodDays = periodDaysMap[periodParam] ?? 30;
        const dateFilter = periodDays > 0
            ? {
                gte: new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000),
            }
            : undefined;
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const baseWhere = {
            affiliateId: affiliate.id,
            commissionAmount: { gt: 0 },
        };
        if (dateFilter) {
            baseWhere.createdAt = dateFilter;
        }
        if (statusParam !== "ALL") {
            baseWhere.status = statusParam;
        }
        const commissions = await prisma.affiliateOrder.findMany({
            where: baseWhere,
            orderBy: { createdAt: "desc" },
            skip,
            take: parseInt(limit),
        });
        const total = await prisma.affiliateOrder.count({
            where: baseWhere,
        });
        const formattedCommissions = commissions.map((commission, index) => ({
            id: `COMM-${String(commission.id).slice(-6).toUpperCase()}`,
            date: commission.createdAt.toISOString().split("T")[0],
            customer: commission.customerEmail || "Anonymous",
            offer: commission.referralCode || "Direct",
            saleAmount: commission.orderValue || 0,
            commissionRate: commission.commissionRate,
            commissionAmount: commission.commissionAmount || 0,
            status: commission.status.toLowerCase(),
            expectedPayout: new Date(commission.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split("T")[0],
            referralCode: commission.referralCode || "N/A",
            type: "Product",
        }));
        const [pendingSummary, approvedSummary, paidSummary] = await Promise.all([
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    status: "PENDING",
                    commissionAmount: { gt: 0 },
                },
                _sum: { commissionAmount: true, orderValue: true },
                _count: { id: true },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    status: "APPROVED",
                    commissionAmount: { gt: 0 },
                },
                _sum: { commissionAmount: true, orderValue: true },
                _count: { id: true },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    status: "PAID",
                    commissionAmount: { gt: 0 },
                },
                _sum: { commissionAmount: true, orderValue: true },
                _count: { id: true },
            }),
        ]);
        const nextPendingOrder = await prisma.affiliateOrder.findFirst({
            where: {
                affiliateId: affiliate.id,
                commissionAmount: { gt: 0 },
                status: {
                    in: ["PENDING", "APPROVED"],
                },
            },
            orderBy: { createdAt: "asc" },
        });
        const nextPayoutDate = nextPendingOrder
            ? new Date(nextPendingOrder.createdAt.getTime() + 30 * 24 * 60 * 60 * 1000)
            : null;
        const bankData = parseBankAccountData(affiliate.bankAccount);
        const summary = {
            pendingAmount: pendingSummary._sum.commissionAmount || 0,
            pendingCount: pendingSummary._count.id || 0,
            approvedAmount: approvedSummary._sum.commissionAmount || 0,
            approvedCount: approvedSummary._count.id || 0,
            paidAmount: paidSummary._sum.commissionAmount || 0,
            paidCount: paidSummary._count.id || 0,
            nextPayoutDate: nextPayoutDate ? nextPayoutDate.toISOString() : null,
            nextPayoutAmount: pendingSummary._sum.commissionAmount || 0,
            payoutMethod: formatPayoutMethod(affiliate.paymentMethod),
            payoutEmail: affiliate.paymentEmail || affiliate.user?.email || "",
            payoutFrequency: bankData.payoutFrequency || "Monthly",
            minimumPayout: bankData.minimumPayout ?? 50,
            currency: commissions[0]?.currency || "USD",
            bankDetails: bankData.bankDetails || null,
        };
        res.json({
            data: formattedCommissions,
            summary,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / parseInt(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error fetching pending commissions:", error);
        res.status(500).json({ error: "Failed to fetch pending commissions" });
    }
});
function formatPayoutMethod(method) {
    return method
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
router.get("/history", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, startDate, endDate } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: {
                user: true,
            },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const parsedPage = Math.max(parseInt(page), 1);
        const parsedLimit = Math.min(Math.max(parseInt(limit), 1), 50);
        const skip = (parsedPage - 1) * parsedLimit;
        const whereClause = {
            affiliateId: affiliate.id,
            status: "PAID",
            commissionAmount: { gt: 0 },
        };
        if (startDate && typeof startDate === "string") {
            whereClause.updatedAt = {
                ...(whereClause.updatedAt || {}),
                gte: new Date(startDate),
            };
        }
        if (endDate && typeof endDate === "string") {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            whereClause.updatedAt = {
                ...(whereClause.updatedAt || {}),
                lte: end,
            };
        }
        const [paidOrders, total] = await Promise.all([
            prisma.affiliateOrder.findMany({
                where: whereClause,
                orderBy: { updatedAt: "desc" },
                skip,
                take: parsedLimit,
            }),
            prisma.affiliateOrder.count({
                where: whereClause,
            }),
        ]);
        const totalPaidAggregate = await prisma.affiliateOrder.aggregate({
            where: {
                affiliateId: affiliate.id,
                status: "PAID",
            },
            _sum: { commissionAmount: true },
        });
        const formattedHistory = paidOrders.map((order) => ({
            id: `COMM-${String(order.id).slice(-6).toUpperCase()}`,
            date: order.createdAt.toISOString().split("T")[0],
            orderId: order.orderId,
            referralCode: order.referralCode || "N/A",
            saleAmount: order.orderValue || 0,
            commissionRate: order.commissionRate,
            commissionAmount: order.commissionAmount || 0,
            payoutDate: order.status === "PAID" && order.updatedAt
                ? order.updatedAt.toISOString().split("T")[0]
                : null,
            currency: order.currency || "USD",
            paymentMethod: formatPayoutMethod(affiliate.paymentMethod),
            payoutEmail: affiliate.paymentEmail || affiliate.user?.email || "",
            status: (order.status || "PAID").toLowerCase(),
        }));
        res.json({
            data: formattedHistory,
            totals: {
                paidAmount: totalPaidAggregate._sum.commissionAmount || 0,
                count: total,
                currency: formattedHistory[0]?.currency || "USD",
            },
            pagination: {
                page: parsedPage,
                limit: parsedLimit,
                total,
                pages: Math.max(Math.ceil(total / parsedLimit), 1),
            },
        });
    }
    catch (error) {
        console.error("Error fetching payout history:", error);
        res.status(500).json({ error: "Failed to fetch payout history" });
    }
});
router.get("/settings", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: { user: true },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const payoutSettings = await buildAffiliatePayoutSettings(affiliate);
        res.json(payoutSettings);
    }
    catch (error) {
        console.error("Error fetching payout settings:", error);
        res.status(500).json({ error: "Failed to fetch payout settings" });
    }
});
router.put("/settings", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
            include: { user: true },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const settingsSchema = zod_1.z.object({
            payoutMethod: zod_1.z.string().min(1, "Payout method is required"),
            payoutEmail: zod_1.z.string().email(),
            payoutFrequency: zod_1.z
                .enum(["Monthly", "Bi-Weekly", "Weekly", "Quarterly"])
                .optional()
                .default("Monthly"),
            minimumPayout: zod_1.z.number().min(0).optional().default(50),
            bankDetails: zod_1.z
                .object({
                accountHolder: zod_1.z.string().min(1, "Account holder is required"),
                bankName: zod_1.z.string().optional(),
                accountNumber: zod_1.z.string().min(1, "Account number is required"),
                routingNumber: zod_1.z.string().optional(),
                swiftCode: zod_1.z.string().optional(),
                iban: zod_1.z.string().optional(),
                currency: zod_1.z.string().optional(),
                notes: zod_1.z.string().optional(),
                address: zod_1.z.string().optional(),
            })
                .nullable()
                .optional(),
        });
        let validatedData;
        try {
            validatedData = settingsSchema.parse(req.body);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    error: "Invalid payout settings",
                    details: error.errors,
                });
            }
            throw error;
        }
        let normalizedMethod;
        try {
            normalizedMethod = normalizePaymentMethod(validatedData.payoutMethod);
        }
        catch (error) {
            return res
                .status(400)
                .json({ error: error.message || "Invalid payout method" });
        }
        const bankPayload = {
            payoutFrequency: validatedData.payoutFrequency || "Monthly",
            minimumPayout: validatedData.minimumPayout ?? 50,
            bankDetails: validatedData.bankDetails || null,
        };
        const updatedAffiliate = await prisma.affiliateProfile.update({
            where: { id: affiliate.id },
            data: {
                paymentMethod: normalizedMethod,
                paymentEmail: validatedData.payoutEmail,
                bankAccount: JSON.stringify(bankPayload),
                updatedAt: new Date(),
            },
            include: { user: true },
        });
        const payoutSettings = await buildAffiliatePayoutSettings(updatedAffiliate);
        res.json(payoutSettings);
    }
    catch (error) {
        console.error("Error updating payout settings:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: "Invalid input data",
                details: error.errors,
            });
        }
        res.status(500).json({ error: "Failed to update payout settings" });
    }
});
router.post("/request-payout", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { amount, reason } = req.body;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        if (!affiliate) {
            return res.status(404).json({ error: "Affiliate profile not found" });
        }
        const totalPending = await prisma.affiliateOrder.aggregate({
            where: {
                affiliateId: affiliate.id,
                status: "PENDING",
                commissionAmount: { gt: 0 },
            },
            _sum: { commissionAmount: true },
        });
        const availableAmount = totalPending._sum.commissionAmount || 0;
        if (amount > availableAmount) {
            return res.status(400).json({
                error: "Requested amount exceeds available balance",
                availableAmount,
            });
        }
        if (amount < 50) {
            return res.status(400).json({
                error: "Minimum payout amount is $50",
                minimumAmount: 50,
            });
        }
        const payoutRequest = await prisma.payout.create({
            data: {
                affiliateId: affiliate.id,
                amount: parseFloat(amount),
                method: affiliate.paymentMethod,
                status: "PENDING",
                referenceId: reason || "Payout request",
            },
        });
        res.json({
            message: "Payout request submitted successfully",
            payoutRequest: {
                id: `PAY-${String(payoutRequest.id).slice(-6).toUpperCase()}`,
                affiliateId: payoutRequest.affiliateId,
                amount: payoutRequest.amount,
                status: payoutRequest.status.toLowerCase(),
                requestedAt: payoutRequest.createdAt,
                reason: payoutRequest.referenceId,
            },
        });
    }
    catch (error) {
        console.error("Error creating payout request:", error);
        res.status(500).json({ error: "Failed to create payout request" });
    }
});
router.get("/analytics", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { period = "30d" } = req.query;
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
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
        const [totalCommissions, totalAmount, pendingOrders, approvedOrders, paidOrders,] = await Promise.all([
            prisma.affiliateOrder.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: startDate },
                    commissionAmount: { gt: 0 },
                },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: startDate },
                    commissionAmount: { gt: 0 },
                },
                _sum: { commissionAmount: true },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    status: "PENDING",
                    createdAt: { gte: startDate },
                },
                _sum: { commissionAmount: true },
                _count: { id: true },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    status: "APPROVED",
                    createdAt: { gte: startDate },
                },
                _sum: { commissionAmount: true },
                _count: { id: true },
            }),
            prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    status: "PAID",
                    createdAt: { gte: startDate },
                },
                _sum: { commissionAmount: true },
                _count: { id: true },
            }),
        ]);
        const statusBreakdown = [
            {
                status: "PENDING",
                _sum: { amount: pendingOrders._sum.commissionAmount || 0 },
                _count: { id: pendingOrders._count.id },
            },
            {
                status: "APPROVED",
                _sum: { amount: approvedOrders._sum.commissionAmount || 0 },
                _count: { id: approvedOrders._count.id },
            },
            {
                status: "PAID",
                _sum: { amount: paidOrders._sum.commissionAmount || 0 },
                _count: { id: paidOrders._count.id },
            },
        ];
        const dailyStats = [];
        const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const startOfDay = new Date(date.setHours(0, 0, 0, 0));
            const endOfDay = new Date(date.setHours(23, 59, 59, 999));
            const dayCommissions = await prisma.affiliateOrder.count({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    commissionAmount: { gt: 0 },
                },
            });
            const dayAmount = await prisma.affiliateOrder.aggregate({
                where: {
                    affiliateId: affiliate.id,
                    createdAt: { gte: startOfDay, lte: endOfDay },
                    commissionAmount: { gt: 0 },
                },
                _sum: { commissionAmount: true },
            });
            dailyStats.push({
                createdAt: startOfDay.toISOString(),
                _sum: { amount: dayAmount._sum.commissionAmount || 0 },
                _count: { id: dayCommissions },
            });
        }
        const analytics = {
            period,
            totalCommissions,
            totalAmount: totalAmount._sum.commissionAmount || 0,
            statusBreakdown,
            dailyStats,
            topAffiliates: [],
        };
        res.json(analytics);
    }
    catch (error) {
        console.error("Error fetching commission analytics:", error);
        res.status(500).json({ error: "Failed to fetch commission analytics" });
    }
});
exports.default = router;
//# sourceMappingURL=commissions.js.map