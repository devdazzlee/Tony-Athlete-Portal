import { Request, Response, NextFunction } from "express";
export declare const COOKIE_CONFIG: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "none" | "lax";
    maxAge: number;
    path: string;
};
export declare const ACCESS_COOKIE_MAX_AGE_MS: number;
export declare const REFRESH_COOKIE_MAX_AGE_MS: number;
export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
        accountId: string;
        affiliateId?: string;
        userId?: string;
        affiliateProfile?: any;
        adminProfile?: any;
    };
}
export declare const authenticateToken: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>>>;
export declare const requireRole: (roles: string[]) => (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireAffiliate: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const requireAdmin: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Response<any, Record<string, any>>;
export declare const optionalAuth: (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;
export declare const setAuthCookies: (res: Response, token: string, refreshToken: string | null, user: any, req?: Request) => void;
export declare const clearAuthCookies: (res: Response) => void;
//# sourceMappingURL=auth.d.ts.map