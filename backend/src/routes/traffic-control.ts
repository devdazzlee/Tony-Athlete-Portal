import { Router } from 'express';
import { TrafficControlController } from '../controllers/TrafficControlController';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD Operations
router.post('/', TrafficControlController.createRule);
router.get('/', TrafficControlController.listRules);
router.get('/dashboard', TrafficControlController.getTrafficControlDashboard);
router.get('/stats', TrafficControlController.getTrafficStats);
router.post('/default', TrafficControlController.createDefaultRules);

// Individual Rule Operations
router.get('/:id', TrafficControlController.getRule);
router.put('/:id', TrafficControlController.updateRule);
router.delete('/:id', TrafficControlController.deleteRule);

// Traffic Processing
router.post('/process', TrafficControlController.processTraffic);

// Traffic Events
router.get('/events', TrafficControlController.getTrafficEvents);

// Rule Testing
router.post('/:id/test', TrafficControlController.testRule);

// IP Management
router.post('/ip/block', TrafficControlController.blockIP);
router.delete('/ip/:ipAddress/unblock', TrafficControlController.unblockIP);
router.get('/ip/blocked', TrafficControlController.getBlockedIPs);

// Country Management
router.post('/country/block', TrafficControlController.blockCountry);
router.delete('/country/:countryCode/unblock', TrafficControlController.unblockCountry);
router.get('/country/blocked', TrafficControlController.getBlockedCountries);

// Rate Limiting
router.put('/:ruleId/rate-limit', TrafficControlController.updateRateLimit);

// Device Management
router.post('/device/block', TrafficControlController.blockDevice);
router.delete('/device/:deviceType/unblock', TrafficControlController.unblockDevice);

// Export/Import
router.get('/export', TrafficControlController.exportRules);
router.post('/import', TrafficControlController.importRules);

export default router;


