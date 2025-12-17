import express, { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const analyticsController = new AnalyticsController();

// All routes require authentication
router.use(authenticateToken);

// Real-time analytics routes
router.get('/realtime', analyticsController.getRealTimeAnalytics);
router.get('/realtime/activity', analyticsController.getRealTimeActivity);
router.get('/realtime/metrics', analyticsController.getRealTimeMetrics);

// Advanced analytics routes
router.get('/funnel', analyticsController.getFunnelAnalysis);
router.get('/cohort', analyticsController.getCohortAnalysis);
router.get('/attribution/:conversionId', analyticsController.getAttributionData);
router.get('/attribution/models', analyticsController.getAttributionModels);

// Performance analytics routes
router.get('/performance', analyticsController.getPerformanceAnalytics);
router.get('/performance/trends', analyticsController.getPerformanceTrends);
router.get('/performance/comparison', analyticsController.getPerformanceComparison);

// Geographic analytics routes
router.get('/geographic', analyticsController.getGeographicAnalytics);
router.get('/geographic/countries', analyticsController.getCountryAnalytics);
router.get('/geographic/cities', analyticsController.getCityAnalytics);

// Device analytics routes
router.get('/devices', analyticsController.getDeviceAnalytics);
router.get('/devices/types', analyticsController.getDeviceTypeAnalytics);
router.get('/devices/browsers', analyticsController.getBrowserAnalytics);

// Custom reports routes
router.get('/reports', analyticsController.getCustomReports);
router.post('/reports', requireRole(['ADMIN', 'MANAGER']), analyticsController.createCustomReport);
router.put('/reports/:reportId', requireRole(['ADMIN', 'MANAGER']), analyticsController.updateCustomReport);
router.delete('/reports/:reportId', requireRole(['ADMIN']), analyticsController.deleteCustomReport);
router.post('/reports/:reportId/export', analyticsController.exportReport);

export default router;