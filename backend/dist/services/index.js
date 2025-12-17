"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationService = exports.automationService = exports.securityService = exports.analyticsService = exports.paymentService = exports.emailService = exports.IntegrationService = exports.AutomationService = exports.SecurityService = exports.AnalyticsService = exports.PaymentService = exports.EmailService = void 0;
const client_1 = require("@prisma/client");
const nodemailer_1 = __importDefault(require("nodemailer"));
const stripe_1 = __importDefault(require("stripe"));
const crypto_1 = __importDefault(require("crypto"));
const prisma = new client_1.PrismaClient();
const stripe = new stripe_1.default(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-06-20',
});
class EmailService {
    constructor() {
        this.transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
    }
    async sendWelcomeEmail(email, firstName) {
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Welcome to Trackdesk!',
            html: `
        <h1>Welcome to Trackdesk, ${firstName}!</h1>
        <p>Your account has been successfully created.</p>
        <p>You can now start tracking your affiliate links and earning commissions.</p>
        <p>Best regards,<br>The Trackdesk Team</p>
      `
        };
        return this.transporter.sendMail(mailOptions);
    }
    async sendCommissionNotification(email, amount) {
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'New Commission Earned!',
            html: `
        <h1>Congratulations!</h1>
        <p>You've earned a new commission of $${amount.toFixed(2)}!</p>
        <p>Check your dashboard for more details.</p>
        <p>Best regards,<br>The Trackdesk Team</p>
      `
        };
        return this.transporter.sendMail(mailOptions);
    }
    async sendPayoutNotification(email, amount, method) {
        const mailOptions = {
            from: process.env.SMTP_FROM,
            to: email,
            subject: 'Payout Processed',
            html: `
        <h1>Payout Processed</h1>
        <p>Your payout of $${amount.toFixed(2)} has been processed via ${method}.</p>
        <p>You should receive the funds within 1-3 business days.</p>
        <p>Best regards,<br>The Trackdesk Team</p>
      `
        };
        return this.transporter.sendMail(mailOptions);
    }
}
exports.EmailService = EmailService;
class PaymentService {
    async createPayout(affiliateId, amount, method) {
        try {
            const payout = await prisma.payout.create({
                data: {
                    affiliateId,
                    amount,
                    method: method,
                    status: 'PENDING'
                }
            });
            if (method === 'STRIPE') {
                const affiliate = await prisma.affiliateProfile.findUnique({
                    where: { id: affiliateId },
                    include: { user: true }
                });
                if (affiliate?.paymentEmail) {
                    const transfer = await stripe.transfers.create({
                        amount: Math.round(amount * 100),
                        currency: 'usd',
                        destination: affiliate.paymentEmail,
                        metadata: {
                            payoutId: payout.id,
                            affiliateId: affiliateId
                        }
                    });
                    await prisma.payout.update({
                        where: { id: payout.id },
                        data: {
                            referenceId: transfer.id,
                            status: 'PROCESSING'
                        }
                    });
                }
            }
            return payout;
        }
        catch (error) {
            console.error('Payment processing error:', error);
            throw error;
        }
    }
    async processWebhook(payload, signature) {
        try {
            const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
            switch (event.type) {
                case 'transfer.created':
                    const transfer = event.data.object;
                    await prisma.payout.updateMany({
                        where: { referenceId: transfer.id },
                        data: { status: 'COMPLETED', processedAt: new Date() }
                    });
                    break;
                case 'transfer.failed':
                    const failedTransfer = event.data.object;
                    await prisma.payout.updateMany({
                        where: { referenceId: failedTransfer.id },
                        data: { status: 'FAILED' }
                    });
                    break;
            }
            return { success: true };
        }
        catch (error) {
            console.error('Webhook processing error:', error);
            throw error;
        }
    }
}
exports.PaymentService = PaymentService;
class AnalyticsService {
    async getFunnelAnalysis(offerId, dateRange) {
        const where = {};
        if (offerId) {
            where.offerId = offerId;
        }
        if (dateRange) {
            where.createdAt = {
                gte: dateRange.start,
                lte: dateRange.end
            };
        }
        const clicks = await prisma.click.count({ where });
        const conversions = await prisma.conversion.count({ where });
        return {
            totalClicks: clicks,
            totalConversions: conversions,
            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0
        };
    }
    async getCohortAnalysis(startDate, endDate) {
        const cohortUsers = await prisma.user.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                },
                role: 'AFFILIATE'
            },
            include: {
                affiliateProfile: true
            }
        });
        const cohorts = [];
        for (let week = 0; week < 8; week++) {
            const weekStart = new Date(startDate);
            weekStart.setDate(weekStart.getDate() + (week * 7));
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekEnd.getDate() + 7);
            const activeUsers = await prisma.click.groupBy({
                by: ['affiliateId'],
                where: {
                    affiliateId: { in: cohortUsers.map(u => u.affiliateProfile?.id).filter(Boolean) },
                    createdAt: {
                        gte: weekStart,
                        lt: weekEnd
                    }
                }
            }).then(result => result.length);
            cohorts.push({
                week,
                activeUsers,
                retentionRate: cohortUsers.length > 0 ? (activeUsers / cohortUsers.length) * 100 : 0
            });
        }
        return cohorts;
    }
    async getAttributionData(conversionId) {
        const conversion = await prisma.conversion.findUnique({
            where: { id: conversionId },
            include: {
                click: {
                    include: {
                        link: {
                            include: {
                                offer: true
                            }
                        }
                    }
                }
            }
        });
        if (!conversion) {
            throw new Error('Conversion not found');
        }
        const attributionWindow = new Date(conversion.createdAt);
        attributionWindow.setDate(attributionWindow.getDate() - 30);
        const attributionClicks = await prisma.click.findMany({
            where: {
                affiliateId: conversion.affiliateId,
                createdAt: {
                    gte: attributionWindow,
                    lte: conversion.createdAt
                }
            },
            include: {
                link: {
                    include: {
                        offer: true
                    }
                }
            },
            orderBy: { createdAt: 'asc' }
        });
        return {
            conversion,
            attributionClicks,
            firstClick: attributionClicks[0],
            lastClick: attributionClicks[attributionClicks.length - 1]
        };
    }
}
exports.AnalyticsService = AnalyticsService;
class SecurityService {
    async generate2FASecret(userId) {
        const secret = crypto_1.default.randomBytes(32).toString('base64');
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: secret,
                twoFactorEnabled: false
            }
        });
        return secret;
    }
    async verify2FAToken(userId, token) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user?.twoFactorSecret) {
            throw new Error('2FA not set up');
        }
        const expectedToken = this.generateTOTP(user.twoFactorSecret);
        return token === expectedToken;
    }
    generateTOTP(secret) {
        const epoch = Math.round(new Date().getTime() / 1000.0);
        const time = Math.floor(epoch / 30);
        const hash = crypto_1.default.createHmac('sha1', Buffer.from(secret, 'base64'))
            .update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'))
            .digest('hex');
        const offset = parseInt(hash.slice(-1), 16);
        const otp = (parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff) % 1000000;
        return otp.toString().padStart(6, '0');
    }
    async logSecurityEvent(userId, event, details, ipAddress, userAgent) {
        return prisma.activity.create({
            data: {
                userId,
                action: event,
                resource: 'Security',
                details,
                ipAddress,
                userAgent
            }
        });
    }
}
exports.SecurityService = SecurityService;
class AutomationService {
    async triggerWorkflow(workflowId, triggerData) {
        const workflow = await prisma.activity.findFirst({
            where: { id: workflowId }
        });
        if (!workflow) {
            throw new Error('Workflow not found');
        }
        console.log(`Executing workflow ${workflowId} with data:`, triggerData);
        return { success: true, workflowId };
    }
    async createAutomationRule(ruleData) {
        const rule = await prisma.trafficRule.create({
            data: {
                name: ruleData.name,
                description: ruleData.description,
                type: ruleData.type,
                conditions: ruleData.conditions,
                action: ruleData.action,
                status: 'ACTIVE'
            }
        });
        return rule;
    }
}
exports.AutomationService = AutomationService;
class IntegrationService {
    async syncShopifyProducts(shopDomain, apiKey) {
        console.log(`Syncing products from ${shopDomain}`);
        return { success: true, productsSynced: 0 };
    }
    async syncMailchimpList(listId, apiKey) {
        console.log(`Syncing Mailchimp list ${listId}`);
        return { success: true, subscribersSynced: 0 };
    }
    async createWebhook(url, events, secret) {
        const webhook = await prisma.webhook.create({
            data: {
                name: `Webhook ${Date.now()}`,
                url,
                events,
                secret,
                status: 'ACTIVE'
            }
        });
        return webhook;
    }
    async triggerWebhook(webhookId, event, data) {
        const webhook = await prisma.webhook.findUnique({
            where: { id: webhookId }
        });
        if (!webhook || !webhook.events.includes(event)) {
            throw new Error('Webhook not found or event not supported');
        }
        const response = await fetch(webhook.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': webhook.secret,
                'X-Webhook-Event': event
            },
            body: JSON.stringify(data)
        });
        await prisma.webhook.update({
            where: { id: webhookId },
            data: {
                totalCalls: { increment: 1 },
                lastTriggered: new Date(),
                successRate: response.ok ?
                    (webhook.successRate * webhook.totalCalls + 100) / (webhook.totalCalls + 1) :
                    (webhook.successRate * webhook.totalCalls) / (webhook.totalCalls + 1)
            }
        });
        return { success: response.ok, status: response.status };
    }
}
exports.IntegrationService = IntegrationService;
exports.emailService = new EmailService();
exports.paymentService = new PaymentService();
exports.analyticsService = new AnalyticsService();
exports.securityService = new SecurityService();
exports.automationService = new AutomationService();
exports.integrationService = new IntegrationService();
//# sourceMappingURL=index.js.map