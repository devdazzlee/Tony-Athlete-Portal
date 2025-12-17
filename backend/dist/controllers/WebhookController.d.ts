import { Request, Response } from 'express';
export declare class WebhookController {
    handleStripeWebhook(req: Request, res: Response): Promise<void>;
    handleShopifyWebhook(req: Request, res: Response): Promise<void>;
    handleMailchimpWebhook(req: Request, res: Response): Promise<void>;
    getWebhooks(req: Request, res: Response): Promise<void>;
    getWebhookById(req: Request, res: Response): Promise<void>;
    createWebhook(req: Request, res: Response): Promise<void>;
    updateWebhook(req: Request, res: Response): Promise<void>;
    deleteWebhook(req: Request, res: Response): Promise<void>;
    testWebhook(req: Request, res: Response): Promise<void>;
    retryWebhook(req: Request, res: Response): Promise<void>;
    getWebhookLogs(req: Request, res: Response): Promise<void>;
    getWebhookLogById(req: Request, res: Response): Promise<void>;
    getWebhookEvents(req: Request, res: Response): Promise<void>;
    triggerWebhookEvent(req: Request, res: Response): Promise<void>;
    regenerateWebhookSecret(req: Request, res: Response): Promise<void>;
    verifyWebhookSignature(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=WebhookController.d.ts.map