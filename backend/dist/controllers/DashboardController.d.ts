import { Response } from 'express';
export declare class DashboardController {
    getStats(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getRecentActivity(req: any, res: Response): Promise<void>;
    getPerformanceChart(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getTopOffers(req: any, res: Response): Promise<void>;
    getNotifications(req: any, res: Response): Promise<void>;
    markNotificationAsRead(req: any, res: Response): Promise<void>;
}
//# sourceMappingURL=DashboardController.d.ts.map