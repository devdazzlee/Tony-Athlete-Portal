import express, { Router } from "express";
import { authenticateToken } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get real-time clicks
router.get("/clicks", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { period = "24h", page = 1, limit = 50 } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "1h":
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get clicks data
    const clicks = await prisma.affiliateClick.findMany({
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
      },
      include: {
        affiliate: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    });

    const total = await prisma.affiliateClick.count({
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
      },
    });

    // Get summary stats
    const [totalClicks, uniqueVisitors, topReferrers] = await Promise.all([
      prisma.affiliateClick.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
      }),

      prisma.affiliateClick
        .groupBy({
          by: ["ipAddress"],
          where: {
            affiliateId: affiliate.id,
            createdAt: { gte: startDate },
          },
        })
        .then((result) => result.length),

      prisma.affiliateClick.groupBy({
        by: ["referrer"],
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
          referrer: { not: null },
        },
        _count: { referrer: true },
        orderBy: { _count: { referrer: "desc" } },
        take: 10,
      }),
    ]);

    // Format clicks data
    const formattedClicks = clicks.map((click) => ({
      id: click.id,
      timestamp: click.createdAt,
      referralCode: click.referralCode,
      storeId: click.storeId,
      url: click.url,
      referrer: click.referrer || "Direct",
      userAgent: click.userAgent,
      ipAddress: click.ipAddress,
      utmSource: click.utmSource,
      utmMedium: click.utmMedium,
      utmCampaign: click.utmCampaign,
      country: "Unknown", // You can implement geolocation
      device: getDeviceType(click.userAgent || ""),
      browser: getBrowserType(click.userAgent || ""),
    }));

    res.json({
      data: formattedClicks,
      summary: {
        totalClicks,
        uniqueVisitors,
        topReferrers: topReferrers.map((r) => ({
          referrer: r.referrer || "Direct",
          clicks: r._count.referrer,
        })),
      },
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Error fetching clicks:", error);
    res.status(500).json({ error: "Failed to fetch clicks data" });
  }
});

// Get conversions log
router.get("/conversions", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { period = "30d", page = 1, limit = 50 } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Get conversions (affiliate orders)
    const conversions = await prisma.affiliateOrder.findMany({
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: parseInt(limit as string),
    });

    const total = await prisma.affiliateOrder.count({
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
      },
    });

    // Get summary stats
    const [
      totalConversions,
      totalRevenueAggregate,
      totalCommissionAggregate,
      totalClicks,
    ] = await Promise.all([
      prisma.affiliateOrder.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
      }),

      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
        _sum: { orderValue: true },
      }),

      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
        _sum: { commissionAmount: true },
      }),

      prisma.affiliateClick.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
      }),
    ]);

    const conversionRate =
      totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Format conversions data
    const formattedConversions = conversions.map((order) => ({
      id: `ORD-${String(order.orderId).slice(-8).toUpperCase()}`,
      date: order.createdAt.toISOString().replace("T", " ").split(".")[0],
      clickId: order.orderId || order.id,
      status: order.status,
      referralType: "Sale",
      commissionAmount: order.commissionAmount || 0,
      customerValue: order.orderValue || 0,
      offer: order.storeId || order.referralCode,
      customerEmail: order.customerEmail || "Anonymous",
      referralCode: order.referralCode,
    }));

    res.json({
      data: formattedConversions,
      summary: {
        totalConversions,
        totalRevenue: totalRevenueAggregate._sum.orderValue || 0,
        totalCommission: totalCommissionAggregate._sum.commissionAmount || 0,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (error) {
    console.error("Error fetching conversions:", error);
    res.status(500).json({ error: "Failed to fetch conversions data" });
  }
});

// Get traffic analysis
router.get("/traffic", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { period = "30d" } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    let days: number;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        days = 7;
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        days = 90;
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        days = 30;
    }

    // Get traffic data by source (utm source) and direct traffic
    const trackedSources = await prisma.affiliateClick.groupBy({
      by: ["utmSource"],
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
        NOT: [
          { utmSource: null },
          { utmSource: "" },
        ],
      },
      _count: { utmSource: true },
      orderBy: { _count: { utmSource: "desc" } },
    });

    const directClicksCount = await prisma.affiliateClick.count({
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
        OR: [{ utmSource: null }, { utmSource: "" }],
      },
    });

    // Get traffic data by device
    const trafficByDevice = await prisma.affiliateClick.groupBy({
      by: ["userAgent"],
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
      },
      _count: { userAgent: true },
    });

    // Process device data
    const deviceStats = {
      desktop: 0,
      mobile: 0,
      tablet: 0,
    };

    trafficByDevice.forEach((device) => {
      const userAgent = (device.userAgent || "").toLowerCase();
      const count = device._count.userAgent;

      if (!userAgent) {
        deviceStats.desktop += count;
        return;
      }

      if (
        userAgent.includes("ipad") ||
        userAgent.includes("tablet") ||
        (userAgent.includes("android") && !userAgent.includes("mobile"))
      ) {
        deviceStats.tablet += count;
      } else if (
        userAgent.includes("mobi") ||
        userAgent.includes("iphone") ||
        userAgent.includes("android")
      ) {
        deviceStats.mobile += count;
      } else {
        deviceStats.desktop += count;
      }
    });

    // Get daily traffic data
    const dailyTraffic = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(date.setHours(0, 0, 0, 0));
      const endOfDay = new Date(date.setHours(23, 59, 59, 999));

      const dayClicks = await prisma.affiliateClick.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startOfDay, lte: endOfDay },
        },
      });

      const dayUniqueVisitors = await prisma.affiliateClick
        .groupBy({
          by: ["ipAddress"],
          where: {
            affiliateId: affiliate.id,
            createdAt: { gte: startOfDay, lte: endOfDay },
          },
        })
        .then((result) => result.length);

      dailyTraffic.push({
        date: startOfDay.toISOString().split("T")[0],
        clicks: dayClicks,
        uniqueVisitors: dayUniqueVisitors,
        bounceRate: Math.random() * 30 + 20, // Mock bounce rate
      });
    }

    // Get top pages
    const topPages = await prisma.affiliateClick.groupBy({
      by: ["url"],
      where: {
        affiliateId: affiliate.id,
        createdAt: { gte: startDate },
      },
      _count: { url: true },
      orderBy: { _count: { url: "desc" } },
      take: 10,
    });

    const trafficBySource = [
      ...trackedSources.map((source) => ({
        source: source.utmSource || "Unknown",
        clicks: source._count.utmSource,
        percentage: 0, // calculated on frontend
      })),
    ];

    if (directClicksCount > 0) {
      trafficBySource.push({
        source: "Direct",
        clicks: directClicksCount,
        percentage: 0,
      });
    }

    const totalClicksForPeriod =
      trafficBySource.reduce((sum, source) => sum + source.clicks, 0) || 0;

    res.json({
      period,
      summary: {
        totalClicks: totalClicksForPeriod,
        uniqueVisitors: await prisma.affiliateClick
          .groupBy({
            by: ["ipAddress"],
            where: {
              affiliateId: affiliate.id,
              createdAt: { gte: startDate },
            },
          })
          .then((result) => result.length),
        avgSessionDuration: Math.random() * 300 + 60, // Mock session duration
        bounceRate: Math.random() * 30 + 20,
      },
      trafficBySource,
      deviceStats,
      dailyTraffic,
      topPages: topPages.map((page) => ({
        url: page.url,
        clicks: page._count.url,
        percentage: 0, // Will be calculated on frontend
      })),
    });
  } catch (error) {
    console.error("Error fetching traffic analysis:", error);
    res.status(500).json({ error: "Failed to fetch traffic analysis" });
  }
});

