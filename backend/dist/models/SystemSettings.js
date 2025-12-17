"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSettingsModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SystemSettingsModel {
    static async create(accountId, data) {
        return await prisma.systemSettings.create({
            data: {
                accountId,
                general: data.general || {
                    siteName: "Trackdesk",
                    siteDescription: "Affiliate Marketing Platform",
                    siteUrl: "https://trackdesk.com",
                    adminEmail: "admin@trackdesk.com",
                    supportEmail: "support@trackdesk.com",
                    timezone: "UTC",
                    dateFormat: "MM/DD/YYYY",
                    timeFormat: "12h",
                    language: "en",
                    defaultCurrency: "USD",
                    maintenanceMode: false,
                    maintenanceMessage: "Site is under maintenance",
                    allowRegistration: true,
                    requireEmailVerification: true,
                    requireApproval: true,
                    maxFileUploadSize: 10485760,
                    allowedFileTypes: ["jpg", "jpeg", "png", "gif", "pdf", "doc", "docx"],
                },
                currencies: data.currencies || {
                    defaultCurrency: "USD",
                    supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
                    exchangeRateProvider: "fixer",
                    autoUpdateRates: true,
                    rateUpdateInterval: 24,
                    customRates: {},
                },
                security: data.security || {
                    passwordMinLength: 8,
                    passwordRequireUppercase: true,
                    passwordRequireLowercase: true,
                    passwordRequireNumbers: true,
                    passwordRequireSymbols: false,
                    passwordExpiryDays: 90,
                    maxLoginAttempts: 5,
                    lockoutDuration: 15,
                    sessionTimeout: 30,
                    require2FA: false,
                    allowedIPs: [],
                    blockedIPs: [],
                    enableAuditLog: true,
                    enableRateLimiting: true,
                    rateLimitRequests: 100,
                    rateLimitWindow: 15,
                },
                notifications: data.notifications || {
                    email: {
                        enabled: true,
                        smtpHost: "smtp.gmail.com",
                        smtpPort: 587,
                        smtpUser: "",
                        smtpPassword: "",
                        smtpSecure: false,
                        fromEmail: "noreply@trackdesk.com",
                        fromName: "Trackdesk",
                    },
                    sms: {
                        enabled: false,
                        provider: "twilio",
                        apiKey: "",
                        apiSecret: "",
                        fromNumber: "",
                    },
                    push: {
                        enabled: false,
                        firebaseConfig: {},
                    },
                    webhooks: {
                        enabled: true,
                        maxRetries: 3,
                        retryDelay: 5,
                        timeout: 30,
                    },
                },
                integrations: data.integrations || {
                    payment: {
                        stripe: {
                            enabled: false,
                            publicKey: "",
                            secretKey: "",
                            webhookSecret: "",
                        },
                        paypal: {
                            enabled: false,
                            clientId: "",
                            clientSecret: "",
                            sandbox: true,
                        },
                        wise: {
                            enabled: false,
                            apiKey: "",
                            profileId: "",
                        },
                    },
                    analytics: {
                        googleAnalytics: {
                            enabled: false,
                            trackingId: "",
                        },
                        mixpanel: {
                            enabled: false,
                            token: "",
                        },
                    },
                    crm: {
                        salesforce: {
                            enabled: false,
                            clientId: "",
                            clientSecret: "",
                            username: "",
                            password: "",
                            securityToken: "",
                        },
                        hubspot: {
                            enabled: false,
                            apiKey: "",
                        },
                    },
                },
                performance: data.performance || {
                    caching: {
                        enabled: true,
                        ttl: 3600,
                        maxSize: 100,
                    },
                    cdn: {
                        enabled: false,
                        provider: "cloudflare",
                        domain: "",
                        apiKey: "",
                    },
                    database: {
                        connectionPool: 10,
                        queryTimeout: 30,
                        slowQueryThreshold: 1000,
                    },
                    monitoring: {
                        enabled: true,
                        uptimeMonitoring: true,
                        performanceMonitoring: true,
                        errorTracking: true,
                    },
                },
                compliance: data.compliance || {
                    gdpr: {
                        enabled: true,
                        dataRetentionPeriod: 2555,
                        consentRequired: true,
                        rightToErasure: true,
                        dataPortability: true,
                    },
                    ccpa: {
                        enabled: false,
                        dataRetentionPeriod: 2555,
                        rightToDelete: true,
                        rightToOptOut: true,
                    },
                    sox: {
                        enabled: false,
                        auditTrail: true,
                        dataIntegrity: true,
                    },
                    pci: {
                        enabled: false,
                        level: 1,
                        complianceRequired: false,
                    },
                },
            },
        });
    }
    static async findByAccountId(accountId) {
        return (await prisma.systemSettings.findFirst({
            where: { accountId },
        }));
    }
    static async update(accountId, data) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, data);
        }
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    static async updateGeneral(accountId, general) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, { general });
        }
        const updatedGeneral = { ...existing.general, ...general };
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                general: updatedGeneral,
                updatedAt: new Date(),
            },
        });
    }
    static async updateSecurity(accountId, security) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, { security });
        }
        const updatedSecurity = { ...existing.security, ...security };
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                security: updatedSecurity,
                updatedAt: new Date(),
            },
        });
    }
    static async updateCurrencies(accountId, currencies) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, { currencies });
        }
        const updatedCurrencies = {
            ...existing.currencies,
            ...currencies,
        };
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                currencies: updatedCurrencies,
                updatedAt: new Date(),
            },
        });
    }
    static async updateNotifications(accountId, notifications) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, { notifications });
        }
        const updatedNotifications = {
            ...existing.notifications,
            ...notifications,
        };
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                notifications: updatedNotifications,
                updatedAt: new Date(),
            },
        });
    }
    static async updateIntegrations(accountId, integrations) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, { integrations });
        }
        const updatedIntegrations = {
            ...existing.integrations,
            ...integrations,
        };
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                integrations: updatedIntegrations,
                updatedAt: new Date(),
            },
        });
    }
    static async updatePerformance(accountId, performance) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, { performance });
        }
        const updatedPerformance = {
            ...existing.performance,
            ...performance,
        };
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                performance: updatedPerformance,
                updatedAt: new Date(),
            },
        });
    }
    static async updateCompliance(accountId, compliance) {
        const existing = await this.findByAccountId(accountId);
        if (!existing) {
            return await this.create(accountId, { compliance });
        }
        const updatedCompliance = {
            ...existing.compliance,
            ...compliance,
        };
        return await prisma.systemSettings.update({
            where: { id: existing.id },
            data: {
                compliance: updatedCompliance,
                updatedAt: new Date(),
            },
        });
    }
    static async getSupportedCurrencies() {
        return [
            "USD",
            "EUR",
            "GBP",
            "JPY",
            "CAD",
            "AUD",
            "CHF",
            "CNY",
            "SEK",
            "NZD",
            "MXN",
            "SGD",
            "HKD",
            "NOK",
            "TRY",
            "RUB",
            "INR",
            "BRL",
            "ZAR",
            "KRW",
        ];
    }
    static async getExchangeRates(baseCurrency = "USD") {
        const rates = {
            USD: 1.0,
            EUR: 0.85,
            GBP: 0.73,
            JPY: 110.0,
            CAD: 1.25,
            AUD: 1.35,
            CHF: 0.92,
            CNY: 6.45,
            SEK: 8.5,
            NZD: 1.42,
        };
        return rates;
    }
    static async validateSettings(settings) {
        const errors = [];
        if (settings.general) {
            if (!settings.general.siteName ||
                settings.general.siteName.length < 2) {
                errors.push("Site name must be at least 2 characters long");
            }
            if (!settings.general.adminEmail ||
                !this.isValidEmail(settings.general.adminEmail)) {
                errors.push("Admin email must be a valid email address");
            }
            if (settings.general.maxFileUploadSize &&
                settings.general.maxFileUploadSize > 104857600) {
                errors.push("Max file upload size cannot exceed 100MB");
            }
        }
        if (settings.security) {
            if (settings.security.passwordMinLength &&
                settings.security.passwordMinLength < 6) {
                errors.push("Password minimum length must be at least 6 characters");
            }
            if (settings.security.maxLoginAttempts &&
                settings.security.maxLoginAttempts < 1) {
                errors.push("Max login attempts must be at least 1");
            }
            if (settings.security.sessionTimeout &&
                settings.security.sessionTimeout < 5) {
                errors.push("Session timeout must be at least 5 minutes");
            }
        }
        if (settings.notifications?.email) {
            if (settings.notifications.email.enabled) {
                if (!settings.notifications.email.smtpHost) {
                    errors.push("SMTP host is required when email notifications are enabled");
                }
                if (!settings.notifications.email.smtpPort ||
                    settings.notifications.email.smtpPort < 1 ||
                    settings.notifications.email.smtpPort > 65535) {
                    errors.push("SMTP port must be between 1 and 65535");
                }
                if (!settings.notifications.email.fromEmail ||
                    !this.isValidEmail(settings.notifications.email.fromEmail)) {
                    errors.push("From email must be a valid email address");
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    static async exportSettings(accountId) {
        const settings = await this.findByAccountId(accountId);
        if (!settings) {
            return null;
        }
        return {
            settings,
            exportedAt: new Date().toISOString(),
            version: "1.0",
        };
    }
    static async importSettings(accountId, settingsData) {
        const validation = await this.validateSettings(settingsData.settings);
        if (!validation.valid) {
            throw new Error(`Invalid settings: ${validation.errors.join(", ")}`);
        }
        return await this.update(accountId, settingsData.settings);
    }
    static async resetToDefaults(accountId) {
        return await this.create(accountId, {});
    }
    static async getSystemHealth(accountId) {
        const settings = await this.findByAccountId(accountId);
        if (!settings) {
            return null;
        }
        const health = {
            general: {
                maintenanceMode: settings.general.maintenanceMode,
                allowRegistration: settings.general.allowRegistration,
                requireEmailVerification: settings.general
                    .requireEmailVerification,
            },
            security: {
                require2FA: settings.security.require2FA,
                enableAuditLog: settings.security.enableAuditLog,
                enableRateLimiting: settings.security.enableRateLimiting,
            },
            notifications: {
                emailEnabled: settings.notifications.email.enabled,
                smsEnabled: settings.notifications.sms.enabled,
                pushEnabled: settings.notifications.push.enabled,
            },
            integrations: {
                stripeEnabled: settings.integrations.payment.stripe.enabled,
                paypalEnabled: settings.integrations.payment.paypal.enabled,
                googleAnalyticsEnabled: settings.integrations.analytics
                    .googleAnalytics.enabled,
            },
            performance: {
                cachingEnabled: settings.performance.caching.enabled,
                cdnEnabled: settings.performance.cdn.enabled,
                monitoringEnabled: settings.performance.monitoring.enabled,
            },
            compliance: {
                gdprEnabled: settings.compliance.gdpr.enabled,
                ccpaEnabled: settings.compliance.ccpa.enabled,
                pciEnabled: settings.compliance.pci.enabled,
            },
        };
        return health;
    }
}
exports.SystemSettingsModel = SystemSettingsModel;
//# sourceMappingURL=SystemSettings.js.map