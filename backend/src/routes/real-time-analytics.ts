import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();

// Get real-time metrics
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
    const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get active users (users who clicked in the last hour)
    const activeUsers = await prisma.click.groupBy({
      by: ['ipAddress'],
      where: {
        createdAt: {
          gte: lastHour
        }
      },
      _count: {
        ipAddress: true
      }
    });

    // Get live clicks in the last hour
    const liveClicks = await prisma.click.count({
      where: {
        createdAt: {
          gte: lastHour
        }
      }
    });

    // Get live conversions in the last hour
    const liveConversions = await prisma.conversion.count({
      where: {
        createdAt: {
          gte: lastHour
        }
      }
    });

    // Get live revenue in the last hour
    const liveRevenueResult = await prisma.conversion.aggregate({
      where: {
        createdAt: {
          gte: lastHour
        }
      },
      _sum: {
        customerValue: true
      }
    });

    res.json({
      activeUsers: activeUsers.length,
      liveClicks,
      liveConversions,
      liveRevenue: liveRevenueResult._sum.customerValue || 0
    });
  } catch (error) {
    console.error('Error fetching real-time metrics:', error);
    res.status(500).json({ error: 'Failed to fetch real-time metrics' });
  }
});

// Get live activity feed
router.get('/activity', async (req: Request, res: Response) => {
  try {
    const { limit = 20 } = req.query;
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    // Get recent clicks
    const recentClicks = await prisma.click.findMany({
      where: {
        createdAt: {
          gte: lastHour
        }
      },
      include: {
        affiliate: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        // affiliateLink relation not available in Click model
      },
        orderBy: {
          createdAt: 'desc'
        },
      take: Number(limit) / 2
    });

    // Get recent conversions
    const recentConversions = await prisma.conversion.findMany({
      where: {
        createdAt: {
          gte: lastHour
        }
      },
      include: {
        affiliate: {
          select: {
            user: {
              select: {
                firstName: true,
                lastName: true
              }
            }
          }
        },
        offer: {
          select: {
            name: true
          }
        }
      },
        orderBy: {
          createdAt: 'desc'
        },
      take: Number(limit) / 2
    });

    // Combine and format activity
    const activity = [
      ...recentClicks.map(click => ({
        id: `click-${click.id}`,
        type: 'click',
        user: click.affiliate?.user ? `${click.affiliate.user.firstName} ${click.affiliate.user.lastName}` : 'Anonymous',
        action: `Clicked link`,
        timestamp: click.createdAt,
        location: `${click.city || 'Unknown'}, ${click.country || 'Unknown'}`,
        device: click.device || 'Unknown',
        status: 'success'
      })),
      ...recentConversions.map(conversion => ({
        id: `conversion-${conversion.id}`,
        type: 'conversion',
        user: 'Anonymous', // affiliate relation not included
        action: `Converted`,
        timestamp: conversion.createdAt,
        location: 'Unknown', // Conversion doesn't have location data
        device: 'Unknown', // Conversion doesn't have device data
        status: 'success'
      }))
    ];

    // Sort by timestamp and limit
    activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json(activity.slice(0, Number(limit)));
  } catch (error) {
    console.error('Error fetching live activity:', error);
    res.status(500).json({ error: 'Failed to fetch live activity' });
  }
});

// Get geographic data
router.get('/geography', async (req: Request, res: Response) => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const countryStats = await prisma.click.groupBy({
      by: ['country'],
      where: {
        createdAt: {
          gte: lastHour
        },
        country: {
          not: null
        }
      },
      _count: {
        country: true
      },
      orderBy: {
        _count: {
          country: 'desc'
        }
      },
      take: 5
    });

    const totalClicks = countryStats.reduce((sum, country) => sum + country._count.country, 0);

    const topCountries = countryStats.map(country => ({
      country: country.country,
      clicks: country._count.country,
      percentage: totalClicks > 0 ? Math.round((country._count.country / totalClicks) * 100) : 0
    }));

    res.json({ topCountries });
  } catch (error) {
    console.error('Error fetching geography data:', error);
    res.status(500).json({ error: 'Failed to fetch geography data' });
  }
});

// Get device data
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const deviceStats = await prisma.click.groupBy({
      by: ['device'],
      where: {
        createdAt: {
          gte: lastHour
        },
        device: {
          not: null
        }
      },
      _count: {
        device: true
      },
      orderBy: {
        _count: {
          device: 'desc'
        }
      }
    });

    const totalClicks = deviceStats.reduce((sum, device) => sum + device._count.device, 0);

    const topDevices = deviceStats.map(device => ({
      device: device.device,
      clicks: device._count.device,
      percentage: totalClicks > 0 ? Math.round((device._count.device / totalClicks) * 100) : 0
    }));

    res.json({ topDevices });
  } catch (error) {
    console.error('Error fetching device data:', error);
    res.status(500).json({ error: 'Failed to fetch device data' });
  }
});

// Get browser data
router.get('/browsers', async (req: Request, res: Response) => {
  try {
    const lastHour = new Date(Date.now() - 60 * 60 * 1000);

    const browserStats = await prisma.click.groupBy({
      by: ['browser'],
      where: {
        createdAt: {
          gte: lastHour
        },
        browser: {
          not: null
        }
      },
      _count: {
        browser: true
      },
      orderBy: {
        _count: {
          browser: 'desc'
        }
      }
    });

    const totalClicks = browserStats.reduce((sum, browser) => sum + browser._count.browser, 0);

    const topBrowsers = browserStats.map(browser => ({
      browser: browser.browser,
      clicks: browser._count.browser,
      percentage: totalClicks > 0 ? Math.round((browser._count.browser / totalClicks) * 100) : 0
    }));

    res.json({ topBrowsers });
  } catch (error) {
    console.error('Error fetching browser data:', error);
    res.status(500).json({ error: 'Failed to fetch browser data' });
  }
});

// Get fraud alerts
router.get('/fraud-alerts', async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000);

    // Check for suspicious patterns
    const suspiciousIPs = await prisma.click.groupBy({
      by: ['ipAddress'],
      where: {
        createdAt: {
          gte: lastHour
        }
      },
      _count: {
        ipAddress: true
      },
      having: {
        ipAddress: {
          _count: {
            gt: 50 // More than 50 clicks in an hour
          }
        }
      }
    });

    // Check for traffic spikes
    const currentHourClicks = await prisma.click.count({
      where: {
        createdAt: {
          gte: lastHour
        }
      }
    });

    const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const previousHourClicks = await prisma.click.count({
      where: {
        createdAt: {
          gte: previousHour,
          lt: lastHour
        }
      }
    });

    const alerts = [];

    if (suspiciousIPs.length > 0) {
      alerts.push({
        type: 'suspicious_pattern',
        title: 'Suspicious Click Pattern',
        message: `${suspiciousIPs.length} IP addresses with unusual click patterns detected`,
        severity: 'high',
        createdAt: new Date()
      });
    }

    if (previousHourClicks > 0 && (currentHourClicks / previousHourClicks) > 3) {
      alerts.push({
        type: 'traffic_spike',
        title: 'Unusual Traffic Spike',
        message: `Traffic increased by ${Math.round((currentHourClicks / previousHourClicks - 1) * 100)}% in the last hour`,
        severity: 'medium',
        createdAt: new Date()
      });
    }

    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching fraud alerts:', error);
    res.status(500).json({ error: 'Failed to fetch fraud alerts' });
  }
});

export default router;
