import { PrismaClient, SystemSettings } from "@prisma/client";

const prisma = new PrismaClient();

// Use Prisma-generated types instead of custom interfaces
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

export class SystemSettingsModel {
  static async create(
    accountId: string,
    data: SystemSettingsInput
  ): Promise<SystemSettings> {
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
          maxFileUploadSize: 10485760, // 10MB
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
            dataRetentionPeriod: 2555, // 7 years in days
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

  static async findByAccountId(
    accountId: string
  ): Promise<SystemSettings | null> {
    return (await prisma.systemSettings.findFirst({
      where: { accountId },
    })) as SystemSettings | null;
  }

  static async update(
    accountId: string,
    data: Partial<SystemSettings>
  ): Promise<SystemSettings> {
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

  static async updateGeneral(
    accountId: string,
    general: any
  ): Promise<SystemSettings> {
    const existing = await this.findByAccountId(accountId);

    if (!existing) {
      return await this.create(accountId, { general });
    }

    const updatedGeneral = { ...(existing.general as any), ...general };

    return await prisma.systemSettings.update({
      where: { id: existing.id },
      data: {
        general: updatedGeneral,
        updatedAt: new Date(),
      },
    });
  }

  static async updateSecurity(
    accountId: string,
    security: any
  ): Promise<SystemSettings> {
    const existing = await this.findByAccountId(accountId);

    if (!existing) {
      return await this.create(accountId, { security });
    }

    const updatedSecurity = { ...(existing.security as any), ...security };

    return await prisma.systemSettings.update({
      where: { id: existing.id },
      data: {
        security: updatedSecurity,
        updatedAt: new Date(),
      },
    });
  }

  static async updateCurrencies(
    accountId: string,
    currencies: any
  ): Promise<SystemSettings> {
    const existing = await this.findByAccountId(accountId);

    if (!existing) {
      return await this.create(accountId, { currencies });
    }

    const updatedCurrencies = {
      ...(existing.currencies as any),
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

  static async updateNotifications(
    accountId: string,
    notifications: any
  ): Promise<SystemSettings> {
    const existing = await this.findByAccountId(accountId);

    if (!existing) {
      return await this.create(accountId, { notifications });
    }

    const updatedNotifications = {
      ...(existing.notifications as any),
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

  static async updateIntegrations(
    accountId: string,
    integrations: any
  ): Promise<SystemSettings> {
    const existing = await this.findByAccountId(accountId);

    if (!existing) {
      return await this.create(accountId, { integrations });
    }

    const updatedIntegrations = {
      ...(existing.integrations as any),
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

  static async updatePerformance(
    accountId: string,
    performance: any
  ): Promise<SystemSettings> {
    const existing = await this.findByAccountId(accountId);

    if (!existing) {
      return await this.create(accountId, { performance });
    }

    const updatedPerformance = {
      ...(existing.performance as any),
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

  static async updateCompliance(
    accountId: string,
    compliance: any
  ): Promise<SystemSettings> {
    const existing = await this.findByAccountId(accountId);

    if (!existing) {
      return await this.create(accountId, { compliance });
    }

    const updatedCompliance = {
      ...(existing.compliance as any),
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

  static async getSupportedCurrencies(): Promise<string[]> {
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

  static async getExchangeRates(
    baseCurrency: string = "USD"
  ): Promise<Record<string, number>> {
    // This would typically call an external API
    // For now, return mock data
    const rates: Record<string, number> = {
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

  static async validateSettings(
    settings: Partial<SystemSettings>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate general settings
    if (settings.general) {
      if (
        !(settings.general as any).siteName ||
        (settings.general as any).siteName.length < 2
      ) {
        errors.push("Site name must be at least 2 characters long");
      }
      if (
        !(settings.general as any).adminEmail ||
        !this.isValidEmail((settings.general as any).adminEmail)
      ) {
        errors.push("Admin email must be a valid email address");
      }
      if (
        (settings.general as any).maxFileUploadSize &&
        (settings.general as any).maxFileUploadSize > 104857600
      ) {
        errors.push("Max file upload size cannot exceed 100MB");
      }
    }

    // Validate security settings
    if (settings.security) {
      if (
        (settings.security as any).passwordMinLength &&
        (settings.security as any).passwordMinLength < 6
      ) {
        errors.push("Password minimum length must be at least 6 characters");
      }
      if (
        (settings.security as any).maxLoginAttempts &&
        (settings.security as any).maxLoginAttempts < 1
      ) {
        errors.push("Max login attempts must be at least 1");
      }
      if (
        (settings.security as any).sessionTimeout &&
        (settings.security as any).sessionTimeout < 5
      ) {
        errors.push("Session timeout must be at least 5 minutes");
      }
    }

    // Validate notification settings
    if ((settings.notifications as any)?.email) {
      if ((settings.notifications as any).email.enabled) {
        if (!(settings.notifications as any).email.smtpHost) {
          errors.push(
            "SMTP host is required when email notifications are enabled"
          );
        }
        if (
          !(settings.notifications as any).email.smtpPort ||
          (settings.notifications as any).email.smtpPort < 1 ||
          (settings.notifications as any).email.smtpPort > 65535
        ) {
          errors.push("SMTP port must be between 1 and 65535");
        }
        if (
          !(settings.notifications as any).email.fromEmail ||
          !this.isValidEmail((settings.notifications as any).email.fromEmail)
        ) {
          errors.push("From email must be a valid email address");
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static async exportSettings(accountId: string): Promise<any> {
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

  static async importSettings(
    accountId: string,
    settingsData: any
  ): Promise<SystemSettings> {
    const validation = await this.validateSettings(settingsData.settings);

    if (!validation.valid) {
      throw new Error(`Invalid settings: ${validation.errors.join(", ")}`);
    }

    return await this.update(accountId, settingsData.settings);
  }

  static async resetToDefaults(accountId: string): Promise<SystemSettings> {
    return await this.create(accountId, {});
  }

  static async getSystemHealth(accountId: string): Promise<any> {
    const settings = await this.findByAccountId(accountId);
    if (!settings) {
      return null;
    }

    const health = {
      general: {
        maintenanceMode: (settings.general as any).maintenanceMode,
        allowRegistration: (settings.general as any).allowRegistration,
        requireEmailVerification: (settings.general as any)
          .requireEmailVerification,
      },
      security: {
        require2FA: (settings.security as any).require2FA,
        enableAuditLog: (settings.security as any).enableAuditLog,
        enableRateLimiting: (settings.security as any).enableRateLimiting,
      },
      notifications: {
        emailEnabled: (settings.notifications as any).email.enabled,
        smsEnabled: (settings.notifications as any).sms.enabled,
        pushEnabled: (settings.notifications as any).push.enabled,
      },
      integrations: {
        stripeEnabled: (settings.integrations as any).payment.stripe.enabled,
        paypalEnabled: (settings.integrations as any).payment.paypal.enabled,
        googleAnalyticsEnabled: (settings.integrations as any).analytics
          .googleAnalytics.enabled,
      },
      performance: {
        cachingEnabled: (settings.performance as any).caching.enabled,
        cdnEnabled: (settings.performance as any).cdn.enabled,
        monitoringEnabled: (settings.performance as any).monitoring.enabled,
      },
      compliance: {
        gdprEnabled: (settings.compliance as any).gdpr.enabled,
        ccpaEnabled: (settings.compliance as any).ccpa.enabled,
        pciEnabled: (settings.compliance as any).pci.enabled,
      },
    };

    return health;
  }
}
