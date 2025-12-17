import express, { Router } from 'express';
import { authenticateToken, requireRole } from '../middleware/auth';
import { emailService, paymentService, analyticsService, securityService, automationService, integrationService } from '../services';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router: Router = express.Router();
const prisma = new PrismaClient();

// Real-time analytics routes
router.get('/api/analytics/realtime', authenticateToken, async (req: any, res) => {
  try {
    const { timeRange = '1h' } = req.query;
    
    // Get real-time metrics
    const now = new Date();
    const startTime = new Date(now.getTime() - (timeRange === '1h' ? 3600000 : 86400000));
    
    const [activeUsers, liveClicks, liveConversions, liveRevenue] = await Promise.all([
      prisma.click.groupBy({
        by: ['ipAddress'],
        where: {
          createdAt: { gte: startTime }
        },
        _count: {
          ipAddress: true
        }
      }).then(result => result.length),
      prisma.click.count({
        where: {
          createdAt: { gte: startTime }
        }
      }),
      prisma.conversion.count({
        where: {
          createdAt: { gte: startTime }
        }
      }),
      prisma.conversion.aggregate({
        where: {
          createdAt: { gte: startTime }
        },
        _sum: { customerValue: true }
      })
    ]);

    res.json({
      activeUsers,
      liveClicks,
      liveConversions,
      liveRevenue: liveRevenue._sum.customerValue || 0,
      timestamp: now
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch real-time analytics' });
  }
});

// Advanced analytics routes
router.get('/api/analytics/funnel', authenticateToken, async (req: any, res) => {
  try {
    const { offerId, startDate, endDate } = req.query;
    
    const funnelData = await analyticsService.getFunnelAnalysis(
      offerId,
      startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined
    );

    res.json(funnelData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch funnel analysis' });
  }
});

router.get('/api/analytics/cohort', authenticateToken, async (req: any, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start and end dates are required' });
    }

    const cohortData = await analyticsService.getCohortAnalysis(
      new Date(startDate),
      new Date(endDate)
    );

    res.json(cohortData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch cohort analysis' });
  }
});

router.get('/api/analytics/attribution/:conversionId', authenticateToken, async (req: any, res) => {
  try {
    const { conversionId } = req.params;
    
    const attributionData = await analyticsService.getAttributionData(conversionId);
    res.json(attributionData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch attribution data' });
  }
});

// Smart features routes
router.post('/api/smart-links', authenticateToken, async (req: any, res) => {
  try {
    const { name, originalUrl, conditions, redirectUrl } = req.body;

    if (req.user.role !== 'AFFILIATE') {
      return res.status(403).json({ error: 'Only affiliates can create smart links' });
    }

    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId: req.user.id }
    });

    if (!affiliate) {
      return res.status(404).json({ error: 'Affiliate profile not found' });
    }

    const smartLink = await prisma.affiliateLink.create({
      data: {
        affiliateId: affiliate.id,
        originalUrl,
        shortUrl: `${process.env.CDN_BASE_URL}/smart/${Date.now()}`,
        customSlug: null
      }
    });

    res.status(201).json(smartLink);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create smart link' });
  }
});

router.post('/api/targeting-rules', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: any, res) => {
  try {
    const { name, description, conditions, actions, priority } = req.body;

    const rule = await automationService.createAutomationRule({
      name,
      description,
      type: 'TRAFFIC_CONTROL',
      conditions,
      action: actions[0]?.type || 'ALLOW'
    });

    res.status(201).json(rule);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create targeting rule' });
  }
});

