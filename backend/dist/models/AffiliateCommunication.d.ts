export interface CommunicationChannel {
    id: string;
    accountId: string;
    name: string;
    type: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP' | 'SLACK' | 'DISCORD' | 'WEBHOOK';
    settings: ChannelSettings;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: Date;
    updatedAt: Date;
}
export interface ChannelSettings {
    enabled: boolean;
    priority: number;
    deliveryTime: string;
    retryAttempts: number;
    retryDelay: number;
    customSettings: Record<string, any>;
}
export interface CommunicationTemplate {
    id: string;
    accountId: string;
    name: string;
    type: 'WELCOME' | 'COMMISSION_EARNED' | 'PAYOUT_PROCESSED' | 'ACCOUNT_UPDATE' | 'PROMOTIONAL' | 'SYSTEM_ALERT' | 'CUSTOM';
    channel: string;
    subject?: string;
    content: string;
    variables: string[];
    status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
    createdAt: Date;
    updatedAt: Date;
}
export interface CommunicationMessage {
    id: string;
    accountId: string;
    templateId?: string;
    channel: string;
    recipientId: string;
    recipientType: 'AFFILIATE' | 'MANAGER' | 'ADMIN' | 'CUSTOM';
    subject?: string;
    content: string;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'BOUNCED';
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    scheduledAt?: Date;
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
}
export interface CommunicationCampaign {
    id: string;
    accountId: string;
    name: string;
    description: string;
    templateId: string;
    channel: string;
    recipientType: 'ALL_AFFILIATES' | 'SPECIFIC_AFFILIATES' | 'AFFILIATE_GROUP' | 'TIER_BASED' | 'CUSTOM_LIST';
    recipientIds: string[];
    filters: any;
    status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PAUSED' | 'CANCELLED';
    scheduledAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    totalRecipients: number;
    sentCount: number;
    deliveredCount: number;
    readCount: number;
    failedCount: number;
    createdAt: Date;
    updatedAt: Date;
}
export interface CommunicationPreference {
    id: string;
    userId: string;
    channel: string;
    enabled: boolean;
    frequency: 'IMMEDIATE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'NEVER';
    quietHours: {
        enabled: boolean;
        startTime: string;
        endTime: string;
        timezone: string;
    };
    createdAt: Date;
    updatedAt: Date;
}
export declare class AffiliateCommunicationModel {
    static createChannel(data: Partial<CommunicationChannel>): Promise<CommunicationChannel>;
    static findChannelById(id: string): Promise<CommunicationChannel | null>;
    static updateChannel(id: string, data: Partial<CommunicationChannel>): Promise<CommunicationChannel>;
    static deleteChannel(id: string): Promise<void>;
    static listChannels(accountId: string, filters?: any): Promise<CommunicationChannel[]>;
    static createTemplate(data: Partial<CommunicationTemplate>): Promise<CommunicationTemplate>;
    static findTemplateById(id: string): Promise<CommunicationTemplate | null>;
    static updateTemplate(id: string, data: Partial<CommunicationTemplate>): Promise<CommunicationTemplate>;
    static deleteTemplate(id: string): Promise<void>;
    static listTemplates(accountId: string, filters?: any): Promise<CommunicationTemplate[]>;
    static sendMessage(data: Partial<CommunicationMessage>): Promise<CommunicationMessage>;
    static sendTemplateMessage(templateId: string, recipientId: string, recipientType: string, variables: Record<string, any>, accountId: string): Promise<CommunicationMessage>;
    static updateMessageStatus(id: string, status: string, additionalData?: any): Promise<CommunicationMessage>;
    static getMessages(filters?: any, page?: number, limit?: number): Promise<CommunicationMessage[]>;
    static createCampaign(data: Partial<CommunicationCampaign>): Promise<CommunicationCampaign>;
    static findCampaignById(id: string): Promise<CommunicationCampaign | null>;
    static updateCampaign(id: string, data: Partial<CommunicationCampaign>): Promise<CommunicationCampaign>;
    static deleteCampaign(id: string): Promise<void>;
    static listCampaigns(accountId: string, filters?: any): Promise<CommunicationCampaign[]>;
    static executeCampaign(campaignId: string): Promise<void>;
    private static getCampaignRecipients;
    private static getRecipientVariables;
    static setCommunicationPreference(userId: string, channel: string, enabled: boolean, frequency: string, quietHours?: any): Promise<CommunicationPreference>;
    static getCommunicationPreferences(userId: string): Promise<CommunicationPreference[]>;
    static getCommunicationStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static createDefaultTemplates(accountId: string): Promise<CommunicationTemplate[]>;
    static createDefaultChannels(accountId: string): Promise<CommunicationChannel[]>;
}
//# sourceMappingURL=AffiliateCommunication.d.ts.map