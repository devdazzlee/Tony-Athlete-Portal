export interface ContactSettings {
    id: string;
    accountId: string;
    name: string;
    type: "AFFILIATE_CONTACT" | "SUPPORT_CONTACT" | "SALES_CONTACT" | "TECHNICAL_CONTACT" | "CUSTOM";
    settings: ContactConfiguration;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface ContactConfiguration {
    allowDirectContact: boolean;
    requireApproval: boolean;
    autoResponse: boolean;
    autoResponseTemplate?: string;
    businessHours: BusinessHours;
    contactMethods: ContactMethod[];
    escalationRules: EscalationRule[];
    notificationSettings: NotificationSettings;
    customFields: CustomField[];
}
export interface BusinessHours {
    enabled: boolean;
    timezone: string;
    schedule: DaySchedule[];
    holidaySchedule: HolidaySchedule[];
    outOfHoursMessage: string;
}
export interface DaySchedule {
    day: "MONDAY" | "TUESDAY" | "WEDNESDAY" | "THURSDAY" | "FRIDAY" | "SATURDAY" | "SUNDAY";
    isWorkingDay: boolean;
    startTime: string;
    endTime: string;
    breaks: BreakTime[];
}
export interface BreakTime {
    startTime: string;
    endTime: string;
    description: string;
}
export interface HolidaySchedule {
    date: string;
    name: string;
    isWorkingDay: boolean;
    message?: string;
}
export interface ContactMethod {
    type: "EMAIL" | "PHONE" | "CHAT" | "TICKET" | "FORM" | "CUSTOM";
    enabled: boolean;
    settings: Record<string, any>;
    priority: number;
}
export interface EscalationRule {
    id: string;
    name: string;
    conditions: EscalationCondition[];
    actions: EscalationAction[];
    priority: number;
    enabled: boolean;
}
export interface EscalationCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "NOT_CONTAINS";
    value: any;
    logic: "AND" | "OR";
}
export interface EscalationAction {
    type: "ASSIGN_TO" | "NOTIFY" | "CHANGE_PRIORITY" | "AUTO_RESPOND" | "CREATE_TASK";
    parameters: Record<string, any>;
    enabled: boolean;
}
export interface NotificationSettings {
    email: {
        enabled: boolean;
        recipients: string[];
        templates: Record<string, string>;
    };
    sms: {
        enabled: boolean;
        recipients: string[];
        templates: Record<string, string>;
    };
    push: {
        enabled: boolean;
        recipients: string[];
    };
    webhook: {
        enabled: boolean;
        url: string;
        events: string[];
    };
}
export interface CustomField {
    id: string;
    name: string;
    label: string;
    type: "TEXT" | "EMAIL" | "PHONE" | "SELECT" | "CHECKBOX" | "RADIO" | "TEXTAREA" | "FILE";
    required: boolean;
    options?: string[];
    validation?: FieldValidation;
    order: number;
}
export interface FieldValidation {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    customMessage?: string;
}
export interface ContactMessage {
    id: string;
    contactSettingsId: string;
    fromUserId: string;
    toUserId?: string;
    subject: string;
    message: string;
    type: "INQUIRY" | "SUPPORT" | "SALES" | "TECHNICAL" | "GENERAL";
    priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
    status: "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
    assignedTo?: string;
    tags: string[];
    customFields: Record<string, any>;
    attachments: string[];
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    closedAt?: Date;
}
export interface ContactResponse {
    id: string;
    messageId: string;
    fromUserId: string;
    message: string;
    isInternal: boolean;
    attachments: string[];
    createdAt: Date;
}
export declare class ContactSettingsModel {
    static create(data: Partial<ContactSettings>): Promise<ContactSettings>;
    static findById(id: string): Promise<ContactSettings | null>;
    static findByAccountAndType(accountId: string, type: string): Promise<ContactSettings | null>;
    static update(id: string, data: Partial<ContactSettings>): Promise<ContactSettings>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<ContactSettings[]>;
    static isBusinessHours(contactSettingsId: string): Promise<boolean>;
    static createMessage(data: Partial<ContactMessage>): Promise<ContactMessage>;
    static findMessageById(id: string): Promise<ContactMessage | null>;
    static updateMessage(id: string, data: Partial<ContactMessage>): Promise<ContactMessage>;
    static deleteMessage(id: string): Promise<void>;
    static listMessages(contactSettingsId: string, filters?: any, page?: number, limit?: number): Promise<ContactMessage[]>;
    static assignMessage(messageId: string, assignedTo: string): Promise<ContactMessage>;
    static resolveMessage(messageId: string, resolvedBy: string): Promise<ContactMessage>;
    static closeMessage(messageId: string, closedBy: string): Promise<ContactMessage>;
    static addResponse(messageId: string, fromUserId: string, message: string, isInternal?: boolean, attachments?: string[]): Promise<ContactResponse>;
    static getResponses(messageId: string): Promise<ContactResponse[]>;
    static processEscalation(messageId: string): Promise<void>;
    private static evaluateEscalationConditions;
    private static evaluateEscalationCondition;
    private static getFieldValue;
    private static executeEscalationActions;
    private static sendNotification;
    private static createTask;
    static getContactStats(contactSettingsId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultSettings(accountId: string): Promise<ContactSettings>;
    static getContactDashboard(contactSettingsId: string): Promise<any>;
}
//# sourceMappingURL=ContactSettings.d.ts.map