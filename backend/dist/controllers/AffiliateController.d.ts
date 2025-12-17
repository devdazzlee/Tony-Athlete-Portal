import { Request, Response } from 'express';
export declare class AffiliateController {
    getAllAffiliates(req: Request, res: Response): Promise<void>;
    getAffiliateById(req: Request, res: Response): Promise<void>;
    createAffiliate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateAffiliate(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteAffiliate(req: Request, res: Response): Promise<void>;
    getMyProfile(req: any, res: Response): Promise<void>;
    updateMyProfile(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    uploadAvatar(req: any, res: Response): Promise<void>;
    getAffiliateLinks(req: Request, res: Response): Promise<void>;
    createAffiliateLink(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    updateAffiliateLink(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    deleteAffiliateLink(req: Request, res: Response): Promise<void>;
    getCommissions(req: Request, res: Response): Promise<void>;
    getPayouts(req: Request, res: Response): Promise<void>;
    requestPayout(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getAnalytics(req: Request, res: Response): Promise<void>;
    getClicksAnalytics(req: Request, res: Response): Promise<void>;
    getConversionsAnalytics(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=AffiliateController.d.ts.map