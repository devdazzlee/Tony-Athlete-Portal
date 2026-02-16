import { Request, Response, NextFunction } from "express";
import * as jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

// Cookie configuration - Vercel compatible for cross-domain
const isVercel = process.env.VERCEL === "1";
const isProduction = process.env.NODE_ENV === "production";

export const COOKIE_CONFIG = {
  httpOnly: true,
  secure: isVercel || isProduction,
  sameSite: isVercel || isProduction ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000, // default (overridden per-cookie)
  path: "/",
};

export const ACCESS_COOKIE_MAX_AGE_MS =
  parseDurationMs(process.env.ACCESS_TOKEN_EXPIRES_IN || "15m");
export const REFRESH_COOKIE_MAX_AGE_MS =
  parseDurationMs(process.env.REFRESH_TOKEN_EXPIRES_IN || "30d");

const prisma = new PrismaClient();

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

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // First try to get token from Authorization header
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  // If no token in header, try to get from cookies
  if (!token) {
    token = req.cookies?.accessToken || req.cookies?.token;
  }

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  try {
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ error: "Access token expired", code: "TOKEN_EXPIRED" });
      }
      return res.status(401).json({ error: "Invalid access token" });
    }

    // Ensure the access token is still part of an active session (allows revocation)
    // First try to find session by exact token match
    let session = await prisma.session.findFirst({
      where: {
        token,
        isActive: true,
        expiresAt: { gt: new Date() },
      } as any,
    } as any);

    // If session not found by token, it might have been refreshed
    // Check if there's an active session for this user (token refresh scenario)
    if (!session && decoded.userId) {
      const userSession = await prisma.session.findFirst({
        where: {
          userId: decoded.userId,
          isActive: true,
          expiresAt: { gt: new Date() },
        } as any,
        orderBy: {
          lastActivity: "desc",
        } as any,
      } as any);

      // Only use user session if the JWT is still valid (not expired)
      // This handles the case where token was refreshed but old token is still being used
      if (userSession) {
        // Check if the JWT expiration is still valid (within 1 minute grace period)
        const jwtExp = decoded.exp ? decoded.exp * 1000 : null;
        const now = Date.now();
        const oneMinuteGrace = 60 * 1000;
        
        if (jwtExp && (jwtExp - now) > -oneMinuteGrace) {
          // Token is still valid (or expired less than 1 minute ago)
          // This allows for race conditions during token refresh
          session = userSession;
        }
      }
    }

    if (!session) {
      // Log for debugging
      console.log("Session not found", {
        tokenLength: token?.length,
        userId: decoded.userId,
        tokenExp: decoded.exp,
      });
      return res.status(401).json({ error: "Session expired", code: "TOKEN_EXPIRED" });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        affiliateProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      accountId: user.id, // Use user ID as accountId for now
      affiliateId: user.affiliateProfile?.id,
      userId: user.id,
      affiliateProfile: user.affiliateProfile,
      adminProfile: user.adminProfile,
    };

    // Best-effort update of last activity
    prisma.session
      .update({
        where: { id: session.id },
        data: { lastActivity: new Date() } as any,
      } as any)
      .catch(() => undefined);

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};

export const requireAffiliate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (req.user.role !== "AFFILIATE") {
    return res.status(403).json({ error: "Affiliate access  q " });
  }

  if (!req.user.affiliateProfile) {
    return res.status(404).json({ error: "Affiliate profile not found" });
  }

  next();
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    return res.status(401).json({ error: "Authentication required" });
  }

  if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // First try to get token from Authorization header
  const authHeader = req.headers["authorization"];
  let token = authHeader && authHeader.split(" ")[1];

  // If no token in header, try to get from cookies
  if (!token) {
    token = req.cookies?.accessToken || req.cookies?.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          affiliateProfile: true,
          adminProfile: true,
        },
      });

      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          role: user.role,
          accountId: user.id, // Use user ID as accountId for now
          affiliateId: user.affiliateProfile?.id,
          userId: user.id,
          affiliateProfile: user.affiliateProfile,
          adminProfile: user.adminProfile,
        };
      }
    } catch (error) {
      // Token is invalid, but we continue without authentication
    }
  }

  next();
};

// Cookie utility functions
export const setAuthCookies = (
  res: Response,
  token: string,
  refreshToken: string | null,
  user: any,
  req?: Request
) => {
  // Check if this is a cross-domain request
  const origin = req?.headers?.origin;
  const host = req?.headers?.host;
  const isCrossDomain = origin && host && !origin.includes(host);

  // In production cross-domain scenario, don't set cookies
  // The frontend Next.js API route will set cookies for its own domain
  if (isCrossDomain && (isVercel || isProduction)) {
    console.log("Cross-domain request detected, skipping cookie setting");
    return;
  }

  // Set access token cookie
  res.cookie("accessToken", token, {
    ...COOKIE_CONFIG,
    maxAge: ACCESS_COOKIE_MAX_AGE_MS,
  });

  if (refreshToken) {
    res.cookie("refreshToken", refreshToken, {
      ...COOKIE_CONFIG,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }

  // Set user data cookie (non-sensitive info only)
  const userData = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatar: user.avatar,
  };

  res.cookie("userData", JSON.stringify(userData), {
    ...COOKIE_CONFIG,
    httpOnly: false, // Allow frontend to read user data
  });
};

export const clearAuthCookies = (res: Response) => {
  const clearOptions = {
    httpOnly: true,
    secure: isVercel || isProduction,
    sameSite: isVercel || isProduction ? ("none" as const) : ("lax" as const),
    path: "/",
  };

  res.clearCookie("accessToken", clearOptions);
  res.clearCookie("refreshToken", clearOptions);
  res.clearCookie("userData", clearOptions);
  res.clearCookie("token", clearOptions); // Legacy support
};

function parseDurationMs(input: string): number {
  const trimmed = String(input || "").trim();
  const match = trimmed.match(/^(\d+)\s*(ms|s|m|h|d)$/i);
  if (!match) {
    // default to 7 days to preserve legacy behavior if misconfigured
    return 7 * 24 * 60 * 60 * 1000;
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 7 * 24 * 60 * 60 * 1000;
  }
}
