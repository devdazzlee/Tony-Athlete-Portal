import { Request, Response } from 'express';
import { AnalyticsService } from '../services/AnalyticsService';
import { z } from 'zod';

const analyticsService = new AnalyticsService();

const getRealTimeAnalyticsSchema = z.object({
  timeRange: z.enum(['1h', '24h', '7d']).optional()
});

const getFunnelAnalysisSchema = z.object({
  offerId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const getCohortAnalysisSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

const getPerformanceAnalyticsSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
  metric: z.enum(['clicks', 'conversions', 'revenue', 'commission']).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
});

const getGeographicAnalyticsSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const getDeviceAnalyticsSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const createCustomReportSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  metrics: z.array(z.string()),
  filters: z.record(z.any()),
  schedule: z.string().optional()
});

const updateCustomReportSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  metrics: z.array(z.string()).optional(),
  filters: z.record(z.any()).optional(),
  schedule: z.string().optional()
});

export class AnalyticsController {
  async getRealTimeAnalytics(req: any, res: Response) {
    try {
      const params = getRealTimeAnalyticsSchema.parse(req.query);
      const analytics = await analyticsService.getRealTimeAnalytics(params);
      res.json(analytics);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getRealTimeActivity(req: any, res: Response) {
    try {
      const { limit = 20 } = req.query;
      const activity = await analyticsService.getRealTimeActivity(parseInt(limit));
      res.json(activity);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getRealTimeMetrics(req: any, res: Response) {
    try {
      const metrics = await analyticsService.getRealTimeMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFunnelAnalysis(req: any, res: Response) {
    try {
      const params = getFunnelAnalysisSchema.parse(req.query);
      const analysis = await analyticsService.getFunnelAnalysis(params);
      res.json(analysis);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getCohortAnalysis(req: any, res: Response) {
    try {
      const params = getCohortAnalysisSchema.parse(req.query);
      const analysis = await analyticsService.getCohortAnalysis(params as any);
      res.json(analysis);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getAttributionData(req: any, res: Response) {
    try {
      const { conversionId } = req.params;
      const data = await analyticsService.getAttributionData(conversionId);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAttributionModels(req: any, res: Response) {
    try {
      const models = await analyticsService.getAttributionModels();
      res.json(models);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPerformanceAnalytics(req: any, res: Response) {
    try {
      const params = getPerformanceAnalyticsSchema.parse(req.query);
      const analytics = await analyticsService.getPerformanceAnalytics(params);
      res.json(analytics);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getPerformanceTrends(req: any, res: Response) {
    try {
      const { timeRange = '30d', metric = 'clicks' } = req.query;
      const trends = await analyticsService.getPerformanceTrends(timeRange as string, metric as string);
      res.json(trends);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPerformanceComparison(req: any, res: Response) {
    try {
      const { period1, period2, metric = 'clicks' } = req.query;
      const comparison = await analyticsService.getPerformanceComparison(
        period1 as string, 
        period2 as string, 
        metric as string
      );
      res.json(comparison);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getGeographicAnalytics(req: any, res: Response) {
    try {
      const params = getGeographicAnalyticsSchema.parse(req.query);
      const analytics = await analyticsService.getGeographicAnalytics(params);
      res.json(analytics);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getCountryAnalytics(req: any, res: Response) {
    try {
      const { timeRange = '30d', limit = 10 } = req.query;
      const analytics = await analyticsService.getCountryAnalytics(timeRange as string, parseInt(limit as string));
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCityAnalytics(req: any, res: Response) {
    try {
      const { timeRange = '30d', limit = 10 } = req.query;
      const analytics = await analyticsService.getCityAnalytics(timeRange as string, parseInt(limit as string));
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getDeviceAnalytics(req: any, res: Response) {
    try {
      const params = getDeviceAnalyticsSchema.parse(req.query);
      const analytics = await analyticsService.getDeviceAnalytics(params);
      res.json(analytics);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getDeviceTypeAnalytics(req: any, res: Response) {
    try {
      const { timeRange = '30d' } = req.query;
      const analytics = await analyticsService.getDeviceTypeAnalytics(timeRange as string);
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getBrowserAnalytics(req: any, res: Response) {
    try {
      const { timeRange = '30d', limit = 10 } = req.query;
      const analytics = await analyticsService.getBrowserAnalytics(timeRange as string, parseInt(limit as string));
      res.json(analytics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getCustomReports(req: any, res: Response) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const reports = await analyticsService.getCustomReports(parseInt(page as string), parseInt(limit as string));
      res.json(reports);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async createCustomReport(req: any, res: Response) {
    try {
      const data = createCustomReportSchema.parse(req.body);
      const report = await analyticsService.createCustomReport(req.user.id, data as any);
      res.status(201).json(report);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async updateCustomReport(req: any, res: Response) {
    try {
      const { reportId } = req.params;
      const data = updateCustomReportSchema.parse(req.body);
      const report = await analyticsService.updateCustomReport(reportId, data);
      res.json(report);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid input data', details: error.errors });
      }
      res.status(404).json({ error: error.message });
    }
  }

  async deleteCustomReport(req: any, res: Response) {
    try {
      const { reportId } = req.params;
      await analyticsService.deleteCustomReport(reportId);
      res.json({ message: 'Report deleted successfully' });
    } catch (error: any) {
      res.status(404).json({ error: error.message });
    }
  }

  async exportReport(req: any, res: Response) {
    try {
      const { reportId } = req.params;
      const { format = 'csv' } = req.query;
      const exportData = await analyticsService.exportReport(reportId, format as string);
      res.json(exportData);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
