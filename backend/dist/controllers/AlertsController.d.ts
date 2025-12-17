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
export declare class AlertsController {
    static createAlert(req: Request, res: Response): Promise<void>;
    static getAlert(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateAlert(req: Request, res: Response): Promise<void>;
    static deleteAlert(req: Request, res: Response): Promise<void>;
    static listAlerts(req: Request, res: Response): Promise<void>;
    static addRule(req: Request, res: Response): Promise<void>;
    static updateRule(req: Request, res: Response): Promise<void>;
    static removeRule(req: Request, res: Response): Promise<void>;
    static addAction(req: Request, res: Response): Promise<void>;
    static updateAction(req: Request, res: Response): Promise<void>;
    static removeAction(req: Request, res: Response): Promise<void>;
    static triggerAlert(req: Request, res: Response): Promise<void>;
    static testAlert(req: Request, res: Response): Promise<void>;
    static getAlertHistory(req: Request, res: Response): Promise<void>;
    static getAlertStats(req: Request, res: Response): Promise<void>;
    static getAlertsDashboard(req: Request, res: Response): Promise<void>;
    static createDefaultAlerts(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AlertsController.d.ts.map