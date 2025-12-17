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
export declare class WebhooksController {
    static createWebhook(req: Request, res: Response): Promise<void>;
    static getWebhook(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateWebhook(req: Request, res: Response): Promise<void>;
    static deleteWebhook(req: Request, res: Response): Promise<void>;
    static listWebhooks(req: Request, res: Response): Promise<void>;
    static addEvent(req: Request, res: Response): Promise<void>;
    static updateEvent(req: Request, res: Response): Promise<void>;
    static removeEvent(req: Request, res: Response): Promise<void>;
    static testWebhook(req: Request, res: Response): Promise<void>;
    static triggerWebhook(req: Request, res: Response): Promise<void>;
    static getWebhookHistory(req: Request, res: Response): Promise<void>;
    static getWebhookLogs(req: Request, res: Response): Promise<void>;
    static getWebhookStats(req: Request, res: Response): Promise<void>;
    static getWebhookTemplates(req: Request, res: Response): Promise<void>;
    static createWebhookFromTemplate(req: Request, res: Response): Promise<void>;
    static generateSecret(req: Request, res: Response): Promise<void>;
    static validateSignature(req: Request, res: Response): Promise<void>;
    static retryWebhook(req: Request, res: Response): Promise<void>;
    static getWebhooksDashboard(req: Request, res: Response): Promise<void>;
    static createDefaultWebhooks(req: Request, res: Response): Promise<void>;
    static receiveWebhook(req: Request, res: Response): Promise<void>;
    static exportWebhooks(req: Request, res: Response): Promise<void>;
    static importWebhooks(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=WebhooksController.d.ts.map