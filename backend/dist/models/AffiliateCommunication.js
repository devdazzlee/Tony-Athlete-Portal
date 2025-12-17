"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AffiliateCommunicationModel = void 0;
class AffiliateCommunicationModel {
    static async createChannel(data) {
        return {
            id: 'mock-channel-id',
            accountId: data.accountId,
            name: data.name,
            type: data.type,
            settings: data.settings || {
                enabled: true,
                priority: 1,
                deliveryTime: 'immediate',
                retryAttempts: 3,
                retryDelay: 5,
                customSettings: {}
            },
            status: data.status || 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findChannelById(id) {
        return null;
    }
    static async updateChannel(id, data) {
        return {
            id,
            accountId: 'mock-account',
            name: 'Mock Channel',
            type: 'EMAIL',
            settings: {
                enabled: true,
                priority: 1,
                deliveryTime: 'immediate',
                retryAttempts: 3,
                retryDelay: 5,
                customSettings: {}
            },
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async deleteChannel(id) {
    }
    static async listChannels(accountId, filters = {}) {
        return [];
    }
    static async createTemplate(data) {
        return {
            id: 'mock-template-id',
            accountId: data.accountId,
            name: data.name,
            type: data.type,
            channel: data.channel,
            subject: data.subject,
            content: data.content,
            variables: data.variables || [],
            status: data.status || 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findTemplateById(id) {
        return null;
    }
    static async updateTemplate(id, data) {
        return {
            id,
            accountId: 'mock-account',
            name: 'Mock Template',
            type: 'WELCOME',
            channel: 'EMAIL',
            content: 'Mock content',
            variables: [],
            status: 'DRAFT',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async deleteTemplate(id) {
    }
    static async listTemplates(accountId, filters = {}) {
        return [];
    }
    static async sendMessage(data) {
        return {
            id: 'mock-message-id',
            accountId: data.accountId,
            templateId: data.templateId,
            channel: data.channel,
            recipientId: data.recipientId,
            recipientType: data.recipientType,
            subject: data.subject,
            content: data.content,
            status: 'PENDING',
            priority: data.priority || 'NORMAL',
            scheduledAt: data.scheduledAt,
            metadata: data.metadata || {},
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async sendTemplateMessage(templateId, recipientId, recipientType, variables, accountId) {
        return {
            id: 'mock-template-message-id',
            accountId,
            templateId,
            channel: 'EMAIL',
            recipientId,
            recipientType: recipientType,
            content: 'Mock template content',
            status: 'PENDING',
            priority: 'NORMAL',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async updateMessageStatus(id, status, additionalData) {
        return {
            id,
            accountId: 'mock-account',
            channel: 'EMAIL',
            recipientId: 'mock-recipient',
            recipientType: 'AFFILIATE',
            content: 'Mock content',
            status: status,
            priority: 'NORMAL',
            metadata: {},
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async getMessages(filters = {}, page = 1, limit = 50) {
        return [];
    }
    static async createCampaign(data) {
        return {
            id: 'mock-campaign-id',
            accountId: data.accountId,
            name: data.name,
            description: data.description || '',
            templateId: data.templateId,
            channel: data.channel,
            recipientType: data.recipientType,
            recipientIds: data.recipientIds || [],
            filters: data.filters || {},
            status: data.status || 'DRAFT',
            scheduledAt: data.scheduledAt,
            totalRecipients: data.totalRecipients || 0,
            sentCount: 0,
            deliveredCount: 0,
            readCount: 0,
            failedCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findCampaignById(id) {
        return null;
    }
    static async updateCampaign(id, data) {
        return {
            id,
            accountId: 'mock-account',
            name: 'Mock Campaign',
            description: '',
            templateId: 'mock-template',
            channel: 'EMAIL',
            recipientType: 'ALL_AFFILIATES',
            recipientIds: [],
            filters: {},
            status: 'DRAFT',
            totalRecipients: 0,
            sentCount: 0,
            deliveredCount: 0,
            readCount: 0,
            failedCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async deleteCampaign(id) {
    }
    static async listCampaigns(accountId, filters = {}) {
        return [];
    }
    static async executeCampaign(campaignId) {
    }
    static async getCampaignRecipients(campaign) {
        return [];
    }
    static async getRecipientVariables(recipientId) {
        return {};
    }
    static async setCommunicationPreference(userId, channel, enabled, frequency, quietHours) {
        return {
            id: 'mock-preference-id',
            userId,
            channel,
            enabled,
            frequency: frequency,
            quietHours: quietHours || {
                enabled: false,
                startTime: '22:00',
                endTime: '08:00',
                timezone: 'UTC'
            },
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async getCommunicationPreferences(userId) {
        return [];
    }
    static async getCommunicationStats(accountId, startDate, endDate) {
        return {
            totalMessages: 0,
            sentMessages: 0,
            deliveredMessages: 0,
            readMessages: 0,
            failedMessages: 0,
            totalCampaigns: 0,
            activeCampaigns: 0,
            completedCampaigns: 0,
            byChannel: {},
            byStatus: {},
            byPriority: {},
            deliveryRate: 0,
            readRate: 0
        };
    }
    static async createDefaultTemplates(accountId) {
        return [];
    }
    static async createDefaultChannels(accountId) {
        return [];
    }
}
exports.AffiliateCommunicationModel = AffiliateCommunicationModel;
//# sourceMappingURL=AffiliateCommunication.js.map