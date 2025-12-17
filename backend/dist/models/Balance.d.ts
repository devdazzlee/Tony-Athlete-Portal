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
    status: "PENDING" | "APPROVED" | "PROCESSING" | "COMPLETED" | "FAILED" | "CANCELLED";
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
export declare class BalanceModel {
    static getBalance(affiliateId: string): Promise<Balance | null>;
    static createBalance(affiliateId: string, currency?: string): Promise<Balance>;
    static updateBalance(affiliateId: string, updates: Partial<Balance>): Promise<Balance>;
    static addCommission(affiliateId: string, amount: number, conversionId: string, description: string): Promise<BalanceTransaction>;
    static holdAmount(affiliateId: string, amount: number, reason: string): Promise<BalanceTransaction>;
    static releaseHold(affiliateId: string, amount: number, reason: string): Promise<BalanceTransaction>;
    static processPayout(affiliateId: string, amount: number, method: string, paymentDetails: any): Promise<PayoutRequest>;
    static approvePayout(payoutId: string, approvedBy: string): Promise<PayoutRequest>;
    static completePayout(payoutId: string, processedBy: string): Promise<PayoutRequest>;
    static failPayout(payoutId: string, reason: string, processedBy: string): Promise<PayoutRequest>;
    static getBalanceTransactions(affiliateId: string, page?: number, limit?: number): Promise<BalanceTransaction[]>;
    static getPayoutRequests(filters?: any, page?: number, limit?: number): Promise<PayoutRequest[]>;
    static getBalanceSummary(affiliateId: string): Promise<any>;
    static getBalanceStats(startDate?: Date, endDate?: Date): Promise<any>;
}
//# sourceMappingURL=Balance.d.ts.map