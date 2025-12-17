export interface EmailTemplate {
    id: string;
    name: string;
    type: 'WELCOME' | 'COMMISSION_EARNED' | 'PAYOUT_PROCESSED' | 'ACCOUNT_SUSPENDED' | 'PASSWORD_RESET' | 'CUSTOM';
    subject: string;
    htmlContent: string;
    textContent: string;
    variables: string[];
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
}
export interface EmailCampaign {
    id: string;
    name: string;
    description: string;
    templateId: string;
    recipientType: 'ALL_AFFILIATES' | 'SPECIFIC_AFFILIATES' | 'AFFILIATE_GROUP' | 'CUSTOM_LIST';
    recipientIds: string[];
    filters: any;
    status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'FAILED';
    scheduledAt?: Date;
    sentAt?: Date;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    openedCount: number;
    clickedCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface EmailMessage {
    id: string;
    campaignId?: string;
    templateId?: string;
    recipientId: string;
    recipientEmail: string;
    subject: string;
    htmlContent: string;
    textContent: string;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'OPENED' | 'CLICKED' | 'BOUNCED' | 'FAILED';
    sentAt?: Date;
    deliveredAt?: Date;
    openedAt?: Date;
    clickedAt?: Date;
    bouncedAt?: Date;
    errorMessage?: string;
    trackingId: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class EmailTemplateModel {
    static create(data: Partial<EmailTemplate>): Promise<EmailTemplate>;
    static findById(id: string): Promise<EmailTemplate | null>;
    static findByType(type: string): Promise<EmailTemplate | null>;
    static update(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate>;
    static delete(id: string): Promise<void>;
    static list(filters?: any): Promise<EmailTemplate[]>;
    static renderTemplate(templateId: string, variables: Record<string, any>): Promise<{
        subject: string;
        htmlContent: string;
        textContent: string;
    }>;
    static createCampaign(data: Partial<EmailCampaign>): Promise<EmailCampaign>;
    static findCampaignById(id: string): Promise<EmailCampaign | null>;
    static updateCampaign(id: string, data: Partial<EmailCampaign>): Promise<EmailCampaign>;
    static deleteCampaign(id: string): Promise<void>;
    static listCampaigns(filters?: any, page?: number, limit?: number): Promise<EmailCampaign[]>;
    static sendEmail(recipientId: string, recipientEmail: string, templateId: string, variables: Record<string, any>): Promise<EmailMessage>;
    static sendCampaign(campaignId: string): Promise<void>;
    private static getCampaignRecipients;
    private static getRecipientVariables;
    static updateMessageStatus(messageId: string, status: string, additionalData?: any): Promise<EmailMessage>;
    static getMessageStats(campaignId?: string, startDate?: Date, endDate?: Date): Promise<any>;
    private static generateTrackingId;
    static createDefaultTemplates(): Promise<EmailTemplate[]>;
}
//# sourceMappingURL=EmailTemplate.d.ts.map