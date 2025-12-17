export declare class EmailService {
    private transporter;
    sendWelcomeEmail(email: string, firstName: string): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    sendCommissionNotification(email: string, amount: number): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
    sendPayoutNotification(email: string, amount: number, method: string): Promise<import("nodemailer/lib/smtp-transport").SentMessageInfo>;
}
export declare class PaymentService {
    createPayout(affiliateId: string, amount: number, method: string): Promise<{
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
    processWebhook(payload: any, signature: string): Promise<{
        success: boolean;
    }>;
}
export declare class AnalyticsService {
    getFunnelAnalysis(offerId?: string, dateRange?: {
        start: Date;
        end: Date;
    }): Promise<{
        totalClicks: number;
        totalConversions: number;
        conversionRate: number;
    }>;
    getCohortAnalysis(startDate: Date, endDate: Date): Promise<any[]>;
    getAttributionData(conversionId: string): Promise<{
        conversion: {
            click: {
                link: {
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
                        tags: string[];
                        accountId: string;
                        startDate: Date;
                        endDate: Date | null;
                        totalRevenue: number;
                        totalCommissions: number;
                    };
                } & {
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
                };
            } & {
                id: string;
                createdAt: Date;
                userId: string | null;
                ipAddress: string;
                userAgent: string;
                linkId: string;
                affiliateId: string;
                referrer: string | null;
                country: string | null;
                city: string | null;
                device: string | null;
                browser: string | null;
                os: string | null;
                source: string | null;
                converted: boolean;
                conversionId: string | null;
                timestamp: Date;
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
        attributionClicks: ({
            link: {
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
                    tags: string[];
                    accountId: string;
                    startDate: Date;
                    endDate: Date | null;
                    totalRevenue: number;
                    totalCommissions: number;
                };
            } & {
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
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            ipAddress: string;
            userAgent: string;
            linkId: string;
            affiliateId: string;
            referrer: string | null;
            country: string | null;
            city: string | null;
            device: string | null;
            browser: string | null;
            os: string | null;
            source: string | null;
            converted: boolean;
            conversionId: string | null;
            timestamp: Date;
        })[];
        firstClick: {
            link: {
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
                    tags: string[];
                    accountId: string;
                    startDate: Date;
                    endDate: Date | null;
                    totalRevenue: number;
                    totalCommissions: number;
                };
            } & {
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
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            ipAddress: string;
            userAgent: string;
            linkId: string;
            affiliateId: string;
            referrer: string | null;
            country: string | null;
            city: string | null;
            device: string | null;
            browser: string | null;
            os: string | null;
            source: string | null;
            converted: boolean;
            conversionId: string | null;
            timestamp: Date;
        };
        lastClick: {
            link: {
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
                    tags: string[];
                    accountId: string;
                    startDate: Date;
                    endDate: Date | null;
                    totalRevenue: number;
                    totalCommissions: number;
                };
            } & {
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
            };
        } & {
            id: string;
            createdAt: Date;
            userId: string | null;
            ipAddress: string;
            userAgent: string;
            linkId: string;
            affiliateId: string;
            referrer: string | null;
            country: string | null;
            city: string | null;
            device: string | null;
            browser: string | null;
            os: string | null;
            source: string | null;
            converted: boolean;
            conversionId: string | null;
            timestamp: Date;
        };
    }>;
}
export declare class SecurityService {
    generate2FASecret(userId: string): Promise<string>;
    verify2FAToken(userId: string, token: string): Promise<boolean>;
    private generateTOTP;
    logSecurityEvent(userId: string, event: string, details: string, ipAddress?: string, userAgent?: string): Promise<{
        id: string;
        status: string | null;
        createdAt: Date;
        userId: string;
        action: string;
        resource: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        ipAddress: string | null;
        userAgent: string | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        adminComment: string | null;
    }>;
}
export declare class AutomationService {
    triggerWorkflow(workflowId: string, triggerData: any): Promise<{
        success: boolean;
        workflowId: string;
    }>;
    createAutomationRule(ruleData: any): Promise<{
        name: string;
        id: string;
        status: import(".prisma/client").$Enums.RuleStatus;
        createdAt: Date;
        updatedAt: Date;
        type: import(".prisma/client").$Enums.RuleType;
        action: import(".prisma/client").$Enums.RuleAction;
        description: string;
        lastTriggered: Date | null;
        conditions: import("@prisma/client/runtime/library").JsonValue;
        hits: number;
    }>;
}
export declare class IntegrationService {
    syncShopifyProducts(shopDomain: string, apiKey: string): Promise<{
        success: boolean;
        productsSynced: number;
    }>;
    syncMailchimpList(listId: string, apiKey: string): Promise<{
        success: boolean;
        subscribersSynced: number;
    }>;
    createWebhook(url: string, events: string[], secret: string): Promise<{
        name: string;
        url: string;
        id: string;
        status: import(".prisma/client").$Enums.WebhookStatus;
        createdAt: Date;
        updatedAt: Date;
        events: string[];
        secret: string;
        lastTriggered: Date | null;
        successRate: number;
        totalCalls: number;
    }>;
    triggerWebhook(webhookId: string, event: string, data: any): Promise<{
        success: boolean;
        status: number;
    }>;
}
export declare const emailService: EmailService;
export declare const paymentService: PaymentService;
export declare const analyticsService: AnalyticsService;
export declare const securityService: SecurityService;
export declare const automationService: AutomationService;
export declare const integrationService: IntegrationService;
//# sourceMappingURL=index.d.ts.map