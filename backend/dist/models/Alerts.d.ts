export interface Alert {
    id: string;
    accountId: string;
    name: string;
    description: string;
    type: 'SYSTEM' | 'PERFORMANCE' | 'SECURITY' | 'BUSINESS' | 'COMPLIANCE' | 'CUSTOM';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'ACTIVE' | 'INACTIVE' | 'TRIGGERED' | 'RESOLVED';
    conditions: AlertCondition[];
    actions: AlertAction[];
    recipients: string[];
    cooldownPeriod: number;
    lastTriggered?: Date;
    triggerCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface AlertCondition {
    field: string;
    operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'NOT_CONTAINS' | 'IN' | 'NOT_IN' | 'BETWEEN';
    value: any;
    threshold?: number;
    timeWindow?: number;
}
export interface AlertAction {
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK' | 'SLACK' | 'DISCORD' | 'CUSTOM';
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface AlertEvent {
    id: string;
    alertId: string;
    type: string;
    severity: string;
    title: string;
    message: string;
    data: any;
    status: 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
    triggeredAt: Date;
    acknowledgedAt?: Date;
    resolvedAt?: Date;
    acknowledgedBy?: string;
    resolvedBy?: string;
    notes?: string;
}
export interface AlertSubscription {
    id: string;
    userId: string;
    alertId: string;
    notificationMethods: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export declare class AlertsModel {
    static create(data: Partial<Alert>): Promise<Alert>;
    static findById(id: string): Promise<Alert | null>;
    static update(id: string, data: Partial<Alert>): Promise<Alert>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<Alert[]>;
    static triggerAlert(alertId: string, data: any): Promise<AlertEvent>;
    static testAlert(alertId: string): Promise<AlertEvent>;
    static getAlertStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultAlerts(accountId: string): Promise<Alert[]>;
    static getAlertDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=Alerts.d.ts.map