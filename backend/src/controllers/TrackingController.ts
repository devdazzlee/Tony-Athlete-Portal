import { Request, Response } from "express";
import { TrackingService } from "../services/TrackingService";
import { z } from "zod";
import * as crypto from "crypto";

const trackingService = new TrackingService();

// Validation schemas
const trackEventsSchema = z.object({
  events: z.array(
    z.object({
      id: z.string(),
      event: z.string(),
      data: z.any(),
      timestamp: z.string(),
      sessionId: z.string(),
      userId: z.string().optional(),
      websiteId: z.string(),
      page: z.object({
        url: z.string(),
        title: z.string(),
        referrer: z.string().optional(),
        path: z.string(),
        search: z.string(),
        hash: z.string(),
      }),
      device: z.object({
        userAgent: z.string(),
        language: z.string(),
        platform: z.string(),
        screenWidth: z.number(),
        screenHeight: z.number(),
        viewportWidth: z.number(),
        viewportHeight: z.number(),
        colorDepth: z.number(),
        timezone: z.string(),
      }),
      browser: z.object({
        browser: z.string(),
        version: z.string(),
      }),
    })
  ),
  websiteId: z.string(),
  sessionId: z.string(),
  timestamp: z.string(),
});

const createWebsiteSchema = z.object({
  name: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().optional(),
  settings: z
    .object({
      trackClicks: z.boolean().default(true),
      trackScrolls: z.boolean().default(true),
      trackForms: z.boolean().default(true),
      trackPageViews: z.boolean().default(true),
      trackConversions: z.boolean().default(true),
      respectDoNotTrack: z.boolean().default(true),
      anonymizeIP: z.boolean().default(false),
    })
    .optional(),
});

const updateWebsiteSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  description: z.string().optional(),
  settings: z
    .object({
      trackClicks: z.boolean(),
      trackScrolls: z.boolean(),
      trackForms: z.boolean(),
      trackPageViews: z.boolean(),
      trackConversions: z.boolean(),
      respectDoNotTrack: z.boolean(),
      anonymizeIP: z.boolean(),
    })
    .optional(),
});

export class TrackingController {
  // Track events from CDN
  async trackEvents(req: Request, res: Response) {
    try {
      const data = trackEventsSchema.parse(req.body);

      // Transform data to match ProcessEventsData interface
      const processData = {
        events: data.events.map((event) => ({
          id: event.id || crypto.randomUUID(),
          event: event.event,
          data: event.data,
          timestamp: event.timestamp,
          sessionId: event.sessionId,
          userId: event.userId,
          websiteId: event.websiteId,
          page: {
            url: event.page?.url || "",
            title: event.page?.title || "",
            referrer: event.page?.referrer,
            path: event.page?.path || "",
            search: event.page?.search || "",
            hash: event.page?.hash || "",
          },
          device: {
            userAgent: event.device?.userAgent || "",
            language: event.device?.language || "en",
            platform: event.device?.platform || "unknown",
            screenWidth: event.device?.screenWidth || 1920,
            screenHeight: event.device?.screenHeight || 1080,
            viewportWidth: event.device?.viewportWidth || 1920,
            viewportHeight: event.device?.viewportHeight || 1080,
            colorDepth: event.device?.colorDepth || 24,
            timezone: event.device?.timezone || "UTC",
          },
          browser: {
            browser: event.browser?.browser || "unknown",
            version: event.browser?.version || "1.0",
          },
          eventType: event.event,
          trackingCodeId: "default",
          ipAddress: "",
          userAgent: "",
          referrer: "",
        })),
        websiteId: data.events[0]?.websiteId || "",
        sessionId: data.events[0]?.sessionId || "",
        timestamp: data.events[0]?.timestamp || new Date().toISOString(),
      };

      // Process events
      const result = await trackingService.processEvents(processData);

      res.json({
        success: true,
        processed: result.processed,
        failed: result.failed,
        message: "Events processed successfully",
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({
          error: "Invalid event data",
          details: error.errors,
        });
      }

      console.error("Tracking error:", error);
      res.status(500).json({ error: "Failed to process events" });
    }
  }

  // Get tracking statistics
  async getTrackingStats(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const {
        startDate,
        endDate,
        groupBy = "day",
        timezone = "UTC",
      } = req.query;

      const stats = await trackingService.getTrackingStats(websiteId, {
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string,
        timezone: timezone as string,
      });

      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get real-time analytics
  async getRealtimeAnalytics(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const analytics = await trackingService.getRealtimeAnalytics(websiteId);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get page analytics
  async getPageAnalytics(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const {
        startDate,
        endDate,
        limit = 50,
        sortBy = "views",
        sortOrder = "desc",
      } = req.query;

      const analytics = await trackingService.getPageAnalytics(websiteId, {
        startDate: startDate as string,
        endDate: endDate as string,
        limit: parseInt(limit as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as string,
      });

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get device analytics
  async getDeviceAnalytics(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const { startDate, endDate, groupBy = "browser" } = req.query;

      const analytics = await trackingService.getDeviceAnalytics(websiteId, {
        startDate: startDate as string,
        endDate: endDate as string,
        groupBy: groupBy as string,
      });

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get geographic analytics
  async getGeographicAnalytics(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const { startDate, endDate, groupBy = "country" } = req.query;

      const analytics = await trackingService.getGeographicAnalytics(
        websiteId,
        {
          startDate: startDate as string,
          endDate: endDate as string,
          groupBy: groupBy as string,
        }
      );

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get conversion analytics
  async getConversionAnalytics(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const { startDate, endDate, conversionType } = req.query;

      const analytics = await trackingService.getConversionAnalytics(
        websiteId,
        {
          startDate: startDate as string,
          endDate: endDate as string,
          conversionType: conversionType as string,
        }
      );

      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get user journey
  async getUserJourney(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const { sessionId, userId, startDate, endDate } = req.query;

      const journey = await trackingService.getUserJourney(websiteId, {
        sessionId: sessionId as string,
        userId: userId as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json(journey);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get heatmap data
  async getHeatmapData(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const { page, startDate, endDate } = req.query;

      const heatmap = await trackingService.getHeatmapData(websiteId, {
        page: page as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json(heatmap);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Get funnel analysis
  async getFunnelAnalysis(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const { steps, startDate, endDate } = req.query;

      const funnel = await trackingService.getFunnelAnalysis(websiteId, {
        steps: steps as string,
        startDate: startDate as string,
        endDate: endDate as string,
      });

      res.json(funnel);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  // Export tracking data
  async exportTrackingData(req: Request, res: Response) {
    try {
      const { websiteId } = req.params;
      const { startDate, endDate, format = "csv", eventTypes } = req.query;

      const exportData = await trackingService.exportTrackingData(websiteId, {
        startDate: startDate as string,
        endDate: endDate as string,
        format: format as string,
        eventTypes: eventTypes as string,
      });

      // Set appropriate headers for download
      const filename = `tracking-data-${websiteId}-${Date.now()}.${format}`;
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${filename}"`
      );
      res.setHeader(
        "Content-Type",
        format === "csv" ? "text/csv" : "application/json"
      );

      res.send(exportData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
