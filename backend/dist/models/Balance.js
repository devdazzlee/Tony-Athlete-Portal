"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BalanceModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BalanceModel {
    static async getBalance(affiliateId) {
        return (await prisma.balance.findUnique({
            where: { affiliateId },
        }));
    }
    static async createBalance(affiliateId, currency = "USD") {
        return (await prisma.balance.create({
            data: {
                affiliateId,
                openBalance: 0,
                settledBalance: 0,
                pendingBalance: 0,
                holdBalance: 0,
                currency,
                lastUpdated: new Date(),
            },
        }));
    }
    static async updateBalance(affiliateId, updates) {
        return (await prisma.balance.update({
            where: { affiliateId },
            data: {
                ...updates,
                lastUpdated: new Date(),
            },
        }));
    }
    static async addCommission(affiliateId, amount, conversionId, description) {
        const transaction = (await prisma.balanceTransaction.create({
            data: {
                affiliateId,
                type: "COMMISSION",
                amount,
                currency: "USD",
                description,
                referenceId: conversionId,
                referenceType: "CONVERSION",
                status: "PROCESSED",
                processedAt: new Date(),
            },
        }));
        await this.updateBalance(affiliateId, {
            openBalance: amount,
        });
        return transaction;
    }
    static async holdAmount(affiliateId, amount, reason) {
        const transaction = (await prisma.balanceTransaction.create({
            data: {
                affiliateId,
                type: "HOLD",
                amount: -amount,
                currency: "USD",
                description: `Hold: ${reason}`,
                status: "PROCESSED",
                processedAt: new Date(),
            },
        }));
        await this.updateBalance(affiliateId, {
            openBalance: -amount,
            holdBalance: amount,
        });
        return transaction;
    }
    static async releaseHold(affiliateId, amount, reason) {
        const transaction = (await prisma.balanceTransaction.create({
            data: {
                affiliateId,
                type: "RELEASE",
                amount,
                currency: "USD",
                description: `Release: ${reason}`,
                status: "PROCESSED",
                processedAt: new Date(),
            },
        }));
        await this.updateBalance(affiliateId, {
            holdBalance: -amount,
            openBalance: amount,
        });
        return transaction;
    }
    static async processPayout(affiliateId, amount, method, paymentDetails) {
        const payoutRequest = (await prisma.payoutRequest.create({
            data: {
                affiliateId,
                amount,
                currency: "USD",
                method: method,
                status: "PENDING",
                paymentDetails,
                requestedAt: new Date(),
            },
        }));
        await this.updateBalance(affiliateId, {
            openBalance: -amount,
            pendingBalance: amount,
        });
        return payoutRequest;
    }
    static async approvePayout(payoutId, approvedBy) {
        const payout = await prisma.payoutRequest.findUnique({
            where: { id: payoutId },
        });
        if (!payout) {
            throw new Error("Payout request not found");
        }
        const updatedPayout = (await prisma.payoutRequest.update({
            where: { id: payoutId },
            data: {
                status: "APPROVED",
                approvedAt: new Date(),
                approvedBy,
            },
        }));
        await this.updateBalance(payout.affiliateId, {
            pendingBalance: -(payout.amount || 0),
            settledBalance: payout.amount || 0,
        });
        return updatedPayout;
    }
    static async completePayout(payoutId, processedBy) {
        const payout = await prisma.payoutRequest.findUnique({
            where: { id: payoutId },
        });
        if (!payout) {
            throw new Error("Payout request not found");
        }
        const updatedPayout = (await prisma.payoutRequest.update({
            where: { id: payoutId },
            data: {
                status: "COMPLETED",
                processedAt: new Date(),
                completedAt: new Date(),
                processedBy,
            },
        }));
        await prisma.balanceTransaction.create({
            data: {
                affiliateId: payout.affiliateId,
                type: "PAYOUT",
                amount: -(payout.amount || 0),
                currency: payout.currency || "USD",
                description: `Payout via ${payout.method}`,
                referenceId: payoutId,
                referenceType: "PAYOUT",
                status: "PROCESSED",
                processedAt: new Date(),
            },
        });
        await this.updateBalance(payout.affiliateId, {
            settledBalance: -(payout.amount || 0),
        });
        return updatedPayout;
    }
    static async failPayout(payoutId, reason, processedBy) {
        const payout = await prisma.payoutRequest.findUnique({
            where: { id: payoutId },
        });
        if (!payout) {
            throw new Error("Payout request not found");
        }
        const updatedPayout = (await prisma.payoutRequest.update({
            where: { id: payoutId },
            data: {
                status: "FAILED",
                processedAt: new Date(),
                processedBy,
                failureReason: reason,
            },
        }));
        await this.updateBalance(payout.affiliateId, {
            pendingBalance: -(payout.amount || 0),
            openBalance: payout.amount || 0,
        });
        return updatedPayout;
    }
    static async getBalanceTransactions(affiliateId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return (await prisma.balanceTransaction.findMany({
            where: { affiliateId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async getPayoutRequests(filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.status)
            where.status = filters.status;
        if (filters.method)
            where.method = filters.method;
        if (filters.startDate && filters.endDate) {
            where.requestedAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.payoutRequest.findMany({
            where,
            skip,
            take: limit,
            orderBy: { requestedAt: "desc" },
        }));
    }
    static async getBalanceSummary(affiliateId) {
        const balance = await this.getBalance(affiliateId);
        if (!balance) {
            return null;
        }
        const transactions = await prisma.balanceTransaction.findMany({
            where: { affiliateId },
            orderBy: { createdAt: "desc" },
            take: 10,
        });
        const payouts = await prisma.payoutRequest.findMany({
            where: { affiliateId },
            orderBy: { requestedAt: "desc" },
            take: 5,
        });
        return {
            balance,
            recentTransactions: transactions,
            recentPayouts: payouts,
            availableForPayout: balance.openBalance,
            totalEarned: balance.openBalance +
                balance.settledBalance +
                balance.pendingBalance +
                balance.holdBalance,
        };
    }
    static async getBalanceStats(startDate, endDate) {
        const where = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const transactions = await prisma.balanceTransaction.findMany({
            where,
            include: {
                affiliate: {
                    include: {
                        user: true,
                    },
                },
            },
        });
        const payouts = await prisma.payoutRequest.findMany({
            where: {
                ...where,
                status: "COMPLETED",
            },
        });
        const stats = {
            totalCommissions: 0,
            totalPayouts: 0,
            totalHolds: 0,
            totalReleases: 0,
            byType: {},
            byAffiliate: {},
            byMonth: {},
        };
        transactions.forEach((transaction) => {
            stats.byType[transaction.type] =
                (stats.byType[transaction.type] || 0) + transaction.amount;
            if (transaction.type === "COMMISSION")
                stats.totalCommissions += transaction.amount;
            else if (transaction.type === "HOLD")
                stats.totalHolds += Math.abs(transaction.amount);
            else if (transaction.type === "RELEASE")
                stats.totalReleases += transaction.amount;
            if (!stats.byAffiliate[transaction.affiliateId]) {
                stats.byAffiliate[transaction.affiliateId] = {
                    total: 0,
                    commissions: 0,
                    name: transaction.affiliate?.user
                        ? `${transaction.affiliate.user.firstName} ${transaction.affiliate.user.lastName}`
                        : "Unknown",
                };
            }
            stats.byAffiliate[transaction.affiliateId].total += transaction.amount;
            if (transaction.type === "COMMISSION") {
                stats.byAffiliate[transaction.affiliateId].commissions +=
                    transaction.amount;
            }
            const month = transaction.createdAt.toISOString().substr(0, 7);
            if (!stats.byMonth[month]) {
                stats.byMonth[month] = {
                    commissions: 0,
                    payouts: 0,
                    holds: 0,
                    releases: 0,
                };
            }
            if (transaction.type === "COMMISSION")
                stats.byMonth[month].commissions += transaction.amount;
            else if (transaction.type === "HOLD")
                stats.byMonth[month].holds += Math.abs(transaction.amount);
            else if (transaction.type === "RELEASE")
                stats.byMonth[month].releases += transaction.amount;
        });
        payouts.forEach((payout) => {
            stats.totalPayouts += payout.amount;
            const month = payout.completedAt?.toISOString().substr(0, 7);
            if (month) {
                if (!stats.byMonth[month]) {
                    stats.byMonth[month] = {
                        commissions: 0,
                        payouts: 0,
                        holds: 0,
                        releases: 0,
                    };
                }
                stats.byMonth[month].payouts += payout.amount;
            }
        });
        return stats;
    }
}
exports.BalanceModel = BalanceModel;
//# sourceMappingURL=Balance.js.map