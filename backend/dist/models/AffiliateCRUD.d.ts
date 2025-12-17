export interface AffiliateProfile {
    id: string;
    userId: string;
    companyName?: string;
    website?: string;
    socialMedia?: any;
    paymentMethod: 'PAYPAL' | 'STRIPE' | 'BANK_TRANSFER' | 'CRYPTO' | 'WISE';
    paymentEmail?: string;
    taxId?: string;
    address?: any;
    tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
    commissionRate: number;
    totalEarnings: number;
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    lastActivityAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface AffiliateApplication {
    id: string;
    userId: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
    applicationData: any;
    submittedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    notes?: string;
    rejectionReason?: string;
}
export interface AffiliateActivity {
    id: string;
    affiliateId: string;
    type: 'LOGIN' | 'CLICK' | 'CONVERSION' | 'PAYOUT' | 'PROFILE_UPDATE' | 'STATUS_CHANGE';
    description: string;
    data: any;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
}
export interface AffiliateDocument {
    id: string;
    affiliateId: string;
    type: 'KYC' | 'TAX' | 'BANK' | 'CONTRACT' | 'OTHER';
    name: string;
    url: string;
    size: number;
    mimeType: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    uploadedAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
    notes?: string;
}
export declare class AffiliateCRUDModel {
    static create(data: Partial<AffiliateProfile>): Promise<AffiliateProfile>;
    static findById(id: string): Promise<AffiliateProfile | null>;
    static findByUserId(userId: string): Promise<AffiliateProfile | null>;
    static update(id: string, data: Partial<AffiliateProfile>): Promise<AffiliateProfile>;
    static delete(id: string): Promise<void>;
    static list(filters?: any, page?: number, limit?: number): Promise<AffiliateProfile[]>;
    static approve(id: string, approvedBy: string, notes?: string): Promise<AffiliateProfile>;
    static reject(id: string, rejectedBy: string, reason: string): Promise<AffiliateProfile>;
    static suspend(id: string, suspendedBy: string, reason: string): Promise<AffiliateProfile>;
    static activate(id: string, activatedBy: string): Promise<AffiliateProfile>;
    static updateTier(id: string, newTier: string, updatedBy: string): Promise<AffiliateProfile>;
    static updateKYCStatus(id: string, verified: boolean, verifiedBy: string, notes?: string): Promise<AffiliateProfile>;
    static addTag(id: string, tag: string): Promise<AffiliateProfile>;
    static removeTag(id: string, tag: string): Promise<AffiliateProfile>;
    static updateCustomField(id: string, field: string, value: any): Promise<AffiliateProfile>;
    static logActivity(affiliateId: string, type: string, description: string, data: any, ipAddress: string, userAgent: string): Promise<AffiliateActivity>;
    static getActivities(affiliateId: string, page?: number, limit?: number): Promise<AffiliateActivity[]>;
    static uploadDocument(affiliateId: string, type: string, name: string, url: string, size: number, mimeType: string): Promise<AffiliateDocument>;
    static findDocumentById(id: string): Promise<AffiliateDocument | null>;
    static listDocuments(affiliateId: string, filters?: any): Promise<AffiliateDocument[]>;
    static updateDocumentStatus(id: string, status: string, reviewedBy: string, notes?: string): Promise<AffiliateDocument>;
    static deleteDocument(id: string): Promise<void>;
    static getAffiliateStats(affiliateId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static getAffiliateDashboard(affiliateId: string): Promise<any>;
    static bulkUpdateStatus(affiliateIds: string[], status: string, updatedBy: string, reason?: string): Promise<AffiliateProfile[]>;
    static bulkUpdateTier(affiliateIds: string[], tier: string, updatedBy: string): Promise<AffiliateProfile[]>;
    static exportAffiliateData(affiliateId: string): Promise<any>;
    static getAffiliateLeaderboard(filters?: any, limit?: number): Promise<any[]>;
    static getAffiliateSummary(): Promise<any>;
}
//# sourceMappingURL=AffiliateCRUD.d.ts.map