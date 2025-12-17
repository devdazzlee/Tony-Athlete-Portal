export interface FraudRule {
    id: string;
    name: string;
    description: string;
    type: "CLICK_FRAUD" | "CONVERSION_FRAUD" | "TRAFFIC_QUALITY" | "GEO_BLOCKING" | "DEVICE_FINGERPRINTING";
    conditions: FraudCondition[];
    actions: FraudAction[];
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface FraudCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "NOT_CONTAINS" | "GREATER_THAN" | "LESS_THAN" | "IN" | "NOT_IN";
    value: any;
    weight: number;
}
export interface FraudAction {
    type: "BLOCK" | "FLAG" | "REDIRECT" | "NOTIFY" | "PAUSE_AFFILIATE" | "REJECT_CONVERSION";
    parameters: Record<string, any>;
}
export interface FraudEvent {
    id: string;
    ruleId: string;
    type: string;
    severity: string;
    data: any;
    score: number;
    status: "DETECTED" | "REVIEWED" | "RESOLVED" | "FALSE_POSITIVE";
    action: string;
    ipAddress: string;
    userAgent: string;
    affiliateId?: string;
    clickId?: string;
    conversionId?: string;
    createdAt: Date;
    reviewedAt?: Date;
    resolvedAt?: Date;
}
export interface FraudStats {
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
    eventsByStatus: Record<string, number>;
    topAffiliates: Array<{
        affiliateId: string;
        count: number;
        name: string;
    }>;
    topIPs: Array<{
        ip: string;
        count: number;
    }>;
    topCountries: Array<{
        country: string;
        count: number;
    }>;
}
export declare class FraudPreventionModel {
    static createRule(data: Partial<FraudRule>): Promise<FraudRule>;
    static findRuleById(id: string): Promise<FraudRule | null>;
    static updateRule(id: string, data: Partial<FraudRule>): Promise<FraudRule>;
    static deleteRule(id: string): Promise<void>;
    static listRules(filters?: any): Promise<FraudRule[]>;
    static detectFraud(data: any, ipAddress: string, userAgent: string, affiliateId?: string, clickId?: string, conversionId?: string): Promise<FraudEvent[]>;
    private static calculateFraudScore;
    private static evaluateCondition;
    private static getFieldValue;
    private static executeFraudActions;
    static getFraudEvents(filters?: any, page?: number, limit?: number): Promise<FraudEvent[]>;
    static updateFraudEventStatus(id: string, status: string): Promise<FraudEvent>;
    static getFraudStats(startDate?: Date, endDate?: Date): Promise<FraudStats>;
    static createDefaultRules(): Promise<FraudRule[]>;
}
//# sourceMappingURL=FraudPrevention.d.ts.map