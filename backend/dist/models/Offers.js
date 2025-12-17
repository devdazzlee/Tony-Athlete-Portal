"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OffersModel = void 0;
class OffersModel {
    static async create(data) {
        return {
            id: 'mock-offer-id',
            accountId: data.accountId,
            name: data.name,
            description: data.description || '',
            category: data.category || 'General',
            type: data.type || 'CPA',
            status: data.status || 'DRAFT',
            priority: data.priority || 0,
            general: data.general || {
                name: data.name,
                description: data.description || '',
                category: data.category || 'General',
                tags: [],
                targetAudience: '',
                restrictions: [],
                compliance: [],
                notes: '',
                isPublic: true,
                requiresApproval: false,
                autoApprove: false
            },
            revenue: data.revenue || {
                type: data.type || 'CPA',
                basePayout: 0,
                currency: 'USD',
                payoutType: 'FIXED',
                payoutSchedule: 'MONTHLY',
                minimumPayout: 0,
                capType: 'NONE',
                holdPeriod: 30,
                chargebackPeriod: 90,
                refundPolicy: ''
            },
            landingPages: data.landingPages || [],
            creatives: data.creatives || [],
            tracking: data.tracking || {
                clickTracking: true,
                conversionTracking: true,
                postbackTracking: false,
                pixelTracking: false,
                serverToServer: false,
                javascriptTracking: false,
                cookieTracking: true,
                sessionTracking: true,
                crossDomainTracking: false,
                trackingParameters: [],
                customEvents: [],
                attributionWindow: 24,
                conversionWindow: 168,
                duplicateWindow: 30,
                allowDuplicates: false,
                requireValidation: false,
                validationRules: []
            },
            integrations: data.integrations || [],
            settings: data.settings || {
                allowMultipleConversions: false,
                requireApproval: false,
                autoApprove: false,
                allowSubAffiliates: false,
                allowCoupons: false,
                allowDeepLinks: false,
                allowDirectLinking: false,
                requireLandingPage: true,
                allowMobileTraffic: true,
                allowDesktopTraffic: true,
                allowTabletTraffic: true,
                geoRestrictions: [],
                deviceRestrictions: [],
                browserRestrictions: [],
                timeRestrictions: [],
                trafficQuality: {
                    minBounceRate: 0,
                    maxBounceRate: 1,
                    minSessionDuration: 0,
                    minPagesPerSession: 1,
                    requireEngagement: false,
                    qualityScore: 0
                },
                fraudPrevention: {
                    enableFraudDetection: false,
                    fraudThreshold: 0.7,
                    blockSuspiciousTraffic: false,
                    requireVerification: false,
                    enableAnura: false,
                    customRules: []
                },
                compliance: {
                    gdprCompliant: false,
                    ccpaCompliant: false,
                    coppaCompliant: false,
                    requireConsent: false,
                    consentText: '',
                    privacyPolicy: '',
                    termsOfService: '',
                    disclaimer: ''
                }
            },
            application: data.application || {
                isOpen: true,
                requiresApproval: false,
                autoApprove: false,
                applicationForm: {
                    fields: [],
                    isCustomizable: false,
                    requireDocuments: false,
                    documentTypes: []
                },
                requirements: [],
                approvalProcess: {
                    steps: [],
                    autoApproval: false,
                    manualReview: true,
                    notificationSettings: {
                        emailNotifications: true,
                        smsNotifications: false,
                        inAppNotifications: true,
                        webhookNotifications: false,
                        notificationTemplates: {}
                    }
                },
                rejectionReasons: [],
                welcomeMessage: '',
                approvalMessage: '',
                rejectionMessage: ''
            },
            smartLink: data.smartLink || {
                enabled: false,
                baseUrl: '',
                trackingParameters: [],
                redirectRules: [],
                sslEnabled: true,
                analyticsEnabled: true,
                aTestingEnabled: false,
                geoRedirects: [],
                deviceRedirects: [],
                timeBasedRedirects: []
            },
            stats: {
                totalClicks: 0,
                uniqueClicks: 0,
                totalConversions: 0,
                uniqueConversions: 0,
                conversionRate: 0,
                totalRevenue: 0,
                totalPayout: 0,
                totalAffiliates: 0,
                activeAffiliates: 0,
                pendingAffiliates: 0,
                rejectedAffiliates: 0,
                byAffiliate: {},
                byCountry: {},
                byDevice: {},
                bySource: {},
                byHour: {},
                byDay: {}
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findById(id) {
        return null;
    }
    static async update(id, data) {
        return {
            id,
            accountId: 'mock-account',
            name: 'Mock Offer',
            description: '',
            category: 'General',
            type: 'CPA',
            status: 'DRAFT',
            priority: 0,
            general: {
                name: 'Mock Offer',
                description: '',
                category: 'General',
                tags: [],
                targetAudience: '',
                restrictions: [],
                compliance: [],
                notes: '',
                isPublic: true,
                requiresApproval: false,
                autoApprove: false
            },
            revenue: {
                type: 'CPA',
                basePayout: 0,
                currency: 'USD',
                payoutType: 'FIXED',
                payoutSchedule: 'MONTHLY',
                minimumPayout: 0,
                capType: 'NONE',
                holdPeriod: 30,
                chargebackPeriod: 90,
                refundPolicy: ''
            },
            landingPages: [],
            creatives: [],
            tracking: {
                clickTracking: true,
                conversionTracking: true,
                postbackTracking: false,
                pixelTracking: false,
                serverToServer: false,
                javascriptTracking: false,
                cookieTracking: true,
                sessionTracking: true,
                crossDomainTracking: false,
                trackingParameters: [],
                customEvents: [],
                attributionWindow: 24,
                conversionWindow: 168,
                duplicateWindow: 30,
                allowDuplicates: false,
                requireValidation: false,
                validationRules: []
            },
            integrations: [],
            settings: {
                allowMultipleConversions: false,
                requireApproval: false,
                autoApprove: false,
                allowSubAffiliates: false,
                allowCoupons: false,
                allowDeepLinks: false,
                allowDirectLinking: false,
                requireLandingPage: true,
                allowMobileTraffic: true,
                allowDesktopTraffic: true,
                allowTabletTraffic: true,
                geoRestrictions: [],
                deviceRestrictions: [],
                browserRestrictions: [],
                timeRestrictions: [],
                trafficQuality: {
                    minBounceRate: 0,
                    maxBounceRate: 1,
                    minSessionDuration: 0,
                    minPagesPerSession: 1,
                    requireEngagement: false,
                    qualityScore: 0
                },
                fraudPrevention: {
                    enableFraudDetection: false,
                    fraudThreshold: 0.7,
                    blockSuspiciousTraffic: false,
                    requireVerification: false,
                    enableAnura: false,
                    customRules: []
                },
                compliance: {
                    gdprCompliant: false,
                    ccpaCompliant: false,
                    coppaCompliant: false,
                    requireConsent: false,
                    consentText: '',
                    privacyPolicy: '',
                    termsOfService: '',
                    disclaimer: ''
                }
            },
            application: {
                isOpen: true,
                requiresApproval: false,
                autoApprove: false,
                applicationForm: {
                    fields: [],
                    isCustomizable: false,
                    requireDocuments: false,
                    documentTypes: []
                },
                requirements: [],
                approvalProcess: {
                    steps: [],
                    autoApproval: false,
                    manualReview: true,
                    notificationSettings: {
                        emailNotifications: true,
                        smsNotifications: false,
                        inAppNotifications: true,
                        webhookNotifications: false,
                        notificationTemplates: {}
                    }
                },
                rejectionReasons: [],
                welcomeMessage: '',
                approvalMessage: '',
                rejectionMessage: ''
            },
            smartLink: {
                enabled: false,
                baseUrl: '',
                trackingParameters: [],
                redirectRules: [],
                sslEnabled: true,
                analyticsEnabled: true,
                aTestingEnabled: false,
                geoRedirects: [],
                deviceRedirects: [],
                timeBasedRedirects: []
            },
            stats: {
                totalClicks: 0,
                uniqueClicks: 0,
                totalConversions: 0,
                uniqueConversions: 0,
                conversionRate: 0,
                totalRevenue: 0,
                totalPayout: 0,
                totalAffiliates: 0,
                activeAffiliates: 0,
                pendingAffiliates: 0,
                rejectedAffiliates: 0,
                byAffiliate: {},
                byCountry: {},
                byDevice: {},
                bySource: {},
                byHour: {},
                byDay: {}
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async delete(id) {
    }
    static async list(accountId, filters = {}) {
        return [];
    }
    static async addLandingPage(offerId, landingPage) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async updateLandingPage(offerId, landingPageId, data) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async removeLandingPage(offerId, landingPageId) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async addCreative(offerId, creative) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async updateCreative(offerId, creativeId, data) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async removeCreative(offerId, creativeId) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async addIntegration(offerId, integration) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async updateIntegration(offerId, integrationId, data) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async removeIntegration(offerId, integrationId) {
        return await this.findById(offerId) || this.create({ accountId: 'mock' });
    }
    static async generateTrackingCode(offerId, type) {
        return `<!-- Mock tracking code for ${offerId} -->`;
    }
    static async createApplication(offerId, affiliateId, applicationData, documents = []) {
        return {
            id: 'mock-app-id',
            offerId,
            affiliateId,
            status: 'PENDING',
            applicationData,
            documents,
            submittedAt: new Date()
        };
    }
    static async findApplicationById(id) {
        return null;
    }
    static async updateApplicationStatus(id, status, reviewedBy, rejectionReason, notes) {
        return {
            id,
            offerId: 'mock-offer',
            affiliateId: 'mock-affiliate',
            status: status,
            applicationData: {},
            documents: [],
            submittedAt: new Date(),
            reviewedAt: new Date(),
            reviewedBy,
            rejectionReason,
            notes
        };
    }
    static async getApplications(offerId, filters = {}) {
        return [];
    }
    static async updateStats(offerId) {
    }
    static async getOfferStats(accountId, startDate, endDate) {
        return {
            totalOffers: 0,
            activeOffers: 0,
            pausedOffers: 0,
            draftOffers: 0,
            totalClicks: 0,
            totalConversions: 0,
            totalRevenue: 0,
            totalPayout: 0,
            byType: {},
            byStatus: {},
            byCategory: {}
        };
    }
    static async createDefaultOffers(accountId) {
        return [];
    }
    static async getOffersDashboard(accountId) {
        return {
            offers: [],
            stats: {
                totalOffers: 0,
                activeOffers: 0,
                pausedOffers: 0,
                draftOffers: 0,
                totalClicks: 0,
                totalConversions: 0,
                totalRevenue: 0,
                totalPayout: 0,
                byType: {},
                byStatus: {},
                byCategory: {}
            }
        };
    }
}
exports.OffersModel = OffersModel;
//# sourceMappingURL=Offers.js.map