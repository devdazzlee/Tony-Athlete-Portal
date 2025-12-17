export declare class OffersService {
    static createOffer(accountId: string, offerData: any): Promise<import("../models/Offers").Offer>;
    static getOffer(id: string): Promise<import("../models/Offers").Offer>;
    static updateOffer(id: string, updateData: any): Promise<import("../models/Offers").Offer>;
    static deleteOffer(id: string): Promise<void>;
    static listOffers(accountId: string, filters?: any): Promise<import("../models/Offers").Offer[]>;
    static addLandingPage(offerId: string, landingPageData: any): Promise<import("../models/Offers").Offer>;
    static updateLandingPage(offerId: string, landingPageId: string, updateData: any): Promise<import("../models/Offers").Offer>;
    static removeLandingPage(offerId: string, landingPageId: string): Promise<import("../models/Offers").Offer>;
    static addCreative(offerId: string, creativeData: any): Promise<import("../models/Offers").Offer>;
    static updateCreative(offerId: string, creativeId: string, updateData: any): Promise<import("../models/Offers").Offer>;
    static removeCreative(offerId: string, creativeId: string): Promise<import("../models/Offers").Offer>;
    static addIntegration(offerId: string, integrationData: any): Promise<import("../models/Offers").Offer>;
    static updateIntegration(offerId: string, integrationId: string, updateData: any): Promise<import("../models/Offers").Offer>;
    static removeIntegration(offerId: string, integrationId: string): Promise<import("../models/Offers").Offer>;
    static generateTrackingCode(offerId: string, type: 'PIXEL' | 'JAVASCRIPT' | 'POSTBACK' | 'SERVER_TO_SERVER'): Promise<string>;
    static createApplication(offerId: string, affiliateId: string, applicationData: any, documents?: any[]): Promise<import("../models/Offers").OfferApplication>;
    static getApplication(id: string): Promise<import("../models/Offers").OfferApplication>;
    static updateApplicationStatus(id: string, status: string, reviewedBy: string, rejectionReason?: string, notes?: string): Promise<import("../models/Offers").OfferApplication>;
    static getApplications(offerId: string, filters?: any): Promise<import("../models/Offers").OfferApplication[]>;
    static updateStats(offerId: string): Promise<void>;
    static getOfferStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static getOffersDashboard(accountId: string): Promise<any>;
    static createDefaultOffers(accountId: string): Promise<import("../models/Offers").Offer[]>;
    static validateOfferAccess(offerId: string, userId: string, userRole: string): Promise<import("../models/Offers").Offer>;
    static calculatePayout(offerId: string, conversionData: any): Promise<number>;
    static validateConversion(offerId: string, conversionData: any): Promise<boolean>;
    private static getFieldValue;
    static processSmartLink(offerId: string, requestData: any): Promise<{
        redirect: boolean;
        url: any;
        reason?: undefined;
    } | {
        redirect: boolean;
        reason: string;
        url?: undefined;
    }>;
    private static evaluateSmartLinkConditions;
    private static executeSmartLinkActions;
    static getOfferPerformance(offerId: string, startDate?: Date, endDate?: Date): Promise<{
        roi: number;
        averageOrderValue: number;
        costPerClick: number;
        costPerConversion: number;
        affiliateUtilization: number;
        totalClicks: number;
        uniqueClicks: number;
        totalConversions: number;
        uniqueConversions: number;
        conversionRate: number;
        totalRevenue: number;
        totalPayout: number;
        totalAffiliates: number;
        activeAffiliates: number;
        pendingAffiliates: number;
        rejectedAffiliates: number;
        lastClick?: Date;
        lastConversion?: Date;
        byAffiliate: Record<string, any>;
        byCountry: Record<string, any>;
        byDevice: Record<string, any>;
        bySource: Record<string, any>;
        byHour: Record<number, any>;
        byDay: Record<string, any>;
    }>;
    static getOfferRecommendations(offerId: string): Promise<string[]>;
}
//# sourceMappingURL=OffersService.d.ts.map