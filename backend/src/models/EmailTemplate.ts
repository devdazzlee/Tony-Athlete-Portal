import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

export class EmailTemplateModel {
  static async create(data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    return await (prisma as any).emailTemplate.create({
      data: {
        name: data.name!,
        type: data.type!,
        subject: data.subject!,
        htmlContent: data.htmlContent!,
        textContent: data.textContent || '',
        variables: data.variables || [],
        status: data.status || 'ACTIVE'
      }
    }) as EmailTemplate;
  }

  static async findById(id: string): Promise<EmailTemplate | null> {
    return await (prisma as any).emailTemplate.findUnique({
      where: { id }
    }) as EmailTemplate | null;
  }

  static async findByType(type: string): Promise<EmailTemplate | null> {
    return await (prisma as any).emailTemplate.findFirst({
      where: { 
        type: type as any,
        status: 'ACTIVE'
      }
    }) as EmailTemplate | null;
  }

  static async update(id: string, data: Partial<EmailTemplate>): Promise<EmailTemplate> {
    return await (prisma as any).emailTemplate.update({
      where: { id },
      data
    }) as EmailTemplate;
  }

  static async delete(id: string): Promise<void> {
    await (prisma as any).emailTemplate.delete({
      where: { id }
    });
  }

  static async list(filters: any = {}): Promise<EmailTemplate[]> {
    const where: any = {};
    
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return await (prisma as any).emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    }) as EmailTemplate[];
  }

  static async renderTemplate(templateId: string, variables: Record<string, any>): Promise<{ subject: string; htmlContent: string; textContent: string }> {
    const template = await this.findById(templateId);
    if (!template) {
      throw new Error('Email template not found');
    }

    let subject = template.subject;
    let htmlContent = template.htmlContent;
    let textContent = template.textContent;

    // Replace variables in template
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const stringValue = String(value || '');
      
      subject = subject.replace(new RegExp(placeholder, 'g'), stringValue);
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), stringValue);
      textContent = textContent.replace(new RegExp(placeholder, 'g'), stringValue);
    }

    return { subject, htmlContent, textContent };
  }

  static async createCampaign(data: Partial<EmailCampaign>): Promise<EmailCampaign> {
    return await (prisma as any).emailCampaign.create({
      data: {
        name: data.name!,
        description: data.description || '',
        templateId: data.templateId!,
        recipientType: data.recipientType!,
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
    }) as EmailCampaign;
  }

  static async findCampaignById(id: string): Promise<EmailCampaign | null> {
    return await (prisma as any).emailCampaign.findUnique({
      where: { id }
    }) as EmailCampaign | null;
  }

  static async updateCampaign(id: string, data: Partial<EmailCampaign>): Promise<EmailCampaign> {
    return await (prisma as any).emailCampaign.update({
      where: { id },
      data
    }) as EmailCampaign;
  }

  static async deleteCampaign(id: string): Promise<void> {
    await (prisma as any).emailCampaign.delete({
      where: { id }
    });
  }

  static async listCampaigns(filters: any = {}, page: number = 1, limit: number = 10): Promise<EmailCampaign[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.recipientType) where.recipientType = filters.recipientType;

    return await (prisma as any).emailCampaign.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }) as EmailCampaign[];
  }

  static async sendEmail(recipientId: string, recipientEmail: string, templateId: string, variables: Record<string, any>): Promise<EmailMessage> {
    const { subject, htmlContent, textContent } = await this.renderTemplate(templateId, variables);
    
    const trackingId = this.generateTrackingId();
    
    const message = await (prisma as any).emailMessage.create({
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
    }) as EmailMessage;

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll just mark it as sent
    await this.updateMessageStatus(message.id, 'SENT');

    return message;
  }

  static async sendCampaign(campaignId: string): Promise<void> {
    const campaign = await this.findCampaignById(campaignId);
    if (!campaign) {
      throw new Error('Campaign not found');
    }

    if (campaign.status !== 'DRAFT' && campaign.status !== 'SCHEDULED') {
      throw new Error('Campaign is not in a sendable state');
    }

    // Update campaign status
    await this.updateCampaign(campaignId, { status: 'SENDING' });

    try {
      // Get recipients based on campaign type
      const recipients = await this.getCampaignRecipients(campaign);
      
      // Get template
      const template = await this.findById(campaign.templateId);
      if (!template) {
        throw new Error('Template not found');
      }

      // Send emails to all recipients
      for (const recipient of recipients) {
        const variables = await this.getRecipientVariables(recipient.id);
        await this.sendEmail(recipient.id, recipient.email, campaign.templateId, variables);
      }

      // Update campaign status
      await this.updateCampaign(campaignId, { 
        status: 'SENT',
        sentAt: new Date(),
        totalRecipients: recipients.length
      });

    } catch (error) {
      // Update campaign status to failed
      await this.updateCampaign(campaignId, { status: 'FAILED' });
      throw error;
    }
  }

  private static async getCampaignRecipients(campaign: EmailCampaign): Promise<Array<{ id: string; email: string }>> {
    switch (campaign.recipientType) {
      case 'ALL_AFFILIATES':
        return await prisma.affiliateProfile.findMany({
          include: {
            user: true
          }
        }).then(affiliates => 
          affiliates.map(affiliate => ({
            id: affiliate.id,
            email: affiliate.user.email
          }))
        );
      
      case 'SPECIFIC_AFFILIATES':
        return await prisma.affiliateProfile.findMany({
          where: {
            id: { in: campaign.recipientIds }
          },
          include: {
            user: true
          }
        }).then(affiliates => 
          affiliates.map(affiliate => ({
            id: affiliate.id,
            email: affiliate.user.email
          }))
        );
      
      default:
        return [];
    }
  }

  private static async getRecipientVariables(affiliateId: string): Promise<Record<string, any>> {
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

  static async updateMessageStatus(messageId: string, status: string, additionalData?: any): Promise<EmailMessage> {
    const updateData: any = { status };
    
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

    return await (prisma as any).emailMessage.update({
      where: { id: messageId },
      data: updateData
    }) as EmailMessage;
  }

  static async getMessageStats(campaignId?: string, startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    
    if (campaignId) where.campaignId = campaignId;
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const messages = await (prisma as any).emailMessage.findMany({
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

    // Calculate rates
    if (stats.delivered > 0) {
      stats.openRate = (stats.opened / stats.delivered) * 100;
      stats.clickRate = (stats.clicked / stats.delivered) * 100;
    }
    
    if (stats.sent > 0) {
      stats.bounceRate = (stats.bounced / stats.sent) * 100;
    }

    return stats;
  }

  private static generateTrackingId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static async createDefaultTemplates(): Promise<EmailTemplate[]> {
    const defaultTemplates = [
      {
        name: 'Welcome Email',
        type: 'WELCOME' as const,
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
        type: 'COMMISSION_EARNED' as const,
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
        type: 'PAYOUT_PROCESSED' as const,
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

    const createdTemplates: EmailTemplate[] = [];
    for (const templateData of defaultTemplates) {
      const template = await this.create(templateData);
      createdTemplates.push(template);
    }

    return createdTemplates;
  }
}


