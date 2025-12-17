"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearAuthCookies = exports.setAuthCookies = exports.optionalAuth = exports.requireAdmin = exports.requireAffiliate = exports.requireRole = exports.authenticateToken = exports.COOKIE_CONFIG = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const client_1 = require("@prisma/client");
const isVercel = process.env.VERCEL === "1";
const isProduction = process.env.NODE_ENV === "production";
exports.COOKIE_CONFIG = {
    httpOnly: true,
    secure: isVercel || isProduction,
    sameSite: isVercel || isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
};
const prisma = new client_1.PrismaClient();
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        token = req.cookies?.accessToken || req.cookies?.token;
    }
    if (!token) {
        return res.status(401).json({ error: "Access token required" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
            accountId: user.id,
            affiliateId: user.affiliateProfile?.id,
            userId: user.id,
            affiliateProfile: user.affiliateProfile,
            adminProfile: user.adminProfile,
        };
        next();
    }
    catch (error) {
        return res.status(403).json({ error: "Invalid token" });
    }
};
exports.authenticateToken = authenticateToken;
const requireRole = (roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Insufficient permissions" });
        }
        next();
    };
};
exports.requireRole = requireRole;
const requireAffiliate = (req, res, next) => {
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
exports.requireAffiliate = requireAffiliate;
const requireAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
    }
    if (!["ADMIN", "MANAGER"].includes(req.user.role)) {
        return res.status(403).json({ error: "Admin access required" });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.split(" ")[1];
    if (!token) {
        token = req.cookies?.accessToken || req.cookies?.token;
    }
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
                    accountId: user.id,
                    affiliateId: user.affiliateProfile?.id,
                    userId: user.id,
                    affiliateProfile: user.affiliateProfile,
                    adminProfile: user.adminProfile,
                };
            }
        }
        catch (error) {
        }
    }
    next();
};
exports.optionalAuth = optionalAuth;
const setAuthCookies = (res, token, user, req) => {
    const origin = req?.headers?.origin;
    const host = req?.headers?.host;
    const isCrossDomain = origin && host && !origin.includes(host);
    if (isCrossDomain && (isVercel || isProduction)) {
        console.log("Cross-domain request detected, skipping cookie setting");
        return;
    }
    res.cookie("accessToken", token, exports.COOKIE_CONFIG);
    const userData = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
    };
    res.cookie("userData", JSON.stringify(userData), {
        ...exports.COOKIE_CONFIG,
        httpOnly: false,
    });
};
exports.setAuthCookies = setAuthCookies;
const clearAuthCookies = (res) => {
    const clearOptions = {
        httpOnly: true,
        secure: isVercel || isProduction,
        sameSite: isVercel || isProduction ? "none" : "lax",
        path: "/",
    };
    res.clearCookie("accessToken", clearOptions);
    res.clearCookie("userData", clearOptions);
    res.clearCookie("token", clearOptions);
};
exports.clearAuthCookies = clearAuthCookies;
//# sourceMappingURL=auth.js.map