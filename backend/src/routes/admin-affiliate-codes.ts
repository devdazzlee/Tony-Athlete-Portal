import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import * as crypto from "crypto";
import { authenticateToken, requireRole } from "../middleware/auth";

const router: Router = Router();
const prisma = new PrismaClient();

// Get all affiliate codes with filtering and pagination
router.get("/", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      affiliateId,
    } = req.query;

    const filters: any = {
      isAffiliate: true, // Only fetch affiliate allowance codes
    };

    if (search) {
      filters.OR = [
        { code: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      filters.status = status;
    }

    if (affiliateId) {
      filters.affiliateId = affiliateId;
    }

    const codes = await prisma.coupon.findMany({
      where: filters,
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.coupon.count({ where: filters });

    // Add expiration status and usage info
    const codesWithStatus = codes.map((code) => {
      const isExpired = code.validUntil < new Date();
      const isUsed = code.maxUsage ? code.usage >= code.maxUsage : false;
      return {
        ...code,
        isExpired,
        isUsed,
        remainingUses: code.maxUsage ? code.maxUsage - code.usage : 0,
      };
    });

    res.json({
      codes: codesWithStatus,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching affiliate codes:", error);
    res.status(500).json({ error: "Failed to fetch affiliate codes" });
  }
});

// Get affiliate code by ID
router.get("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const code = await prisma.coupon.findUnique({
      where: { id },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!code || !code.isAffiliate) {
      return res.status(404).json({ error: "Affiliate code not found" });
    }

    const isExpired = code.validUntil < new Date();
    const isUsed = code.maxUsage ? code.usage >= code.maxUsage : false;

    res.json({
      ...code,
      isExpired,
      isUsed,
      remainingUses: code.maxUsage ? code.maxUsage - code.usage : 0,
    });
  } catch (error) {
    console.error("Error fetching affiliate code:", error);
    res.status(500).json({ error: "Failed to fetch affiliate code" });
  }
});

// Generate new affiliate code
router.post("/generate", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const generateSchema = z.object({
      affiliateId: z.string(),
      allowanceAmount: z.number().min(0), // Dollar amount (e.g., 150)
      discountType: z.enum(["percentage", "fixed_amount"]).default("fixed_amount"),
      discountValue: z.number().min(0).default(0),
      freeShipping: z.boolean().default(false),
      description: z.string().optional(),
    });

    const data = generateSchema.parse(req.body);

    // Verify affiliate exists
    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { id: data.affiliateId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!affiliate) {
      return res.status(404).json({ error: "Affiliate not found" });
    }

    // Generate unique code
    let code: string;
    let attempts = 0;
    const existingCodes = new Set(
      (await prisma.coupon.findMany({ select: { code: true } })).map((c) => c.code)
    );

    do {
      const randomPart = crypto
        .randomBytes(4)
        .toString("hex")
        .toUpperCase();
      code = `AFFILIATE-${randomPart}`;
      attempts++;
    } while (existingCodes.has(code) && attempts < 10);

    if (attempts >= 10) {
      return res.status(400).json({ error: "Unable to generate unique code" });
    }

    // Calculate end of current month
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Create description
    const shippingText = data.freeShipping ? " + Free Shipping" : "";
    const discountText = data.discountValue > 0 
      ? data.discountType === "percentage" 
        ? `${data.discountValue}% off${shippingText}` 
        : `$${data.discountValue} off${shippingText}`
      : data.freeShipping 
        ? "Free Shipping Only" 
        : "No Discount";

    const description = data.description || 
      `Affiliate allowance code for ${affiliate.user.firstName} ${affiliate.user.lastName} - $${data.allowanceAmount} allowance - ${discountText} - Expires ${endOfMonth.toLocaleDateString()}`;

    // Create the affiliate code
    const affiliateCode = await prisma.coupon.create({
      data: {
        code,
        description,
        discount: data.discountValue.toString(),
        affiliateId: data.affiliateId,
        validUntil: endOfMonth,
        maxUsage: 1, // One-time use
        usage: 0,
        status: "ACTIVE",
        freeShipping: data.freeShipping,
        isAffiliate: true,
      },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Affiliate code generated successfully",
      code: affiliateCode,
    });
  } catch (error) {
    console.error("Error generating affiliate code:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to generate affiliate code" });
  }
});

// Delete affiliate code
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const code = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!code || !code.isAffiliate) {
      return res.status(404).json({ error: "Affiliate code not found" });
    }

    await prisma.coupon.delete({
      where: { id },
    });

    res.json({ message: "Affiliate code deleted successfully" });
  } catch (error) {
    console.error("Error deleting affiliate code:", error);
    res.status(500).json({ error: "Failed to delete affiliate code" });
  }
});

// Update affiliate code status (activate/deactivate)
router.patch("/:id/status", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const statusSchema = z.object({
      status: z.enum(["ACTIVE", "INACTIVE"]),
    });

    const { status } = statusSchema.parse(req.body);

    const code = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!code || !code.isAffiliate) {
      return res.status(404).json({ error: "Affiliate code not found" });
    }

    const updatedCode = await prisma.coupon.update({
      where: { id },
      data: { status },
      include: {
        affiliate: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: "Affiliate code status updated successfully",
      code: updatedCode,
    });
  } catch (error) {
    console.error("Error updating affiliate code status:", error);
    res.status(500).json({ error: "Failed to update affiliate code status" });
  }
});

// Get statistics for affiliate codes
router.get("/stats/overview", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { affiliateId } = req.query;

    const filters: any = { isAffiliate: true };
    if (affiliateId) {
      filters.affiliateId = affiliateId;
    }

    const totalCodes = await prisma.coupon.count({ where: filters });
    const activeCodes = await prisma.coupon.count({
      where: { ...filters, status: "ACTIVE" },
    });
    const usedCodes = await prisma.coupon.count({
      where: { ...filters, usage: { gt: 0 } },
    });
    const expiredCodes = await prisma.coupon.count({
      where: {
        ...filters,
        validUntil: { lt: new Date() },
      },
    });

    res.json({
      totalCodes,
      activeCodes,
      usedCodes,
      expiredCodes,
      unusedCodes: totalCodes - usedCodes,
    });
  } catch (error) {
    console.error("Error fetching affiliate code statistics:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;

