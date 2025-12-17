export interface GetAllAffiliatesParams {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    tier?: string;
    sortBy?: string;
    sortOrder?: string;
}
export interface CreateAffiliateData {
    email: string;
    firstName: string;
    lastName: string;
    companyName?: string;
    website?: string;
    paymentMethod?: string;
    paymentEmail?: string;
    tier?: string;
}
export interface UpdateAffiliateData {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    website?: string;
    paymentMethod?: string;
    paymentEmail?: string;
    tier?: string;
    commissionRate?: number;
    status?: string;
}
export interface CreateLinkData {
    originalUrl: string;
    offerId?: string;
    customSlug?: string;
    expiresAt?: string;
}
export interface UpdateLinkData {
    originalUrl?: string;
    customSlug?: string;
    isActive?: boolean;
    expiresAt?: string;
}
export interface RequestPayoutData {
    amount: number;
    method: string;
    notes?: string;
}
export interface GetCommissionsParams {
    page: number;
    limit: number;
    status?: string;
    startDate?: string;
    endDate?: string;
}
export interface GetPayoutsParams {
    page: number;
    limit: number;
    status?: string;
    startDate?: string;
    endDate?: string;
}
export interface GetAnalyticsParams {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
}
export interface GetClicksAnalyticsParams {
    timeRange?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: string;
}
export declare class AffiliateService {
    getAllAffiliates(params: GetAllAffiliatesParams): Promise<{
        affiliates: ({
            user: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
                status: import(".prisma/client").$Enums.UserStatus;
                createdAt: Date;
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
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getAffiliateById(id: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            status: import(".prisma/client").$Enums.UserStatus;
            createdAt: Date;
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
    }>;
    createAffiliate(data: CreateAffiliateData): Promise<{
        createdAt: Date;
        email: string;
        firstName: string;
        lastName: string;
        companyName?: string;
        website?: string;
        paymentMethod?: string;
        paymentEmail?: string;
        tier?: string;
        id: string;
    }>;
    updateAffiliate(id: string, data: UpdateAffiliateData): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            status: import(".prisma/client").$Enums.UserStatus;
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
    }>;
    deleteAffiliate(id: string): Promise<void>;
    getMyProfile(userId: string): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            status: import(".prisma/client").$Enums.UserStatus;
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
    }>;
    updateMyProfile(userId: string, data: UpdateAffiliateData): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string;
            lastName: string;
            status: import(".prisma/client").$Enums.UserStatus;
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
    }>;
    getAffiliateLinks(affiliateId: string, params: any): Promise<{
        links: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            expiresAt: Date | null;
            clicks: number;
            conversions: number;
            affiliateId: string;
            offerId: string | null;
            originalUrl: string;
            shortUrl: string;
            customSlug: string | null;
            earnings: number;
            isActive: boolean;
        }[];
        pagination: {
            page: any;
            limit: any;
            total: number;
            pages: number;
        };
    }>;
    createAffiliateLink(affiliateId: string, data: CreateLinkData): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        clicks: number;
        conversions: number;
        affiliateId: string;
        offerId: string | null;
        originalUrl: string;
        shortUrl: string;
        customSlug: string | null;
        earnings: number;
        isActive: boolean;
    }>;
    updateAffiliateLink(linkId: string, data: UpdateLinkData): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        expiresAt: Date | null;
        clicks: number;
        conversions: number;
        affiliateId: string;
        offerId: string | null;
        originalUrl: string;
        shortUrl: string;
        customSlug: string | null;
        earnings: number;
        isActive: boolean;
    }>;
    deleteAffiliateLink(linkId: string): Promise<void>;
    getCommissions(affiliateId: string, params: GetCommissionsParams): Promise<{
        commissions: ({
            conversion: {
                offer: {
                    name: string;
                    id: string;
                    status: import(".prisma/client").$Enums.OfferStatus;
                    createdAt: Date;
                    updatedAt: Date;
                    commissionRate: number;
                    totalClicks: number;
                    totalConversions: number;
                    description: string;
                    accountId: string;
                    startDate: Date;
                    endDate: Date | null;
                    tags: string[];
                    totalRevenue: number;
                    totalCommissions: number;
                };
            } & {
                id: string;
                status: import(".prisma/client").$Enums.ConversionStatus;
                createdAt: Date;
                updatedAt: Date;
                userId: string | null;
                orderValue: number;
                commissionAmount: number;
                affiliateId: string;
                clickId: string;
                offerId: string;
                customerEmail: string | null;
                customerValue: number;
            };
        } & {
            id: string;
            status: import(".prisma/client").$Enums.CommissionStatus;
            createdAt: Date;
            updatedAt: Date;
            affiliateId: string;
            conversionId: string;
            payoutId: string | null;
            amount: number;
            rate: number;
            payoutDate: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    getPayouts(affiliateId: string, params: GetPayoutsParams): Promise<{
        payouts: ({
            commissions: {
                id: string;
                status: import(".prisma/client").$Enums.CommissionStatus;
                createdAt: Date;
                updatedAt: Date;
                affiliateId: string;
                conversionId: string;
                payoutId: string | null;
                amount: number;
                rate: number;
                payoutDate: Date | null;
            }[];
        } & {
            method: import(".prisma/client").$Enums.PaymentMethod;
            id: string;
            status: import(".prisma/client").$Enums.PayoutStatus;
            createdAt: Date;
            updatedAt: Date;
            affiliateId: string;
            amount: number;
            paymentMethodId: string | null;
            referenceId: string | null;
            processedAt: Date | null;
        })[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    requestPayout(affiliateId: string, data: RequestPayoutData): Promise<{
        method: import(".prisma/client").$Enums.PaymentMethod;
        id: string;
        status: import(".prisma/client").$Enums.PayoutStatus;
        createdAt: Date;
        updatedAt: Date;
        affiliateId: string;
        amount: number;
        paymentMethodId: string | null;
        referenceId: string | null;
        processedAt: Date | null;
    }>;
    getAnalytics(affiliateId: string, params: GetAnalyticsParams): Promise<{
        totalClicks: number;
        totalConversions: number;
        totalEarnings: number;
        conversionRate: number;
        topOffers: {
            name: string;
            conversions: number;
            earnings: number;
        }[];
    }>;
    getClicksAnalytics(affiliateId: string, params: GetClicksAnalyticsParams): Promise<{
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
    getConversionsAnalytics(affiliateId: string, params: GetClicksAnalyticsParams): Promise<{
        totalConversions: number;
        conversionsByDay: {
            date: string;
            conversions: number;
        }[];
        conversionsByOffer: {
            offer: string;
            conversions: number;
        }[];
    }>;
}
//# sourceMappingURL=AffiliateService.d.ts.map