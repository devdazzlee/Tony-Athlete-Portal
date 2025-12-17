import { Response } from 'express';
export declare class AnalyticsController {
    getRealTimeAnalytics(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getRealTimeActivity(req: any, res: Response): Promise<void>;
    getRealTimeMetrics(req: any, res: Response): Promise<void>;
    getFunnelAnalysis(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getCohortAnalysis(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getAttributionData(req: any, res: Response): Promise<void>;
    getAttributionModels(req: any, res: Response): Promise<void>;
    getPerformanceAnalytics(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getPerformanceTrends(req: any, res: Response): Promise<void>;
    getPerformanceComparison(req: any, res: Response): Promise<void>;
    getGeographicAnalytics(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getCountryAnalytics(req: any, res: Response): Promise<void>;
    getCityAnalytics(req: any, res: Response): Promise<void>;
    getDeviceAnalytics(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getDeviceTypeAnalytics(req: any, res: Response): Promise<void>;
    getBrowserAnalytics(req: any, res: Response): Promise<void>;
    getCustomReports(req: any, res: Response): Promise<void>;
    createCustomReport(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    updateCustomReport(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteCustomReport(req: any, res: Response): Promise<void>;
    exportReport(req: any, res: Response): Promise<void>;
}
//# sourceMappingURL=AnalyticsController.d.ts.map