"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../lib/prisma");
const zod_1 = require("zod");
const router = express_1.default.Router();
const payoutQuerySchema = zod_1.z.object({
    page: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 1)),
    limit: zod_1.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val) : 10)),
    status: zod_1.z
        .enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED"])
        .optional(),
});
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        let validatedQuery;
        try {
            validatedQuery = payoutQuerySchema.parse(req.query);
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
        const { page, limit, status } = validatedQuery;
        const formatPaymentMethod = (method) => {
            const methodMap = {
                PAYPAL: "PayPal",
                STRIPE: "Stripe",
                BANK_TRANSFER: "Bank Transfer",
                CRYPTO: "Crypto",
                WISE: "Wise",
            };
            return methodMap[method] || method;
        };
        const where = {};
        if (status) {
            where.status = status;
        }
        const paidCommissionsData = await prisma_1.prisma.affiliateOrder.findMany({
            where: {
                status: "PAID",
            },
            select: {
                id: true,
                affiliateId: true,
                commissionAmount: true,
                createdAt: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const affiliateIdsWithPaidCommissions = [
            ...new Set(paidCommissionsData.map((pc) => pc.affiliateId)),
        ];
        const affiliatesWithPaidCommissions = await prisma_1.prisma.affiliateProfile.findMany({
            where: {
                id: { in: affiliateIdsWithPaidCommissions },
            },
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        const commissionBasedPayouts = paidCommissionsData.map((pc) => {
            const affiliate = affiliatesWithPaidCommissions.find((a) => a.id === pc.affiliateId);
            const paymentMethod = affiliate?.paymentMethod || "PAYPAL";
            return {
                id: `COMM-${pc.id}`,
                affiliateId: pc.affiliateId,
                affiliateName: affiliate?.user
                    ? `${affiliate.user.firstName} ${affiliate.user.lastName}`
                    : "Unknown Affiliate",
                amount: pc.commissionAmount,
                method: formatPaymentMethod(paymentMethod),
                status: "completed",
                requestDate: pc.createdAt.toISOString().split("T")[0],
                email: affiliate?.user?.email || "",
                commissionsCount: 1,
                source: "commission",
            };
        });
        const actualPayouts = await prisma_1.prisma.payout.findMany({
            where,
            include: {
                affiliate: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        const allPayouts = [
            ...commissionBasedPayouts,
            ...actualPayouts.map((payout) => ({
                id: payout.id,
                affiliateId: payout.affiliateId,
                affiliateName: payout.affiliate.user
                    ? `${payout.affiliate.user.firstName} ${payout.affiliate.user.lastName}`
                    : "Unknown Affiliate",
                amount: payout.amount,
                method: formatPaymentMethod(payout.method),
                status: payout.status.toLowerCase(),
                requestDate: payout.createdAt.toISOString().split("T")[0],
                email: payout.affiliate.user?.email || "",
                commissionsCount: 0,
                processedDate: payout.processedAt
                    ? payout.processedAt.toISOString().split("T")[0]
                    : undefined,
                referenceId: payout.referenceId,
                source: "payout",
            })),
        ];
        let filteredPayouts = allPayouts;
        if (status) {
            filteredPayouts = allPayouts.filter((p) => p.status === status.toLowerCase());
        }
        filteredPayouts.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
        const total = filteredPayouts.length;
        const skip = (page - 1) * limit;
        const paginatedPayouts = filteredPayouts.slice(skip, skip + limit);
        const formattedPayouts = paginatedPayouts;
        const pendingPayouts = allPayouts.filter((p) => p.status === "pending");
        const processingPayouts = allPayouts.filter((p) => p.status === "processing");
        const completedPayouts = allPayouts.filter((p) => p.status === "completed");
        const pendingCount = pendingPayouts.length;
        const processingCount = processingPayouts.length;
        const completedCount = completedPayouts.length;
        const pendingAmount = pendingPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);
        res.json({
            data: formattedPayouts,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
            summary: {
                pending: pendingCount,
                processing: processingCount,
                completed: completedCount,
                totalPendingAmount: pendingAmount,
            },
        });
    }
    catch (error) {
        console.error("Error fetching payouts:", error);
        res.status(500).json({ error: "Failed to fetch payouts" });
    }
});
router.patch("/:id/status", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = [
            "PENDING",
            "PROCESSING",
            "COMPLETED",
            "FAILED",
            "CANCELLED",
        ];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const updateData = {
            status,
            updatedAt: new Date(),
        };
        if (status === "COMPLETED") {
            updateData.processedAt = new Date();
        }
        const payout = await prisma_1.prisma.payout.update({
            where: { id },
            data: updateData,
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
        res.json({
            success: true,
            message: `Payout status updated to ${status}`,
            payout: {
                id: payout.id,
                status: payout.status.toLowerCase(),
                amount: payout.amount,
                method: payout.method,
                processedAt: payout.processedAt,
            },
        });
    }
    catch (error) {
        if (error.code === "P2025") {
            return res.status(404).json({ error: "Payout not found" });
        }
        console.error("Error updating payout status:", error);
        res.status(500).json({ error: "Failed to update payout status" });
    }
});
router.post("/process-bulk", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { payoutIds, status = "PROCESSING" } = req.body;
        if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
            return res.status(400).json({ error: "Invalid payout IDs" });
        }
        const validStatuses = ["PROCESSING", "COMPLETED", "FAILED", "CANCELLED"];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const updateData = {
            status,
            updatedAt: new Date(),
        };
        if (status === "COMPLETED") {
            updateData.processedAt = new Date();
        }
        const result = await prisma_1.prisma.payout.updateMany({
            where: {
                id: { in: payoutIds },
            },
            data: updateData,
        });
        res.json({
            success: true,
            message: `${result.count} payouts processed successfully`,
            processedCount: result.count,
        });
    }
    catch (error) {
        console.error("Error processing bulk payouts:", error);
        res.status(500).json({ error: "Failed to process bulk payouts" });
    }
});
router.get("/analytics", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { period = "30d" } = req.query;
        const analytics = {
            period,
            totalPayouts: 156,
            totalAmount: 45320.5,
            averagePayoutAmount: 290.51,
            byStatus: {
                pending: 12,
                processing: 5,
                completed: 135,
                failed: 4,
            },
            byMethod: {
                PayPal: 98,
                "Bank Transfer": 52,
                Check: 6,
            },
            dailyStats: [
                { date: "2024-10-09", payouts: 5, amount: 1250.0 },
                { date: "2024-10-10", payouts: 8, amount: 2150.5 },
                { date: "2024-10-11", payouts: 3, amount: 890.0 },
                { date: "2024-10-12", payouts: 6, amount: 1680.75 },
                { date: "2024-10-13", payouts: 4, amount: 1120.0 },
                { date: "2024-10-14", payouts: 7, amount: 1950.25 },
                { date: "2024-10-15", payouts: 2, amount: 580.0 },
            ],
        };
        res.json(analytics);
    }
    catch (error) {
        console.error("Error fetching payout analytics:", error);
        res.status(500).json({ error: "Failed to fetch payout analytics" });
    }
});
exports.default = router;
//# sourceMappingURL=admin-payouts.js.map