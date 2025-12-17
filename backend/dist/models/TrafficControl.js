"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficControlModel = void 0;
class TrafficControlModel {
    static async createRule(data) {
        return {
            id: 'mock-rule-id',
            name: data.name,
            description: data.description || '',
            type: data.type || 'GEO_BLOCKING',
            conditions: data.conditions || [],
            actions: data.actions || [],
            priority: data.priority || 1,
            status: data.status || 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async findRuleById(id) {
        return null;
    }
    static async updateRule(id, data) {
        return {
            id,
            name: 'Mock Rule',
            description: '',
            type: 'GEO_BLOCKING',
            conditions: [],
            actions: [],
            priority: 1,
            status: 'ACTIVE',
            createdAt: new Date(),
            updatedAt: new Date()
        };
    }
    static async deleteRule(id) {
    }
    static async listRules(filters = {}) {
        return [];
    }
    static async processTraffic(data, ipAddress, userAgent, affiliateId, clickId) {
        return {
            id: 'mock-event-id',
            ruleId: 'mock-rule',
            type: 'DEFAULT',
            data,
            action: 'ALLOW',
            ipAddress,
            userAgent,
            country: data.country,
            device: data.device,
            browser: data.browser,
            os: data.os,
            affiliateId,
            clickId,
            timestamp: new Date()
        };
    }
    static async getTrafficEvents(filters = {}, page = 1, limit = 50) {
        return [];
    }
    static async getTrafficStats(startDate, endDate) {
        return {
            totalRequests: 0,
            allowedRequests: 0,
            blockedRequests: 0,
            redirectedRequests: 0,
            throttledRequests: 0,
            byRule: {},
            byCountry: {},
            byDevice: {},
            byHour: {},
            topIPs: []
        };
    }
    static async createDefaultRules() {
        return [];
    }
    static async testRule(id, testData) {
        return {
            success: true,
            message: 'Rule test completed',
            testResults: {}
        };
    }
    static async blockIP(ipAddress, reason, duration) {
        return {
            success: true,
            message: 'IP blocked successfully',
            ipAddress,
            reason,
            duration
        };
    }
    static async unblockIP(ipAddress) {
        return {
            success: true,
            message: 'IP unblocked successfully',
            ipAddress
        };
    }
    static async getBlockedIPs(page = 1, limit = 50) {
        return [];
    }
    static async blockCountry(countryCode, reason) {
        return {
            success: true,
            message: 'Country blocked successfully',
            countryCode,
            reason
        };
    }
    static async unblockCountry(countryCode) {
        return {
            success: true,
            message: 'Country unblocked successfully',
            countryCode
        };
    }
    static async getBlockedCountries() {
        return [];
    }
    static async updateRateLimit(ruleId, requestsPerMinute, requestsPerHour, requestsPerDay) {
        return {
            success: true,
            message: 'Rate limit updated successfully',
            ruleId,
            requestsPerMinute,
            requestsPerHour,
            requestsPerDay
        };
    }
    static async blockDevice(deviceType, reason) {
        return {
            success: true,
            message: 'Device blocked successfully',
            deviceType,
            reason
        };
    }
    static async unblockDevice(deviceType) {
        return {
            success: true,
            message: 'Device unblocked successfully',
            deviceType
        };
    }
    static async getTrafficControlDashboard() {
        return {
            stats: {
                totalRequests: 0,
                allowedRequests: 0,
                blockedRequests: 0,
                redirectedRequests: 0,
                throttledRequests: 0,
                byRule: {},
                byCountry: {},
                byDevice: {},
                byHour: {},
                topIPs: []
            },
            recentEvents: [],
            activeRules: []
        };
    }
    static async exportRules(format) {
        return {
            format,
            rules: [],
            exportedAt: new Date()
        };
    }
    static async importRules(rules, overwrite = false) {
        return {
            imported: rules.length,
            skipped: 0,
            errors: [],
            importedAt: new Date()
        };
    }
}
exports.TrafficControlModel = TrafficControlModel;
//# sourceMappingURL=TrafficControl.js.map