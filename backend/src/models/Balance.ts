import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface Balance {
  id: string;
  affiliateId: string;
  openBalance: number;
  settledBalance: number;
  pendingBalance: number;
  holdBalance: number;
  currency: string;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BalanceTransaction {
  id: string;
  affiliateId: string;
  type: "COMMISSION" | "PAYOUT" | "ADJUSTMENT" | "HOLD" | "RELEASE" | "REFUND";
  amount: number;
  currency: string;
  description: string;
  referenceId?: string;
  referenceType?: "CONVERSION" | "PAYOUT" | "ADJUSTMENT" | "HOLD";
  status: "PENDING" | "PROCESSED" | "FAILED" | "CANCELLED";
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayoutRequest {
  id: string;
  affiliateId: string;
  amount: number;
  currency: string;
  method: "PAYPAL" | "STRIPE" | "BANK_TRANSFER" | "CRYPTO" | "WISE";
  status:
    | "PENDING"
    | "APPROVED"
    | "PROCESSING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";
  paymentDetails: any;
  notes?: string;
  requestedAt: Date;
  approvedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  approvedBy?: string;
  processedBy?: string;
  failureReason?: string;
}

export class BalanceModel {
  static async getBalance(affiliateId: string): Promise<Balance | null> {
    return (await (prisma as any).balance.findUnique({
      where: { affiliateId },
    })) as Balance | null;
  }

  static async createBalance(
    affiliateId: string,
    currency: string = "USD"
  ): Promise<Balance> {
    return (await (prisma as any).balance.create({
      data: {
        affiliateId,
        openBalance: 0,
        settledBalance: 0,
        pendingBalance: 0,
        holdBalance: 0,
        currency,
        lastUpdated: new Date(),
      },
    })) as Balance;
  }

  static async updateBalance(
    affiliateId: string,
    updates: Partial<Balance>
  ): Promise<Balance> {
    return (await (prisma as any).balance.update({
      where: { affiliateId },
      data: {
        ...updates,
        lastUpdated: new Date(),
      } as any,
    })) as Balance;
  }

  static async addCommission(
    affiliateId: string,
    amount: number,
    conversionId: string,
    description: string
  ): Promise<BalanceTransaction> {
    // Create transaction
    const transaction = (await (prisma as any).balanceTransaction.create({
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
    })) as BalanceTransaction;

    // Update balance
    await this.updateBalance(affiliateId, {
      openBalance: amount,
    } as any);

    return transaction;
  }

  static async holdAmount(
    affiliateId: string,
    amount: number,
    reason: string
  ): Promise<BalanceTransaction> {
    const transaction = (await (prisma as any).balanceTransaction.create({
      data: {
        affiliateId,
        type: "HOLD",
        amount: -amount,
        currency: "USD",
        description: `Hold: ${reason}`,
        status: "PROCESSED",
        processedAt: new Date(),
      },
    })) as BalanceTransaction;

    // Move from open to hold
    await this.updateBalance(affiliateId, {
      openBalance: -amount,
      holdBalance: amount,
    } as any);

    return transaction;
  }

  static async releaseHold(
    affiliateId: string,
    amount: number,
    reason: string
  ): Promise<BalanceTransaction> {
    const transaction = (await (prisma as any).balanceTransaction.create({
      data: {
        affiliateId,
        type: "RELEASE",
        amount,
        currency: "USD",
        description: `Release: ${reason}`,
        status: "PROCESSED",
        processedAt: new Date(),
      },
    })) as BalanceTransaction;

    // Move from hold to open
    await this.updateBalance(affiliateId, {
      holdBalance: -amount,
      openBalance: amount,
    } as any);

    return transaction;
  }

  static async processPayout(
    affiliateId: string,
    amount: number,
    method: string,
    paymentDetails: any
  ): Promise<PayoutRequest> {
    const payoutRequest = (await (prisma as any).payoutRequest.create({
      data: {
        affiliateId,
        amount,
        currency: "USD",
        method: method as any,
        status: "PENDING",
        paymentDetails,
        requestedAt: new Date(),
      },
    })) as PayoutRequest;

    // Move from open to pending
    await this.updateBalance(affiliateId, {
      openBalance: -amount,
      pendingBalance: amount,
    } as any);

    return payoutRequest;
  }

  static async approvePayout(
    payoutId: string,
    approvedBy: string
  ): Promise<PayoutRequest> {
    const payout = await (prisma as any).payoutRequest.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout request not found");
    }

    const updatedPayout = (await (prisma as any).payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy,
      },
    })) as PayoutRequest;

    // Move from pending to settled
    await this.updateBalance(payout.affiliateId, {
      pendingBalance: -(payout.amount || 0),
      settledBalance: payout.amount || 0,
    } as any);

    return updatedPayout;
  }

  static async completePayout(
    payoutId: string,
    processedBy: string
  ): Promise<PayoutRequest> {
    const payout = await (prisma as any).payoutRequest.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout request not found");
    }

    const updatedPayout = (await (prisma as any).payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: "COMPLETED",
        processedAt: new Date(),
        completedAt: new Date(),
        processedBy,
      },
    })) as PayoutRequest;

    // Create payout transaction
    await (prisma as any).balanceTransaction.create({
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

    // Remove from settled balance
    await this.updateBalance(payout.affiliateId, {
      settledBalance: -(payout.amount || 0),
    } as any);

    return updatedPayout;
  }

  static async failPayout(
    payoutId: string,
    reason: string,
    processedBy: string
  ): Promise<PayoutRequest> {
    const payout = await (prisma as any).payoutRequest.findUnique({
      where: { id: payoutId },
    });

    if (!payout) {
      throw new Error("Payout request not found");
    }

    const updatedPayout = (await (prisma as any).payoutRequest.update({
      where: { id: payoutId },
      data: {
        status: "FAILED",
        processedAt: new Date(),
        processedBy,
        failureReason: reason,
      },
    })) as PayoutRequest;

    // Move back from pending to open
    await this.updateBalance(payout.affiliateId, {
      pendingBalance: -(payout.amount || 0),
      openBalance: payout.amount || 0,
    } as any);

    return updatedPayout;
  }

  static async getBalanceTransactions(
    affiliateId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<BalanceTransaction[]> {
    const skip = (page - 1) * limit;
    return (await (prisma as any).balanceTransaction.findMany({
      where: { affiliateId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as BalanceTransaction[];
  }

  static async getPayoutRequests(
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<PayoutRequest[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.startDate && filters.endDate) {
      where.requestedAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return (await (prisma as any).payoutRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { requestedAt: "desc" },
    })) as PayoutRequest[];
  }

  static async getBalanceSummary(affiliateId: string): Promise<any> {
    const balance = await this.getBalance(affiliateId);
    if (!balance) {
      return null;
    }

    const transactions = await (prisma as any).balanceTransaction.findMany({
      where: { affiliateId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const payouts = await (prisma as any).payoutRequest.findMany({
      where: { affiliateId },
      orderBy: { requestedAt: "desc" },
      take: 5,
    });

    return {
      balance,
      recentTransactions: transactions,
      recentPayouts: payouts,
      availableForPayout: balance.openBalance,
      totalEarned:
        balance.openBalance +
        balance.settledBalance +
        balance.pendingBalance +
        balance.holdBalance,
    };
  }

  static async getBalanceStats(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const transactions = await (prisma as any).balanceTransaction.findMany({
      where,
      include: {
        affiliate: {
          include: {
            user: true,
          },
        },
      },
    });

    const payouts = await (prisma as any).payoutRequest.findMany({
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
      byType: {} as Record<string, number>,
      byAffiliate: {} as Record<string, any>,
      byMonth: {} as Record<string, any>,
    };

    transactions.forEach((transaction) => {
      // Count by type
      stats.byType[transaction.type] =
        (stats.byType[transaction.type] || 0) + transaction.amount;

      // Sum totals
      if (transaction.type === "COMMISSION")
        stats.totalCommissions += transaction.amount;
      else if (transaction.type === "HOLD")
        stats.totalHolds += Math.abs(transaction.amount);
      else if (transaction.type === "RELEASE")
        stats.totalReleases += transaction.amount;

      // By affiliate
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

      // By month
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

    // Sum payouts
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
