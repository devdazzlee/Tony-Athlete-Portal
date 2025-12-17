"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficControlController = void 0;
const TrafficControl_1 = require("../models/TrafficControl");
class TrafficControlController {
    static async createRule(req, res) {
        try {
            const ruleData = req.body;
            const rule = await TrafficControl_1.TrafficControlModel.createRule(ruleData);
            res.status(201).json({
                success: true,
                data: rule,
                message: 'Traffic rule created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getRule(req, res) {
        try {
            const { id } = req.params;
            const rule = await TrafficControl_1.TrafficControlModel.findRuleById(id);
            if (!rule) {
                return res.status(404).json({
                    success: false,
                    error: 'Traffic rule not found'
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
    static async updateRule(req, res) {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const rule = await TrafficControl_1.TrafficControlModel.updateRule(id, updateData);
            res.json({
                success: true,
                data: rule,
                message: 'Traffic rule updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async deleteRule(req, res) {
        try {
            const { id } = req.params;
            await TrafficControl_1.TrafficControlModel.deleteRule(id);
            res.json({
                success: true,
                message: 'Traffic rule deleted successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async listRules(req, res) {
        try {
            const filters = req.query;
            const rules = await TrafficControl_1.TrafficControlModel.listRules(filters);
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
    static async processTraffic(req, res) {
        try {
            const { data, ipAddress, userAgent, affiliateId, clickId } = req.body;
            const result = await TrafficControl_1.TrafficControlModel.processTraffic(data, ipAddress, userAgent, affiliateId, clickId);
            res.json({
                success: true,
                data: result,
                message: 'Traffic processed successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getTrafficEvents(req, res) {
        try {
            const filters = req.query;
            const { page = 1, limit = 50 } = req.query;
            const events = await TrafficControl_1.TrafficControlModel.getTrafficEvents(filters, Number(page), Number(limit));
            res.json({
                success: true,
                data: events,
                count: events.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getTrafficStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const stats = await TrafficControl_1.TrafficControlModel.getTrafficStats(startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
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
    static async testRule(req, res) {
        try {
            const { id } = req.params;
            const testData = req.body;
            const result = await TrafficControl_1.TrafficControlModel.testRule(id, testData);
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
    static async createDefaultRules(req, res) {
        try {
            const rules = await TrafficControl_1.TrafficControlModel.createDefaultRules();
            res.status(201).json({
                success: true,
                data: rules,
                message: 'Default traffic rules created successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async blockIP(req, res) {
        try {
            const { ipAddress, reason, duration } = req.body;
            const result = await TrafficControl_1.TrafficControlModel.blockIP(ipAddress, reason, duration);
            res.json({
                success: true,
                data: result,
                message: 'IP blocked successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async unblockIP(req, res) {
        try {
            const { ipAddress } = req.params;
            const result = await TrafficControl_1.TrafficControlModel.unblockIP(ipAddress);
            res.json({
                success: true,
                data: result,
                message: 'IP unblocked successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getBlockedIPs(req, res) {
        try {
            const { page = 1, limit = 50 } = req.query;
            const blockedIPs = await TrafficControl_1.TrafficControlModel.getBlockedIPs(Number(page), Number(limit));
            res.json({
                success: true,
                data: blockedIPs,
                count: blockedIPs.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async blockCountry(req, res) {
        try {
            const { countryCode, reason } = req.body;
            const result = await TrafficControl_1.TrafficControlModel.blockCountry(countryCode, reason);
            res.json({
                success: true,
                data: result,
                message: 'Country blocked successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async unblockCountry(req, res) {
        try {
            const { countryCode } = req.params;
            const result = await TrafficControl_1.TrafficControlModel.unblockCountry(countryCode);
            res.json({
                success: true,
                data: result,
                message: 'Country unblocked successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getBlockedCountries(req, res) {
        try {
            const blockedCountries = await TrafficControl_1.TrafficControlModel.getBlockedCountries();
            res.json({
                success: true,
                data: blockedCountries,
                count: blockedCountries.length
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async updateRateLimit(req, res) {
        try {
            const { ruleId } = req.params;
            const { requestsPerMinute, requestsPerHour, requestsPerDay } = req.body;
            const result = await TrafficControl_1.TrafficControlModel.updateRateLimit(ruleId, requestsPerMinute, requestsPerHour, requestsPerDay);
            res.json({
                success: true,
                data: result,
                message: 'Rate limit updated successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async blockDevice(req, res) {
        try {
            const { deviceType, reason } = req.body;
            const result = await TrafficControl_1.TrafficControlModel.blockDevice(deviceType, reason);
            res.json({
                success: true,
                data: result,
                message: 'Device blocked successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async unblockDevice(req, res) {
        try {
            const { deviceType } = req.params;
            const result = await TrafficControl_1.TrafficControlModel.unblockDevice(deviceType);
            res.json({
                success: true,
                data: result,
                message: 'Device unblocked successfully'
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message
            });
        }
    }
    static async getTrafficControlDashboard(req, res) {
        try {
            const dashboard = await TrafficControl_1.TrafficControlModel.getTrafficControlDashboard();
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
    static async exportRules(req, res) {
        try {
            const { format = 'json' } = req.query;
            const exportData = await TrafficControl_1.TrafficControlModel.exportRules(format);
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
            const { rules, overwrite = false } = req.body;
            const result = await TrafficControl_1.TrafficControlModel.importRules(rules, overwrite);
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
exports.TrafficControlController = TrafficControlController;
//# sourceMappingURL=TrafficControlController.js.map