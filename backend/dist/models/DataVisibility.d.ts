export interface DataVisibilityRule {
    id: string;
    accountId: string;
    name: string;
    description: string;
    type: "AFFILIATE_DATA" | "FINANCIAL_DATA" | "PERFORMANCE_DATA" | "PERSONAL_DATA" | "SYSTEM_DATA";
    scope: "GLOBAL" | "ROLE_BASED" | "USER_BASED" | "AFFILIATE_BASED";
    conditions: VisibilityCondition[];
    permissions: VisibilityPermissions;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface VisibilityCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "IN" | "NOT_IN" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS";
    value: any;
    logic: "AND" | "OR";
}
export interface VisibilityPermissions {
    view: boolean;
    edit: boolean;
    delete: boolean;
    export: boolean;
    share: boolean;
    restrictedFields: string[];
    allowedRoles: string[];
    allowedUsers: string[];
    allowedAffiliates: string[];
}
export interface DataAccessLog {
    id: string;
    userId: string;
    resourceType: string;
    resourceId: string;
    action: "VIEW" | "EDIT" | "DELETE" | "EXPORT" | "SHARE";
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
    success: boolean;
    reason?: string;
}
export interface DataMaskingRule {
    id: string;
    accountId: string;
    field: string;
    type: "PARTIAL" | "FULL" | "HASH" | "ENCRYPT" | "REDACT";
    pattern: string;
    replacement: string;
    conditions: VisibilityCondition[];
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export declare class DataVisibilityModel {
    static createRule(data: Partial<DataVisibilityRule>): Promise<DataVisibilityRule>;
    static findById(id: string): Promise<DataVisibilityRule | null>;
    static update(id: string, data: Partial<DataVisibilityRule>): Promise<DataVisibilityRule>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<DataVisibilityRule[]>;
    static checkAccess(userId: string, resourceType: string, resourceId: string, action: string, userRole: string, affiliateId?: string): Promise<{
        allowed: boolean;
        reason?: string;
        maskedFields?: string[];
    }>;
    private static evaluateConditions;
    private static evaluateCondition;
    static logAccess(userId: string, resourceType: string, resourceId: string, action: string, ipAddress: string, userAgent: string, success: boolean, reason?: string): Promise<DataAccessLog>;
    static getAccessLogs(filters?: any, page?: number, limit?: number): Promise<DataAccessLog[]>;
    static createMaskingRule(data: Partial<DataMaskingRule>): Promise<DataMaskingRule>;
    static findMaskingRuleById(id: string): Promise<DataMaskingRule | null>;
    static updateMaskingRule(id: string, data: Partial<DataMaskingRule>): Promise<DataMaskingRule>;
    static deleteMaskingRule(id: string): Promise<void>;
    static listMaskingRules(accountId: string, filters?: any): Promise<DataMaskingRule[]>;
    static applyMasking(data: any, userId: string, userRole: string): Promise<any>;
    private static maskValue;
    static getDataVisibilityStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultRules(accountId: string): Promise<DataVisibilityRule[]>;
    static createDefaultMaskingRules(accountId: string): Promise<DataMaskingRule[]>;
    static exportDataVisibilityConfig(accountId: string): Promise<any>;
    static importDataVisibilityConfig(accountId: string, config: any): Promise<void>;
}
//# sourceMappingURL=DataVisibility.d.ts.map