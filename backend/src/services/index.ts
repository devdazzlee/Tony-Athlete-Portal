import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// Payment service
export class PaymentService {
  async createPayout(affiliateId: string, amount: number, method: string) {
    try {
      // Create payout record
      const payout = await prisma.payout.create({
        data: {
          affiliateId,
          amount,
          method: method as any,
          status: "PENDING",
        },
      });

      // Process payment based on method
      // TODO: Implement PayPal payout processing if needed
      // if (method === 'PAYPAL') {
      //   // PayPal payout logic here
      // }

      return payout;
    } catch (error) {
      console.error("Payment processing error:", error);
      throw error;
    }
  }

  async processWebhook(payload: any, signature: string) {
    try {
      // TODO: Implement PayPal webhook processing if needed
      // PayPal webhook verification and processing logic here
      return { success: true };
    } catch (error) {
      console.error("Webhook processing error:", error);
      throw error;
    }
  }
}

// Analytics service
export class AnalyticsService {
  async getFunnelAnalysis(
    offerId?: string,
    dateRange?: { start: Date; end: Date },
  ) {
    const where: any = {};
    if (offerId) {
      where.offerId = offerId;
    }
    if (dateRange) {
      where.createdAt = {
        gte: dateRange.start,
        lte: dateRange.end,
      };
    }

    const clicks = await prisma.click.count({ where });
    const conversions = await prisma.conversion.count({ where });

    return {
      totalClicks: clicks,
      totalConversions: conversions,
      conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
    };
  }

  async getCohortAnalysis(startDate: Date, endDate: Date) {
    // Get users who registered in the cohort period
    const cohortUsers = await prisma.user.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        role: "AFFILIATE",
      },
      include: {
        affiliateProfile: true,
      },
    });

    // Calculate retention for each week
    const cohorts = [];
    for (let week = 0; week < 8; week++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const activeUsers = await prisma.click
        .groupBy({
          by: ["affiliateId"],
          where: {
            affiliateId: {
              in: cohortUsers
                .map((u) => u.affiliateProfile?.id)
                .filter(Boolean),
            },
            createdAt: {
              gte: weekStart,
              lt: weekEnd,
            },
          },
        })
        .then((result) => result.length);

      cohorts.push({
        week,
        activeUsers,
        retentionRate:
          cohortUsers.length > 0 ? (activeUsers / cohortUsers.length) * 100 : 0,
      });
    }

    return cohorts;
  }

  async getAttributionData(conversionId: string) {
    const conversion = await prisma.conversion.findUnique({
      where: { id: conversionId },
      include: {
        click: {
          include: {
            link: {
              include: {
                offer: true,
              },
            },
          },
        },
      },
    });

    if (!conversion) {
      throw new Error("Conversion not found");
    }

    // Get all clicks for this affiliate in the attribution window (30 days)
    const attributionWindow = new Date(conversion.createdAt);
    attributionWindow.setDate(attributionWindow.getDate() - 30);

    const attributionClicks = await prisma.click.findMany({
      where: {
        affiliateId: conversion.affiliateId,
        createdAt: {
          gte: attributionWindow,
          lte: conversion.createdAt,
        },
      },
      include: {
        link: {
          include: {
            offer: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      conversion,
      attributionClicks,
      firstClick: attributionClicks[0],
      lastClick: attributionClicks[attributionClicks.length - 1],
    };
  }
}

// Security service
export class SecurityService {
  async generate2FASecret(userId: string) {
    const secret = crypto.randomBytes(32).toString("base64");

    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false,
      },
    });

    return secret;
  }

  async verify2FAToken(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.twoFactorSecret) {
      throw new Error("2FA not set up");
    }

    // Simple TOTP verification (in production, use a proper TOTP library)
    const expectedToken = this.generateTOTP(user.twoFactorSecret);
    return token === expectedToken;
  }

  private generateTOTP(secret: string): string {
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const time = Math.floor(epoch / 30);
    const hash = crypto
      .createHmac("sha1", Buffer.from(secret, "base64"))
      .update(Buffer.from(time.toString(16).padStart(16, "0"), "hex"))
      .digest("hex");

    const offset = parseInt(hash.slice(-1), 16);
    const otp =
      (parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff) % 1000000;

    return otp.toString().padStart(6, "0");
  }

  async logSecurityEvent(
    userId: string,
    event: string,
    details: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return prisma.activity.create({
      data: {
        userId,
        action: event,
        resource: "Security",
        details,
        ipAddress,
        userAgent,
      },
    });
  }
}

// Automation service
export class AutomationService {
  async triggerWorkflow(workflowId: string, triggerData: any) {
    // Get workflow configuration
    const workflow = await prisma.activity.findFirst({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error("Workflow not found");
    }

    // Execute workflow steps
    // This is a simplified implementation
    console.log(`Executing workflow ${workflowId} with data:`, triggerData);

    return { success: true, workflowId };
  }

  async createAutomationRule(ruleData: any) {
    // Create automation rule
    const rule = await prisma.trafficRule.create({
      data: {
        name: ruleData.name,
        description: ruleData.description,
        type: ruleData.type,
        conditions: ruleData.conditions,
        action: ruleData.action,
        status: "ACTIVE",
      },
    });

    return rule;
  }
}

// Integration service
export class IntegrationService {
  async syncShopifyProducts(shopDomain: string, apiKey: string) {
    // Shopify integration logic
    console.log(`Syncing products from ${shopDomain}`);
    return { success: true, productsSynced: 0 };
  }

  async syncMailchimpList(listId: string, apiKey: string) {
    // Mailchimp integration logic
    console.log(`Syncing Mailchimp list ${listId}`);
    return { success: true, subscribersSynced: 0 };
  }

  async createWebhook(url: string, events: string[], secret: string) {
    const webhook = await prisma.webhook.create({
      data: {
        name: `Webhook ${Date.now()}`,
        url,
        events,
        secret,
        status: "ACTIVE",
      },
    });

    return webhook;
  }

  async triggerWebhook(webhookId: string, event: string, data: any) {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.events.includes(event)) {
      throw new Error("Webhook not found or event not supported");
    }

    // Send webhook request
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Secret": webhook.secret,
        "X-Webhook-Event": event,
      },
      body: JSON.stringify(data),
    });

    // Update webhook statistics
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        totalCalls: { increment: 1 },
        lastTriggered: new Date(),
        successRate: response.ok
          ? (webhook.successRate * webhook.totalCalls + 100) /
            (webhook.totalCalls + 1)
          : (webhook.successRate * webhook.totalCalls) /
            (webhook.totalCalls + 1),
      },
    });

    return { success: response.ok, status: response.status };
  }
}

// Export services — emailService uses hardcoded SMTP from EmailService.ts
export { EmailService } from "./EmailService";
import emailServiceDefault from "./EmailService";
export const emailService = emailServiceDefault;
export const paymentService = new PaymentService();
export const analyticsService = new AnalyticsService();
export const securityService = new SecurityService();
export const automationService = new AutomationService();
export const integrationService = new IntegrationService();
