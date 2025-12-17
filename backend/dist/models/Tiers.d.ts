import { Tier, TierAssignment, TierProgress } from "@prisma/client";
export interface TierRequirements {
    minimumClicks: number;
    minimumConversions: number;
    minimumEarnings: number;
    minimumReferrals: number;
    timePeriod: number;
    otherRequirements: string[];
}
export interface TierBenefits {
    commissionRate: number;
    bonusRate: number;
    prioritySupport: boolean;
    customFeatures: string[];
    exclusiveOffers: boolean;
    higherPayouts: boolean;
    marketingMaterials: boolean;
    dedicatedManager: boolean;
}
export declare class TiersModel {
    static create(data: any): Promise<Tier>;
    static findById(id: string): Promise<Tier | null>;
    static update(id: string, data: Partial<Tier>): Promise<Tier>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<Tier[]>;
    static assignTier(affiliateId: string, tierId: string, assignedBy: string, reason: string, expiresAt?: Date): Promise<TierAssignment>;
    static getAffiliateTier(affiliateId: string): Promise<Tier | null>;
    static calculateTierProgress(affiliateId: string, tierId: string): Promise<TierProgress>;
    static getAffiliateProgress(affiliateId: string): Promise<TierProgress[]>;
    static checkTierEligibility(affiliateId: string): Promise<{
        eligible: boolean;
        tier?: Tier;
        reason?: string;
    }>;
    static autoAssignTiers(accountId: string): Promise<{
        assigned: number;
        errors: string[];
    }>;
    static getTierStats(accountId: string): Promise<any>;
    static createDefaultTiers(accountId: string): Promise<Tier[]>;
    static getTierBenefits(affiliateId: string): Promise<any>;
    static updateTierProgress(affiliateId: string): Promise<void>;
    static getTierLeaderboard(accountId: string, limit?: number): Promise<any[]>;
}
//# sourceMappingURL=Tiers.d.ts.map