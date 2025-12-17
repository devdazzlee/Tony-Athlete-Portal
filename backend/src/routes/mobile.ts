import express, { Router } from 'express';
import { MobileController } from '../controllers/MobileController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const mobileController = new MobileController();

// All routes require authentication
router.use(authenticateToken);

// Mobile analytics routes
router.get('/analytics', mobileController.getMobileAnalytics);
router.get('/analytics/users', mobileController.getMobileUsers);
router.get('/analytics/devices', mobileController.getMobileDevices);

// PWA routes
router.get('/pwa/manifest', mobileController.getPWAManifest);
router.get('/pwa/service-worker', mobileController.getServiceWorker);
router.post('/pwa/install', mobileController.trackPWAInstall);

// Push notifications routes
router.post('/push/subscribe', mobileController.subscribeToPush);
router.post('/push/unsubscribe', mobileController.unsubscribeFromPush);
router.post('/push/send', requireRole(['ADMIN', 'MANAGER']), mobileController.sendPushNotification);
router.get('/push/history', mobileController.getPushHistory);

// Mobile app routes
router.get('/app/version', mobileController.getAppVersion);
router.get('/app/config', mobileController.getAppConfig);
router.post('/app/feedback', mobileController.submitAppFeedback);

// Offline support routes
router.get('/offline/data', mobileController.getOfflineData);
router.post('/offline/sync', mobileController.syncOfflineData);

// Mobile-specific features routes
router.get('/features', mobileController.getMobileFeatures);
router.post('/features/track', mobileController.trackFeatureUsage);

export default router;
