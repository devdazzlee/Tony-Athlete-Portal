import { Request, Response } from 'express';
export declare class IntegrationController {
    getIntegrations(req: Request, res: Response): Promise<void>;
    getIntegrationById(req: Request, res: Response): Promise<void>;
    createIntegration(req: Request, res: Response): Promise<void>;
    updateIntegration(req: Request, res: Response): Promise<void>;
    deleteIntegration(req: Request, res: Response): Promise<void>;
    connectShopify(req: Request, res: Response): Promise<void>;
    syncShopifyProducts(req: Request, res: Response): Promise<void>;
    getShopifyProducts(req: Request, res: Response): Promise<void>;
    getShopifyOrders(req: Request, res: Response): Promise<void>;
    connectMailchimp(req: Request, res: Response): Promise<void>;
    syncMailchimpList(req: Request, res: Response): Promise<void>;
    getMailchimpLists(req: Request, res: Response): Promise<void>;
    getMailchimpCampaigns(req: Request, res: Response): Promise<void>;
    connectStripe(req: Request, res: Response): Promise<void>;
    getStripeBalance(req: Request, res: Response): Promise<void>;
    getStripePayouts(req: Request, res: Response): Promise<void>;
    connectGoogleAnalytics(req: Request, res: Response): Promise<void>;
    getGoogleAnalyticsData(req: Request, res: Response): Promise<void>;
    connectFacebookPixel(req: Request, res: Response): Promise<void>;
    getFacebookPixelEvents(req: Request, res: Response): Promise<void>;
    getIntegrationStatus(req: Request, res: Response): Promise<void>;
    testIntegration(req: Request, res: Response): Promise<void>;
    syncIntegration(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=IntegrationController.d.ts.map