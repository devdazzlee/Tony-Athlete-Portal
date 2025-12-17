export declare class WebhooksService {
    static createWebhook(accountId: string, webhookData: any): Promise<{
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
    static getWebhook(id: string): Promise<{
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
    static updateWebhook(id: string, updateData: any): Promise<{
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
    static deleteWebhook(id: string): Promise<{
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
    static listWebhooks(accountId: string, filters?: any): Promise<{
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
    }[]>;
    static addEvent(webhookId: string, eventData: any): Promise<{
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
    static updateEvent(webhookId: string, eventId: string, updateData: any): Promise<{
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
    static removeEvent(webhookId: string, eventId: string): Promise<{
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
    static testWebhook(id: string, testData: any): Promise<{
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
    static triggerWebhook(id: string, eventData: any): Promise<{
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
    static getWebhookHistory(id: string, filters?: any): Promise<{
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
    }[]>;
    static getWebhookLogs(id: string, page?: number, limit?: number): Promise<{
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
    }[]>;
    static getWebhookStats(id: string, startDate?: Date, endDate?: Date): Promise<{
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
    static getWebhookTemplates(): Promise<any[]>;
    static createWebhookFromTemplate(accountId: string, templateId: string, customizations: any): Promise<{
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
    static generateSecret(id: string): Promise<{
        secret: string;
    }>;
    static validateSignature(id: string, signature: string, payload: string): Promise<boolean>;
    static retryWebhook(id: string, logId: string): Promise<{
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
    static getWebhooksDashboard(accountId: string): Promise<{
        stats: {};
    }>;
    static createDefaultWebhooks(accountId: string): Promise<any[]>;
    static receiveWebhook(webhookId: string, payload: any, headers: any): Promise<{
        received: boolean;
    }>;
    static exportWebhooks(accountId: string, format: string): Promise<any[]>;
    static importWebhooks(accountId: string, webhooks: any[], overwrite?: boolean): Promise<any[]>;
    static executeWebhook(webhookId: string, eventData: any): Promise<{
        success: boolean;
        status: number;
        statusText: string;
        responseTime: number;
        response: string;
        headers: {};
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        responseTime: number;
        status?: undefined;
        statusText?: undefined;
        response?: undefined;
        headers?: undefined;
    }>;
    private static preparePayload;
    private static applyTransformation;
    private static formatField;
    private static calculateField;
    private static getFieldValue;
    private static evaluateFilter;
    private static sendWebhook;
    private static logWebhookAttempt;
    static retryFailedWebhook(webhookId: string, logId: string): Promise<{
        success: boolean;
        status: number;
        statusText: string;
        responseTime: number;
        response: string;
        headers: {};
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        responseTime: number;
        status?: undefined;
        statusText?: undefined;
        response?: undefined;
        headers?: undefined;
    }>;
    static getWebhookPerformance(webhookId: string, startDate?: Date, endDate?: Date): Promise<{
        totalAttempts: number;
        successfulAttempts: number;
        failedAttempts: number;
        successRate: number;
        averageResponseTime: number;
        byStatus: Record<string, number>;
        byEvent: Record<string, number>;
        byHour: Record<number, number>;
        byDay: Record<string, number>;
    }>;
    static getWebhookRecommendations(webhookId: string): Promise<string[]>;
    static validateWebhookConfiguration(webhookId: string): Promise<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
    }>;
}
//# sourceMappingURL=WebhooksService.d.ts.map