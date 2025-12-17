import { Request, Response } from "express";
export declare class AuthController {
    register(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    login(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    logout(req: any, res: Response): Promise<void>;
    getProfile(req: any, res: Response): Promise<void>;
    updateProfile(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    changePassword(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    forgotPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resetPassword(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    setup2FA(req: any, res: Response): Promise<void>;
    verify2FA(req: any, res: Response): Promise<void>;
    disable2FA(req: any, res: Response): Promise<void>;
    generateBackupCodes(req: any, res: Response): Promise<void>;
    verifyEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    resendVerificationEmail(req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
//# sourceMappingURL=AuthController.d.ts.map