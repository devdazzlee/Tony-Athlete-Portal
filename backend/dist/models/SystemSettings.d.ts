import { SystemSettings } from "@prisma/client";
export interface SystemSettingsInput {
    general?: any;
    security?: any;
    currencies?: any;
    notifications?: any;
    integrations?: any;
    performance?: any;
    compliance?: any;
}
export interface GeneralSettings {
    siteName: string;
    siteDescription: string;
    siteUrl: string;
    adminEmail: string;
    supportEmail: string;
    timezone: string;
    dateFormat: string;
    timeFormat: string;
    language: string;
    defaultCurrency: string;
    maintenanceMode: boolean;
    maintenanceMessage: string;
    allowRegistration: boolean;
    requireEmailVerification: boolean;
    requireApproval: boolean;
    maxFileUploadSize: number;
    allowedFileTypes: string[];
}
export interface CurrencySettings {
    defaultCurrency: string;
    supportedCurrencies: string[];
    exchangeRateProvider: string;
    exchangeRateApiKey?: string;
    autoUpdateRates: boolean;
    rateUpdateInterval: number;
    customRates: Record<string, number>;
}
export interface SecuritySettings {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireLowercase: boolean;
    passwordRequireNumbers: boolean;
    passwordRequireSymbols: boolean;
    passwordExpiryDays: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    sessionTimeout: number;
    require2FA: boolean;
    allowedIPs: string[];
    blockedIPs: string[];
    enableAuditLog: boolean;
    enableRateLimiting: boolean;
    rateLimitRequests: number;
    rateLimitWindow: number;
}
export interface NotificationSettings {
    email: {
        enabled: boolean;
        smtpHost: string;
        smtpPort: number;
        smtpUser: string;
        smtpPassword: string;
        smtpSecure: boolean;
        fromEmail: string;
        fromName: string;
    };
    sms: {
        enabled: boolean;
        provider: string;
        apiKey: string;
        apiSecret: string;
        fromNumber: string;
    };
    push: {
        enabled: boolean;
        firebaseConfig: any;
    };
    webhooks: {
        enabled: boolean;
        maxRetries: number;
        retryDelay: number;
        timeout: number;
    };
}
export interface IntegrationSettings {
    payment: {
        stripe: {
            enabled: boolean;
            publicKey: string;
            secretKey: string;
            webhookSecret: string;
        };
        paypal: {
            enabled: boolean;
            clientId: string;
            clientSecret: string;
            sandbox: boolean;
        };
        wise: {
            enabled: boolean;
            apiKey: string;
            profileId: string;
        };
    };
    analytics: {
        googleAnalytics: {
            enabled: boolean;
            trackingId: string;
        };
        mixpanel: {
            enabled: boolean;
            token: string;
        };
    };
    crm: {
        salesforce: {
            enabled: boolean;
            clientId: string;
            clientSecret: string;
            username: string;
            password: string;
            securityToken: string;
        };
        hubspot: {
            enabled: boolean;
            apiKey: string;
        };
    };
}
export interface PerformanceSettings {
    caching: {
        enabled: boolean;
        ttl: number;
        maxSize: number;
    };
    cdn: {
        enabled: boolean;
        provider: string;
        domain: string;
        apiKey: string;
    };
    database: {
        connectionPool: number;
        queryTimeout: number;
        slowQueryThreshold: number;
    };
    monitoring: {
        enabled: boolean;
        uptimeMonitoring: boolean;
        performanceMonitoring: boolean;
        errorTracking: boolean;
    };
}
export interface ComplianceSettings {
    gdpr: {
        enabled: boolean;
        dataRetentionPeriod: number;
        consentRequired: boolean;
        rightToErasure: boolean;
        dataPortability: boolean;
    };
    ccpa: {
        enabled: boolean;
        dataRetentionPeriod: number;
        rightToDelete: boolean;
        rightToOptOut: boolean;
    };
    sox: {
        enabled: boolean;
        auditTrail: boolean;
        dataIntegrity: boolean;
    };
    pci: {
        enabled: boolean;
        level: number;
        complianceRequired: boolean;
    };
}
export declare class SystemSettingsModel {
    static create(accountId: string, data: SystemSettingsInput): Promise<SystemSettings>;
    static findByAccountId(accountId: string): Promise<SystemSettings | null>;
    static update(accountId: string, data: Partial<SystemSettings>): Promise<SystemSettings>;
    static updateGeneral(accountId: string, general: any): Promise<SystemSettings>;
    static updateSecurity(accountId: string, security: any): Promise<SystemSettings>;
    static updateCurrencies(accountId: string, currencies: any): Promise<SystemSettings>;
    static updateNotifications(accountId: string, notifications: any): Promise<SystemSettings>;
    static updateIntegrations(accountId: string, integrations: any): Promise<SystemSettings>;
    static updatePerformance(accountId: string, performance: any): Promise<SystemSettings>;
    static updateCompliance(accountId: string, compliance: any): Promise<SystemSettings>;
    static getSupportedCurrencies(): Promise<string[]>;
    static getExchangeRates(baseCurrency?: string): Promise<Record<string, number>>;
    static validateSettings(settings: Partial<SystemSettings>): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    private static isValidEmail;
    static exportSettings(accountId: string): Promise<any>;
    static importSettings(accountId: string, settingsData: any): Promise<SystemSettings>;
    static resetToDefaults(accountId: string): Promise<SystemSettings>;
    static getSystemHealth(accountId: string): Promise<any>;
}
//# sourceMappingURL=SystemSettings.d.ts.map