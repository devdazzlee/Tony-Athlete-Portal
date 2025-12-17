import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import * as crypto from "crypto";
import multer from "multer";
import csv from "csv-parser";
import * as fs from "fs";

const router: Router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads - use memory storage for serverless environments
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Get coupons with filtering and pagination
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      status,
      type,
      affiliateId,
    } = req.query;

    const filters: any = {};

    if (search) {
      filters.OR = [
        { code: { contains: search as string, mode: "insensitive" } },
        { description: { contains: search as string, mode: "insensitive" } },
      ];
    }

    if (status && status !== "all") {
      filters.status = status;
    }

    if (type && type !== "all") {
      filters.type = type;
    }

    if (affiliateId) {
      filters.affiliateId = affiliateId;
    }

    const coupons = await prisma.coupon.findMany({
      where: filters,
      include: {
        affiliate: {
          select: {
            id: true,
            companyName: true,
          },
        },
        // _count not available in schema
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    });

    const total = await prisma.coupon.count({ where: filters });

    res.json({
      coupons,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ error: "Failed to fetch coupons" });
  }
});

// Get coupon by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        affiliate: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    // Calculate usage statistics
    const totalUses = coupon.usage;
    const successfulUses = coupon.usage; // Simplified
    const totalRevenue = 0; // Simplified
    const conversionRate =
      totalUses > 0 ? ((successfulUses / totalUses) * 100).toFixed(2) : "0.00";

    res.json({
      ...coupon,
      statistics: {
        totalUses,
        successfulUses,
        totalRevenue,
        conversionRate: `${conversionRate}%`,
        remainingUses: coupon.maxUsage
          ? Math.max(0, coupon.maxUsage - totalUses)
          : "Unlimited",
      },
    });
  } catch (error) {
    console.error("Error fetching coupon:", error);
    res.status(500).json({ error: "Failed to fetch coupon" });
  }
});

// Create new coupon
router.post("/", async (req: Request, res: Response) => {
  try {
    const couponSchema = z.object({
      code: z.string().min(3).max(50),
      description: z.string().optional(),
      type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
      value: z.number().min(0),
      affiliateId: z.string(),
      offerId: z.string().optional(),
      maxUses: z.number().min(1).optional(),
      expiresAt: z.string().optional(),
      minOrderValue: z.number().min(0).optional(),
      isActive: z.boolean().default(true),
    });

    const data = couponSchema.parse(req.body);

    // Check if coupon code already exists
    const existingCoupon = await prisma.coupon.findUnique({
      where: { code: data.code },
    });

    if (existingCoupon) {
      return res.status(400).json({ error: "Coupon code already exists" });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code,
        description: data.description || "",
        discount: data.value?.toString() || "10",
        affiliateId: data.affiliateId,
        validUntil: data.expiresAt
          ? new Date(data.expiresAt)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxUsage: data.maxUses,
        status: data.isActive ? "ACTIVE" : "INACTIVE",
      },
      include: {
        affiliate: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    res.status(201).json(coupon);
  } catch (error) {
    console.error("Error creating coupon:", error);
    res.status(400).json({ error: "Failed to create coupon" });
  }
});

// Update coupon
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateSchema = z.object({
      description: z.string().optional(),
      type: z.enum(["percentage", "fixed_amount", "free_shipping"]).optional(),
      value: z.number().min(0).optional(),
      maxUses: z.number().min(1).optional(),
      expiresAt: z.string().optional(),
      minOrderValue: z.number().min(0).optional(),
      isActive: z.boolean().optional(),
    });

    const data = updateSchema.parse(req.body);

    const coupon = await prisma.coupon.update({
      where: { id },
      data: {
        description: data.description,
        discount: data.value?.toString(),
        maxUsage: data.maxUses,
        validUntil: data.expiresAt ? new Date(data.expiresAt) : undefined,
        status: data.isActive ? "ACTIVE" : "INACTIVE",
      },
      include: {
        affiliate: {
          select: {
            id: true,
            companyName: true,
          },
        },
      },
    });

    res.json(coupon);
  } catch (error) {
    console.error("Error updating coupon:", error);
    res.status(400).json({ error: "Failed to update coupon" });
  }
});

