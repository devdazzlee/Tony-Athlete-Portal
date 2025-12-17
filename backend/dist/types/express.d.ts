import { Request } from 'express';
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
export interface AuthenticatedRequest extends Request {
    user: {
        id: string;
        email: string;
        role: string;
        accountId: string;
        affiliateId?: string;
        userId?: string;
    };
}
//# sourceMappingURL=express.d.ts.map