"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const DashboardService_1 = require("../services/DashboardService");
const zod_1 = require("zod");
const dashboardService = new DashboardService_1.DashboardService();
const getStatsSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['7d', '30d', '90d', '1y']).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional()
});
const getPerformanceChartSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['7d', '30d', '90d', '1y']).optional(),
    metric: zod_1.z.enum(['clicks', 'conversions', 'revenue', 'commission']).optional(),
    groupBy: zod_1.z.enum(['day', 'week', 'month']).optional()
});
class DashboardController {
    async getStats(req, res) {
        try {
            const params = getStatsSchema.parse(req.query);
            const stats = await dashboardService.getStats(req.user.id, req.user.role, params);
            res.json(stats);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getRecentActivity(req, res) {
        try {
            const { limit = 10 } = req.query;
            const activities = await dashboardService.getRecentActivity(req.user.id, parseInt(limit));
            res.json(activities);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getPerformanceChart(req, res) {
        try {
            const params = getPerformanceChartSchema.parse(req.query);
            const chartData = await dashboardService.getPerformanceChart(req.user.id, req.user.role, params);
            res.json(chartData);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getTopOffers(req, res) {
        try {
            const { limit = 5 } = req.query;
            const offers = await dashboardService.getTopOffers(req.user.id, req.user.role, parseInt(limit));
            res.json(offers);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getNotifications(req, res) {
        try {
            const { page = 1, limit = 20, unreadOnly = false } = req.query;
            const notifications = await dashboardService.getNotifications(req.user.id, parseInt(page), parseInt(limit), unreadOnly === 'true');
            res.json(notifications);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async markNotificationAsRead(req, res) {
        try {
            const { id } = req.params;
            await dashboardService.markNotificationAsRead(req.user.id, id);
            res.json({ message: 'Notification marked as read' });
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.DashboardController = DashboardController;
//# sourceMappingURL=DashboardController.js.map