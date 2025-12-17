export declare class AlertsService {
    static createAlert(accountId: string, alertData: any): Promise<import("../models/Alerts").Alert>;
    static getAlert(id: string): Promise<import("../models/Alerts").Alert>;
    static updateAlert(id: string, updateData: any): Promise<import("../models/Alerts").Alert>;
    static deleteAlert(id: string): Promise<void>;
    static listAlerts(accountId: string, filters?: any): Promise<import("../models/Alerts").Alert[]>;
    static addRule(alertId: string, ruleData: any): Promise<{
        success: boolean;
    }>;
    static updateRule(alertId: string, ruleId: string, updateData: any): Promise<{
        success: boolean;
    }>;
    static removeRule(alertId: string, ruleId: string): Promise<{
        success: boolean;
    }>;
    static addAction(alertId: string, actionData: any): Promise<{
        success: boolean;
    }>;
    static updateAction(alertId: string, actionId: string, updateData: any): Promise<{
        success: boolean;
    }>;
    static removeAction(alertId: string, actionId: string): Promise<{
        success: boolean;
    }>;
    static triggerAlert(alertId: string, triggerData: any): Promise<import("../models/Alerts").AlertEvent>;
    static testAlert(alertId: string, testData: any): Promise<{
        success: boolean;
    }>;
    static getAlertHistory(alertId: string, filters?: any): Promise<any[]>;
    static getAlertStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static getAlertsDashboard(accountId: string): Promise<any>;
    static createDefaultAlerts(accountId: string): Promise<import("../models/Alerts").Alert[]>;
    static evaluateAlertConditions(alertId: string, data: any): Promise<any[]>;
    private static evaluateRule;
    private static getFieldValue;
    static executeAlertActions(alertId: string, triggerData: any): Promise<any[]>;
    private static executeAction;
    private static sendEmail;
    private static sendSMS;
    private static sendWebhook;
    private static sendNotification;
    private static sendSlackMessage;
    private static sendDiscordMessage;
    private static sendTeamsMessage;
    private static replacePlaceholders;
    static getAlertPerformance(alertId: string, startDate?: Date, endDate?: Date): Promise<{
        totalTriggers: number;
        successfulActions: number;
        failedActions: number;
        successRate: number;
        averageResponseTime: number;
        byActionType: Record<string, number>;
        byStatus: Record<string, number>;
        byDate: Record<string, number>;
    }>;
    static getAlertRecommendations(alertId: string): Promise<string[]>;
}
//# sourceMappingURL=AlertsService.d.ts.map