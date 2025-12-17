import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface StatsParams {
  timeRange?: "7d" | "30d" | "90d" | "1y";
  startDate?: string;
  endDate?: string;
}

export interface PerformanceChartParams {
  timeRange?: "7d" | "30d" | "90d" | "1y";
  metric?: "clicks" | "conversions" | "revenue" | "commission";
  groupBy?: "day" | "week" | "month";
}

export class DashboardService {
  async getStats(userId: string, userRole: string, params: StatsParams) {
    const now = new Date();
    let startDate: Date;

    if (params.startDate && params.endDate) {
      startDate = new Date(params.startDate);
    } else {
      const days =
        params.timeRange === "7d"
          ? 7
          : params.timeRange === "30d"
            ? 30
            : params.timeRange === "90d"
              ? 90
              : 365;
      startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    }

    if (userRole === "AFFILIATE") {
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { userId },
      });

      if (!affiliate) {
        throw new Error("Affiliate profile not found");
      }

      // Get stats for the time period
      const [clicks, conversions, commissions, payouts] = await Promise.all([
        prisma.click.count({
          where: {
            affiliateId: affiliate.id,
            createdAt: { gte: startDate },
          },
        }),
        prisma.conversion.count({
          where: {
            affiliateId: affiliate.id,
            createdAt: { gte: startDate },
          },
        }),
        prisma.commission.aggregate({
          where: {
            affiliateId: affiliate.id,
            createdAt: { gte: startDate },
          },
          _sum: { amount: true },
        }),
        prisma.payout.aggregate({
          where: {
            affiliateId: affiliate.id,
            createdAt: { gte: startDate },
          },
          _sum: { amount: true },
        }),
      ]);

