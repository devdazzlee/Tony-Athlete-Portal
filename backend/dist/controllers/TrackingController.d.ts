import { Request, Response } from "express";
export declare class TrackingController {
    trackEvents(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getTrackingStats(req: Request, res: Response): Promise<void>;
    getRealtimeAnalytics(req: Request, res: Response): Promise<void>;
    getPageAnalytics(req: Request, res: Response): Promise<void>;
    getDeviceAnalytics(req: Request, res: Response): Promise<void>;
    getGeographicAnalytics(req: Request, res: Response): Promise<void>;
    getConversionAnalytics(req: Request, res: Response): Promise<void>;
    getUserJourney(req: Request, res: Response): Promise<void>;
    getHeatmapData(req: Request, res: Response): Promise<void>;
    getFunnelAnalysis(req: Request, res: Response): Promise<void>;
    exportTrackingData(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=TrackingController.d.ts.map