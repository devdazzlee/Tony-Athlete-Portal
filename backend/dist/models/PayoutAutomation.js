"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayoutAutomationModel = void 0;
class PayoutAutomationModel {
    static async createAutomation(data) {
        return {
            id: 'mock-id',
            accountId: data.accountId,
            name: data.name,
            description: data.description || '',
            rules: data.rules || [],
            settings: data.settings || {
                maxPayoutsPerRun: 100,
                maxPayoutAmount: 10000,
                minPayoutAmount: 10,
                allowedPaymentMethods: [],
                requireApproval: false,
                autoApprove: true,
                notificationSettings: {
                    onSuccess: true,
                    onFailure: true,
                    onPayoutCreated: true,
                    recipients: []
                },
                retrySettings: {
                    maxRetries: 3,
                    retryDelay: 5,
                    backoffMultiplier: 2
                }
            },
            status: data.status || 'ACTIVE',
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
            name: 'Mock Automation',
            description: '',
            rules: [],
            settings: {
                maxPayoutsPerRun: 100,
                maxPayoutAmount: 10000,
                minPayoutAmount: 10,
                allowedPaymentMethods: [],
                requireApproval: false,
                autoApprove: true,
                notificationSettings: {
                    onSuccess: true,
                    onFailure: true,
                    onPayoutCreated: true,
                    recipients: []
                },
                retrySettings: {
                    maxRetries: 3,
                    retryDelay: 5,
                    backoffMultiplier: 2
                }
            },
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async delete(id) {
    }
    static async list(accountId, filters = {}) {
        return [];
    }
    static async executeAutomation(automationId) {
        return {
            success: true,
            message: 'Automation executed successfully',
            payoutsCreated: 0
        };
    }
    static async logExecution(automationId, action, status, message, data, executionTime) {
        return {
            id: 'mock-log-id',
            automationId,
            ruleId: 'system',
            action,
            status: status,
            message,
            data,
            executionTime,
            timestamp: new Date()
        };
    }
    static async getExecutionLogs(automationId, page = 1, limit = 50) {
        return [];
    }
    static async getAutomationStats(accountId, startDate, endDate) {
        return {
            totalAutomations: 0,
            activeAutomations: 0,
            totalExecutions: 0,
            successfulExecutions: 0,
            failedExecutions: 0,
            averageExecutionTime: 0,
            byStatus: {},
            byAction: {}
        };
    }
    static async createDefaultAutomation(accountId) {
        const defaultRules = [
            {
                id: 'mock-rule-id',
                accountId,
                name: 'Weekly Payout Rule',
                description: 'Automatically create payouts for affiliates with minimum balance',
                conditions: [
                    {
                        field: 'totalEarnings',
                        operator: 'GREATER_THAN',
                        value: 50,
                        logic: 'AND'
                    }
                ],
                actions: [
                    {
                        type: 'CREATE_PAYOUT',
                        parameters: {
                            paymentMethod: 'PAYPAL'
                        },
                        enabled: true
                    },
                    {
                        type: 'SEND_NOTIFICATION',
                        parameters: {
                            template: 'payout_created'
                        },
                        enabled: true
                    }
                ],
                schedule: {
                    type: 'WEEKLY',
                    time: '09:00',
                    timezone: 'UTC',
                    daysOfWeek: [1]
                },
                status: 'ACTIVE',
                priority: 1,
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];
        return await this.createAutomation({
            accountId,
            name: 'Default Payout Automation',
            description: 'Automatically process payouts for eligible affiliates',
            rules: defaultRules,
            settings: {
                maxPayoutsPerRun: 100,
                maxPayoutAmount: 5000,
                minPayoutAmount: 50,
                allowedPaymentMethods: ['PAYPAL', 'BANK_TRANSFER'],
                requireApproval: false,
                autoApprove: true,
                notificationSettings: {
                    onSuccess: true,
                    onFailure: true,
                    onPayoutCreated: true,
                    recipients: ['admin@trackdesk.com']
                },
                retrySettings: {
                    maxRetries: 3,
                    retryDelay: 5,
                    backoffMultiplier: 2
                }
            }
        });
    }
    static async pauseAutomation(id) {
        return await this.update(id, { status: 'PAUSED' });
    }
    static async resumeAutomation(id) {
        return await this.update(id, { status: 'ACTIVE' });
    }
    static async testAutomation(id) {
        return {
            success: true,
            message: 'Automation test completed successfully',
            testResults: {
                totalEligibleAffiliates: 0,
                sampleSize: 0,
                sampleResults: []
            }
        };
    }
    static async getAutomationDashboard(accountId) {
        return {
            automations: [],
            stats: {
                totalAutomations: 0,
                activeAutomations: 0,
                totalExecutions: 0,
                successfulExecutions: 0,
                failedExecutions: 0,
                averageExecutionTime: 0,
                byStatus: {},
                byAction: {}
            },
            recentLogs: []
        };
    }
    static async createRule(data) {
        return {
            id: 'mock-rule-id',
            accountId: data.accountId,
            name: data.name,
            description: data.description || '',
            conditions: data.conditions || [],
            actions: data.actions || [],
            schedule: data.schedule || {
                type: 'IMMEDIATE',
                time: '00:00',
                timezone: 'UTC'
            },
            status: data.status || 'ACTIVE',
            priority: data.priority || 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async addCondition(ruleId, conditionData) {
        return {
            id: ruleId,
            accountId: 'mock-account',
            name: 'Mock Rule',
            description: '',
            conditions: [],
            actions: [],
            schedule: { type: 'IMMEDIATE', time: '00:00', timezone: 'UTC' },
            status: 'ACTIVE',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async updateCondition(ruleId, conditionId, updateData) {
        return {
            id: ruleId,
            accountId: 'mock-account',
            name: 'Mock Rule',
            description: '',
            conditions: [],
            actions: [],
            schedule: { type: 'IMMEDIATE', time: '00:00', timezone: 'UTC' },
            status: 'ACTIVE',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async removeCondition(ruleId, conditionId) {
        return {
            id: ruleId,
            accountId: 'mock-account',
            name: 'Mock Rule',
            description: '',
            conditions: [],
            actions: [],
            schedule: { type: 'IMMEDIATE', time: '00:00', timezone: 'UTC' },
            status: 'ACTIVE',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async addAction(ruleId, actionData) {
        return {
            id: ruleId,
            accountId: 'mock-account',
            name: 'Mock Rule',
            description: '',
            conditions: [],
            actions: [],
            schedule: { type: 'IMMEDIATE', time: '00:00', timezone: 'UTC' },
            status: 'ACTIVE',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async updateAction(ruleId, actionId, updateData) {
        return {
            id: ruleId,
            accountId: 'mock-account',
            name: 'Mock Rule',
            description: '',
            conditions: [],
            actions: [],
            schedule: { type: 'IMMEDIATE', time: '00:00', timezone: 'UTC' },
            status: 'ACTIVE',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async removeAction(ruleId, actionId) {
        return {
            id: ruleId,
            accountId: 'mock-account',
            name: 'Mock Rule',
            description: '',
            conditions: [],
            actions: [],
            schedule: { type: 'IMMEDIATE', time: '00:00', timezone: 'UTC' },
            status: 'ACTIVE',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async processPayouts(ruleId, dryRun = false) {
        return {
            success: true,
            message: dryRun ? 'Payout preview generated' : 'Payouts processed successfully',
            payoutsProcessed: 0,
            totalAmount: 0
        };
    }
    static async previewPayouts(ruleId, filters = {}) {
        return [];
    }
    static async getPayoutHistory(ruleId, filters = {}) {
        return [];
    }
    static async generatePayoutReport(ruleId, format, startDate, endDate) {
        return {
            report: 'generated',
            format,
            startDate,
            endDate,
            data: []
        };
    }
    static async getPayoutStats(accountId, startDate, endDate) {
        return {
            totalPayouts: 0,
            totalAmount: 0,
            successRate: 0,
            byStatus: {},
            byMethod: {},
            byDate: {}
        };
    }
    static async getPayoutAutomationDashboard(accountId) {
        return this.getAutomationDashboard(accountId);
    }
    static async createDefaultRules(accountId) {
        return [];
    }
    static async testRule(ruleId, testData) {
        return {
            success: true,
            message: 'Rule test completed',
            testResults: {}
        };
    }
    static async updateSchedule(ruleId, scheduleData) {
        return {
            id: ruleId,
            accountId: 'mock-account',
            name: 'Mock Rule',
            description: '',
            conditions: [],
            actions: [],
            schedule: scheduleData || { type: 'IMMEDIATE', time: '00:00', timezone: 'UTC' },
            status: 'ACTIVE',
            priority: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async exportRules(accountId, format) {
        return {
            format,
            rules: [],
            exportedAt: new Date()
        };
    }
    static async importRules(accountId, rules, overwrite = false) {
        return {
            imported: rules.length,
            skipped: 0,
            errors: [],
            importedAt: new Date()
        };
    }
}
exports.PayoutAutomationModel = PayoutAutomationModel;
//# sourceMappingURL=PayoutAutomation.js.map