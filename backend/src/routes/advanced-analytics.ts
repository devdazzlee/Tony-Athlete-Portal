import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router: Router = Router();
const prisma = new PrismaClient();

// Get funnel analysis data
router.get('/funnel', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, funnelId } = req.query;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Basic conversion funnel stages
    const visitors = await prisma.click.count({
      where: {
        createdAt: dateFilter
      }
    });

    const landingPageViews = await prisma.click.count({
      where: {
        createdAt: dateFilter,
        referrer: { not: null }
      }
    });

    const productViews = await prisma.click.count({
      where: {
        createdAt: dateFilter,
        referrer: { contains: 'product' }
      }
    });

    const addToCarts = await prisma.click.count({
      where: {
        createdAt: dateFilter,
        referrer: { contains: 'cart' }
      }
    });

    const checkouts = await prisma.click.count({
      where: {
        createdAt: dateFilter,
        referrer: { contains: 'checkout' }
      }
    });

    const purchases = await prisma.conversion.count({
      where: {
        createdAt: dateFilter,
        status: 'APPROVED'
      }
    });

    const funnelData = [
      { stage: "Visitors", count: visitors, percentage: 100, dropoff: 0 },
      { 
        stage: "Landing Page", 
        count: landingPageViews, 
        percentage: visitors > 0 ? Math.round((landingPageViews / visitors) * 100) : 0,
        dropoff: visitors > 0 ? Math.round(((visitors - landingPageViews) / visitors) * 100) : 0
      },
      { 
        stage: "Product View", 
        count: productViews, 
        percentage: visitors > 0 ? Math.round((productViews / visitors) * 100) : 0,
        dropoff: landingPageViews > 0 ? Math.round(((landingPageViews - productViews) / landingPageViews) * 100) : 0
      },
      { 
        stage: "Add to Cart", 
        count: addToCarts, 
        percentage: visitors > 0 ? Math.round((addToCarts / visitors) * 100) : 0,
        dropoff: productViews > 0 ? Math.round(((productViews - addToCarts) / productViews) * 100) : 0
      },
      { 
        stage: "Checkout", 
        count: checkouts, 
        percentage: visitors > 0 ? Math.round((checkouts / visitors) * 100) : 0,
        dropoff: addToCarts > 0 ? Math.round(((addToCarts - checkouts) / addToCarts) * 100) : 0
      },
      { 
        stage: "Purchase", 
        count: purchases, 
        percentage: visitors > 0 ? Math.round((purchases / visitors) * 100) : 0,
        dropoff: checkouts > 0 ? Math.round(((checkouts - purchases) / checkouts) * 100) : 0
      }
    ];

    res.json({
      funnelData,
      metrics: {
        overallConversionRate: visitors > 0 ? ((purchases / visitors) * 100).toFixed(1) : '0.0',
        biggestDropoff: funnelData.reduce((max, stage) => stage.dropoff > max.dropoff ? stage : max, funnelData[0])
      }
    });
  } catch (error) {
    console.error('Error fetching funnel data:', error);
    res.status(500).json({ error: 'Failed to fetch funnel data' });
  }
});

