import { Request, Response } from 'express';
export declare class ComplianceController {
    getGDPRSettings(req: Request, res: Response): Promise<void>;
    updateGDPRSettings(req: Request, res: Response): Promise<void>;
    getDataRequests(req: Request, res: Response): Promise<void>;
    createDataRequest(req: Request, res: Response): Promise<void>;
    updateDataRequest(req: Request, res: Response): Promise<void>;
    getDataRetentionSettings(req: Request, res: Response): Promise<void>;
    updateDataRetentionSettings(req: Request, res: Response): Promise<void>;
    runDataCleanup(req: Request, res: Response): Promise<void>;
    getAuditTrail(req: Request, res: Response): Promise<void>;
    exportAuditTrail(req: Request, res: Response): Promise<void>;
    getPrivacyPolicy(req: Request, res: Response): Promise<void>;
    updatePrivacyPolicy(req: Request, res: Response): Promise<void>;
    getTermsOfService(req: Request, res: Response): Promise<void>;
    updateTermsOfService(req: Request, res: Response): Promise<void>;
    getCookieConsentSettings(req: Request, res: Response): Promise<void>;
    updateCookieConsentSettings(req: Request, res: Response): Promise<void>;
    trackCookieConsent(req: Request, res: Response): Promise<void>;
    requestDataExport(req: Request, res: Response): Promise<void>;
    getDataExport(req: Request, res: Response): Promise<void>;
    downloadDataExport(req: Request, res: Response): Promise<void>;
    requestDataDeletion(req: Request, res: Response): Promise<void>;
    getDataDeletionStatus(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=ComplianceController.d.ts.map