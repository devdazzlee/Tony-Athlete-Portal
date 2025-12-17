import express, { Router, Request, Response } from "express";
import { authenticateToken } from "../middleware/auth";
import { z } from "zod";
import LinksService from "../services/LinksService";

const router: Router = express.Router();

// Validation schemas
const generateLinkSchema = z.object({
  url: z.string().url("Invalid URL format"),
  websiteId: z.string().optional(),
  referralCodeId: z.string().optional(),
  campaignName: z.string().optional(),
  offerId: z.string().optional(),
});

const generateCouponSchema = z.object({
  description: z.string().min(3, "Description must be at least 3 characters"),
  discountType: z.enum(["PERCENTAGE", "FIXED"], {
    errorMap: () => ({ message: "Discount type must be PERCENTAGE or FIXED" }),
  }),
  discountValue: z.number().positive("Discount value must be positive"),
  minPurchase: z.number().positive().optional(),
  maxUsage: z.number().int().positive().optional(),
  validDays: z.number().int().positive().max(365).optional(),
});

const trackClickSchema = z.object({
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
  country: z.string().optional(),
  device: z.string().optional(),
});

// Generate affiliate link
router.post("/generate", authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    // Validate input
    const validatedData = generateLinkSchema.parse(req.body);

    // Generate link using service
    const link = await LinksService.generateLink(userId, validatedData as any);

    res.status(201).json({
      success: true,
      link,
      message: "Affiliate link generated successfully",
    });
  } catch (error) {
    console.error("Error generating link:", error);

    if (error instanceof z.ZodError) {
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

// Get all affiliate links
router.get("/my-links", authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;

    const links = await LinksService.getMyLinks(userId);

    res.json({
      success: true,
      links,
      total: links.length,
    });
  } catch (error) {
    console.error("Error fetching links:", error);

    if (
      error instanceof Error &&
      error.message === "Affiliate profile not found"
    ) {
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

// Get link statistics
router.get(
  "/stats/:linkId",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { linkId } = req.params;

      const stats = await LinksService.getLinkStats(userId, linkId);

      res.json({
        success: true,
        stats,
      });
    } catch (error) {
      console.error("Error fetching link stats:", error);

      if (error instanceof Error) {
        if (
          error.message === "Link not found" ||
          error.message === "Affiliate profile not found"
        ) {
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
  }
);

// Public link details
router.get("/public/:trackingCode", async (req: Request, res: Response) => {
  try {
    const { trackingCode } = req.params;
    const link = await LinksService.getPublicLink(trackingCode);

    res.json({
      success: true,
      link,
    });
  } catch (error: any) {
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

// Update link status
router.patch(
  "/:linkId/status",
  authenticateToken,
  async (req: any, res: Response) => {
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

      const link = await LinksService.updateLinkStatus(
        userId,
        linkId,
        isActive
      );

      res.json({
        success: true,
        link,
        message: `Link ${isActive ? "activated" : "deactivated"} successfully`,
      });
    } catch (error) {
      console.error("Error updating link status:", error);

      if (
        error instanceof Error &&
        error.message === "Affiliate profile not found"
      ) {
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
  }
);

// Delete link
router.delete(
  "/:linkId",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { linkId } = req.params;

      const result = await LinksService.deleteLink(userId, linkId);

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Error deleting link:", error);

      if (
        error instanceof Error &&
        error.message === "Affiliate profile not found"
      ) {
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
  }
);

// Get marketing assets (banners)
router.get(
  "/assets/banners",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;

      // TODO: Implement proper marketing assets management with database
      // For now, returning sample assets as placeholders
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
    } catch (error) {
      console.error("Error fetching banners:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch marketing assets",
      });
    }
  }
);

// Get available coupons
router.get(
  "/coupons/available",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;

      const coupons = await LinksService.getAvailableCoupons(userId);

      res.json({
        success: true,
        coupons,
        total: coupons.length,
      });
    } catch (error) {
      console.error("Error fetching coupons:", error);

      if (
        error instanceof Error &&
        error.message === "Affiliate profile not found"
      ) {
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
  }
);

// Generate custom coupon
router.post(
  "/coupons/generate",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;

      // Validate input
      const validatedData = generateCouponSchema.parse(req.body);

      const coupon = await LinksService.generateCoupon(
        userId,
        validatedData as any
      );

      res.status(201).json({
        success: true,
        coupon,
        message: "Coupon generated successfully",
      });
    } catch (error) {
      console.error("Error generating coupon:", error);

      if (error instanceof z.ZodError) {
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
  }
);

// Validate and use coupon
router.post("/coupons/validate", async (req: Request, res: Response) => {
  try {
    const { couponCode } = req.body;

    if (!couponCode || typeof couponCode !== "string") {
      return res.status(400).json({
        success: false,
        error: "Coupon code is required",
      });
    }

    const result = await LinksService.useCoupon(couponCode);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
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

// Deactivate coupon
router.patch(
  "/coupons/:couponId/deactivate",
  authenticateToken,
  async (req: any, res: Response) => {
    try {
      const userId = req.user.id;
      const { couponId } = req.params;

      const coupon = await LinksService.deactivateCoupon(userId, couponId);

      res.json({
        success: true,
        coupon,
        message: "Coupon deactivated successfully",
      });
    } catch (error) {
      console.error("Error deactivating coupon:", error);

      if (
        error instanceof Error &&
        error.message === "Affiliate profile not found"
      ) {
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
  }
);

// Track link click
router.post("/track/:trackingCode", async (req: Request, res: Response) => {
  try {
    const { trackingCode } = req.params;

    // Validate click data
    const validatedData = trackClickSchema.parse(req.body);

    // Track the click
    const result = await LinksService.trackClick(trackingCode, validatedData);

    // Return success with redirect URL
    res.json({
      success: true,
      redirectUrl: result.redirectUrl,
      message: "Click tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking click:", error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: error.errors,
      });
    }

    if (
      error instanceof Error &&
      error.message === "Tracking link not found or inactive"
    ) {
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

// Redirect short URL to original URL (for actual link redirection)
router.get("/redirect/:trackingCode", async (req: Request, res: Response) => {
  try {
    const { trackingCode } = req.params;

    // Get user agent and IP for tracking
    const userAgent = req.headers["user-agent"] || "Unknown";
    const referrer = req.headers.referer || req.headers.referrer;
    const ipAddress =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0] || req.ip;

    // Track the click and get redirect URL
    const result = await LinksService.trackClick(trackingCode, {
      userAgent,
      referrer: referrer as string,
      ipAddress,
    });

    // Redirect to original URL
    res.redirect(301, result.redirectUrl);
  } catch (error) {
    console.error("Error redirecting:", error);

    if (
      error instanceof Error &&
      error.message === "Tracking link not found or inactive"
    ) {
      return res.status(404).send("Link not found or inactive");
    }

    res.status(500).send("Failed to redirect");
  }
});

export default router;
