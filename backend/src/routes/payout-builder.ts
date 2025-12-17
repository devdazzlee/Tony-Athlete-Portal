import { Router } from 'express';
import { PayoutBuilderController } from '../controllers/PayoutBuilderController';
import { authenticateToken } from '../middleware/auth';

const router: Router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// CRUD Operations
router.post('/', PayoutBuilderController.createPayoutRule);
router.get('/', PayoutBuilderController.listPayoutRules);
router.get('/dashboard', PayoutBuilderController.getPayoutBuilderDashboard);
router.get('/stats', PayoutBuilderController.getPayoutStats);
router.post('/default', PayoutBuilderController.createDefaultRules);

// Individual Rule Operations
router.get('/:id', PayoutBuilderController.getPayoutRule);
router.put('/:id', PayoutBuilderController.updatePayoutRule);
router.delete('/:id', PayoutBuilderController.deletePayoutRule);

// Payout Conditions Management
router.post('/:ruleId/conditions', PayoutBuilderController.addCondition);
router.put('/:ruleId/conditions/:conditionId', PayoutBuilderController.updateCondition);
router.delete('/:ruleId/conditions/:conditionId', PayoutBuilderController.removeCondition);

// Payout Actions Management
router.post('/:ruleId/actions', PayoutBuilderController.addAction);
router.put('/:ruleId/actions/:actionId', PayoutBuilderController.updateAction);
router.delete('/:ruleId/actions/:actionId', PayoutBuilderController.removeAction);

// Payout Processing
router.post('/:ruleId/process', PayoutBuilderController.processPayouts);
router.get('/:ruleId/preview', PayoutBuilderController.previewPayouts);

// Payout History
router.get('/:ruleId/history', PayoutBuilderController.getPayoutHistory);

// Payout Reports
router.post('/:ruleId/reports', PayoutBuilderController.generatePayoutReport);

// Rule Testing
router.post('/:ruleId/test', PayoutBuilderController.testRule);

// Schedule Management
router.put('/:ruleId/schedule', PayoutBuilderController.updateSchedule);

// Export/Import
router.get('/export', PayoutBuilderController.exportRules);
router.post('/import', PayoutBuilderController.importRules);

export default router;


