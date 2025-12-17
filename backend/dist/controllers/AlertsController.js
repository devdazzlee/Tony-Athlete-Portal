"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsController = void 0;
const AlertsService_1 = require("../services/AlertsService");
class AlertsController {
    static async createAlert(req, res) {
        try {
            const { accountId } = req.user;
            const alertData = req.body;
            const alert = await AlertsService_1.AlertsService.createAlert(accountId, alertData);
            res.status(201).json({
                success: true,
                data: alert,
                message: 'Alert created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getAlert(req, res) {
        try {
            const { id } = req.params;
            const alert = await AlertsService_1.AlertsService.getAlert(id);
            if (!alert) {
                return res.status(404).json({
                    success: false,
                    error: 'Alert not found'
                });
            }
            res.json({
                success: true,
                data: alert
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateAlert(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const alert = await AlertsService_1.AlertsService.updateAlert(id, updateData);
            res.json({
                success: true,
                data: alert,
                message: 'Alert updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async deleteAlert(req, res) {
        try {
            const { id } = req.params;
            await AlertsService_1.AlertsService.deleteAlert(id);
            res.json({
                success: true,
                message: 'Alert deleted successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async listAlerts(req, res) {
        try {
            const { accountId } = req.user;
            const filters = req.query;
            const alerts = await AlertsService_1.AlertsService.listAlerts(accountId, filters);
            res.json({
                success: true,
                data: alerts,
                count: alerts.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async addRule(req, res) {
        try {
            const { alertId } = req.params;
            const ruleData = req.body;
            const result = await AlertsService_1.AlertsService.addRule(alertId, ruleData);
            res.json({
                success: true,
                data: result,
                message: 'Rule added successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateRule(req, res) {
        try {
            const { alertId, ruleId } = req.params;
            const updateData = req.body;
            const result = await AlertsService_1.AlertsService.updateRule(alertId, ruleId, updateData);
            res.json({
                success: true,
                data: result,
                message: 'Rule updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async removeRule(req, res) {
        try {
            const { alertId, ruleId } = req.params;
            const result = await AlertsService_1.AlertsService.removeRule(alertId, ruleId);
            res.json({
                success: true,
                data: result,
                message: 'Rule removed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async addAction(req, res) {
        try {
            const { alertId } = req.params;
            const actionData = req.body;
            const result = await AlertsService_1.AlertsService.addAction(alertId, actionData);
            res.json({
                success: true,
                data: result,
                message: 'Action added successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateAction(req, res) {
        try {
            const { alertId, actionId } = req.params;
            const updateData = req.body;
            const result = await AlertsService_1.AlertsService.updateAction(alertId, actionId, updateData);
            res.json({
                success: true,
                data: result,
                message: 'Action updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async removeAction(req, res) {
        try {
            const { alertId, actionId } = req.params;
            const result = await AlertsService_1.AlertsService.removeAction(alertId, actionId);
            res.json({
                success: true,
                data: result,
                message: 'Action removed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async triggerAlert(req, res) {
        try {
            const { alertId } = req.params;
            const triggerData = req.body;
            const result = await AlertsService_1.AlertsService.triggerAlert(alertId, triggerData);
            res.json({
                success: true,
                data: result,
                message: 'Alert triggered successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async testAlert(req, res) {
        try {
            const { alertId } = req.params;
            const testData = req.body;
            const result = await AlertsService_1.AlertsService.testAlert(alertId, testData);
            res.json({
                success: true,
                data: result,
                message: 'Alert test completed'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getAlertHistory(req, res) {
        try {
            const { alertId } = req.params;
            const filters = req.query;
            const history = await AlertsService_1.AlertsService.getAlertHistory(alertId, filters);
            res.json({
                success: true,
                data: history,
                count: history.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getAlertStats(req, res) {
        try {
            const { accountId } = req.user;
            const { startDate, endDate } = req.query;
            const stats = await AlertsService_1.AlertsService.getAlertStats(accountId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getAlertsDashboard(req, res) {
        try {
            const { accountId } = req.user;
            const dashboard = await AlertsService_1.AlertsService.getAlertsDashboard(accountId);
            res.json({
                success: true,
                data: dashboard
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async createDefaultAlerts(req, res) {
        try {
            const { accountId } = req.user;
            const alerts = await AlertsService_1.AlertsService.createDefaultAlerts(accountId);
            res.status(201).json({
                success: true,
                data: alerts,
                message: 'Default alerts created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
}
exports.AlertsController = AlertsController;
//# sourceMappingURL=AlertsController.js.map