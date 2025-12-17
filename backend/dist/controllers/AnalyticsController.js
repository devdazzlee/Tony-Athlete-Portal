"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const AnalyticsService_1 = require("../services/AnalyticsService");
const zod_1 = require("zod");
const analyticsService = new AnalyticsService_1.AnalyticsService();
const getRealTimeAnalyticsSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['1h', '24h', '7d']).optional()
});
const getFunnelAnalysisSchema = zod_1.z.object({
    offerId: zod_1.z.string().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional()
});
const getCohortAnalysisSchema = zod_1.z.object({
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime()
});
const getPerformanceAnalyticsSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['7d', '30d', '90d', '1y']).optional(),
    metric: zod_1.z.enum(['clicks', 'conversions', 'revenue', 'commission']).optional(),
    groupBy: zod_1.z.enum(['day', 'week', 'month']).optional()
});
const getGeographicAnalyticsSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['7d', '30d', '90d', '1y']).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional()
});
const getDeviceAnalyticsSchema = zod_1.z.object({
    timeRange: zod_1.z.enum(['7d', '30d', '90d', '1y']).optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional()
});
const createCustomReportSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    metrics: zod_1.z.array(zod_1.z.string()),
    filters: zod_1.z.record(zod_1.z.any()),
    schedule: zod_1.z.string().optional()
});
const updateCustomReportSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
    metrics: zod_1.z.array(zod_1.z.string()).optional(),
    filters: zod_1.z.record(zod_1.z.any()).optional(),
    schedule: zod_1.z.string().optional()
});
class AnalyticsController {
    async getRealTimeAnalytics(req, res) {
        try {
            const params = getRealTimeAnalyticsSchema.parse(req.query);
            const analytics = await analyticsService.getRealTimeAnalytics(params);
            res.json(analytics);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getRealTimeActivity(req, res) {
        try {
            const { limit = 20 } = req.query;
            const activity = await analyticsService.getRealTimeActivity(parseInt(limit));
            res.json(activity);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getRealTimeMetrics(req, res) {
        try {
            const metrics = await analyticsService.getRealTimeMetrics();
            res.json(metrics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getFunnelAnalysis(req, res) {
        try {
            const params = getFunnelAnalysisSchema.parse(req.query);
            const analysis = await analyticsService.getFunnelAnalysis(params);
            res.json(analysis);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getCohortAnalysis(req, res) {
        try {
            const params = getCohortAnalysisSchema.parse(req.query);
            const analysis = await analyticsService.getCohortAnalysis(params);
            res.json(analysis);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getAttributionData(req, res) {
        try {
            const { conversionId } = req.params;
            const data = await analyticsService.getAttributionData(conversionId);
            res.json(data);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getAttributionModels(req, res) {
        try {
            const models = await analyticsService.getAttributionModels();
            res.json(models);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getPerformanceAnalytics(req, res) {
        try {
            const params = getPerformanceAnalyticsSchema.parse(req.query);
            const analytics = await analyticsService.getPerformanceAnalytics(params);
            res.json(analytics);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getPerformanceTrends(req, res) {
        try {
            const { timeRange = '30d', metric = 'clicks' } = req.query;
            const trends = await analyticsService.getPerformanceTrends(timeRange, metric);
            res.json(trends);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getPerformanceComparison(req, res) {
        try {
            const { period1, period2, metric = 'clicks' } = req.query;
            const comparison = await analyticsService.getPerformanceComparison(period1, period2, metric);
            res.json(comparison);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getGeographicAnalytics(req, res) {
        try {
            const params = getGeographicAnalyticsSchema.parse(req.query);
            const analytics = await analyticsService.getGeographicAnalytics(params);
            res.json(analytics);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getCountryAnalytics(req, res) {
        try {
            const { timeRange = '30d', limit = 10 } = req.query;
            const analytics = await analyticsService.getCountryAnalytics(timeRange, parseInt(limit));
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getCityAnalytics(req, res) {
        try {
            const { timeRange = '30d', limit = 10 } = req.query;
            const analytics = await analyticsService.getCityAnalytics(timeRange, parseInt(limit));
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getDeviceAnalytics(req, res) {
        try {
            const params = getDeviceAnalyticsSchema.parse(req.query);
            const analytics = await analyticsService.getDeviceAnalytics(params);
            res.json(analytics);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
            }
            res.status(500).json({ error: error.message });
        }
    }
    async getDeviceTypeAnalytics(req, res) {
        try {
            const { timeRange = '30d' } = req.query;
            const analytics = await analyticsService.getDeviceTypeAnalytics(timeRange);
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getBrowserAnalytics(req, res) {
        try {
            const { timeRange = '30d', limit = 10 } = req.query;
            const analytics = await analyticsService.getBrowserAnalytics(timeRange, parseInt(limit));
            res.json(analytics);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async getCustomReports(req, res) {
        try {
            const { page = 1, limit = 10 } = req.query;
            const reports = await analyticsService.getCustomReports(parseInt(page), parseInt(limit));
            res.json(reports);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
    async createCustomReport(req, res) {
        try {
            const data = createCustomReportSchema.parse(req.body);
            const report = await analyticsService.createCustomReport(req.user.id, data);
            res.status(201).json(report);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(400).json({ error: error.message });
        }
    }
    async updateCustomReport(req, res) {
        try {
            const { reportId } = req.params;
            const data = updateCustomReportSchema.parse(req.body);
            const report = await analyticsService.updateCustomReport(reportId, data);
            res.json(report);
        }
        catch (error) {
            if (error.name === 'ZodError') {
                return res.status(400).json({ error: 'Invalid input data', details: error.errors });
            }
            res.status(404).json({ error: error.message });
        }
    }
    async deleteCustomReport(req, res) {
        try {
            const { reportId } = req.params;
            await analyticsService.deleteCustomReport(reportId);
            res.json({ message: 'Report deleted successfully' });
        }
        catch (error) {
            res.status(404).json({ error: error.message });
        }
    }
    async exportReport(req, res) {
        try {
            const { reportId } = req.params;
            const { format = 'csv' } = req.query;
            const exportData = await analyticsService.exportReport(reportId, format);
            res.json(exportData);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
        }
    }
}
exports.AnalyticsController = AnalyticsController;
//# sourceMappingURL=AnalyticsController.js.map