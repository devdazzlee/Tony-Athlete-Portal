"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const zod_1 = require("zod");
const LinksService_1 = __importDefault(require("../services/LinksService"));
const router = express_1.default.Router();
const generateLinkSchema = zod_1.z.object({
    url: zod_1.z.string().url("Invalid URL format"),
    websiteId: zod_1.z.string().optional(),
    referralCodeId: zod_1.z.string().optional(),
    campaignName: zod_1.z.string().optional(),
    offerId: zod_1.z.string().optional(),
});
const generateCouponSchema = zod_1.z.object({
    description: zod_1.z.string().min(3, "Description must be at least 3 characters"),
    discountType: zod_1.z.enum(["PERCENTAGE", "FIXED"], {
        errorMap: () => ({ message: "Discount type must be PERCENTAGE or FIXED" }),
    }),
    discountValue: zod_1.z.number().positive("Discount value must be positive"),
    minPurchase: zod_1.z.number().positive().optional(),
    maxUsage: zod_1.z.number().int().positive().optional(),
    validDays: zod_1.z.number().int().positive().max(365).optional(),
});
const trackClickSchema = zod_1.z.object({
    referrer: zod_1.z.string().optional(),
    userAgent: zod_1.z.string().optional(),
    ipAddress: zod_1.z.string().optional(),
    country: zod_1.z.string().optional(),
    device: zod_1.z.string().optional(),
});
router.post("/generate", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = generateLinkSchema.parse(req.body);
        const link = await LinksService_1.default.generateLink(userId, validatedData);
        res.status(201).json({
            success: true,
            link,
            message: "Affiliate link generated successfully",
        });
    }
    catch (error) {
        console.error("Error generating link:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                details: error.errors,
            });
        }
        if (error instanceof Error) {
            if (error.message === "Custom alias is already taken") {
                return res.status(409).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message === "Affiliate profile not found") {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
        }
        res.status(500).json({
            success: false,
            error: "Failed to generate affiliate link",
        });
    }
});
router.get("/my-links", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const links = await LinksService_1.default.getMyLinks(userId);
        res.json({
            success: true,
            links,
            total: links.length,
        });
    }
    catch (error) {
        console.error("Error fetching links:", error);
        if (error instanceof Error &&
            error.message === "Affiliate profile not found") {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: "Failed to fetch affiliate links",
        });
    }
});
router.get("/stats/:linkId", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { linkId } = req.params;
        const stats = await LinksService_1.default.getLinkStats(userId, linkId);
        res.json({
            success: true,
            stats,
        });
    }
    catch (error) {
        console.error("Error fetching link stats:", error);
        if (error instanceof Error) {
            if (error.message === "Link not found" ||
                error.message === "Affiliate profile not found") {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
        }
        res.status(500).json({
            success: false,
            error: "Failed to fetch link statistics",
        });
    }
});
router.get("/public/:trackingCode", async (req, res) => {
    try {
        const { trackingCode } = req.params;
        const link = await LinksService_1.default.getPublicLink(trackingCode);
        res.json({
            success: true,
            link,
        });
    }
    catch (error) {
        console.error("Error fetching public link:", error);
        if (error instanceof Error && error.message === "Link not found") {
            return res.status(404).json({ success: false, error: error.message });
        }
        res.status(500).json({
            success: false,
            error: "Failed to fetch link details",
        });
    }
});
router.patch("/:linkId/status", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { linkId } = req.params;
        const { isActive } = req.body;
        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                error: "isActive must be a boolean",
            });
        }
        const link = await LinksService_1.default.updateLinkStatus(userId, linkId, isActive);
        res.json({
            success: true,
            link,
            message: `Link ${isActive ? "activated" : "deactivated"} successfully`,
        });
    }
    catch (error) {
        console.error("Error updating link status:", error);
        if (error instanceof Error &&
            error.message === "Affiliate profile not found") {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: "Failed to update link status",
        });
    }
});
router.delete("/:linkId", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { linkId } = req.params;
        const result = await LinksService_1.default.deleteLink(userId, linkId);
        res.json({
            success: true,
            message: result.message,
        });
    }
    catch (error) {
        console.error("Error deleting link:", error);
        if (error instanceof Error &&
            error.message === "Affiliate profile not found") {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: "Failed to delete link",
        });
    }
});
router.get("/assets/banners", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const banners = [
            {
                id: "banner-1",
                name: "Hero Banner - 1200x628",
                category: "Social Media",
                size: "1200x628",
                format: "PNG",
                fileSize: "245 KB",
                downloadUrl: "/assets/banners/hero-1200x628.png",
                previewUrl: "/assets/banners/preview/hero-1200x628.png",
                downloads: 156,
                createdAt: new Date("2024-01-01"),
            },
            {
                id: "banner-2",
                name: "Square Banner - 1080x1080",
                category: "Instagram",
                size: "1080x1080",
                format: "PNG",
                fileSize: "312 KB",
                downloadUrl: "/assets/banners/square-1080x1080.png",
                previewUrl: "/assets/banners/preview/square-1080x1080.png",
                downloads: 203,
                createdAt: new Date("2024-01-05"),
            },
            {
                id: "banner-3",
                name: "Leaderboard - 728x90",
                category: "Web Banner",
                size: "728x90",
                format: "PNG",
                fileSize: "89 KB",
                downloadUrl: "/assets/banners/leaderboard-728x90.png",
                previewUrl: "/assets/banners/preview/leaderboard-728x90.png",
                downloads: 98,
                createdAt: new Date("2024-01-10"),
            },
            {
                id: "banner-4",
                name: "Skyscraper - 160x600",
                category: "Web Banner",
                size: "160x600",
                format: "PNG",
                fileSize: "134 KB",
                downloadUrl: "/assets/banners/skyscraper-160x600.png",
                previewUrl: "/assets/banners/preview/skyscraper-160x600.png",
                downloads: 67,
                createdAt: new Date("2024-01-15"),
            },
        ];
        res.json({
            success: true,
            banners,
            total: banners.length,
        });
    }
    catch (error) {
        console.error("Error fetching banners:", error);
        res.status(500).json({
            success: false,
            error: "Failed to fetch marketing assets",
        });
    }
});
router.get("/coupons/available", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const coupons = await LinksService_1.default.getAvailableCoupons(userId);
        res.json({
            success: true,
            coupons,
            total: coupons.length,
        });
    }
    catch (error) {
        console.error("Error fetching coupons:", error);
        if (error instanceof Error &&
            error.message === "Affiliate profile not found") {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: "Failed to fetch available coupons",
        });
    }
});
router.post("/coupons/generate", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const validatedData = generateCouponSchema.parse(req.body);
        const coupon = await LinksService_1.default.generateCoupon(userId, validatedData);
        res.status(201).json({
            success: true,
            coupon,
            message: "Coupon generated successfully",
        });
    }
    catch (error) {
        console.error("Error generating coupon:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                details: error.errors,
            });
        }
        if (error instanceof Error) {
            if (error.message === "Affiliate profile not found") {
                return res.status(404).json({
                    success: false,
                    error: error.message,
                });
            }
            if (error.message === "Failed to generate unique coupon code") {
                return res.status(500).json({
                    success: false,
                    error: error.message,
                });
            }
        }
        res.status(500).json({
            success: false,
            error: "Failed to generate coupon",
        });
    }
});
router.post("/coupons/validate", async (req, res) => {
    try {
        const { couponCode } = req.body;
        if (!couponCode || typeof couponCode !== "string") {
            return res.status(400).json({
                success: false,
                error: "Coupon code is required",
            });
        }
        const result = await LinksService_1.default.useCoupon(couponCode);
        res.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error("Error validating coupon:", error);
        if (error instanceof Error) {
            return res.status(400).json({
                success: false,
                error: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: "Failed to validate coupon",
        });
    }
});
router.patch("/coupons/:couponId/deactivate", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { couponId } = req.params;
        const coupon = await LinksService_1.default.deactivateCoupon(userId, couponId);
        res.json({
            success: true,
            coupon,
            message: "Coupon deactivated successfully",
        });
    }
    catch (error) {
        console.error("Error deactivating coupon:", error);
        if (error instanceof Error &&
            error.message === "Affiliate profile not found") {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: "Failed to deactivate coupon",
        });
    }
});
router.post("/track/:trackingCode", async (req, res) => {
    try {
        const { trackingCode } = req.params;
        const validatedData = trackClickSchema.parse(req.body);
        const result = await LinksService_1.default.trackClick(trackingCode, validatedData);
        res.json({
            success: true,
            redirectUrl: result.redirectUrl,
            message: "Click tracked successfully",
        });
    }
    catch (error) {
        console.error("Error tracking click:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Validation failed",
                details: error.errors,
            });
        }
        if (error instanceof Error &&
            error.message === "Tracking link not found or inactive") {
            return res.status(404).json({
                success: false,
                error: error.message,
            });
        }
        res.status(500).json({
            success: false,
            error: "Failed to track click",
        });
    }
});
router.get("/redirect/:trackingCode", async (req, res) => {
    try {
        const { trackingCode } = req.params;
        const userAgent = req.headers["user-agent"] || "Unknown";
        const referrer = req.headers.referer || req.headers.referrer;
        const ipAddress = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
        const result = await LinksService_1.default.trackClick(trackingCode, {
            userAgent,
            referrer: referrer,
            ipAddress,
        });
        res.redirect(301, result.redirectUrl);
    }
    catch (error) {
        console.error("Error redirecting:", error);
        if (error instanceof Error &&
            error.message === "Tracking link not found or inactive") {
            return res.status(404).send("Link not found or inactive");
        }
        res.status(500).send("Failed to redirect");
    }
});
exports.default = router;
//# sourceMappingURL=links.js.map