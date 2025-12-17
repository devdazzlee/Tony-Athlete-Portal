export interface EmailTemplate {
    id: string;
    accountId: string;
    name: string;
    description: string;
    type: "WELCOME" | "COMMISSION_EARNED" | "PAYOUT_PROCESSED" | "ACCOUNT_UPDATE" | "PROMOTIONAL" | "SYSTEM_ALERT" | "CUSTOM";
    category: string;
    subject: string;
    content: string;
    htmlContent: string;
    variables: string[];
    settings: EmailTemplateSettings;
    status: "ACTIVE" | "INACTIVE" | "DRAFT";
    isDefault: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmailTemplateSettings {
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    priority: "LOW" | "NORMAL" | "HIGH";
    trackOpens: boolean;
    trackClicks: boolean;
    unsubscribeLink: boolean;
    footer: string;
    header: string;
    customCss?: string;
    customJs?: string;
}
export interface EmailCampaign {
    id: string;
    accountId: string;
    name: string;
    description: string;
    templateId: string;
    subject: string;
    content: string;
    htmlContent: string;
    recipientType: "ALL_AFFILIATES" | "SPECIFIC_AFFILIATES" | "AFFILIATE_GROUP" | "TIER_BASED" | "CUSTOM_LIST";
    recipientIds: string[];
    filters: any;
    schedule: CampaignSchedule;
    status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "CANCELLED";
    createdAt: Date;
    updatedAt: Date;
}
export interface CampaignSchedule {
    type: "IMMEDIATE" | "SCHEDULED" | "RECURRING";
    scheduledAt?: Date;
    timezone: string;
    frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
    endDate?: Date;
}
export interface EmailDesign {
    id: string;
    accountId: string;
    name: string;
    description: string;
    type: "HEADER" | "FOOTER" | "BUTTON" | "BANNER" | "CUSTOM";
    html: string;
    css: string;
    assets: DesignAsset[];
    isDefault: boolean;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface DesignAsset {
    id: string;
    name: string;
    type: "IMAGE" | "FONT" | "ICON" | "LOGO";
    url: string;
    size: number;
    mimeType: string;
    alt?: string;
}
export interface EmailVariable {
    id: string;
    accountId: string;
    name: string;
    description: string;
    type: "AFFILIATE" | "OFFER" | "COMMISSION" | "PAYOUT" | "SYSTEM" | "CUSTOM";
    source: string;
    format: string;
    defaultValue?: string;
    isRequired: boolean;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface EmailAutomation {
    id: string;
    accountId: string;
    name: string;
    description: string;
    trigger: AutomationTrigger;
    conditions: AutomationCondition[];
    actions: AutomationAction[];
    status: "ACTIVE" | "INACTIVE" | "PAUSED";
    createdAt: Date;
    updatedAt: Date;
}
export interface AutomationTrigger {
    type: "AFFILIATE_REGISTERED" | "COMMISSION_EARNED" | "PAYOUT_PROCESSED" | "ACCOUNT_ACTIVATED" | "TIER_UPGRADED" | "CUSTOM";
    parameters: Record<string, any>;
}
export interface AutomationCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "NOT_CONTAINS";
    value: any;
    logic: "AND" | "OR";
}
export interface AutomationAction {
    type: "SEND_EMAIL" | "SEND_SMS" | "ADD_TAG" | "REMOVE_TAG" | "UPDATE_FIELD" | "WEBHOOK";
    parameters: Record<string, any>;
    delay?: number;
    enabled: boolean;
}
export declare class EmailCustomizationModel {
    static createTemplate(data: Partial<EmailTemplate>): Promise<EmailTemplate>;
    static findTemplateById(id: string): Promise<EmailTemplate | null>;
    static updateTemplate(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate>;
    static deleteTemplate(id: string): Promise<void>;
    static listTemplates(accountId: string, filters?: any): Promise<EmailTemplate[]>;
    static createCampaign(data: Partial<EmailCampaign>): Promise<EmailCampaign>;
    static findCampaignById(id: string): Promise<EmailCampaign | null>;
    static updateCampaign(id: string, data: Partial<EmailCampaign>): Promise<EmailCampaign>;
    static deleteCampaign(id: string): Promise<void>;
    static listCampaigns(accountId: string, filters?: any): Promise<EmailCampaign[]>;
    static createDesign(data: Partial<EmailDesign>): Promise<EmailDesign>;
    static findDesignById(id: string): Promise<EmailDesign | null>;
    static updateDesign(id: string, data: Partial<EmailDesign>): Promise<EmailDesign>;
    static deleteDesign(id: string): Promise<void>;
    static listDesigns(accountId: string, filters?: any): Promise<EmailDesign[]>;
    static createVariable(data: Partial<EmailVariable>): Promise<EmailVariable>;
    static findVariableById(id: string): Promise<EmailVariable | null>;
    static updateVariable(id: string, data: Partial<EmailVariable>): Promise<EmailVariable>;
    static deleteVariable(id: string): Promise<void>;
    static listVariables(accountId: string, filters?: any): Promise<EmailVariable[]>;
    static createAutomation(data: Partial<EmailAutomation>): Promise<EmailAutomation>;
    static findAutomationById(id: string): Promise<EmailAutomation | null>;
    static updateAutomation(id: string, data: Partial<EmailAutomation>): Promise<EmailAutomation>;
    static deleteAutomation(id: string): Promise<void>;
    static listAutomations(accountId: string, filters?: any): Promise<EmailAutomation[]>;
    static processTemplate(templateId: string, variables: Record<string, any>): Promise<{
        subject: string;
        content: string;
        htmlContent: string;
    }>;
    static executeAutomation(automationId: string, triggerData: any): Promise<void>;
    private static evaluateAutomationConditions;
    private static evaluateAutomationCondition;
    private static getFieldValue;
    private static executeAutomationAction;
    private static sendEmail;
    private static sendSMS;
    private static addTag;
    private static removeTag;
    private static updateField;
    private static callWebhook;
    static getEmailStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultTemplates(accountId: string): Promise<EmailTemplate[]>;
    static createDefaultVariables(accountId: string): Promise<EmailVariable[]>;
    static getEmailCustomizationDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=EmailCustomization.d.ts.map