import { Router } from 'express';
import { AlertsController } from '../controllers/AlertsController';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD Operations
router.post('/', AlertsController.createAlert);
router.get('/', AlertsController.listAlerts);
router.get('/dashboard', AlertsController.getAlertsDashboard);
router.get('/stats', AlertsController.getAlertStats);
router.post('/default', AlertsController.createDefaultAlerts);

// Individual Alert Operations
router.get('/:id', AlertsController.getAlert);
router.put('/:id', AlertsController.updateAlert);
router.delete('/:id', AlertsController.deleteAlert);

// Alert Rules Management
router.post('/:alertId/rules', AlertsController.addRule);
router.put('/:alertId/rules/:ruleId', AlertsController.updateRule);
router.delete('/:alertId/rules/:ruleId', AlertsController.removeRule);

// Alert Actions Management
router.post('/:alertId/actions', AlertsController.addAction);
router.put('/:alertId/actions/:actionId', AlertsController.updateAction);
router.delete('/:alertId/actions/:actionId', AlertsController.removeAction);

// Alert Triggers
router.post('/:alertId/trigger', AlertsController.triggerAlert);
router.post('/:alertId/test', AlertsController.testAlert);

// Alert History
router.get('/:alertId/history', AlertsController.getAlertHistory);

export default router;