// Get performance metrics
router.get("/performance", authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.id;
    const { period = "30d" } = req.query;

    const affiliate = await prisma.affiliateProfile.findFirst({
      where: { userId },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate profile not found" });
    }

    const referralCodes = await prisma.referralCode.findMany({
      where: { affiliateId: affiliate.id },
    });

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get performance metrics
    const [
      totalClicks,
      totalConversions,
      revenueAggregate,
      avgOrderAggregate,
    ] = await Promise.all([
      prisma.affiliateClick.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
      }),

      prisma.affiliateOrder.count({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
      }),

      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
        _sum: { orderValue: true, commissionAmount: true },
      }),

      prisma.affiliateOrder.aggregate({
        where: {
          affiliateId: affiliate.id,
          createdAt: { gte: startDate },
        },
        _avg: { orderValue: true },
      }),
    ]);

    const totalRevenueValue = revenueAggregate._sum.orderValue || 0;
    const conversionRate =
      totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
    const revenuePerClick =
      totalClicks > 0 ? totalRevenueValue / totalClicks : 0;

    // Get performance by referral code
    const performanceByCode = await Promise.all(
      referralCodes.map(async (code) => {
        const [clicks, conversions, revenue] = await Promise.all([
          prisma.affiliateClick.count({
            where: {
              affiliateId: affiliate.id,
              referralCode: code.code,
              createdAt: { gte: startDate },
            },
          }),

          prisma.affiliateOrder.count({
            where: {
              affiliateId: affiliate.id,
              referralCode: code.code,
              createdAt: { gte: startDate },
            },
          }),

          prisma.affiliateOrder.aggregate({
            where: {
              affiliateId: affiliate.id,
              referralCode: code.code,
              createdAt: { gte: startDate },
            },
            _sum: { orderValue: true },
          }),
        ]);

        const codeConversionRate =
          clicks > 0 ? (conversions / clicks) * 100 : 0;

        return {
          referralCode: code.code,
          clicks,
          conversions,
          revenue: revenue._sum.orderValue || 0,
          conversionRate: Math.round(codeConversionRate * 100) / 100,
          commissionRate: code.commissionRate,
        };
      })
    );

    res.json({
      period,
      metrics: {
        totalClicks,
        totalConversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalRevenue: totalRevenueValue,
        avgOrderValue: avgOrderAggregate._avg.orderValue || 0,
        revenuePerClick: Math.round(revenuePerClick * 100) / 100,
      },
      performanceByCode: performanceByCode.sort(
        (a, b) => b.revenue - a.revenue
      ),
    });
  } catch (error) {
    console.error("Error fetching performance metrics:", error);
    res.status(500).json({ error: "Failed to fetch performance metrics" });
  }
});

// Helper functions
function getDeviceType(userAgent: string): string {
  if (userAgent.includes("Mobile")) return "Mobile";
  if (userAgent.includes("Tablet") || userAgent.includes("iPad"))
    return "Tablet";
  return "Desktop";
}

function getBrowserType(userAgent: string): string {
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Safari")) return "Safari";
  if (userAgent.includes("Edge")) return "Edge";
  return "Other";
}

export default router;
