export interface GetAllOffersParams {
    page: number;
    limit: number;
    search?: string;
    status?: string;
}
export interface CreateOfferData {
    name: string;
    description: string;
    commissionRate: number;
    startDate: string;
    endDate?: string;
}
export interface UpdateOfferData {
    name?: string;
    description?: string;
    commissionRate?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
}
export interface ApplyForOfferData {
    message?: string;
}
export interface UpdateApplicationData {
    status: string;
    message?: string;
}
export interface CreateCreativeData {
    name: string;
    type: string;
    size: string;
    format: string;
    url: string;
    downloadUrl: string;
}
export interface UpdateCreativeData {
    name?: string;
    type?: string;
    size?: string;
    format?: string;
    url?: string;
    downloadUrl?: string;
}
export interface GetOfferApplicationsParams {
    page: number;
    limit: number;
    status?: string;
}
export interface GetOfferCreativesParams {
    page: number;
    limit: number;
    type?: string;
}
export interface GetOfferAnalyticsParams {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
}
export interface GetOfferClicksParams {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
}
export declare class OfferService {
    getAllOffers(params: GetAllOffersParams): Promise<{
        offers: {
            name: string;
            id: string;
            status: import(".prisma/client").$Enums.OfferStatus;
            createdAt: Date;
            updatedAt: Date;
            commissionRate: number;
            totalClicks: number;
            totalConversions: number;
            description: string;
            tags: string[];
            accountId: string;
            startDate: Date;
            endDate: Date | null;
            totalRevenue: number;
            totalCommissions: number;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getOfferById(id: string): Promise<{
        applications: ({
            affiliate: {
                user: {
                    email: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                status: string;
                phone: string | null;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                companyName: string | null;
                website: string | null;
                socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                paymentEmail: string | null;
                taxId: string | null;
                address: import("@prisma/client/runtime/library").JsonValue | null;
                bankAccount: string | null;
                kycVerified: boolean;
                tier: import(".prisma/client").$Enums.AffiliateTier;
                commissionRate: number;
                totalEarnings: number;
                totalClicks: number;
                totalConversions: number;
                conversionRate: number;
                lastActivityAt: Date | null;
                deliverablesNote: string | null;
                spendingLimit: number | null;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ApplicationStatus;
            createdAt: Date;
            updatedAt: Date;
            message: string | null;
            affiliateId: string;
            offerId: string;
        })[];
        creatives: {
            name: string;
            url: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.CreativeType;
            offerId: string;
            size: string;
            format: string;
            downloadUrl: string;
        }[];
    } & {
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        createdAt: Date;
        updatedAt: Date;
        commissionRate: number;
        totalClicks: number;
        totalConversions: number;
        description: string;
        tags: string[];
        accountId: string;
        startDate: Date;
        endDate: Date | null;
        totalRevenue: number;
        totalCommissions: number;
    }>;
    createOffer(data: CreateOfferData, accountId: string): Promise<{
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        createdAt: Date;
        updatedAt: Date;
        commissionRate: number;
        totalClicks: number;
        totalConversions: number;
        description: string;
        tags: string[];
        accountId: string;
        startDate: Date;
        endDate: Date | null;
        totalRevenue: number;
        totalCommissions: number;
    }>;
    updateOffer(id: string, data: UpdateOfferData): Promise<{
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.OfferStatus;
        createdAt: Date;
        updatedAt: Date;
        commissionRate: number;
        totalClicks: number;
        totalConversions: number;
        description: string;
        tags: string[];
        accountId: string;
        startDate: Date;
        endDate: Date | null;
        totalRevenue: number;
        totalCommissions: number;
    }>;
    deleteOffer(id: string): Promise<void>;
    getOfferApplications(offerId: string, params: GetOfferApplicationsParams): Promise<{
        applications: ({
            affiliate: {
                user: {
                    email: string;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                status: string;
                phone: string | null;
                createdAt: Date;
                updatedAt: Date;
                userId: string;
                companyName: string | null;
                website: string | null;
                socialMedia: import("@prisma/client/runtime/library").JsonValue | null;
                paymentMethod: import(".prisma/client").$Enums.PaymentMethod;
                paymentEmail: string | null;
                taxId: string | null;
                address: import("@prisma/client/runtime/library").JsonValue | null;
                bankAccount: string | null;
                kycVerified: boolean;
                tier: import(".prisma/client").$Enums.AffiliateTier;
                commissionRate: number;
                totalEarnings: number;
                totalClicks: number;
                totalConversions: number;
                conversionRate: number;
                lastActivityAt: Date | null;
                deliverablesNote: string | null;
                spendingLimit: number | null;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.ApplicationStatus;
            createdAt: Date;
            updatedAt: Date;
            message: string | null;
            affiliateId: string;
            offerId: string;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    applyForOffer(offerId: string, userId: string, data: ApplyForOfferData): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        createdAt: Date;
        updatedAt: Date;
        message: string | null;
        affiliateId: string;
        offerId: string;
    }>;
    updateApplication(applicationId: string, data: UpdateApplicationData): Promise<{
        id: string;
        status: import(".prisma/client").$Enums.ApplicationStatus;
        createdAt: Date;
        updatedAt: Date;
        message: string | null;
        affiliateId: string;
        offerId: string;
    }>;
    deleteApplication(applicationId: string): Promise<void>;
    getOfferCreatives(offerId: string, params: GetOfferCreativesParams): Promise<{
        creatives: {
            name: string;
            url: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            type: import(".prisma/client").$Enums.CreativeType;
            offerId: string;
            size: string;
            format: string;
            downloadUrl: string;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    createCreative(offerId: string, data: CreateCreativeData): Promise<{
        name: string;
        url: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CreativeType;
        offerId: string;
        size: string;
        format: string;
        downloadUrl: string;
    }>;
    updateCreative(creativeId: string, data: UpdateCreativeData): Promise<{
        name: string;
        url: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.CreativeType;
        offerId: string;
        size: string;
        format: string;
        downloadUrl: string;
    }>;
    deleteCreative(creativeId: string): Promise<void>;
    getOfferAnalytics(offerId: string, params: GetOfferAnalyticsParams): Promise<{
        totalClicks: number;
        totalConversions: number;
        totalRevenue: number;
        conversionRate: number;
        topAffiliates: {
            name: string;
            conversions: number;
            earnings: number;
        }[];
    }>;
    getOfferClicks(offerId: string, params: GetOfferClicksParams): Promise<{
        totalClicks: number;
        clicksByDay: {
            date: string;
            clicks: number;
        }[];
        clicksByCountry: {
            country: string;
            clicks: number;
        }[];
    }>;
    getOfferConversions(offerId: string, params: GetOfferClicksParams): Promise<{
        totalConversions: number;
        conversionsByDay: {
            date: string;
            conversions: number;
        }[];
        conversionsByAffiliate: {
            affiliate: string;
            conversions: number;
        }[];
    }>;
}
//# sourceMappingURL=OfferService.d.ts.map