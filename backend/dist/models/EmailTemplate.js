"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTemplateModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EmailTemplateModel {
    static async create(data) {
        return await prisma.emailTemplate.create({
            data: {
                name: data.name,
                type: data.type,
                subject: data.subject,
                htmlContent: data.htmlContent,
                textContent: data.textContent || '',
                variables: data.variables || [],
                status: data.status || 'ACTIVE'
            }
        });
    }
    static async findById(id) {
        return await prisma.emailTemplate.findUnique({
            where: { id }
        });
    }
    static async findByType(type) {
        return await prisma.emailTemplate.findFirst({
            where: {
                type: type,
                status: 'ACTIVE'
            }
        });
    }
    static async update(id, data) {
        return await prisma.emailTemplate.update({
            where: { id },
            data
        });
    }
    static async delete(id) {
        await prisma.emailTemplate.delete({
            where: { id }
        });
    }
    static async list(filters = {}) {
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        return await prisma.emailTemplate.findMany({
            where,
            orderBy: { createdAt: 'desc' }
        });
    }
    static async renderTemplate(templateId, variables) {
        const template = await this.findById(templateId);
        if (!template) {
            throw new Error('Email template not found');
        }
        let subject = template.subject;
        let htmlContent = template.htmlContent;
        let textContent = template.textContent;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            const stringValue = String(value || '');
            subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
            htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), stringValue);
            textContent = textContent.replace(new RegExp(placeholder, 'g'), stringValue);
        }
        return { subject, htmlContent, textContent };
    }
    static async createCampaign(data) {
        return await prisma.emailCampaign.create({
            data: {
                name: data.name,
                description: data.description || '',
                templateId: data.templateId,
                recipientType: data.recipientType,
                recipientIds: data.recipientIds || [],
                filters: data.filters || {},
                status: data.status || 'DRAFT',
                scheduledAt: data.scheduledAt,
                totalRecipients: data.totalRecipients || 0,
                sentCount: 0,
                deliveredCount: 0,
                openedCount: 0,
                clickedCount: 0
            }
        });
    }
    static async findCampaignById(id) {
        return await prisma.emailCampaign.findUnique({
            where: { id }
        });
    }
    static async updateCampaign(id, data) {
        return await prisma.emailCampaign.update({
            where: { id },
            data
        });
    }
    static async deleteCampaign(id) {
        await prisma.emailCampaign.delete({
            where: { id }
        });
    }
    static async listCampaigns(filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.recipientType)
            where.recipientType = filters.recipientType;
        return await prisma.emailCampaign.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });
    }
    static async sendEmail(recipientId, recipientEmail, templateId, variables) {
        const { subject, htmlContent, textContent } = await this.renderTemplate(templateId, variables);
        const trackingId = this.generateTrackingId();
        const message = await prisma.emailMessage.create({
            data: {
                templateId,
                recipientId,
                recipientEmail,
                subject,
                htmlContent,
                textContent,
                status: 'PENDING',
                trackingId
            }
        });
        await this.updateMessageStatus(message.id, 'SENT');
        return message;
    }
    static async sendCampaign(campaignId) {
        const campaign = await this.findCampaignById(campaignId);
        if (!campaign) {
            throw new Error('Campaign not found');
        }
        if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
            throw new Error('Campaign is not in a sendable state');
        }
        await this.updateCampaign(campaignId, { status: 'SENDING' });
        try {
            const recipients = await this.getCampaignRecipients(campaign);
            const template = await this.findById(campaign.templateId);
            if (!template) {
                throw new Error('Template not found');
            }
            for (const recipient of recipients) {
                const variables = await this.getRecipientVariables(recipient.id);
                await this.sendEmail(recipient.id, recipient.email, campaign.templateId, variables);
            }
            await this.updateCampaign(campaignId, {
                status: 'SENT',
                sentAt: new Date(),
                totalRecipients: recipients.length
            });
        }
        catch (error) {
            await this.updateCampaign(campaignId, { status: 'FAILED' });
            throw error;
        }
    }
    static async getCampaignRecipients(campaign) {
        switch (campaign.recipientType) {
            case 'ALL_AFFILIATES':
                return await prisma.affiliateProfile.findMany({
                    include: {
                        user: true
                    }
                }).then(affiliates => affiliates.map(affiliate => ({
                    id: affiliate.id,
                    email: affiliate.user.email
                })));
            case 'SPECIFIC_AFFILIATES':
                return await prisma.affiliateProfile.findMany({
                    where: {
                        id: { in: campaign.recipientIds }
                    },
                    include: {
                        user: true
                    }
                }).then(affiliates => affiliates.map(affiliate => ({
                    id: affiliate.id,
                    email: affiliate.user.email
                })));
            default:
                return [];
        }
    }
    static async getRecipientVariables(affiliateId) {
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id: affiliateId },
            include: {
                user: true
            }
        });
        if (!affiliate) {
            return {};
        }
        return {
            firstName: affiliate.user.firstName,
            lastName: affiliate.user.lastName,
            email: affiliate.user.email,
            companyName: affiliate.companyName,
            totalEarnings: affiliate.totalEarnings,
            totalClicks: affiliate.totalClicks,
            totalConversions: affiliate.totalConversions
        };
    }
    static async updateMessageStatus(messageId, status, additionalData) {
        const updateData = { status };
        switch (status) {
            case 'SENT':
                updateData.sentAt = new Date();
                break;
            case 'DELIVERED':
                updateData.deliveredAt = new Date();
                break;
            case 'OPENED':
                updateData.openedAt = new Date();
                break;
            case 'CLICKED':
                updateData.clickedAt = new Date();
                break;
            case 'BOUNCED':
                updateData.bouncedAt = new Date();
                updateData.errorMessage = additionalData?.errorMessage;
                break;
            case 'FAILED':
                updateData.errorMessage = additionalData?.errorMessage;
                break;
        }
        return await prisma.emailMessage.update({
            where: { id: messageId },
            data: updateData
        });
    }
    static async getMessageStats(campaignId, startDate, endDate) {
        const where = {};
        if (campaignId)
            where.campaignId = campaignId;
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }
        const messages = await prisma.emailMessage.findMany({
            where
        });
        const stats = {
            total: messages.length,
            sent: 0,
            delivered: 0,
            opened: 0,
            clicked: 0,
            bounced: 0,
            failed: 0,
            openRate: 0,
            clickRate: 0,
            bounceRate: 0
        };
        messages.forEach(message => {
            switch (message.status) {
                case 'SENT':
                    stats.sent++;
                    break;
                case 'DELIVERED':
                    stats.delivered++;
                    break;
                case 'OPENED':
                    stats.opened++;
                    break;
                case 'CLICKED':
                    stats.clicked++;
                    break;
                case 'BOUNCED':
                    stats.bounced++;
                    break;
                case 'FAILED':
                    stats.failed++;
                    break;
            }
        });
        if (stats.delivered > 0) {
            stats.openRate = (stats.opened / stats.delivered) * 100;
            stats.clickRate = (stats.clicked / stats.delivered) * 100;
        }
        if (stats.sent > 0) {
            stats.bounceRate = (stats.bounced / stats.sent) * 100;
        }
        return stats;
    }
    static generateTrackingId() {
        return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    static async createDefaultTemplates() {
        const defaultTemplates = [
            {
                name: 'Welcome Email',
                type: 'WELCOME',
                subject: 'Welcome to {{companyName}} Affiliate Program!',
                htmlContent: `
          <h1>Welcome {{firstName}}!</h1>
          <p>Thank you for joining the {{companyName}} affiliate program.</p>
          <p>Your affiliate ID is: {{affiliateId}}</p>
          <p>You can start promoting our products and earn commissions.</p>
          <p>Best regards,<br>The {{companyName}} Team</p>
        `,
                textContent: 'Welcome {{firstName}}! Thank you for joining the {{companyName}} affiliate program.',
                variables: ['firstName', 'companyName', 'affiliateId']
            },
            {
                name: 'Commission Earned',
                type: 'COMMISSION_EARNED',
                subject: 'You earned ${{amount}} commission!',
                htmlContent: `
          <h1>Commission Earned!</h1>
          <p>Congratulations {{firstName}}!</p>
          <p>You have earned $\{\{amount\}\} commission from \{\{offerName\}\}.</p>
          <p>Your total earnings are now $\{\{totalEarnings\}\}.</p>
          <p>Keep up the great work!</p>
        `,
                textContent: 'Congratulations {{firstName}}! You earned ${{amount}} commission.',
                variables: ['firstName', 'amount', 'offerName', 'totalEarnings']
            },
            {
                name: 'Payout Processed',
                type: 'PAYOUT_PROCESSED',
                subject: 'Your payout of ${{amount}} has been processed',
                htmlContent: `
          <h1>Payout Processed</h1>
          <p>Hello {{firstName}},</p>
          <p>Your payout of $\{\{amount\}\} has been successfully processed via \{\{paymentMethod\}\}.</p>
          <p>Transaction ID: {{transactionId}}</p>
          <p>Thank you for your partnership!</p>
        `,
                textContent: 'Your payout of ${{amount}} has been processed.',
                variables: ['firstName', 'amount', 'paymentMethod', 'transactionId']
            }
        ];
        const createdTemplates = [];
        for (const templateData of defaultTemplates) {
            const template = await this.create(templateData);
            createdTemplates.push(template);
        }
        return createdTemplates;
    }
}
exports.EmailTemplateModel = EmailTemplateModel;
//# sourceMappingURL=EmailTemplate.js.map