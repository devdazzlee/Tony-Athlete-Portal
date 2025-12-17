import { Request, Response } from 'express';
export declare class EnterpriseController {
    getWhiteLabelSettings(req: Request, res: Response): Promise<void>;
    updateWhiteLabelSettings(req: Request, res: Response): Promise<void>;
    previewWhiteLabel(req: Request, res: Response): Promise<void>;
    getTenants(req: Request, res: Response): Promise<void>;
    getTenantById(req: Request, res: Response): Promise<void>;
    createTenant(req: Request, res: Response): Promise<void>;
    updateTenant(req: Request, res: Response): Promise<void>;
    deleteTenant(req: Request, res: Response): Promise<void>;
    getTenantSettings(req: Request, res: Response): Promise<void>;
    updateTenantSettings(req: Request, res: Response): Promise<void>;
    getTenantAnalytics(req: Request, res: Response): Promise<void>;
    getTenantUsage(req: Request, res: Response): Promise<void>;
    getEnterpriseFeatures(req: Request, res: Response): Promise<void>;
    updateEnterpriseFeatures(req: Request, res: Response): Promise<void>;
    getAPILimits(req: Request, res: Response): Promise<void>;
    updateAPILimits(req: Request, res: Response): Promise<void>;
    getCustomDomains(req: Request, res: Response): Promise<void>;
    addCustomDomain(req: Request, res: Response): Promise<void>;
    removeCustomDomain(req: Request, res: Response): Promise<void>;
    getSSOSettings(req: Request, res: Response): Promise<void>;
    updateSSOSettings(req: Request, res: Response): Promise<void>;
    testSSO(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=EnterpriseController.d.ts.map