// Delete coupon
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.coupon.delete({
      where: { id },
    });

    res.json({ message: "Coupon deleted successfully" });
  } catch (error) {
    console.error("Error deleting coupon:", error);
    res.status(500).json({ error: "Failed to delete coupon" });
  }
});

// Generate random coupon codes
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const generateSchema = z.object({
      count: z.number().min(1).max(100),
      length: z.number().min(4).max(20).default(8),
      prefix: z.string().optional(),
      suffix: z.string().optional(),
      type: z.enum(["percentage", "fixed_amount", "free_shipping"]),
      value: z.number().min(0),
      affiliateId: z.string(),
      offerId: z.string().optional(),
      maxUses: z.number().min(1).optional(),
      expiresAt: z.string().optional(),
      minOrderValue: z.number().min(0).optional(),
    });

    const data = generateSchema.parse(req.body);

    const generatedCoupons = [];
    const existingCodes = new Set();

    // Get existing coupon codes to avoid duplicates
    const existing = await prisma.coupon.findMany({
      select: { code: true },
    });
    for (const coupon of existing) {
      existingCodes.add(coupon.code);
    }

    for (let i = 0; i < data.count; i++) {
      let code: string;
      let attempts = 0;

      do {
        const randomPart = crypto
          .randomBytes(Math.ceil(data.length / 2))
          .toString("hex")
          .substring(0, data.length)
          .toUpperCase();

        code = `${data.prefix || ""}${randomPart}${data.suffix || ""}`;
        attempts++;
      } while (existingCodes.has(code) && attempts < 10);

      if (attempts >= 10) {
        return res
          .status(400)
          .json({ error: "Unable to generate unique coupon codes" });
      }

      existingCodes.add(code);

      const coupon = await prisma.coupon.create({
        data: {
          code,
          description: `Auto-generated coupon ${i + 1}/${data.count}`,
          discount: data.value?.toString() || "10",
          affiliateId: data.affiliateId,
          maxUsage: data.maxUses,
          validUntil: data.expiresAt
            ? new Date(data.expiresAt)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: "ACTIVE",
        },
      });

      generatedCoupons.push(coupon);
    }

    res.status(201).json({
      message: `Successfully generated ${generatedCoupons.length} coupons`,
      coupons: generatedCoupons,
    });
  } catch (error) {
    console.error("Error generating coupons:", error);
    res.status(400).json({ error: "Failed to generate coupons" });
  }
});

// Import coupons from CSV
router.post(
  "/import",
  upload.single("csvFile"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No CSV file provided" });
      }

      const csvFilePath = req.file.path;
      const coupons: any[] = [];
      const errors: string[] = [];

      // Parse CSV file
      await new Promise((resolve, reject) => {
        fs.createReadStream(csvFilePath)
          .pipe(csv())
          .on("data", (row) => {
            try {
              // Validate required fields
              if (!row.code || !row.type || !row.value || !row.affiliateId) {
                errors.push(
                  `Row missing required fields: ${JSON.stringify(row)}`
                );
                return;
              }

              coupons.push({
                code: row.code.trim(),
                description: row.description?.trim() || "",
                type: row.type.trim(),
                value: parseFloat(row.value),
                affiliateId: row.affiliateId.trim(),
                offerId: row.offerId?.trim() || null,
                maxUses: row.maxUses ? parseInt(row.maxUses) : null,
                expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
                minOrderValue: row.minOrderValue
                  ? parseFloat(row.minOrderValue)
                  : null,
                isActive: row.isActive !== "false",
              });
            } catch (error) {
              errors.push(
                `Error parsing row: ${JSON.stringify(row)} - ${error}`
              );
            }
          })
          .on("end", resolve)
          .on("error", reject);
      });

      // Clean up uploaded file
      fs.unlinkSync(csvFilePath);

      if (errors.length > 0) {
        return res.status(400).json({
          error: "CSV parsing errors",
          errors: errors.slice(0, 10), // Limit error messages
        });
      }

      // Check for duplicate codes in the CSV
      const codes = coupons.map((c) => c.code);
      const duplicateCodes = codes.filter(
        (code, index) => codes.indexOf(code) !== index
      );

      if (duplicateCodes.length > 0) {
        return res.status(400).json({
          error: "Duplicate codes in CSV",
          duplicates: Array.from(new Set(duplicateCodes)),
        });
      }

      // Check for existing codes in database
      const existingCoupons = await prisma.coupon.findMany({
        where: {
          code: {
            in: codes,
          },
        },
        select: { code: true },
      });

      const existingCodes = existingCoupons.map((c) => c.code);
      if (existingCodes.length > 0) {
        return res.status(400).json({
          error: "Some coupon codes already exist",
          existingCodes,
        });
      }

      // Import coupons
      const importedCoupons = await prisma.coupon.createMany({
        data: coupons.map((coupon) => ({
          ...coupon,
          createdAt: new Date(),
        })),
      });

      res.status(201).json({
        message: `Successfully imported ${importedCoupons.count} coupons`,
        imported: importedCoupons.count,
        errors: errors.length,
      });
    } catch (error) {
      console.error("Error importing coupons:", error);

      // Clean up uploaded file if it exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({ error: "Failed to import coupons" });
    }
  }
);

