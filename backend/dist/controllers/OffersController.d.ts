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
export declare class OffersController {
    static createOffer(req: Request, res: Response): Promise<void>;
    static getOffer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateOffer(req: Request, res: Response): Promise<void>;
    static deleteOffer(req: Request, res: Response): Promise<void>;
    static listOffers(req: Request, res: Response): Promise<void>;
    static addLandingPage(req: Request, res: Response): Promise<void>;
    static updateLandingPage(req: Request, res: Response): Promise<void>;
    static removeLandingPage(req: Request, res: Response): Promise<void>;
    static addCreative(req: Request, res: Response): Promise<void>;
    static updateCreative(req: Request, res: Response): Promise<void>;
    static removeCreative(req: Request, res: Response): Promise<void>;
    static addIntegration(req: Request, res: Response): Promise<void>;
    static updateIntegration(req: Request, res: Response): Promise<void>;
    static removeIntegration(req: Request, res: Response): Promise<void>;
    static generateTrackingCode(req: Request, res: Response): Promise<void>;
    static createApplication(req: Request, res: Response): Promise<void>;
    static getApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    static updateApplicationStatus(req: Request, res: Response): Promise<void>;
    static getApplications(req: Request, res: Response): Promise<void>;
    static updateStats(req: Request, res: Response): Promise<void>;
    static getOfferStats(req: Request, res: Response): Promise<void>;
    static getOffersDashboard(req: Request, res: Response): Promise<void>;
    static createDefaultOffers(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=OffersController.d.ts.map