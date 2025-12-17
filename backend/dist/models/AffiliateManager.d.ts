export interface AffiliateManager {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    department: string;
    role: "MANAGER" | "SENIOR_MANAGER" | "DIRECTOR" | "VP";
    permissions: ManagerPermissions;
    assignedAffiliates: string[];
    assignedOffers: string[];
    assignedRegions: string[];
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    createdAt: Date;
    updatedAt: Date;
}
export interface ManagerPermissions {
    affiliates: {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
        approve: boolean;
        suspend: boolean;
    };
    offers: {
        view: boolean;
        create: boolean;
        edit: boolean;
        delete: boolean;
        approve: boolean;
    };
    payouts: {
        view: boolean;
        approve: boolean;
        process: boolean;
        reject: boolean;
    };
    reports: {
        view: boolean;
        export: boolean;
        schedule: boolean;
    };
    settings: {
        view: boolean;
        edit: boolean;
    };
    communications: {
        send: boolean;
        view: boolean;
        manage: boolean;
    };
}
export interface ManagerActivity {
    id: string;
    managerId: string;
    action: string;
    resource: string;
    resourceId: string;
    details: any;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
}
export interface ManagerPerformance {
    id: string;
    managerId: string;
    period: string;
    metrics: {
        affiliatesManaged: number;
        newAffiliates: number;
        activeAffiliates: number;
        totalCommissions: number;
        totalPayouts: number;
        averageAffiliateEarnings: number;
        conversionRate: number;
        retentionRate: number;
    };
    createdAt: Date;
}
export declare class AffiliateManagerModel {
    static create(data: Partial<AffiliateManager>): Promise<AffiliateManager>;
    static findById(id: string): Promise<AffiliateManager | null>;
    static findByUserId(userId: string): Promise<AffiliateManager | null>;
    static update(id: string, data: Partial<AffiliateManager>): Promise<AffiliateManager>;
    static delete(id: string): Promise<void>;
    static list(filters?: any, page?: number, limit?: number): Promise<AffiliateManager[]>;
    static assignAffiliate(managerId: string, affiliateId: string): Promise<AffiliateManager>;
    static unassignAffiliate(managerId: string, affiliateId: string): Promise<AffiliateManager>;
    static assignOffer(managerId: string, offerId: string): Promise<AffiliateManager>;
    static unassignOffer(managerId: string, offerId: string): Promise<AffiliateManager>;
    static updatePermissions(managerId: string, permissions: Partial<ManagerPermissions>): Promise<AffiliateManager>;
    static recordActivity(managerId: string, action: string, resource: string, resourceId: string, details: any, ipAddress: string, userAgent: string): Promise<ManagerActivity>;
    static getActivities(managerId: string, page?: number, limit?: number): Promise<ManagerActivity[]>;
    static getAssignedAffiliates(managerId: string, page?: number, limit?: number): Promise<any[]>;
    static getAssignedOffers(managerId: string, page?: number, limit?: number): Promise<any[]>;
    static getManagerStats(managerId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static getPerformanceReport(managerId: string, period: string): Promise<ManagerPerformance>;
    static getManagerDashboard(managerId: string): Promise<any>;
    static checkPermission(managerId: string, resource: string, action: string): Promise<boolean>;
    static bulkAssignAffiliates(managerId: string, affiliateIds: string[]): Promise<AffiliateManager>;
    static bulkUnassignAffiliates(managerId: string, affiliateIds: string[]): Promise<AffiliateManager>;
    static getManagerHierarchy(): Promise<any>;
    static getManagerReports(managerId: string, startDate?: Date, endDate?: Date): Promise<any>;
}
//# sourceMappingURL=AffiliateManager.d.ts.map