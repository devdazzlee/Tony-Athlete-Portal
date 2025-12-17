export declare class PayoutBuilderService {
    static createPayoutRule(accountId: string, ruleData: any): Promise<import("../models/PayoutAutomation").PayoutAutomation>;
    static getPayoutRule(id: string): Promise<import("../models/PayoutAutomation").PayoutAutomation>;
    static updatePayoutRule(id: string, updateData: any): Promise<import("../models/PayoutAutomation").PayoutAutomation>;
    static deletePayoutRule(id: string): Promise<void>;
    static listPayoutRules(accountId: string, filters?: any): Promise<import("../models/PayoutAutomation").PayoutAutomation[]>;
    static addCondition(ruleId: string, conditionData: any): Promise<{
        success: boolean;
    }>;
    static updateCondition(ruleId: string, conditionId: string, updateData: any): Promise<{
        success: boolean;
    }>;
    static removeCondition(ruleId: string, conditionId: string): Promise<{
        success: boolean;
    }>;
    static addAction(ruleId: string, actionData: any): Promise<{
        success: boolean;
    }>;
    static updateAction(ruleId: string, actionId: string, updateData: any): Promise<{
        success: boolean;
    }>;
    static removeAction(ruleId: string, actionId: string): Promise<{
        success: boolean;
    }>;
    static processPayouts(ruleId: string, dryRun?: boolean): Promise<{
        success: boolean;
    }>;
    static previewPayouts(ruleId: string, filters?: any): Promise<any[]>;
    static getPayoutHistory(ruleId: string, filters?: any): Promise<any[]>;
    static generatePayoutReport(ruleId: string, format: string, startDate?: Date, endDate?: Date): Promise<{
        report: string;
    }>;
    static getPayoutStats(accountId: string, startDate?: Date, endDate?: Date): Promise<{
        stats: {};
    }>;
    static getPayoutBuilderDashboard(accountId: string): Promise<any>;
    static createDefaultRules(accountId: string): Promise<any[]>;
    static testRule(ruleId: string, testData: any): Promise<{
        success: boolean;
    }>;
    static updateSchedule(ruleId: string, scheduleData: any): Promise<{
        success: boolean;
    }>;
    static exportRules(accountId: string, format: string): Promise<any[]>;
    static importRules(accountId: string, rules: any[], overwrite?: boolean): Promise<any[]>;
    static evaluatePayoutConditions(ruleId: string, data: any): Promise<any[]>;
    private static evaluateCondition;
    private static getFieldValue;
    static executePayoutActions(ruleId: string, payoutData: any): Promise<any[]>;
    private static executeAction;
    private static processPayout;
    private static sendEmail;
    private static sendSMS;
    private static sendWebhook;
    private static sendNotification;
    private static holdPayout;
    private static rejectPayout;
    private static approvePayout;
    private static replacePlaceholders;
    static calculatePayoutAmount(ruleId: string, data: any): Promise<number>;
    private static calculateCustomAmount;
    static getPayoutRulePerformance(ruleId: string, startDate?: Date, endDate?: Date): Promise<{
        totalPayouts: number;
        totalAmount: any;
        successfulPayouts: number;
        failedPayouts: number;
        successRate: number;
        averageAmount: number;
        byStatus: Record<string, number>;
        byMethod: Record<string, number>;
        byDate: Record<string, number>;
    }>;
    static getPayoutRuleRecommendations(ruleId: string): Promise<string[]>;
}
//# sourceMappingURL=PayoutBuilderService.d.ts.map