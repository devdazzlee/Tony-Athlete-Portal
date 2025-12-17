"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileController = void 0;
class MobileController {
    async getMobileAnalytics(req, res) {
        res.json({ analytics: {} });
    }
    async getMobileUsers(req, res) {
        res.json({ users: [] });
    }
    async getMobileDevices(req, res) {
        res.json({ devices: [] });
    }
    async getPWAManifest(req, res) {
        res.json({ manifest: {} });
    }
    async getServiceWorker(req, res) {
        res.json({ serviceWorker: {} });
    }
    async trackPWAInstall(req, res) {
        res.json({ success: true });
    }
    async subscribeToPush(req, res) {
        res.json({ success: true });
    }
    async unsubscribeFromPush(req, res) {
        res.json({ success: true });
    }
    async sendPushNotification(req, res) {
        res.json({ success: true });
    }
    async getPushHistory(req, res) {
        res.json({ history: [] });
    }
    async getAppVersion(req, res) {
        res.json({ version: '1.0.0' });
    }
    async getAppConfig(req, res) {
        res.json({ config: {} });
    }
    async submitAppFeedback(req, res) {
        res.json({ success: true });
    }
    async getOfflineData(req, res) {
        res.json({ data: {} });
    }
    async syncOfflineData(req, res) {
        res.json({ success: true });
    }
    async getMobileFeatures(req, res) {
        res.json({ features: [] });
    }
    async trackFeatureUsage(req, res) {
        res.json({ success: true });
    }
}
exports.MobileController = MobileController;
//# sourceMappingURL=MobileController.js.map