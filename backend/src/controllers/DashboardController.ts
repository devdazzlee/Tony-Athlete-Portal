import { Request, Response } from 'express';
import { DashboardService } from '../services/DashboardService';
import { z } from 'zod';

const dashboardService = new DashboardService();

const getStatsSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

const getPerformanceChartSchema = z.object({
  timeRange: z.enum(['7d', '30d', '90d', '1y']).optional(),
  metric: z.enum(['clicks', 'conversions', 'revenue', 'commission']).optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional()
});

export class DashboardController {
  async getStats(req: any, res: Response) {
    try {
      const params = getStatsSchema.parse(req.query);
      const stats = await dashboardService.getStats(req.user.id, req.user.role, params);
      res.json(stats);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getRecentActivity(req: any, res: Response) {
    try {
      const { limit = 10 } = req.query;
      const activities = await dashboardService.getRecentActivity(req.user.id, parseInt(limit));
      res.json(activities);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPerformanceChart(req: any, res: Response) {
    try {
      const params = getPerformanceChartSchema.parse(req.query);
      const chartData = await dashboardService.getPerformanceChart(req.user.id, req.user.role, params);
      res.json(chartData);
    } catch (error: any) {
      if (error.name === 'ZodError') {
        return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async getTopOffers(req: any, res: Response) {
    try {
      const { limit = 5 } = req.query;
      const offers = await dashboardService.getTopOffers(req.user.id, req.user.role, parseInt(limit));
      res.json(offers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getNotifications(req: any, res: Response) {
    try {
      const { page = 1, limit = 20, unreadOnly = false } = req.query;
      const notifications = await dashboardService.getNotifications(
        req.user.id, 
        parseInt(page), 
        parseInt(limit), 
        unreadOnly === 'true'
      );
      res.json(notifications);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async markNotificationAsRead(req: any, res: Response) {
    try {
      const { id } = req.params;
      await dashboardService.markNotificationAsRead(req.user.id, id);
      res.json({ message: 'Notification marked as read' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}


