import { Request, Response } from 'express';
export declare class TrafficControlController {
    static createRule(req: Request, res: Response): Promise<void>;
    static getRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateRule(req: Request, res: Response): Promise<void>;
    static deleteRule(req: Request, res: Response): Promise<void>;
    static listRules(req: Request, res: Response): Promise<void>;
    static processTraffic(req: Request, res: Response): Promise<void>;
    static getTrafficEvents(req: Request, res: Response): Promise<void>;
    static getTrafficStats(req: Request, res: Response): Promise<void>;
    static testRule(req: Request, res: Response): Promise<void>;
    static createDefaultRules(req: Request, res: Response): Promise<void>;
    static blockIP(req: Request, res: Response): Promise<void>;
    static unblockIP(req: Request, res: Response): Promise<void>;
    static getBlockedIPs(req: Request, res: Response): Promise<void>;
    static blockCountry(req: Request, res: Response): Promise<void>;
    static unblockCountry(req: Request, res: Response): Promise<void>;
    static getBlockedCountries(req: Request, res: Response): Promise<void>;
    static updateRateLimit(req: Request, res: Response): Promise<void>;
    static blockDevice(req: Request, res: Response): Promise<void>;
    static unblockDevice(req: Request, res: Response): Promise<void>;
    static getTrafficControlDashboard(req: Request, res: Response): Promise<void>;
    static exportRules(req: Request, res: Response): Promise<void>;
    static importRules(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=TrafficControlController.d.ts.map