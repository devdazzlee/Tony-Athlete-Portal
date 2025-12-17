export interface ReferralCode {
    id: string;
    affiliateId: string;
    code: string;
    type: "SIGNUP" | "PRODUCT" | "BOTH";
    commissionRate: number;
    productId?: string | null;
    maxUses?: number | null;
    currentUses: number;
    expiresAt?: Date | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface ReferralUsage {
    id: string;
    referralCodeId: string;
    userId: string;
    type: "SIGNUP" | "PRODUCT" | "BOTH";
    productId?: string | null;
    orderValue?: number | null;
    commissionAmount: number;
    status: "PENDING" | "APPROVED" | "PAID";
    createdAt: Date;
}
export interface ReferralStats {
    totalReferrals: number;
    totalCommissions: number;
    pendingCommissions: number;
    conversionRate: number;
    topProducts: Array<{
        productId: string;
        productName: string;
        referrals: number;
        commissions: number;
    }>;
}
export declare class ReferralSystemModel {
    static generateReferralCode(affiliateId: string, data: {
        type: "SIGNUP" | "PRODUCT" | "BOTH";
        commissionRate?: number;
        productId?: string;
        maxUses?: number;
        expiresAt?: Date;
    }): Promise<ReferralCode>;
    static processReferral(code: string, userId: string, type: "SIGNUP" | "PRODUCT", data?: {
        productId?: string;
        orderValue?: number;
    }): Promise<ReferralUsage>;
    static getReferralStats(affiliateId: string): Promise<ReferralStats>;
    static getAffiliateReferralCodes(affiliateId: string): Promise<{
        commissionRate: number;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date;
        productId: string;
        isActive: boolean;
        code: string;
        maxUses: number;
        currentUses: number;
    }[]>;
    static generateShareableLinks(affiliateId: string, platforms?: string[]): Promise<{
        referralCode: string;
        links: Record<string, string>;
        qrCode: string;
    }>;
}
//# sourceMappingURL=ReferralSystem.d.ts.map