import { Request, Response } from 'express';
export declare class SecurityController {
    setup2FA(req: Request, res: Response): Promise<void>;
    verify2FA(req: Request, res: Response): Promise<void>;
    disable2FA(req: Request, res: Response): Promise<void>;
    generateBackupCodes(req: Request, res: Response): Promise<void>;
    getSecurityLogs(req: Request, res: Response): Promise<void>;
    getSecurityLogById(req: Request, res: Response): Promise<void>;
    getLoginAttempts(req: Request, res: Response): Promise<void>;
    getUserLoginAttempts(req: Request, res: Response): Promise<void>;
    getIPBlocks(req: Request, res: Response): Promise<void>;
    createIPBlock(req: Request, res: Response): Promise<void>;
    deleteIPBlock(req: Request, res: Response): Promise<void>;
    getUserDevices(req: Request, res: Response): Promise<void>;
    revokeDevice(req: Request, res: Response): Promise<void>;
    revokeAllDevices(req: Request, res: Response): Promise<void>;
    getSecuritySettings(req: Request, res: Response): Promise<void>;
    updateSecuritySettings(req: Request, res: Response): Promise<void>;
    getAuditTrail(req: Request, res: Response): Promise<void>;
    getUserAuditTrail(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=SecurityController.d.ts.map