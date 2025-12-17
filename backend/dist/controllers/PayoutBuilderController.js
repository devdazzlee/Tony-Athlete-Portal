"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutBuilderController = void 0;
const PayoutAutomation_1 = require("../models/PayoutAutomation");
class PayoutBuilderController {
    static async createPayoutRule(req, res) {
        try {
            const { accountId } = req.user;
            const ruleData = req.body;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.createRule({
                accountId,
                ...ruleData
            });
            res.status(201).json({
                success: true,
                data: rule,
                message: 'Payout rule created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getPayoutRule(req, res) {
        try {
            const { id } = req.params;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.findById(id);
            if (!rule) {
                return res.status(404).json({
                    success: false,
                    error: 'Payout rule not found'
                });
            }
            res.json({
                success: true,
                data: rule
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updatePayoutRule(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.update(id, updateData);
            res.json({
                success: true,
                data: rule,
                message: 'Payout rule updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async deletePayoutRule(req, res) {
        try {
            const { id } = req.params;
            await PayoutAutomation_1.PayoutAutomationModel.delete(id);
            res.json({
                success: true,
                message: 'Payout rule deleted successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async listPayoutRules(req, res) {
        try {
            const { accountId } = req.user;
            const filters = req.query;
            const rules = await PayoutAutomation_1.PayoutAutomationModel.list(accountId, filters);
            res.json({
                success: true,
                data: rules,
                count: rules.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async addCondition(req, res) {
        try {
            const { ruleId } = req.params;
            const conditionData = req.body;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.addCondition(ruleId, conditionData);
            res.json({
                success: true,
                data: rule,
                message: 'Condition added successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateCondition(req, res) {
        try {
            const { ruleId, conditionId } = req.params;
            const updateData = req.body;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.updateCondition(ruleId, conditionId, updateData);
            res.json({
                success: true,
                data: rule,
                message: 'Condition updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async removeCondition(req, res) {
        try {
            const { ruleId, conditionId } = req.params;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.removeCondition(ruleId, conditionId);
            res.json({
                success: true,
                data: rule,
                message: 'Condition removed successfully'
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
            const { ruleId } = req.params;
            const actionData = req.body;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.addAction(ruleId, actionData);
            res.json({
                success: true,
                data: rule,
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
            const { ruleId, actionId } = req.params;
            const updateData = req.body;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.updateAction(ruleId, actionId, updateData);
            res.json({
                success: true,
                data: rule,
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
            const { ruleId, actionId } = req.params;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.removeAction(ruleId, actionId);
            res.json({
                success: true,
                data: rule,
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
    static async processPayouts(req, res) {
        try {
            const { ruleId } = req.params;
            const { dryRun = false } = req.body;
            const result = await PayoutAutomation_1.PayoutAutomationModel.processPayouts(ruleId, dryRun);
            res.json({
                success: true,
                data: result,
                message: dryRun ? 'Payout preview generated' : 'Payouts processed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async previewPayouts(req, res) {
        try {
            const { ruleId } = req.params;
            const filters = req.query;
            const preview = await PayoutAutomation_1.PayoutAutomationModel.previewPayouts(ruleId, filters);
            res.json({
                success: true,
                data: preview,
                message: 'Payout preview generated'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getPayoutHistory(req, res) {
        try {
            const { ruleId } = req.params;
            const filters = req.query;
            const history = await PayoutAutomation_1.PayoutAutomationModel.getPayoutHistory(ruleId, filters);
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
    static async generatePayoutReport(req, res) {
        try {
            const { ruleId } = req.params;
            const { format = 'json', startDate, endDate } = req.body;
            const report = await PayoutAutomation_1.PayoutAutomationModel.generatePayoutReport(ruleId, format, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
            res.json({
                success: true,
                data: report,
                message: 'Payout report generated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getPayoutStats(req, res) {
        try {
            const { accountId } = req.user;
            const { startDate, endDate } = req.query;
            const stats = await PayoutAutomation_1.PayoutAutomationModel.getPayoutStats(accountId, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
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
    static async getPayoutBuilderDashboard(req, res) {
        try {
            const { accountId } = req.user;
            const dashboard = await PayoutAutomation_1.PayoutAutomationModel.getPayoutAutomationDashboard(accountId);
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
    static async createDefaultRules(req, res) {
        try {
            const { accountId } = req.user;
            const rules = await PayoutAutomation_1.PayoutAutomationModel.createDefaultRules(accountId);
            res.status(201).json({
                success: true,
                data: rules,
                message: 'Default payout rules created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async testRule(req, res) {
        try {
            const { ruleId } = req.params;
            const testData = req.body;
            const result = await PayoutAutomation_1.PayoutAutomationModel.testRule(ruleId, testData);
            res.json({
                success: true,
                data: result,
                message: 'Rule test completed'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateSchedule(req, res) {
        try {
            const { ruleId } = req.params;
            const scheduleData = req.body;
            const rule = await PayoutAutomation_1.PayoutAutomationModel.updateSchedule(ruleId, scheduleData);
            res.json({
                success: true,
                data: rule,
                message: 'Schedule updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async exportRules(req, res) {
        try {
            const { accountId } = req.user;
            const { format = 'json' } = req.query;
            const exportData = await PayoutAutomation_1.PayoutAutomationModel.exportRules(accountId, format);
            res.json({
                success: true,
                data: exportData,
                message: 'Rules exported successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async importRules(req, res) {
        try {
            const { accountId } = req.user;
            const { rules, overwrite = false } = req.body;
            const result = await PayoutAutomation_1.PayoutAutomationModel.importRules(accountId, rules, overwrite);
            res.json({
                success: true,
                data: result,
                message: 'Rules imported successfully'
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
exports.PayoutBuilderController = PayoutBuilderController;
//# sourceMappingURL=PayoutBuilderController.js.map