"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertsModel = void 0;
class AlertsModel {
    static async create(data) {
        return {
            id: 'mock-alert-id',
            accountId: data.accountId,
            name: data.name,
            description: data.description || '',
            type: data.type,
            severity: data.severity || 'MEDIUM',
            status: data.status || 'ACTIVE',
            conditions: data.conditions || [],
            actions: data.actions || [],
            recipients: data.recipients || [],
            cooldownPeriod: data.cooldownPeriod || 60,
            triggerCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findById(id) {
        return null;
    }
    static async update(id, data) {
        return {
            id,
            accountId: 'mock-account',
            name: 'Mock Alert',
            description: '',
            type: 'SYSTEM',
            severity: 'MEDIUM',
            status: 'ACTIVE',
            conditions: [],
            actions: [],
            recipients: [],
            cooldownPeriod: 60,
            triggerCount: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async delete(id) {
    }
    static async list(accountId, filters = {}) {
        return [];
    }
    static async triggerAlert(alertId, data) {
        return {
            id: 'mock-event-id',
            alertId,
            type: 'SYSTEM',
            severity: 'MEDIUM',
            title: 'Mock Alert',
            message: 'This is a mock alert event',
            data,
            status: 'TRIGGERED',
            triggeredAt: new Date()
        };
    }
    static async testAlert(alertId) {
        const testData = {
            test: true,
            timestamp: new Date().toISOString(),
            message: 'This is a test alert'
        };
        return await this.triggerAlert(alertId, testData);
    }
    static async getAlertStats(accountId, startDate, endDate) {
        return {
            totalAlerts: 0,
            activeAlerts: 0,
            triggeredAlerts: 0,
            resolvedAlerts: 0,
            totalEvents: 0,
            eventsByType: {},
            eventsBySeverity: {},
            eventsByStatus: {},
            topAlerts: []
        };
    }
    static async createDefaultAlerts(accountId) {
        return [];
    }
    static async getAlertDashboard(accountId) {
        return {
            alerts: [],
            recentEvents: [],
            stats: {
                totalAlerts: 0,
                activeAlerts: 0,
                triggeredAlerts: 0,
                resolvedAlerts: 0,
                totalEvents: 0,
                eventsByType: {},
                eventsBySeverity: {},
                eventsByStatus: {},
                topAlerts: []
            }
        };
    }
}
exports.AlertsModel = AlertsModel;
//# sourceMappingURL=Alerts.js.map