import { Request, Response } from 'express';

// Extend Express Request interface to include user
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


