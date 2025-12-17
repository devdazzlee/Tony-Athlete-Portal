"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksController = void 0;
const WebhooksService_1 = require("../services/WebhooksService");
class WebhooksController {
    static async createWebhook(req, res) {
        try {
            const { accountId } = req.user;
            const webhookData = req.body;
            const webhook = await WebhooksService_1.WebhooksService.createWebhook(accountId, webhookData);
            res.status(201).json({
                success: true,
                data: webhook,
                message: 'Webhook created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getWebhook(req, res) {
        try {
            const { id } = req.params;
            const webhook = await WebhooksService_1.WebhooksService.getWebhook(id);
            if (!webhook) {
                return res.status(404).json({
                    success: false,
                    error: 'Webhook not found'
                });
            }
            res.json({
                success: true,
                data: webhook
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateWebhook(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const webhook = await WebhooksService_1.WebhooksService.updateWebhook(id, updateData);
            res.json({
                success: true,
                data: webhook,
                message: 'Webhook updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async deleteWebhook(req, res) {
        try {
            const { id } = req.params;
            await WebhooksService_1.WebhooksService.deleteWebhook(id);
            res.json({
                success: true,
                message: 'Webhook deleted successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async listWebhooks(req, res) {
        try {
            const { accountId } = req.user;
            const filters = req.query;
            const webhooks = await WebhooksService_1.WebhooksService.listWebhooks(accountId, filters);
            res.json({
                success: true,
                data: webhooks,
                count: webhooks.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async addEvent(req, res) {
        try {
            const { webhookId } = req.params;
            const eventData = req.body;
            const webhook = await WebhooksService_1.WebhooksService.addEvent(webhookId, eventData);
            res.json({
                success: true,
                data: webhook,
                message: 'Event added successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateEvent(req, res) {
        try {
            const { webhookId, eventId } = req.params;
            const updateData = req.body;
            const webhook = await WebhooksService_1.WebhooksService.updateEvent(webhookId, eventId, updateData);
            res.json({
                success: true,
                data: webhook,
                message: 'Event updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async removeEvent(req, res) {
        try {
            const { webhookId, eventId } = req.params;
            const webhook = await WebhooksService_1.WebhooksService.removeEvent(webhookId, eventId);
            res.json({
                success: true,
                data: webhook,
                message: 'Event removed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async testWebhook(req, res) {
        try {
            const { id } = req.params;
            const testData = req.body;
            const result = await WebhooksService_1.WebhooksService.testWebhook(id, testData);
            res.json({
                success: true,
                data: result,
                message: 'Webhook test completed'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async triggerWebhook(req, res) {
        try {
            const { id } = req.params;
            const eventData = req.body;
            const result = await WebhooksService_1.WebhooksService.triggerWebhook(id, eventData);
            res.json({
                success: true,
                data: result,
                message: 'Webhook triggered successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getWebhookHistory(req, res) {
        try {
            const { id } = req.params;
            const filters = req.query;
            const history = await WebhooksService_1.WebhooksService.getWebhookHistory(id, filters);
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
    static async getWebhookLogs(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 50 } = req.query;
            const logs = await WebhooksService_1.WebhooksService.getWebhookLogs(id, Number(page), Number(limit));
            res.json({
                success: true,
                data: logs,
                count: logs.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getWebhookStats(req, res) {
        try {
            const { id } = req.params;
            const { startDate, endDate } = req.query;
            const stats = await WebhooksService_1.WebhooksService.getWebhookStats(id, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
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
    static async getWebhookTemplates(req, res) {
        try {
            const templates = await WebhooksService_1.WebhooksService.getWebhookTemplates();
            res.json({
                success: true,
                data: templates,
                count: templates.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async createWebhookFromTemplate(req, res) {
        try {
            const { accountId } = req.user;
            const { templateId, customizations } = req.body;
            const webhook = await WebhooksService_1.WebhooksService.createWebhookFromTemplate(accountId, templateId, customizations);
            res.status(201).json({
                success: true,
                data: webhook,
                message: 'Webhook created from template successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async generateSecret(req, res) {
        try {
            const { id } = req.params;
            const secret = await WebhooksService_1.WebhooksService.generateSecret(id);
            res.json({
                success: true,
                data: { secret },
                message: 'Webhook secret generated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async validateSignature(req, res) {
        try {
            const { id } = req.params;
            const { signature, payload } = req.body;
            const isValid = await WebhooksService_1.WebhooksService.validateSignature(id, signature, payload);
            res.json({
                success: true,
                data: { isValid },
                message: 'Signature validation completed'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async retryWebhook(req, res) {
        try {
            const { id } = req.params;
            const { logId } = req.body;
            const result = await WebhooksService_1.WebhooksService.retryWebhook(id, logId);
            res.json({
                success: true,
                data: result,
                message: 'Webhook retry initiated'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getWebhooksDashboard(req, res) {
        try {
            const { accountId } = req.user;
            const dashboard = await WebhooksService_1.WebhooksService.getWebhooksDashboard(accountId);
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
    static async createDefaultWebhooks(req, res) {
        try {
            const { accountId } = req.user;
            const webhooks = await WebhooksService_1.WebhooksService.createDefaultWebhooks(accountId);
            res.status(201).json({
                success: true,
                data: webhooks,
                message: 'Default webhooks created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async receiveWebhook(req, res) {
        try {
            const { webhookId } = req.params;
            const payload = req.body;
            const headers = req.headers;
            const result = await WebhooksService_1.WebhooksService.receiveWebhook(webhookId, payload, headers);
            res.json({
                success: true,
                data: result,
                message: 'Webhook received successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async exportWebhooks(req, res) {
        try {
            const { accountId } = req.user;
            const { format = 'json' } = req.query;
            const exportData = await WebhooksService_1.WebhooksService.exportWebhooks(accountId, format);
            res.json({
                success: true,
                data: exportData,
                message: 'Webhooks exported successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async importWebhooks(req, res) {
        try {
            const { accountId } = req.user;
            const { webhooks, overwrite = false } = req.body;
            const result = await WebhooksService_1.WebhooksService.importWebhooks(accountId, webhooks, overwrite);
            res.json({
                success: true,
                data: result,
                message: 'Webhooks imported successfully'
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
exports.WebhooksController = WebhooksController;
//# sourceMappingURL=WebhooksController.js.map