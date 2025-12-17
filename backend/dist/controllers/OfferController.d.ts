import { Request, Response } from "express";
import "../types/express";
export declare class OfferController {
    getAllOffers(req: Request, res: Response): Promise<void>;
    getOfferById(req: Request, res: Response): Promise<void>;
    createOffer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateOffer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteOffer(req: Request, res: Response): Promise<void>;
    getOfferApplications(req: Request, res: Response): Promise<void>;
    applyForOffer(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateApplication(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteApplication(req: Request, res: Response): Promise<void>;
    getOfferCreatives(req: Request, res: Response): Promise<void>;
    createCreative(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateCreative(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteCreative(req: Request, res: Response): Promise<void>;
    getOfferAnalytics(req: Request, res: Response): Promise<void>;
    getOfferClicks(req: Request, res: Response): Promise<void>;
    getOfferConversions(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=OfferController.d.ts.map