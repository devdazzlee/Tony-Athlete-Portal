import { PrismaClient } from "@prisma/client";
import { z } from "zod";

const prisma = new PrismaClient();

interface TrackingEvent {
  id: string;
  event: string;
  data: any;
  timestamp: string;
  sessionId: string;
  userId?: string;
  websiteId: string;
  page: {
    url: string;
    title: string;
    referrer?: string;
    path: string;
    search: string;
    hash: string;
  };
  device: {
    userAgent: string;
    language: string;
    platform: string;
    screenWidth: number;
    screenHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    colorDepth: number;
    timezone: string;
  };
  browser: {
    browser: string;
    version: string;
  };
}

interface ProcessEventsData {
  events: TrackingEvent[];
  websiteId: string;
  sessionId: string;
  timestamp: string;
}

export class TrackingService {
  // Process tracking events
  async processEvents(data: ProcessEventsData) {
    const { events, websiteId, sessionId } = data;
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      try {
        await this.processEvent(event);
        processed++;
      } catch (error) {
        console.error("Failed to process event:", error);
        failed++;
      }
    }

    return { processed, failed };
  }

  // Process individual event
  private async processEvent(event: TrackingEvent) {
    const {
      id,
      event: eventType,
      data,
      timestamp,
      sessionId,
      userId,
      websiteId,
      page,
      device,
      browser,
    } = event;

    // Create or update session
    await this.upsertSession({
      id: sessionId,
      websiteId,
      userId,
      startTime: timestamp,
      lastActivity: timestamp,
      userAgent: device.userAgent,
      ipAddress: "", // Will be filled by middleware
      country: "Unknown",
      city: "Unknown",
    });

    // Store event
    await this.storeEvent({
      id,
      eventType,
      data,
      timestamp,
      sessionId,
      userId,
      websiteId,
      page,
      device,
      browser,
      event: eventType,
      trackingCodeId: "default",
      ipAddress: "",
      userAgent: "",
      referrer: "",
    });

    // Update website statistics
    await this.updateWebsiteStats(websiteId, eventType, timestamp);
  }

  // Upsert session
  private async upsertSession(sessionData: {
    id: string;
    websiteId: string;
    userId?: string;
    startTime: string;
    lastActivity: string;
    userAgent: string;
    ipAddress: string;
    country: string;
    city: string;
  }) {
    await prisma.trackingSession.upsert({
      where: { sessionId: sessionData.id },
      update: {
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress,
        country: sessionData.country,
        city: sessionData.city,
        updatedAt: new Date(),
      },
      create: {
        sessionId: sessionData.id,
        websiteId: sessionData.websiteId,
        userId: sessionData.userId,
        startTime: new Date(sessionData.startTime),
        userAgent: sessionData.userAgent,
        ipAddress: sessionData.ipAddress,
        country: sessionData.country,
        city: sessionData.city,
      },
    });
  }

  // Store event
  private async storeEvent(eventData: {
    id: string;
    eventType: string;
    data: any;
    timestamp: string;
    sessionId: string;
    userId?: string;
    websiteId: string;
    page: any;
    device: any;
    browser: any;
    event: string;
    trackingCodeId: string;
    ipAddress: string;
    userAgent: string;
    referrer: string;
  }) {
    await prisma.trackingEvent.create({
      data: {
        trackingCodeId: eventData.trackingCodeId || "default",
        eventType: eventData.eventType,
        event: eventData.event,
        data: eventData.data,
        timestamp: new Date(eventData.timestamp),
        sessionId: eventData.sessionId,
        websiteId: eventData.websiteId,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        referrer: eventData.referrer,
      },
    });
  }

  // Update website statistics
  private async updateWebsiteStats(
    websiteId: string,
    eventType: string,
    timestamp: string
  ) {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split("T")[0];

    await prisma.trackingStats.upsert({
      where: {
        websiteId_date: {
          websiteId,
          date: new Date(dateStr),
        },
      },
      update: {
        pageViews: eventType === "page_view" ? { increment: 1 } : undefined,
        events:
          eventType === "click" || eventType === "conversion"
            ? { increment: 1 }
            : undefined,
        conversions: eventType === "conversion" ? { increment: 1 } : undefined,
      },
      create: {
        websiteId,
        date: new Date(dateStr),
        pageViews: eventType === "page_view" ? 1 : 0,
        uniqueVisitors: 0,
        sessions: 0,
        events: eventType === "click" || eventType === "conversion" ? 1 : 0,
        conversions: eventType === "conversion" ? 1 : 0,
        revenue: 0,
        bounceRate: 0,
        avgSessionDuration: 0,
      },
    });
  }

  // Get tracking statistics
  async getTrackingStats(
    websiteId: string,
    options: {
      startDate?: string;
      endDate?: string;
      groupBy?: string;
      timezone?: string;
    }
  ) {
    const { startDate, endDate, groupBy = "day" } = options;

    let whereClause: any = { websiteId };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) whereClause.date.gte = startDate;
      if (endDate) whereClause.date.lte = endDate;
    }

    const stats = await prisma.trackingStats.findMany({
      where: whereClause,
      orderBy: { date: "asc" },
    });

    // Group by specified period
    const groupedStats = this.groupStatsByPeriod(stats, groupBy);

    return {
      websiteId,
      period: { startDate, endDate, groupBy },
      stats: groupedStats,
      summary: this.calculateSummary(stats),
    };
  }

  // Get real-time analytics
  async getRealtimeAnalytics(websiteId: string) {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [activeSessions, recentEvents, topPages] = await Promise.all([
      // Active sessions in the last hour
      prisma.trackingSession.count({
        where: {
          websiteId,
          updatedAt: { gte: oneHourAgo },
        },
      }),

      // Recent events
      prisma.trackingEvent.findMany({
        where: {
          websiteId,
          timestamp: { gte: oneHourAgo },
        },
        orderBy: { timestamp: "desc" },
        take: 50,
      }),

      // Top pages in the last hour
      prisma.trackingEvent.findMany({
        where: {
          websiteId,
          eventType: "page_view",
          timestamp: { gte: oneHourAgo },
        },
        select: {
          data: true,
          timestamp: true,
        },
        orderBy: { timestamp: "desc" },
        take: 100,
      }),
    ]);

    return {
      websiteId,
      timestamp: now.toISOString(),
      activeSessions,
      recentEvents: recentEvents.map((event) => ({
        id: event.id,
        eventType: event.eventType,
        timestamp: event.timestamp,
        page: (event.data as any)?.page || null,
        data: event.data,
      })),
      topPages: topPages.map((page) => ({
        page: (page.data as any)?.page || null,
        views: 1,
      })),
    };
  }

  // Get page analytics
  async getPageAnalytics(
    websiteId: string,
    options: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
    }
  ) {
    const {
      startDate,
      endDate,
      limit = 50,
      sortBy = "views",
      sortOrder = "desc",
    } = options;

    let whereClause: any = {
      websiteId,
      eventType: "page_view",
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const pageStats = await prisma.trackingEvent.findMany({
      where: whereClause,
      select: {
        data: true,
        timestamp: true,
      },
      orderBy: { timestamp: sortOrder as "asc" | "desc" },
      take: limit,
    });

    // Group by page URL manually
    const pageGroups: { [key: string]: { views: number; avgTime: number } } =
      {};
    pageStats.forEach((event) => {
      const pageUrl = (event.data as any)?.page?.url || "unknown";
      if (!pageGroups[pageUrl]) {
        pageGroups[pageUrl] = { views: 0, avgTime: 0 };
      }
      pageGroups[pageUrl].views++;
    });

    const result = Object.entries(pageGroups)
      .map(([page, stats]) => ({
        page,
        views: stats.views,
        avgTime: stats.avgTime,
      }))
      .sort((a, b) => {
        if (sortBy === "views") {
          return sortOrder === "desc" ? b.views - a.views : a.views - b.views;
        }
        return 0;
      });

    return result;
  }

  // Get device analytics
  async getDeviceAnalytics(
    websiteId: string,
    options: {
      startDate?: string;
      endDate?: string;
      groupBy?: string;
    }
  ) {
    const { startDate, endDate, groupBy = "browser" } = options;

    let whereClause: any = { websiteId };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const deviceStats = await prisma.trackingEvent.findMany({
      where: whereClause,
      select: {
        data: true,
        timestamp: true,
      },
      take: 1000,
    });

    // Group by device type manually
    const deviceGroups: { [key: string]: number } = {};
    deviceStats.forEach((event) => {
      const deviceType = (event.data as any)?.device?.platform || "unknown";
      deviceGroups[deviceType] = (deviceGroups[deviceType] || 0) + 1;
    });

    return Object.entries(deviceGroups).map(([device, count]) => ({
      [groupBy]: device,
      count,
    }));
  }

  // Get geographic analytics
  async getGeographicAnalytics(
    websiteId: string,
    options: {
      startDate?: string;
      endDate?: string;
      groupBy?: string;
    }
  ) {
    const { startDate, endDate, groupBy = "country" } = options;

    let whereClause: any = { websiteId };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const geoStats = await prisma.trackingSession.groupBy({
      by: [groupBy as "country" | "city" | "device" | "browser" | "os"],
      where: whereClause,
      _count: { id: true },
    });

    return geoStats.map((stat) => ({
      [groupBy]: stat[groupBy as keyof typeof stat],
      count: stat._count.id,
    }));
  }

  // Get conversion analytics
  async getConversionAnalytics(
    websiteId: string,
    options: {
      startDate?: string;
      endDate?: string;
      conversionType?: string;
    }
  ) {
    const { startDate, endDate, conversionType } = options;

    let whereClause: any = {
      websiteId,
      eventType: "conversion",
    };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const conversions = await prisma.trackingEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
    });

    return conversions.map((conversion) => ({
      id: conversion.id,
      timestamp: conversion.timestamp,
      data: conversion.data,
      page: (conversion.data as any)?.page || null,
    }));
  }

  // Get user journey
  async getUserJourney(
    websiteId: string,
    options: {
      sessionId?: string;
      userId?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const { sessionId, userId, startDate, endDate } = options;

    let whereClause: any = { websiteId };

    if (sessionId) whereClause.sessionId = sessionId;
    if (userId) whereClause.userId = userId;
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const events = await prisma.trackingEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: "asc" },
    });

    return events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      timestamp: event.timestamp,
      page: (event.data as any)?.page || null,
      data: event.data,
    }));
  }

  // Get heatmap data
  async getHeatmapData(
    websiteId: string,
    options: {
      page?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const { page, startDate, endDate } = options;

    let whereClause: any = {
      websiteId,
      eventType: "click",
    };

    if (page) whereClause.page = { path: page };
    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const clicks = await prisma.trackingEvent.findMany({
      where: whereClause,
      select: { data: true },
    });

    // Process click positions for heatmap
    const heatmapData = clicks
      .filter(
        (click) =>
          click.data &&
          typeof click.data === "object" &&
          "position" in click.data
      )
      .map((click) => ({
        x: (click.data as any).position?.x || 0,
        y: (click.data as any).position?.y || 0,
      }));

    return {
      page,
      clicks: heatmapData,
      totalClicks: heatmapData.length,
    };
  }

  // Get funnel analysis
  async getFunnelAnalysis(
    websiteId: string,
    options: {
      steps?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const { steps, startDate, endDate } = options;

    // Parse steps from query parameter
    const stepList = steps
      ? steps.split(",")
      : ["page_view", "click", "conversion"];

    let whereClause: any = { websiteId };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    const funnelData = await Promise.all(
      stepList.map(async (step, index) => {
        const count = await prisma.trackingEvent.count({
          where: {
            ...whereClause,
            eventType: step,
          },
        });

        return {
          step: index + 1,
          eventType: step,
          count,
          conversionRate: index === 0 ? 100 : 0, // Will be calculated properly
        };
      })
    );

    // Calculate conversion rates
    const firstStepCount = funnelData[0]?.count || 0;
    funnelData.forEach((step, index) => {
      if (index > 0 && firstStepCount > 0) {
        step.conversionRate = (step.count / firstStepCount) * 100;
      }
    });

    return {
      steps: funnelData,
      totalSteps: stepList.length,
    };
  }

  // Export tracking data
  async exportTrackingData(
    websiteId: string,
    options: {
      startDate?: string;
      endDate?: string;
      format?: string;
      eventTypes?: string;
    }
  ) {
    const { startDate, endDate, format = "csv", eventTypes } = options;

    let whereClause: any = { websiteId };

    if (startDate || endDate) {
      whereClause.timestamp = {};
      if (startDate) whereClause.timestamp.gte = new Date(startDate);
      if (endDate) whereClause.timestamp.lte = new Date(endDate);
    }

    if (eventTypes) {
      const types = eventTypes.split(",");
      whereClause.eventType = { in: types };
    }

    const events = await prisma.trackingEvent.findMany({
      where: whereClause,
      orderBy: { timestamp: "desc" },
    });

    if (format === "csv") {
      return this.convertToCSV(events);
    } else {
      return JSON.stringify(events, null, 2);
    }
  }

  // Helper methods
  private groupStatsByPeriod(stats: any[], groupBy: string) {
    // Implementation for grouping stats by period
    return stats;
  }

  private calculateSummary(stats: any[]) {
    return {
      totalPageViews: stats.reduce((sum, stat) => sum + stat.pageViews, 0),
      totalClicks: stats.reduce((sum, stat) => sum + stat.clicks, 0),
      totalConversions: stats.reduce((sum, stat) => sum + stat.conversions, 0),
      totalEvents: stats.reduce((sum, stat) => sum + stat.otherEvents, 0),
    };
  }

  private convertToCSV(events: any[]) {
    const headers = [
      "id",
      "eventType",
      "timestamp",
      "sessionId",
      "userId",
      "page",
      "data",
    ];
    const csvRows = [headers.join(",")];

    events.forEach((event) => {
      const row = headers.map((header) => {
        const value = event[header];
        return typeof value === "object" ? JSON.stringify(value) : value;
      });
      csvRows.push(row.join(","));
    });

    return csvRows.join("\n");
  }
}
