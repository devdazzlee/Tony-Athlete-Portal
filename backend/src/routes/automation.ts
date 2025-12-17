import express, { Router } from 'express';
import { AutomationController } from '../controllers/AutomationController';
import { authenticateToken, requireRole } from '../middleware/auth';

const router: Router = express.Router();
const automationController = new AutomationController();

// All routes require authentication
router.use(authenticateToken);

// Workflow management routes
router.get('/workflows', automationController.getWorkflows);
router.get('/workflows/:id', automationController.getWorkflowById);
router.post('/workflows', requireRole(['ADMIN', 'MANAGER']), automationController.createWorkflow);
router.put('/workflows/:id', requireRole(['ADMIN', 'MANAGER']), automationController.updateWorkflow);
router.delete('/workflows/:id', requireRole(['ADMIN']), automationController.deleteWorkflow);

// Workflow execution routes
router.post('/workflows/:id/trigger', automationController.triggerWorkflow);
router.post('/workflows/:id/test', requireRole(['ADMIN', 'MANAGER']), automationController.testWorkflow);

// Rule management routes
router.get('/rules', automationController.getRules);
router.get('/rules/:id', automationController.getRuleById);
router.post('/rules', requireRole(['ADMIN', 'MANAGER']), automationController.createRule);
router.put('/rules/:id', requireRole(['ADMIN', 'MANAGER']), automationController.updateRule);
router.delete('/rules/:id', requireRole(['ADMIN']), automationController.deleteRule);

// Rule execution routes
router.post('/rules/:id/activate', requireRole(['ADMIN', 'MANAGER']), automationController.activateRule);
router.post('/rules/:id/deactivate', requireRole(['ADMIN', 'MANAGER']), automationController.deactivateRule);
router.post('/rules/:id/test', requireRole(['ADMIN', 'MANAGER']), automationController.testRule);

// Automation analytics routes
router.get('/analytics', automationController.getAutomationAnalytics);
router.get('/analytics/workflows', automationController.getWorkflowAnalytics);
router.get('/analytics/rules', automationController.getRuleAnalytics);

export default router;