// Export coupons to CSV
router.get("/export", async (req: Request, res: Response) => {
  try {
    const { affiliateId, status, type } = req.query;

    const filters: any = {};
    if (affiliateId) filters.affiliateId = affiliateId;
    if (status && status !== "all") filters.status = status;
    if (type && type !== "all") filters.type = type;

    const coupons = await prisma.coupon.findMany({
      where: filters,
      include: {
        affiliate: {
          select: {
            id: true,
            companyName: true,
          },
        },
        // offer relation not in Coupon schema,
        // _count not available in schema
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const csv = [
      "Code,Description,Type,Value,Affiliate,Offer,Max Uses,Total Uses,Expires At,Status,Created At",
      ...coupons.map((coupon) =>
        [
          coupon.code,
          `"${(coupon.description || "").replace(/"/g, '""')}"`,
          "percentage", // type not in schema, defaulting
          coupon.discount,
          "", // affiliate relation not included in query
          "", // offer not in schema
          coupon.maxUsage || "Unlimited",
          coupon.usage,
          coupon.validUntil
            ? coupon.validUntil.toISOString().split("T")[0]
            : "",
          coupon.status === "ACTIVE" ? "Active" : "Inactive",
          coupon.createdAt.toISOString().split("T")[0],
        ].join(",")
      ),
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", 'attachment; filename="coupons.csv"');
    res.send(csv);
  } catch (error) {
    console.error("Error exporting coupons:", error);
    res.status(500).json({ error: "Failed to export coupons" });
  }
});

// Validate coupon code
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const validateSchema = z.object({
      code: z.string(),
      orderValue: z.number().min(0).optional(),
      affiliateId: z.string().optional(),
    });

    const {
      code,
      orderValue = 0,
      affiliateId,
    } = validateSchema.parse(req.body);

    const coupon = await prisma.coupon.findUnique({
      where: { code },
      include: {
        // _count not available in schema
      },
    });

    if (!coupon) {
      return res.status(404).json({
        valid: false,
        error: "Coupon code not found",
      });
    }

    // Check if coupon is active
    if (coupon.status !== "ACTIVE") {
      return res.status(400).json({
        valid: false,
        error: "Coupon is not active",
      });
    }

    // Check if coupon has expired
    if (coupon.validUntil && coupon.validUntil < new Date()) {
      return res.status(400).json({
        valid: false,
        error: "Coupon has expired",
      });
    }

    // Check usage limit
    if (coupon.maxUsage && coupon.usage >= coupon.maxUsage) {
      return res.status(400).json({
        valid: false,
        error: "Coupon usage limit reached",
      });
    }

    // Check affiliate restriction
    if (affiliateId && coupon.affiliateId !== affiliateId) {
      return res.status(400).json({
        valid: false,
        error: "Coupon not valid for this affiliate",
      });
    }

    // Calculate discount amount
    let discountAmount = 0;
    const discountValue = parseFloat(coupon.discount);

    // Assume percentage if discount is less than 1, otherwise fixed amount
    if (discountValue < 1) {
      discountAmount = (orderValue * discountValue) / 100;
    } else {
      discountAmount = Math.min(discountValue, orderValue);
    }

    res.json({
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        description: coupon.description,
        discount: coupon.discount,
        discountAmount,
      },
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    res.status(400).json({ error: "Failed to validate coupon" });
  }
});

export default router;