// Create funnel analysis
router.post('/funnel', async (req: Request, res: Response) => {
  try {
    const funnelSchema = z.object({
      name: z.string(),
      description: z.string(),
      stages: z.array(z.object({
        name: z.string(),
        condition: z.string()
      }))
    });

    const data = funnelSchema.parse(req.body);

    // In a real implementation, you would save this funnel configuration
    // For now, we'll just return a success response
    res.status(201).json({
      id: `funnel-${Date.now()}`,
      ...data,
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Error creating funnel:', error);
    res.status(400).json({ error: 'Failed to create funnel' });
  }
});

// Get cohort analysis data
router.get('/cohort', async (req: Request, res: Response) => {
  try {
    const { period = 'monthly', startDate, endDate } = req.query;

    // Get user cohorts based on first click date
    const cohorts = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${period}, MIN(c.timestamp)) as cohort_month,
        COUNT(DISTINCT c."affiliateId") as cohort_size,
        array_agg(DISTINCT c."affiliateId") as user_ids
      FROM "Click" c
      WHERE c."affiliateId" IS NOT NULL
      GROUP BY c."affiliateId"
      ORDER BY cohort_month DESC
      LIMIT 12
    ` as any[];

    const cohortData = [];

    for (const cohort of cohorts) {
      const cohortDate = new Date(cohort.cohort_month);
      const retention = [];

      // Calculate retention for each week/month after cohort start
      for (let period = 0; period < 8; period++) {
        const periodStart = new Date(cohortDate);
        const periodEnd = new Date(cohortDate);
        
        if (req.query.period === 'weekly') {
          periodStart.setDate(periodStart.getDate() + (period * 7));
          periodEnd.setDate(periodEnd.getDate() + ((period + 1) * 7));
        } else {
          periodStart.setMonth(periodStart.getMonth() + period);
          periodEnd.setMonth(periodEnd.getMonth() + period + 1);
        }

        const activeUsers = await prisma.click.count({
          where: {
            affiliateId: {
              in: cohort.user_ids
            },
            createdAt: {
              gte: periodStart,
              lt: periodEnd
            }
          }
        });

        const retentionRate = cohort.cohort_size > 0 ? Math.round((activeUsers / cohort.cohort_size) * 100) : 0;
        retention.push(retentionRate);
      }

      cohortData.push({
        cohort: cohortDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
        size: cohort.cohort_size,
        retention
      });
    }

    res.json({ cohortData });
  } catch (error) {
    console.error('Error fetching cohort data:', error);
    res.status(500).json({ error: 'Failed to fetch cohort data' });
  }
});

// Get attribution model comparison
router.get('/attribution', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    // Get conversions with click data for attribution analysis
    const conversions = await prisma.conversion.findMany({
      where: {
        createdAt: dateFilter,
        status: 'APPROVED'
      },
      include: {
        click: {
          include: {
            link: true
          }
        }
      }
    });

    const totalConversions = conversions.length;
    const totalRevenue = conversions.reduce((sum, conv) => sum + (conv.customerValue || 0), 0);

    const attributionModels = [
      {
        model: "First Click",
        conversions: totalConversions,
        revenue: totalRevenue,
        percentage: 100
      },
      {
        model: "Last Click",
        conversions: totalConversions,
        revenue: totalRevenue,
        percentage: 100
      },
      {
        model: "Linear",
        conversions: totalConversions,
        revenue: totalRevenue,
        percentage: 100
      },
      {
        model: "Time Decay",
        conversions: totalConversions,
        revenue: totalRevenue,
        percentage: 100
      },
      {
        model: "Position Based",
        conversions: totalConversions,
        revenue: totalRevenue,
        percentage: 100
      }
    ];

    res.json({ attributionData: attributionModels });
  } catch (error) {
    console.error('Error fetching attribution data:', error);
    res.status(500).json({ error: 'Failed to fetch attribution data' });
  }
});

// Get A/B tests
router.get('/ab-tests', async (req: Request, res: Response) => {
  try {
    // In a real implementation, you would have an ABTest model
    // For now, we'll return mock data that matches the frontend structure
    const abTests = [
      {
        id: "TEST-001",
        name: "Landing Page Headlines",
        status: "running",
        variants: [
          { name: "Control", visitors: 5000, conversions: 500, rate: 10.0 },
          { name: "Variant A", visitors: 5000, conversions: 650, rate: 13.0 }
        ],
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        confidence: 95.2
      },
      {
        id: "TEST-002",
        name: "CTA Button Colors",
        status: "completed",
        variants: [
          { name: "Control", visitors: 3000, conversions: 300, rate: 10.0 },
          { name: "Variant A", visitors: 3000, conversions: 360, rate: 12.0 }
        ],
        startDate: "2023-12-01",
        endDate: "2023-12-31",
        confidence: 98.7
      }
    ];

    res.json({ abTests });
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    res.status(500).json({ error: 'Failed to fetch A/B tests' });
  }
});

// Create A/B test
router.post('/ab-tests', async (req: Request, res: Response) => {
  try {
    const testSchema = z.object({
      name: z.string(),
      description: z.string(),
      variants: z.array(z.object({
        name: z.string(),
        config: z.any()
      })),
      startDate: z.string(),
      endDate: z.string(),
      trafficSplit: z.number().min(0).max(100)
    });

    const data = testSchema.parse(req.body);

    // In a real implementation, you would save this to the database
    const abTest = {
      id: `TEST-${Date.now()}`,
      ...data,
      status: 'draft',
      createdAt: new Date()
    };

    res.status(201).json(abTest);
  } catch (error) {
    console.error('Error creating A/B test:', error);
    res.status(400).json({ error: 'Failed to create A/B test' });
  }
});

// Update A/B test
router.put('/ab-tests/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const testSchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(['draft', 'running', 'paused', 'completed']).optional(),
      variants: z.array(z.object({
        name: z.string(),
        config: z.any()
      })).optional()
    });

    const data = testSchema.parse(req.body);

    // In a real implementation, you would update the database
    res.json({
      id,
      ...data,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Error updating A/B test:', error);
    res.status(400).json({ error: 'Failed to update A/B test' });
  }
});

// Delete A/B test
router.delete('/ab-tests/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would delete from the database
    res.json({ message: 'A/B test deleted successfully' });
  } catch (error) {
    console.error('Error deleting A/B test:', error);
    res.status(500).json({ error: 'Failed to delete A/B test' });
  }
});

export default router;


