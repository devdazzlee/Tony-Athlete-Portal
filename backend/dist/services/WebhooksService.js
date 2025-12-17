"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const prisma_1 = require("../lib/prisma");
class WebhooksService {
    static async createWebhook(accountId, webhookData) {
        return await prisma_1.prisma.webhook.create({
            data: {
                ...webhookData
            }
        });
    }
    static async getWebhook(id) {
        return await prisma_1.prisma.webhook.findUnique({ where: { id } });
    }
    static async updateWebhook(id, updateData) {
        return await prisma_1.prisma.webhook.update({ where: { id }, data: updateData });
    }
    static async deleteWebhook(id) {
        return await prisma_1.prisma.webhook.delete({ where: { id } });
    }
    static async listWebhooks(accountId, filters = {}) {
        return await prisma_1.prisma.webhook.findMany({ where: filters });
    }
    static async addEvent(webhookId, eventData) {
        return await prisma_1.prisma.webhook.update({ where: { id: webhookId }, data: eventData });
    }
    static async updateEvent(webhookId, eventId, updateData) {
        return await prisma_1.prisma.webhook.update({ where: { id: webhookId }, data: updateData });
    }
    static async removeEvent(webhookId, eventId) {
        return await prisma_1.prisma.webhook.delete({ where: { id: webhookId } });
    }
    static async testWebhook(id, testData) {
        return await prisma_1.prisma.webhook.findUnique({ where: { id } });
    }
    static async triggerWebhook(id, eventData) {
        return await prisma_1.prisma.webhook.findUnique({ where: { id } });
    }
    static async getWebhookHistory(id, filters = {}) {
        return await prisma_1.prisma.webhook.findMany({ where: { id } });
    }
    static async getWebhookLogs(id, page = 1, limit = 50) {
        return await prisma_1.prisma.webhook.findMany({ where: { id } });
    }
    static async getWebhookStats(id, startDate, endDate) {
        return await prisma_1.prisma.webhook.findUnique({ where: { id } });
    }
    static async getWebhookTemplates() {
        return [];
    }
    static async createWebhookFromTemplate(accountId, templateId, customizations) {
        return await prisma_1.prisma.webhook.create({ data: customizations });
    }
    static async generateSecret(id) {
        return { secret: 'generated-secret' };
    }
    static async validateSignature(id, signature, payload) {
        return true;
    }
    static async retryWebhook(id, logId) {
        return await prisma_1.prisma.webhook.findUnique({ where: { id } });
    }
    static async getWebhooksDashboard(accountId) {
        return { stats: {} };
    }
    static async createDefaultWebhooks(accountId) {
        return [];
    }
    static async receiveWebhook(webhookId, payload, headers) {
        return { received: true };
    }
    static async exportWebhooks(accountId, format) {
        return [];
    }
    static async importWebhooks(accountId, webhooks, overwrite = false) {
        return [];
    }
    static async executeWebhook(webhookId, eventData) {
        const webhook = await this.getWebhook(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        if (webhook.status !== 'ACTIVE') {
            throw new Error('Webhook is not active');
        }
        const event = webhook.events.find(e => e === eventData.event);
        if (!event) {
            throw new Error(`Event ${eventData.event} is not configured for this webhook`);
        }
        const payload = this.preparePayload(webhook, eventData);
        const result = await this.sendWebhook(webhook, payload);
        await this.logWebhookAttempt(webhookId, eventData, payload, result);
        return result;
    }
    static preparePayload(webhook, eventData) {
        let payload = { ...eventData };
        if (webhook.transformations) {
            for (const transformation of webhook.transformations) {
                payload = this.applyTransformation(payload, transformation);
            }
        }
        if (webhook.filters) {
            for (const filter of webhook.filters) {
                if (!this.evaluateFilter(payload, filter)) {
                    throw new Error(`Payload filtered out by filter: ${filter.name}`);
                }
            }
        }
        return payload;
    }
    static applyTransformation(payload, transformation) {
        switch (transformation.type) {
            case 'RENAME_FIELD':
                if (payload[transformation.from]) {
                    payload[transformation.to] = payload[transformation.from];
                    delete payload[transformation.from];
                }
                break;
            case 'ADD_FIELD':
                payload[transformation.field] = transformation.value;
                break;
            case 'REMOVE_FIELD':
                delete payload[transformation.field];
                break;
            case 'FORMAT_FIELD':
                if (payload[transformation.field]) {
                    payload[transformation.field] = this.formatField(payload[transformation.field], transformation.format);
                }
                break;
            case 'CALCULATE_FIELD':
                payload[transformation.field] = this.calculateField(payload, transformation.formula);
                break;
        }
        return payload;
    }
    static formatField(value, format) {
        switch (format) {
            case 'UPPERCASE':
                return String(value).toUpperCase();
            case 'LOWERCASE':
                return String(value).toLowerCase();
            case 'DATE_ISO':
                return new Date(value).toISOString();
            case 'CURRENCY':
                return parseFloat(value).toFixed(2);
            default:
                return value;
        }
    }
    static calculateField(payload, formula) {
        try {
            let processedFormula = formula;
            const placeholderRegex = /\{\{([^}]+)\}\}/g;
            processedFormula = processedFormula.replace(placeholderRegex, (match, field) => {
                const value = this.getFieldValue(payload, field.trim());
                return value !== undefined ? String(value) : '0';
            });
            const allowedChars = /^[0-9+\-*/().\s]+$/;
            if (!allowedChars.test(processedFormula)) {
                throw new Error('Invalid characters in formula');
            }
            return eval(processedFormula);
        }
        catch (error) {
            throw new Error(`Error calculating field: ${error}`);
        }
    }
    static getFieldValue(data, field) {
        const fields = field.split('.');
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static evaluateFilter(payload, filter) {
        const fieldValue = this.getFieldValue(payload, filter.field);
        let conditionMet = false;
        switch (filter.operator) {
            case 'EQUALS':
                conditionMet = fieldValue === filter.value;
                break;
            case 'NOT_EQUALS':
                conditionMet = fieldValue !== filter.value;
                break;
            case 'GREATER_THAN':
                conditionMet = Number(fieldValue) > Number(filter.value);
                break;
            case 'LESS_THAN':
                conditionMet = Number(fieldValue) < Number(filter.value);
                break;
            case 'CONTAINS':
                conditionMet = String(fieldValue).includes(String(filter.value));
                break;
            case 'NOT_CONTAINS':
                conditionMet = !String(fieldValue).includes(String(filter.value));
                break;
            case 'IN':
                conditionMet = Array.isArray(filter.value) && filter.value.includes(fieldValue);
                break;
            case 'NOT_IN':
                conditionMet = Array.isArray(filter.value) && !filter.value.includes(fieldValue);
                break;
            case 'REGEX':
                try {
                    const regex = new RegExp(filter.value);
                    conditionMet = regex.test(String(fieldValue));
                }
                catch {
                    conditionMet = false;
                }
                break;
        }
        return filter.negate ? !conditionMet : conditionMet;
    }
    static async sendWebhook(webhook, payload) {
        const startTime = Date.now();
        try {
            const response = await fetch(webhook.url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Trackdesk-Webhook/1.0'
                },
                body: JSON.stringify(payload)
            });
            const responseTime = Date.now() - startTime;
            const responseText = await response.text();
            return {
                success: response.ok,
                status: response.status,
                statusText: response.statusText,
                responseTime,
                response: responseText,
                headers: {}
            };
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            return {
                success: false,
                error: error.message,
                responseTime
            };
        }
    }
    static async logWebhookAttempt(webhookId, eventData, payload, result) {
    }
    static async retryFailedWebhook(webhookId, logId) {
        const webhook = await this.getWebhook(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        const logs = await this.getWebhookLogs(webhookId, 1, 1000);
        const log = logs.find(l => l.id === logId);
        if (!log) {
            throw new Error('Webhook log not found');
        }
        if (log.status === 'ACTIVE') {
            throw new Error('Webhook log is not in failed state');
        }
        const result = await this.sendWebhook(webhook, {});
        return result;
    }
    static async getWebhookPerformance(webhookId, startDate, endDate) {
        const webhook = await this.getWebhook(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        const logs = await this.getWebhookLogs(webhookId, 1, 1000);
        const filteredLogs = logs.filter(log => {
            if (startDate && new Date(log.createdAt) < startDate)
                return false;
            if (endDate && new Date(log.createdAt) > endDate)
                return false;
            return true;
        });
        const performance = {
            totalAttempts: filteredLogs.length,
            successfulAttempts: filteredLogs.filter(l => l.status === 'ACTIVE').length,
            failedAttempts: filteredLogs.filter(l => l.status === 'ERROR').length,
            successRate: filteredLogs.length > 0 ? (filteredLogs.filter(l => l.status === 'ACTIVE').length / filteredLogs.length) * 100 : 0,
            averageResponseTime: filteredLogs.length > 0 ? filteredLogs.reduce((sum, l) => sum + (l.successRate || 0), 0) / filteredLogs.length : 0,
            byStatus: {},
            byEvent: {},
            byHour: {},
            byDay: {}
        };
        filteredLogs.forEach(log => {
            performance.byStatus[log.status] = (performance.byStatus[log.status] || 0) + 1;
            performance.byEvent[log.events[0] || 'unknown'] = (performance.byEvent[log.events[0] || 'unknown'] || 0) + 1;
            const hour = new Date(log.createdAt).getHours();
            const day = new Date(log.createdAt).toISOString().split('T')[0];
            performance.byHour[hour] = (performance.byHour[hour] || 0) + 1;
            performance.byDay[day] = (performance.byDay[day] || 0) + 1;
        });
        return performance;
    }
    static async getWebhookRecommendations(webhookId) {
        const webhook = await this.getWebhook(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        const recommendations = [];
        const performance = await this.getWebhookPerformance(webhookId);
        if (performance.successRate < 95) {
            recommendations.push('Low success rate - review webhook configuration and endpoint');
        }
        if (performance.averageResponseTime > 5000) {
            recommendations.push('High response time - optimize webhook endpoint');
        }
        if (webhook.events.length === 0) {
            recommendations.push('No events configured - add events to trigger webhook');
        }
        if (!webhook.secret) {
            recommendations.push('No secret configured - add webhook secret for security');
        }
        if (webhook.totalCalls === 0) {
            recommendations.push('No retry attempts configured - enable retries for failed webhooks');
        }
        return recommendations;
    }
    static async validateWebhookConfiguration(webhookId) {
        const webhook = await this.getWebhook(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        const validation = {
            isValid: true,
            errors: [],
            warnings: []
        };
        try {
            new URL(webhook.url);
        }
        catch {
            validation.isValid = false;
            validation.errors.push('Invalid webhook URL');
        }
        if (webhook.events.length === 0) {
            validation.warnings.push('No events configured');
        }
        return validation;
    }
}
exports.WebhooksService = WebhooksService;
//# sourceMappingURL=WebhooksService.js.map