      return {
        totalClicks: clicks,
        totalConversions: conversions,
        totalEarnings: commissions._sum.amount || 0,
        totalPayouts: payouts._sum.amount || 0,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        availableBalance:
          affiliate.totalEarnings - (commissions._sum.amount || 0),
      };
    } else {
      // Admin/Manager stats
      const [
        totalAffiliates,
        totalClicks,
        totalConversions,
        totalRevenue,
        totalCommissions,
      ] = await Promise.all([
        prisma.affiliateProfile.count(),
        prisma.click.count({
          where: { createdAt: { gte: startDate } },
        }),
        prisma.conversion.count({
          where: { createdAt: { gte: startDate } },
        }),
        prisma.conversion.aggregate({
          where: { createdAt: { gte: startDate } },
          _sum: { customerValue: true },
        }),
        prisma.commission.aggregate({
          where: { createdAt: { gte: startDate } },
          _sum: { amount: true },
        }),
      ]);

      return {
        totalAffiliates,
        totalClicks,
        totalConversions,
        totalRevenue: totalRevenue._sum.customerValue || 0,
        totalCommissions: totalCommissions._sum.amount || 0,
        conversionRate:
          totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
      };
    }
  }

  async getRecentActivity(userId: string, limit: number) {
    const activities = await prisma.activity.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    return activities;
  }

  async getPerformanceChart(
    userId: string,
    userRole: string,
    params: PerformanceChartParams
  ) {
    const now = new Date();
    const days =
      params.timeRange === "7d"
        ? 7
        : params.timeRange === "30d"
          ? 30
          : params.timeRange === "90d"
            ? 90
            : 365;
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    let chartData: any[] = [];

    if (userRole === "AFFILIATE") {
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { userId },
      });

      if (!affiliate) {
        throw new Error("Affiliate profile not found");
      }

      // Generate chart data based on groupBy
      const groupBy = params.groupBy || "day";
      const interval = groupBy === "day" ? 1 : groupBy === "week" ? 7 : 30;

      for (let i = 0; i < days; i += interval) {
        const dateStart = new Date(
          startDate.getTime() + i * 24 * 60 * 60 * 1000
        );
        const dateEnd = new Date(
          startDate.getTime() + (i + interval) * 24 * 60 * 60 * 1000
        );

        const [clicks, conversions, revenue] = await Promise.all([
          prisma.click.count({
            where: {
              affiliateId: affiliate.id,
              createdAt: { gte: dateStart, lt: dateEnd },
            },
          }),
          prisma.conversion.count({
            where: {
              affiliateId: affiliate.id,
              createdAt: { gte: dateStart, lt: dateEnd },
            },
          }),
          prisma.conversion.aggregate({
            where: {
              affiliateId: affiliate.id,
              createdAt: { gte: dateStart, lt: dateEnd },
            },
            _sum: { customerValue: true },
          }),
        ]);

        chartData.push({
          date: dateStart.toISOString().split("T")[0],
          clicks,
          conversions,
          revenue: revenue._sum.customerValue || 0,
        });
      }
    } else {
      // Admin chart data
      const groupBy = params.groupBy || "day";
      const interval = groupBy === "day" ? 1 : groupBy === "week" ? 7 : 30;

      for (let i = 0; i < days; i += interval) {
        const dateStart = new Date(
          startDate.getTime() + i * 24 * 60 * 60 * 1000
        );
        const dateEnd = new Date(
          startDate.getTime() + (i + interval) * 24 * 60 * 60 * 1000
        );

        const [clicks, conversions, revenue] = await Promise.all([
          prisma.click.count({
            where: { createdAt: { gte: dateStart, lt: dateEnd } },
          }),
          prisma.conversion.count({
            where: { createdAt: { gte: dateStart, lt: dateEnd } },
          }),
          prisma.conversion.aggregate({
            where: { createdAt: { gte: dateStart, lt: dateEnd } },
            _sum: { customerValue: true },
          }),
        ]);

        chartData.push({
          date: dateStart.toISOString().split("T")[0],
          clicks,
          conversions,
          revenue: revenue._sum.customerValue || 0,
        });
      }
    }

    return chartData;
  }

  async getTopOffers(userId: string, userRole: string, limit: number) {
    if (userRole === "AFFILIATE") {
      const affiliate = await prisma.affiliateProfile.findUnique({
        where: { userId },
      });

      if (!affiliate) {
        throw new Error("Affiliate profile not found");
      }

      const offers = await prisma.offer.findMany({
        where: {
          applications: {
            some: {
              affiliateId: affiliate.id,
              status: "APPROVED",
            },
          },
        },
        include: {
          _count: {
            select: {
              conversions: true,
              links: true,
            },
          },
        },
        orderBy: {
          conversions: {
            _count: "desc",
          },
        },
        take: limit,
      });

      return offers.map((offer) => ({
        id: offer.id,
        name: offer.name,
        commissionRate: offer.commissionRate,
        totalClicks: offer.totalClicks,
        totalConversions: offer.totalConversions,
        conversionRate:
          offer.totalClicks > 0
            ? (offer.totalConversions / offer.totalClicks) * 100
            : 0,
      }));
    } else {
      // Admin top offers
      const offers = await prisma.offer.findMany({
        include: {
          _count: {
            select: {
              conversions: true,
              links: true,
            },
          },
        },
        orderBy: {
          conversions: {
            _count: "desc",
          },
        },
        take: limit,
      });

      return offers.map((offer) => ({
        id: offer.id,
        name: offer.name,
        commissionRate: offer.commissionRate,
        totalClicks: offer.totalClicks,
        totalConversions: offer.totalConversions,
        conversionRate:
          offer.totalClicks > 0
            ? (offer.totalConversions / offer.totalClicks) * 100
            : 0,
      }));
    }
  }

  async getNotifications(
    userId: string,
    page: number,
    limit: number,
    unreadOnly: boolean
  ) {
    const skip = (page - 1) * limit;
    const where: any = { userId };

    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async markNotificationAsRead(userId: string, notificationId: string) {
    await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: { read: true },
    });
  }
}
