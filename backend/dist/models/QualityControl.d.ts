export interface QualityRule {
    id: string;
    name: string;
    description: string;
    type: "TRAFFIC_QUALITY" | "CONVERSION_QUALITY" | "AFFILIATE_QUALITY" | "OFFER_QUALITY";
    conditions: QualityCondition[];
    actions: QualityAction[];
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface QualityCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "BETWEEN" | "IN" | "NOT_IN";
    value: any;
    weight: number;
}
export interface QualityAction {
    type: "APPROVE" | "REJECT" | "FLAG" | "REQUIRE_REVIEW" | "PAUSE_AFFILIATE" | "SEND_NOTIFICATION";
    parameters: Record<string, any>;
}
export interface QualityCheck {
    id: string;
    ruleId: string;
    type: string;
    data: any;
    score: number;
    status: "PASSED" | "FAILED" | "REVIEW_REQUIRED";
    action: string;
    affiliateId?: string;
    clickId?: string;
    conversionId?: string;
    offerId?: string;
    createdAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
}
export interface QualityMetrics {
    totalChecks: number;
    passedChecks: number;
    failedChecks: number;
    reviewRequired: number;
    passRate: number;
    byType: Record<string, any>;
    byAffiliate: Record<string, any>;
    byOffer: Record<string, any>;
}
export declare class QualityControlModel {
    static createRule(data: any): Promise<any>;
    static findRuleById(id: string): Promise<any | null>;
    static updateRule(id: string, data: any): Promise<any>;
    static deleteRule(id: string): Promise<void>;
    static listRules(filters?: any): Promise<any[]>;
    static performQualityCheck(data: any, type: string, affiliateId?: string, clickId?: string, conversionId?: string, offerId?: string): Promise<any[]>;
    private static calculateQualityScore;
    private static evaluateCondition;
    private static getFieldValue;
    private static determineQualityStatus;
    private static executeQualityActions;
    static getQualityChecks(filters?: any, page?: number, limit?: number): Promise<any[]>;
    static updateQualityCheckStatus(id: string, status: string, reviewedBy: string): Promise<any>;
    static getQualityMetrics(startDate?: Date, endDate?: Date): Promise<QualityMetrics>;
    static createDefaultRules(accountId: string): Promise<any[]>;
}
//# sourceMappingURL=QualityControl.d.ts.map