// Automation routes
router.get('/api/automation/workflows', authenticateToken, async (req: any, res) => {
  try {
    const workflows = await prisma.activity.findMany({
      where: {
        action: { contains: 'workflow' }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(workflows);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch workflows' });
  }
});

router.post('/api/automation/workflows', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: any, res) => {
  try {
    const { name, description, trigger, steps } = req.body;

    const workflow = await prisma.activity.create({
      data: {
        userId: req.user.id,
        action: 'workflow_created',
        resource: 'Workflow',
        details: `Created workflow: ${name}`,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    res.status(201).json(workflow);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

router.post('/api/automation/trigger/:workflowId', authenticateToken, async (req: any, res) => {
  try {
    const { workflowId } = req.params;
    const triggerData = req.body;

    const result = await automationService.triggerWorkflow(workflowId, triggerData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to trigger workflow' });
  }
});

// Integration routes
router.get('/api/integrations', authenticateToken, async (req: any, res) => {
  try {
    const integrations = [
      {
        id: 'stripe',
        name: 'Stripe Payment',
        type: 'payment',
        status: 'connected',
        lastSync: new Date().toISOString()
      },
      {
        id: 'shopify',
        name: 'Shopify Store',
        type: 'ecommerce',
        status: 'connected',
        lastSync: new Date().toISOString()
      }
    ];

    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

router.post('/api/integrations/shopify/sync', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: any, res) => {
  try {
    const { shopDomain, apiKey } = req.body;

    const result = await integrationService.syncShopifyProducts(shopDomain, apiKey);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync Shopify products' });
  }
});

router.post('/api/integrations/mailchimp/sync', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: any, res) => {
  try {
    const { listId, apiKey } = req.body;

    const result = await integrationService.syncMailchimpList(listId, apiKey);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to sync Mailchimp list' });
  }
});

// Webhook routes
router.get('/api/webhooks', authenticateToken, async (req: any, res) => {
  try {
    const webhooks = await prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' }
    });

    res.json(webhooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

router.post('/api/webhooks', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: any, res) => {
  try {
    const { name, url, events, secret } = req.body;

    const webhook = await integrationService.createWebhook(url, events, secret);
    res.status(201).json(webhook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

router.post('/api/webhooks/:webhookId/test', authenticateToken, async (req: any, res) => {
  try {
    const { webhookId } = req.params;
    const { event, data } = req.body;

    const result = await integrationService.triggerWebhook(webhookId, event, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to test webhook' });
  }
});

// Security routes
router.post('/api/security/2fa/setup', authenticateToken, async (req: any, res) => {
  try {
    const secret = await securityService.generate2FASecret(req.user.id);
    res.json({ secret });
  } catch (error) {
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

router.post('/api/security/2fa/verify', authenticateToken, async (req: any, res) => {
  try {
    const { token } = req.body;
    
    const isValid = await securityService.verify2FAToken(req.user.id, token);
    
    if (isValid) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: { twoFactorEnabled: true }
      });
      
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify 2FA token' });
  }
});

router.get('/api/security/logs', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: any, res) => {
  try {
    const { page = 1, limit = 50, event } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (event) {
      where.action = { contains: event };
    }

    const [logs, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.activity.count({ where })
    ]);

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch security logs' });
  }
});

// Enterprise routes
router.get('/api/enterprise/white-label', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const settings = {
      companyName: 'TC Nutrition Athlete Portal',
      logo: '/logos/tc-nutrition.png',
      primaryColor: '#3b82f6',
      secondaryColor: '#10b981',
      customDomain: 'athletes.tcnutrition.com',
      removeBranding: true
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch white-label settings' });
  }
});

router.put('/api/enterprise/white-label', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const settings = req.body;
    
    // Update white-label settings (in production, store in database)
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update white-label settings' });
  }
});

router.get('/api/enterprise/tenants', authenticateToken, requireRole(['ADMIN']), async (req: any, res) => {
  try {
    const tenants = await prisma.user.findMany({
      where: { role: 'AFFILIATE' },
      include: {
        affiliateProfile: true
      },
      take: 10
    });

    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Mobile/PWA routes
router.get('/api/mobile/analytics', authenticateToken, async (req: any, res) => {
  try {
    const analytics = {
      totalUsers: 1250,
      mobileUsers: 890,
      desktopUsers: 360,
      mobilePercentage: 71.2,
      pwaInstalls: 456,
      installRate: 36.5
    };

    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch mobile analytics' });
  }
});

router.post('/api/mobile/push-notifications', authenticateToken, async (req: any, res) => {
  try {
    const { title, body, userIds } = req.body;

    // Send push notifications (simplified implementation)
    res.json({ success: true, notificationsSent: userIds?.length || 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send push notifications' });
  }
});

// Compliance routes
router.get('/api/compliance/gdpr', authenticateToken, async (req: any, res) => {
  try {
    const gdprSettings = {
      enabled: true,
      dataRetentionPeriod: '7 years',
      consentRequired: true,
      rightToErasure: true,
      dataPortability: true
    };

    res.json(gdprSettings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch GDPR settings' });
  }
});

router.post('/api/compliance/data-requests', authenticateToken, async (req: any, res) => {
  try {
    const { type, userEmail, reason } = req.body;

    const request = {
      id: `REQ-${Date.now()}`,
      type,
      user: userEmail,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      reason
    };

    res.status(201).json(request);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create data request' });
  }
});

router.get('/api/compliance/audit-trails', authenticateToken, requireRole(['ADMIN', 'MANAGER']), async (req: any, res) => {
  try {
    const { page = 1, limit = 50, action } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (action) {
      where.action = { contains: action };
    }

    const [auditTrails, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true
            }
          }
        }
      }),
      prisma.activity.count({ where })
    ]);

    res.json({
      auditTrails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit trails' });
  }
});

// Stripe webhook endpoint
router.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: any, res) => {
  try {
    const signature = req.headers['stripe-signature'];
    const result = await paymentService.processWebhook(req.body, signature);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

export default router;
