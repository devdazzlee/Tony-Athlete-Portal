"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const EmailService_1 = __importDefault(require("../services/EmailService"));
const router = express_1.default.Router();
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
        console.warn("Failed to parse affiliate bank account details", error);
    }
    return {
        bankDetails: null,
        payoutFrequency: null,
        minimumPayout: null,
    };
}
function formatPayoutMethod(method) {
    if (!method) {
        return "Not Set";
    }
    return method
        .toLowerCase()
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
}
const commissionQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1)),
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 10)),
    status: zod_1.z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]).optional(),
    affiliateId: zod_1.z.string().optional(),
    affiliateSearch: zod_1.z.string().optional(),
    dateFrom: zod_1.z.string().optional(),
    dateTo: zod_1.z.string().optional(),
    sortBy: zod_1.z
        .enum(["createdAt", "commissionAmount", "status", "orderValue"])
        .optional()
        .default("createdAt"),
    sortOrder: zod_1.z.enum(["asc", "desc"]).optional().default("desc"),
});
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can access commission management" });
        }
        let validatedQuery;
        try {
            validatedQuery = commissionQuerySchema.parse(req.query);
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    error: "Invalid query parameters",
                    details: error.errors.map((err) => ({
                        field: err.path.join("."),
                        message: err.message,
                    })),
                });
            }
            throw error;
        }
        const { page, limit, status, affiliateId, affiliateSearch, dateFrom, dateTo, sortBy, sortOrder, } = validatedQuery;
        const where = {};
        if (status) {
            where.status = status;
        }
        if (affiliateId) {
            where.affiliateId = affiliateId;
        }
        if (affiliateSearch) {
            const searchTerm = affiliateSearch.trim();
            if (searchTerm) {
                const matchingAffiliates = await prisma_1.prisma.affiliateProfile.findMany({
                    where: {
                        OR: [
                            {
                                user: {
                                    OR: [
                                        {
                                            firstName: {
                                                contains: searchTerm,
                                                mode: "insensitive",
                                            },
                                        },
                                        {
                                            lastName: {
                                                contains: searchTerm,
                                                mode: "insensitive",
                                            },
                                        },
                                        {
                                            email: {
                                                contains: searchTerm,
                                                mode: "insensitive",
                                            },
                                        },
                                    ],
                                },
                            },
                        ],
                    },
                    select: { id: true },
                });
                const affiliateIds = matchingAffiliates.map((a) => a.id);
                if (affiliateIds.length > 0) {
                    where.affiliateId = { in: affiliateIds };
                }
                else {
                    where.affiliateId = { in: [] };
                }
            }
        }
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom) {
                const fromDate = new Date(dateFrom);
                fromDate.setUTCHours(0, 0, 0, 0);
                where.createdAt.gte = fromDate;
            }
            if (dateTo) {
                const toDate = new Date(dateTo);
                toDate.setUTCHours(23, 59, 59, 999);
                where.createdAt.lte = toDate;
            }
        }
        const [orders, total, statistics] = await Promise.all([
            prisma_1.prisma.affiliateOrder.findMany({
                where,
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
                orderBy: {
                    [sortBy]: sortOrder,
                },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma_1.prisma.affiliateOrder.count({ where }),
            Promise.all([
                prisma_1.prisma.affiliateOrder.count(),
                prisma_1.prisma.affiliateOrder.aggregate({
                    _sum: { commissionAmount: true },
                }),
                prisma_1.prisma.affiliateOrder.count({ where: { status: "PAID" } }),
                prisma_1.prisma.affiliateOrder.aggregate({
                    where: { status: "PAID" },
                    _sum: { commissionAmount: true },
                }),
                prisma_1.prisma.affiliateOrder.count({ where: { status: "PENDING" } }),
                prisma_1.prisma.affiliateOrder.aggregate({
                    where: { status: "PENDING" },
                    _sum: { commissionAmount: true },
                }),
                prisma_1.prisma.affiliateOrder.count({ where: { status: "APPROVED" } }),
                prisma_1.prisma.affiliateOrder.aggregate({
                    where: { status: "APPROVED" },
                    _sum: { commissionAmount: true },
                }),
                prisma_1.prisma.affiliateProfile.count({ where: { status: "ACTIVE" } }),
            ]),
        ]);
        const commissions = await Promise.all(orders.map(async (order) => {
            const lastLoginActivity = await prisma_1.prisma.activity.findFirst({
                where: {
                    userId: order.affiliate.userId,
                    action: "user_login",
                },
                orderBy: {
                    createdAt: "desc",
                },
                select: {
                    createdAt: true,
                },
            });
            const bankData = parseBankAccountData(order.affiliate.bankAccount);
            const bankDetails = bankData.bankDetails
                ? {
                    ...bankData.bankDetails,
                    payoutMethod: formatPayoutMethod(order.affiliate.paymentMethod),
                    payoutEmail: order.affiliate.paymentEmail ||
                        order.affiliate.user?.email ||
                        "",
                    payoutFrequency: bankData.payoutFrequency || "Monthly",
                    minimumPayout: bankData.minimumPayout ?? 50,
                }
                : null;
            return {
                id: order.id,
                amount: order.commissionAmount,
                rate: order.commissionRate,
                status: order.status,
                createdAt: order.createdAt,
                payoutDate: order.status === "PAID" ? order.updatedAt : undefined,
                affiliate: {
                    ...order.affiliate,
                    lastLogin: lastLoginActivity?.createdAt
                        ? lastLoginActivity.createdAt
                            .toISOString()
                            .replace("T", " ")
                            .split(".")[0]
                        : "Never",
                },
                conversion: {
                    orderValue: order.orderValue,
                    offer: {
                        name: order.referralCode || "Direct Sale",
                        description: `Order ${order.orderId}`,
                    },
                },
                bankDetails,
            };
        }));
        const [totalCommissions, totalAmount, paidCount, paidAmount, pendingCount, pendingAmount, approvedCount, approvedAmount, activeAffiliates,] = statistics;
        const formattedStatistics = {
            totalCommissions,
            totalAmount: totalAmount._sum.commissionAmount || 0,
            paidCommissions: paidCount,
            paidAmount: paidAmount._sum.commissionAmount || 0,
            pendingCommissions: pendingCount,
            pendingAmount: pendingAmount._sum.commissionAmount || 0,
            approvedCommissions: approvedCount,
            approvedAmount: approvedAmount._sum.commissionAmount || 0,
            activeAffiliates,
        };
        res.json({
            data: commissions,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            statistics: formattedStatistics,
        });
    }
    catch (error) {
        console.error("Error fetching commissions:", error);
        res.status(500).json({ error: "Failed to fetch commissions" });
    }
});
router.patch("/:id/status", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can update commission status" });
        }
        const schema = zod_1.z.object({
            status: zod_1.z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]),
            notes: zod_1.z.string().optional(),
        });
        const { status, notes } = schema.parse(req.body);
        const { id } = req.params;
        const order = await prisma_1.prisma.affiliateOrder.update({
            where: { id },
            data: {
                status,
                updatedAt: new Date(),
            },
        });
        const affiliate = await prisma_1.prisma.affiliateProfile.findUnique({
            where: { id: order.affiliateId },
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
        if (status === "APPROVED" || status === "PAID") {
            await prisma_1.prisma.affiliateProfile.update({
                where: { id: order.affiliateId },
                data: {
                    totalEarnings: { increment: order.commissionAmount },
                },
            });
        }
        if (status === "PAID" && affiliate) {
            try {
                await EmailService_1.default.sendCommissionPaidEmail(affiliate.user.email, affiliate.user.firstName, {
                    commissionId: order.id,
                    amount: order.commissionAmount,
                    commissionRate: order.commissionRate,
                    orderValue: order.orderValue,
                    referralCode: order.referralCode || "Direct Sale",
                    paidDate: new Date().toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                    }),
                    paymentMethod: affiliate.paymentMethod || "Default Payment Method",
                });
                console.log(`✅ Commission paid email sent to ${affiliate.user.email}`);
            }
            catch (emailError) {
                console.error("Failed to send commission paid email:", emailError);
            }
        }
        res.json({
            id: order.id,
            amount: order.commissionAmount,
            rate: order.commissionRate,
            status: order.status,
            createdAt: order.createdAt,
            affiliate,
            conversion: {
                orderValue: order.orderValue,
                offer: {
                    name: order.referralCode || "Direct Sale",
                    description: `Order ${order.orderId}`,
                },
            },
        });
    }
    catch (error) {
        console.error("Error updating commission status:", error);
        res.status(500).json({ error: "Failed to update commission status" });
    }
});
router.delete("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can delete commissions" });
        }
        const { id } = req.params;
        const order = await prisma_1.prisma.affiliateOrder.update({
            where: { id },
            data: {
                status: "CANCELLED",
                updatedAt: new Date(),
            },
        });
        res.json({
            success: true,
            message: "Commission deleted successfully",
            commission: {
                id: order.id,
                status: order.status,
            },
        });
    }
    catch (error) {
        console.error("Error deleting commission:", error);
        res.status(500).json({ error: "Failed to delete commission" });
    }
});
router.patch("/bulk-status", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can bulk update commission statuses" });
        }
        const schema = zod_1.z.object({
            commissionIds: zod_1.z.array(zod_1.z.string()),
            status: zod_1.z.enum(["PENDING", "APPROVED", "PAID", "CANCELLED"]),
            notes: zod_1.z.string().optional(),
        });
        const { commissionIds, status, notes } = schema.parse(req.body);
        const updateData = {
            status,
            updatedAt: new Date(),
        };
        if (status === "PAID") {
            updateData.payoutDate = new Date();
        }
        const result = await prisma_1.prisma.affiliateOrder.updateMany({
            where: {
                id: { in: commissionIds },
            },
            data: updateData,
        });
        if (status === "PAID") {
            const orders = await prisma_1.prisma.affiliateOrder.findMany({
                where: { id: { in: commissionIds } },
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
            });
            orders.forEach(async (order) => {
                try {
                    await EmailService_1.default.sendCommissionPaidEmail(order.affiliate.user.email, order.affiliate.user.firstName, {
                        commissionId: order.id,
                        amount: order.commissionAmount,
                        commissionRate: order.commissionRate,
                        orderValue: order.orderValue,
                        referralCode: order.referralCode || "Direct Sale",
                        paidDate: new Date().toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                        }),
                        paymentMethod: order.affiliate.paymentMethod || "Default Payment Method",
                    });
                    console.log(`✅ Bulk commission paid email sent to ${order.affiliate.user.email}`);
                }
                catch (emailError) {
                    console.error(`Failed to send email to ${order.affiliate.user.email}:`, emailError);
                }
            });
        }
        if (status === "APPROVED") {
            const orders = await prisma_1.prisma.affiliateOrder.findMany({
                where: { id: { in: commissionIds } },
                select: { affiliateId: true, commissionAmount: true },
            });
            const affiliateUpdates = orders.reduce((acc, order) => {
                if (!acc[order.affiliateId]) {
                    acc[order.affiliateId] = 0;
                }
                acc[order.affiliateId] += order.commissionAmount;
                return acc;
            }, {});
            await Promise.all(Object.entries(affiliateUpdates).map(([affiliateId, amount]) => prisma_1.prisma.affiliateProfile.update({
                where: { id: affiliateId },
                data: { totalEarnings: { increment: amount } },
            })));
        }
        res.json({ updated: result.count });
    }
    catch (error) {
        console.error("Error bulk updating commission statuses:", error);
        res
            .status(500)
            .json({ error: "Failed to bulk update commission statuses" });
    }
});
router.get("/analytics", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can access commission analytics" });
        }
        const { period = "30d" } = req.query;
        let dateFrom;
        switch (period) {
            case "7d":
                dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                break;
            case "30d":
                dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
                break;
            case "90d":
                dateFrom = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                dateFrom = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        }
        const [totalCommissions, totalAmount, statusBreakdown, topAffiliates, dailyStats,] = await Promise.all([
            prisma_1.prisma.affiliateOrder.count({
                where: { createdAt: { gte: dateFrom } },
            }),
            prisma_1.prisma.affiliateOrder.aggregate({
                where: { createdAt: { gte: dateFrom } },
                _sum: { commissionAmount: true },
            }),
            prisma_1.prisma.affiliateOrder.groupBy({
                by: ["status"],
                where: { createdAt: { gte: dateFrom } },
                _sum: { commissionAmount: true },
                _count: { id: true },
            }),
            prisma_1.prisma.affiliateOrder.groupBy({
                by: ["affiliateId"],
                where: { createdAt: { gte: dateFrom } },
                _sum: { commissionAmount: true },
                _count: { id: true },
                orderBy: { _sum: { commissionAmount: "desc" } },
                take: 10,
            }),
            prisma_1.prisma.affiliateOrder.groupBy({
                by: ["createdAt"],
                where: { createdAt: { gte: dateFrom } },
                _sum: { commissionAmount: true },
                _count: { id: true },
                orderBy: { createdAt: "asc" },
            }),
        ]);
        const topAffiliateIds = topAffiliates.map((a) => a.affiliateId);
        const affiliateDetails = await prisma_1.prisma.affiliateProfile.findMany({
            where: { id: { in: topAffiliateIds } },
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
        const topAffiliatesWithDetails = topAffiliates.map((affiliate) => {
            const details = affiliateDetails.find((d) => d.id === affiliate.affiliateId);
            return {
                ...affiliate,
                affiliateName: details
                    ? `${details.user.firstName} ${details.user.lastName}`
                    : "Unknown",
                affiliateEmail: details?.user.email,
            };
        });
        res.json({
            period,
            totalCommissions,
            totalAmount: totalAmount._sum.commissionAmount || 0,
            statusBreakdown,
            topAffiliates: topAffiliatesWithDetails,
            dailyStats,
        });
    }
    catch (error) {
        console.error("Error fetching commission analytics:", error);
        res.status(500).json({ error: "Failed to fetch commission analytics" });
    }
});
router.patch("/affiliate/:affiliateId/rate", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can update commission rates" });
        }
        const schema = zod_1.z.object({
            commissionRate: zod_1.z.number().min(0).max(100),
            reason: zod_1.z.string().optional(),
        });
        const { commissionRate, reason } = schema.parse(req.body);
        const { affiliateId } = req.params;
        const affiliate = await prisma_1.prisma.affiliateProfile.update({
            where: { id: affiliateId },
            data: { commissionRate },
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
        await prisma_1.prisma.activity.create({
            data: {
                action: "COMMISSION_RATE_CHANGE",
                resource: "AFFILIATE_PROFILE",
                details: {
                    description: `Commission rate changed to ${commissionRate}%${reason ? ` - ${reason}` : ""}`,
                    oldRate: affiliate.commissionRate,
                    newRate: commissionRate,
                    reason,
                },
                userId: req.user.id,
            },
        });
        res.json(affiliate);
    }
    catch (error) {
        console.error("Error updating commission rate:", error);
        res.status(500).json({ error: "Failed to update commission rate" });
    }
});
exports.default = router;
//# sourceMappingURL=commission-management.js.map