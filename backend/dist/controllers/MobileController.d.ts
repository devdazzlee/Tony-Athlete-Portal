import { Request, Response } from 'express';
export declare class MobileController {
    getMobileAnalytics(req: Request, res: Response): Promise<void>;
    getMobileUsers(req: Request, res: Response): Promise<void>;
    getMobileDevices(req: Request, res: Response): Promise<void>;
    getPWAManifest(req: Request, res: Response): Promise<void>;
    getServiceWorker(req: Request, res: Response): Promise<void>;
    trackPWAInstall(req: Request, res: Response): Promise<void>;
    subscribeToPush(req: Request, res: Response): Promise<void>;
    unsubscribeFromPush(req: Request, res: Response): Promise<void>;
    sendPushNotification(req: Request, res: Response): Promise<void>;
    getPushHistory(req: Request, res: Response): Promise<void>;
    getAppVersion(req: Request, res: Response): Promise<void>;
    getAppConfig(req: Request, res: Response): Promise<void>;
    submitAppFeedback(req: Request, res: Response): Promise<void>;
    getOfflineData(req: Request, res: Response): Promise<void>;
    syncOfflineData(req: Request, res: Response): Promise<void>;
    getMobileFeatures(req: Request, res: Response): Promise<void>;
    trackFeatureUsage(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=MobileController.d.ts.map