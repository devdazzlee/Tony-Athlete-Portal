"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AccountModel = void 0;
class AccountModel {
    static async create(data) {
        return {
            id: 'mock-account-id',
            name: data.name,
            domain: data.domain,
            subdomain: data.subdomain,
            status: data.status || 'PENDING',
            plan: data.plan || 'STARTER',
            settings: data.settings || {
                timezone: 'UTC',
                currency: 'USD',
                language: 'en',
                dateFormat: 'MM/DD/YYYY',
                numberFormat: 'US',
                allowAffiliateRegistration: true,
                requireApproval: false,
                minimumPayout: 50,
                payoutSchedule: 'WEEKLY',
                fraudDetection: true,
                qualityControl: true,
                mlmEnabled: false,
                maxTiers: 3
            },
            branding: data.branding || {
                logo: '',
                favicon: '',
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                customCss: '',
                customJs: '',
                footerText: '',
                removeBranding: false,
                customDomain: ''
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findById(id) {
        return null;
    }
    static async findBySubdomain(subdomain) {
        return null;
    }
    static async update(id, data) {
        return {
            id,
            name: 'Mock Account',
            domain: 'mock.com',
            subdomain: 'mock',
            status: 'ACTIVE',
            plan: 'STARTER',
            settings: {
                timezone: 'UTC',
                currency: 'USD',
                language: 'en',
                dateFormat: 'MM/DD/YYYY',
                numberFormat: 'US',
                allowAffiliateRegistration: true,
                requireApproval: false,
                minimumPayout: 50,
                payoutSchedule: 'WEEKLY',
                fraudDetection: true,
                qualityControl: true,
                mlmEnabled: false,
                maxTiers: 3
            },
            branding: {
                logo: '',
                favicon: '',
                primaryColor: '#007bff',
                secondaryColor: '#6c757d',
                customCss: '',
                customJs: '',
                footerText: '',
                removeBranding: false,
                customDomain: ''
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async delete(id) {
    }
    static async list(page = 1, limit = 10) {
        return [];
    }
}
exports.AccountModel = AccountModel;
//# sourceMappingURL=Account.js.map