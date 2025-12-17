import { Request, Response } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                accountId: string;
                affiliateId?: string;
                userId?: string;
            };
        }
    }
}
export declare class PayoutBuilderController {
    static createPayoutRule(req: Request, res: Response): Promise<void>;
    static getPayoutRule(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updatePayoutRule(req: Request, res: Response): Promise<void>;
    static deletePayoutRule(req: Request, res: Response): Promise<void>;
    static listPayoutRules(req: Request, res: Response): Promise<void>;
    static addCondition(req: Request, res: Response): Promise<void>;
    static updateCondition(req: Request, res: Response): Promise<void>;
    static removeCondition(req: Request, res: Response): Promise<void>;
    static addAction(req: Request, res: Response): Promise<void>;
    static updateAction(req: Request, res: Response): Promise<void>;
    static removeAction(req: Request, res: Response): Promise<void>;
    static processPayouts(req: Request, res: Response): Promise<void>;
    static previewPayouts(req: Request, res: Response): Promise<void>;
    static getPayoutHistory(req: Request, res: Response): Promise<void>;
    static generatePayoutReport(req: Request, res: Response): Promise<void>;
    static getPayoutStats(req: Request, res: Response): Promise<void>;
    static getPayoutBuilderDashboard(req: Request, res: Response): Promise<void>;
    static createDefaultRules(req: Request, res: Response): Promise<void>;
    static testRule(req: Request, res: Response): Promise<void>;
    static updateSchedule(req: Request, res: Response): Promise<void>;
    static exportRules(req: Request, res: Response): Promise<void>;
    static importRules(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=PayoutBuilderController.d.ts.map