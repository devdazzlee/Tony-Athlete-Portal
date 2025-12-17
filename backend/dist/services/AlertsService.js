"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsService = void 0;
const Alerts_1 = require("../models/Alerts");
class AlertsService {
    static async createAlert(accountId, alertData) {
        return await Alerts_1.AlertsModel.create({
            accountId,
            ...alertData
        });
    }
    static async getAlert(id) {
        return await Alerts_1.AlertsModel.findById(id);
    }
    static async updateAlert(id, updateData) {
        return await Alerts_1.AlertsModel.update(id, updateData);
    }
    static async deleteAlert(id) {
        return await Alerts_1.AlertsModel.delete(id);
    }
    static async listAlerts(accountId, filters = {}) {
        return await Alerts_1.AlertsModel.list(accountId, filters);
    }
    static async addRule(alertId, ruleData) {
        return { success: true };
    }
    static async updateRule(alertId, ruleId, updateData) {
        return { success: true };
    }
    static async removeRule(alertId, ruleId) {
        return { success: true };
    }
    static async addAction(alertId, actionData) {
        return { success: true };
    }
    static async updateAction(alertId, actionId, updateData) {
        return { success: true };
    }
    static async removeAction(alertId, actionId) {
        return { success: true };
    }
    static async triggerAlert(alertId, triggerData) {
        return await Alerts_1.AlertsModel.triggerAlert(alertId, triggerData);
    }
    static async testAlert(alertId, testData) {
        return { success: true };
    }
    static async getAlertHistory(alertId, filters = {}) {
        return [];
    }
    static async getAlertStats(accountId, startDate, endDate) {
        return await Alerts_1.AlertsModel.getAlertStats(accountId, startDate, endDate);
    }
    static async getAlertsDashboard(accountId) {
        return await Alerts_1.AlertsModel.getAlertDashboard(accountId);
    }
    static async createDefaultAlerts(accountId) {
        return await Alerts_1.AlertsModel.createDefaultAlerts(accountId);
    }
    static async evaluateAlertConditions(alertId, data) {
        const alert = await this.getAlert(alertId);
        if (!alert) {
            throw new Error('Alert not found');
        }
        const results = [];
        for (const rule of []) {
            if (!rule.isActive)
                continue;
            const result = this.evaluateRule(rule, data);
            results.push({
                ruleId: rule.id,
                ruleName: rule.name,
                result,
                triggered: result.triggered
            });
        }
        return results;
    }
    static evaluateRule(rule, data) {
        const conditions = rule.conditions;
        let allConditionsMet = true;
        const conditionResults = [];
        for (const condition of conditions) {
            if (!condition.isActive)
                continue;
            const fieldValue = this.getFieldValue(data, condition.field);
            let conditionMet = false;
            switch (condition.operator) {
                case 'EQUALS':
                    conditionMet = fieldValue === condition.value;
                    break;
                case 'NOT_EQUALS':
                    conditionMet = fieldValue !== condition.value;
                    break;
                case 'GREATER_THAN':
                    conditionMet = Number(fieldValue) > Number(condition.value);
                    break;
                case 'LESS_THAN':
                    conditionMet = Number(fieldValue) < Number(condition.value);
                    break;
                case 'CONTAINS':
                    conditionMet = String(fieldValue).includes(String(condition.value));
                    break;
                case 'IN':
                    conditionMet = Array.isArray(condition.value) && condition.value.includes(fieldValue);
                    break;
                case 'NOT_IN':
                    conditionMet = Array.isArray(condition.value) && !condition.value.includes(fieldValue);
                    break;
                case 'REGEX':
                    try {
                        const regex = new RegExp(condition.value);
                        conditionMet = regex.test(String(fieldValue));
                    }
                    catch {
                        conditionMet = false;
                    }
                    break;
            }
            conditionResults.push({
                field: condition.field,
                operator: condition.operator,
                value: condition.value,
                actualValue: fieldValue,
                met: conditionMet
            });
            if (!conditionMet) {
                allConditionsMet = false;
            }
        }
        return {
            triggered: allConditionsMet,
            conditionResults
        };
    }
    static getFieldValue(data, field) {
        const fields = field.split('.');
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static async executeAlertActions(alertId, triggerData) {
        const alert = await this.getAlert(alertId);
        if (!alert) {
            throw new Error('Alert not found');
        }
        const results = [];
        for (const action of alert.actions) {
            try {
                const result = await this.executeAction(action, triggerData);
                results.push({
                    actionId: 'action-id',
                    actionName: 'action-name',
                    success: true,
                    result
                });
            }
            catch (error) {
                results.push({
                    actionId: 'action-id',
                    actionName: 'action-name',
                    success: false,
                    error: error.message
                });
            }
        }
        return results;
    }
    static async executeAction(action, triggerData) {
        switch (action.type) {
            case 'EMAIL':
                return await this.sendEmail(action, triggerData);
            case 'SMS':
                return await this.sendSMS(action, triggerData);
            case 'WEBHOOK':
                return await this.sendWebhook(action, triggerData);
            case 'NOTIFICATION':
                return await this.sendNotification(action, triggerData);
            case 'SLACK':
                return await this.sendSlackMessage(action, triggerData);
            case 'DISCORD':
                return await this.sendDiscordMessage(action, triggerData);
            case 'TEAMS':
                return await this.sendTeamsMessage(action, triggerData);
            default:
                throw new Error(`Unknown action type: ${action.type}`);
        }
    }
    static async sendEmail(action, triggerData) {
        const emailData = {
            to: action.parameters.recipients,
            subject: this.replacePlaceholders(action.parameters.subject, triggerData),
            body: this.replacePlaceholders(action.parameters.body, triggerData),
            from: action.parameters.from
        };
        return { type: 'EMAIL', sent: true, data: emailData };
    }
    static async sendSMS(action, triggerData) {
        const smsData = {
            to: action.parameters.recipients,
            message: this.replacePlaceholders(action.parameters.message, triggerData)
        };
        return { type: 'SMS', sent: true, data: smsData };
    }
    static async sendWebhook(action, triggerData) {
        const webhookData = {
            url: action.parameters.url,
            method: action.parameters.method || 'POST',
            headers: action.parameters.headers || {},
            body: this.replacePlaceholders(action.parameters.body, triggerData)
        };
        return { type: 'WEBHOOK', sent: true, data: webhookData };
    }
    static async sendNotification(action, triggerData) {
        const notificationData = {
            title: this.replacePlaceholders(action.parameters.title, triggerData),
            message: this.replacePlaceholders(action.parameters.message, triggerData),
            type: action.parameters.type || 'info',
            recipients: action.parameters.recipients
        };
        return { type: 'NOTIFICATION', sent: true, data: notificationData };
    }
    static async sendSlackMessage(action, triggerData) {
        const slackData = {
            channel: action.parameters.channel,
            message: this.replacePlaceholders(action.parameters.message, triggerData),
            webhookUrl: action.parameters.webhookUrl
        };
        return { type: 'SLACK', sent: true, data: slackData };
    }
    static async sendDiscordMessage(action, triggerData) {
        const discordData = {
            channel: action.parameters.channel,
            message: this.replacePlaceholders(action.parameters.message, triggerData),
            webhookUrl: action.parameters.webhookUrl
        };
        return { type: 'DISCORD', sent: true, data: discordData };
    }
    static async sendTeamsMessage(action, triggerData) {
        const teamsData = {
            channel: action.parameters.channel,
            message: this.replacePlaceholders(action.parameters.message, triggerData),
            webhookUrl: action.parameters.webhookUrl
        };
        return { type: 'TEAMS', sent: true, data: teamsData };
    }
    static replacePlaceholders(template, data) {
        let result = template;
        const placeholderRegex = /\{\{([^}]+)\}\}/g;
        result = result.replace(placeholderRegex, (match, field) => {
            const value = this.getFieldValue(data, field.trim());
            return value !== undefined ? String(value) : match;
        });
        return result;
    }
    static async getAlertPerformance(alertId, startDate, endDate) {
        const alert = await this.getAlert(alertId);
        if (!alert) {
            throw new Error('Alert not found');
        }
        const history = await this.getAlertHistory(alertId, { startDate, endDate });
        const performance = {
            totalTriggers: history.length,
            successfulActions: history.filter(h => h.status === 'SUCCESS').length,
            failedActions: history.filter(h => h.status === 'FAILED').length,
            successRate: history.length > 0 ? (history.filter(h => h.status === 'SUCCESS').length / history.length) * 100 : 0,
            averageResponseTime: history.length > 0 ? history.reduce((sum, h) => sum + (h.responseTime || 0), 0) / history.length : 0,
            byActionType: {},
            byStatus: {},
            byDate: {}
        };
        history.forEach(record => {
            performance.byActionType[record.actionType] = (performance.byActionType[record.actionType] || 0) + 1;
            performance.byStatus[record.status] = (performance.byStatus[record.status] || 0) + 1;
            const date = new Date(record.triggeredAt).toISOString().split('T')[0];
            performance.byDate[date] = (performance.byDate[date] || 0) + 1;
        });
        return performance;
    }
    static async getAlertRecommendations(alertId) {
        const alert = await this.getAlert(alertId);
        if (!alert) {
            throw new Error('Alert not found');
        }
        const recommendations = [];
        const performance = await this.getAlertPerformance(alertId);
        if (performance.successRate < 90) {
            recommendations.push('Consider reviewing failed actions and improving error handling');
        }
        if (performance.averageResponseTime > 5000) {
            recommendations.push('Optimize action execution to reduce response time');
        }
        if (true) {
            recommendations.push('Add alert rules to define when the alert should trigger');
        }
        if (alert.actions.length === 0) {
            recommendations.push('Add alert actions to define what should happen when the alert triggers');
        }
        if (false) {
            recommendations.push('Consider using a different frequency to reduce noise');
        }
        return recommendations;
    }
}
exports.AlertsService = AlertsService;
//# sourceMappingURL=AlertsService.js.map