import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import * as crypto from "crypto";
import multer from "multer";
import csv from "csv-parser";
import { Readable } from "stream";
import { authenticateToken, requireRole } from "../middleware/auth";
import shopifyService from "../services/ShopifyService";
import emailService from "../services/EmailService";

const router: Router = Router();
const prisma = new PrismaClient();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

const normalizeCode = (code: string) =>
  code.trim().toUpperCase().replace(/\s+/g, "-");

async function generateUniqueAllowanceCode(customCode?: string) {
  if (customCode) {
    const normalized = normalizeCode(customCode);
    const existingCode = await prisma.coupon.findFirst({
      where: { code: normalized },
    });
    if (existingCode) {
      throw new Error(
        `The code "${normalized}" already exists. Please choose a different code.`
      );
    }
    return normalized;
  }

  let attempts = 0;
  const existingCodes = new Set(
    (await prisma.coupon.findMany({ select: { code: true } })).map(
      (c) => c.code
    )
  );

  let code = "";
  do {
    const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
    code = `AFFILIATE-${randomPart}`;
    attempts++;
  } while (existingCodes.has(code) && attempts < 10);

  if (attempts >= 10) {
    throw new Error("Unable to generate unique code");
  }

  return code;
}

async function generateUniqueShippingCode(allowanceCode: string) {
  const base = `${allowanceCode}-SHIP`;
  let candidate = base;

  for (let attempt = 0; attempt < 5; attempt++) {
    const existingCode = await prisma.coupon.findFirst({
      where: { code: candidate },
    });
    if (!existingCode) return candidate;
    const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
    candidate = `${base}-${suffix}`;
  }

  throw new Error("Unable to generate unique shipping code");
}

const parseCsvBoolean = (value?: string) => {
  if (!value) return false;
  return ["true", "1", "yes", "y"].includes(value.trim().toLowerCase());
};

const getNextFifteenthExpiration = (from = new Date()) => {
  const expiration = new Date(
    from.getFullYear(),
    from.getMonth(),
    15,
    23,
    59,
    59,
    999
  );

  if (from.getTime() > expiration.getTime()) {
    expiration.setMonth(expiration.getMonth() + 1);
  }

  return expiration;
};

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
    const now = new Date();

    const filters: any = {
      isAffiliate: true, // Only fetch affiliate allowance codes
      validUntil: { gt: now },
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
      const isExpired = code.validUntil <= now;
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

// Generate new affiliate code (with optional custom code + auto-sync to Shopify)
router.post("/generate", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const generateSchema = z.object({
      affiliateId: z.string(),
      customCode: z.string().min(1).max(50).optional(), // Admin can set their own code
      allowanceAmount: z.number().min(0), // Dollar amount (e.g., 150)
      discountType: z.enum(["percentage", "fixed_amount"]).default("fixed_amount"),
      discountValue: z.number().min(0).default(0),
      freeShipping: z.boolean().default(false),
      description: z.string().optional(),
      syncToShopify: z.boolean().default(true), // Auto-sync to Shopify by default
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

    // Determine the allowance code to use
    let code: string;
    try {
      code = await generateUniqueAllowanceCode(data.customCode);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || "Unable to generate unique code" });
    }

    // Generate a separate shipping code if needed
    const shippingCode = data.freeShipping ? await generateUniqueShippingCode(code) : null;

    const expirationDate = getNextFifteenthExpiration();

    // Create description
    const discountText = data.discountValue > 0
      ? data.discountType === "percentage"
        ? `${data.discountValue}% off`
        : `$${data.discountValue} off`
      : "No Discount";
    const shippingNote = shippingCode ? ` + Free Shipping (use code ${shippingCode})` : "";

    const description =
      data.description ||
      `Affiliate allowance code for ${affiliate.user.firstName} ${affiliate.user.lastName} - $${data.allowanceAmount} allowance - ${discountText}${shippingNote} - Expires ${expirationDate.toLocaleDateString()}`;

    const shippingDescription = shippingCode
      ? `Free shipping code for ${affiliate.user.firstName} ${affiliate.user.lastName} (paired with ${code}) - Expires ${expirationDate.toLocaleDateString()}`
      : null;

    // ----- Sync to Shopify (both USA and Canada stores) -----
    let allowanceSyncedToShopify = false;
    let allowanceShopifyPriceRuleIds: Record<string, any> = {};
    let allowanceShopifyDiscountIds: Record<string, any> = {};
    let allowanceSyncedStores: string[] = [];

    let shippingSyncedToShopify = false;
    let shippingShopifyPriceRuleIds: Record<string, any> = {};
    let shippingShopifyDiscountIds: Record<string, any> = {};
    let shippingSyncedStores: string[] = [];

    const shopifyErrors: string[] = [];

    if (data.syncToShopify) {
      const stores = shopifyService.getAllStores();

      for (const store of stores) {
        // Allowance discount code (single-use per customer) — via GraphQL
        try {
          const result = await shopifyService.createDiscountCodeGraphQL(store.id, {
            title: `Affiliate Allowance Code: ${code}`,
            code: code,
            valueType: data.discountType,
            value: data.discountValue > 0 ? data.discountValue : 0.01,
            startsAt: new Date().toISOString(),
            endsAt: expirationDate.toISOString(),
            oncePerCustomer: true,
            combinesWith: { shippingDiscounts: true },
          });

          allowanceShopifyPriceRuleIds[store.id] = result.graphqlId;
          allowanceShopifyDiscountIds[store.id] = result.graphqlId;
          allowanceSyncedStores.push(store.id);

          console.log(`✅ Synced allowance code "${code}" to ${store.name} via GraphQL`);
        } catch (err: any) {
          console.error(`❌ Failed to sync allowance code "${code}" to ${store.name}:`, err.message);
          shopifyErrors.push(`${store.name} (allowance): ${err.message}`);
        }

        // Separate shipping code (unlimited use) — via GraphQL
        if (shippingCode) {
          try {
            const shipResult = await shopifyService.createFreeShippingCodeGraphQL(store.id, {
              title: `Affiliate Shipping Code: ${shippingCode}`,
              code: shippingCode,
              startsAt: new Date().toISOString(),
              endsAt: expirationDate.toISOString(),
              oncePerCustomer: false,
              combinesWith: {
                orderDiscounts: true,
                productDiscounts: true,
              },
            });

            shippingShopifyPriceRuleIds[store.id] = shipResult.graphqlId;
            shippingShopifyDiscountIds[store.id] = shipResult.graphqlId;
            shippingSyncedStores.push(store.id);

            console.log(`✅ Synced shipping code "${shippingCode}" to ${store.name} via GraphQL`);
          } catch (err: any) {
            console.error(`❌ Failed to sync shipping code "${shippingCode}" to ${store.name}:`, err.message);
            shopifyErrors.push(`${store.name} (shipping): ${err.message}`);
          }
        }
      }

      allowanceSyncedToShopify = allowanceSyncedStores.length > 0;
      shippingSyncedToShopify = shippingSyncedStores.length > 0;
    }

    // Create the allowance code in our database
    // Monthly allowance codes: single-use per customer (not single-use total)
    // Shopify enforces oncePerCustomer: true, so we set maxUsage: null (unlimited total uses)
    const affiliateCode = await prisma.coupon.create({
      data: {
        code,
        description,
        discount: data.discountValue.toString(),
        affiliateId: data.affiliateId,
        validUntil: expirationDate,
        maxUsage: null, // Unlimited total uses - Shopify enforces oncePerCustomer: true
        usage: 0,
        status: "ACTIVE",
        freeShipping: false,
        isAffiliate: true,
        syncedToShopify: allowanceSyncedToShopify,
        shopifyPriceRuleIds: Object.keys(allowanceShopifyPriceRuleIds).length > 0 ? allowanceShopifyPriceRuleIds : undefined,
        shopifyDiscountIds: Object.keys(allowanceShopifyDiscountIds).length > 0 ? allowanceShopifyDiscountIds : undefined,
        syncedStores: allowanceSyncedStores,
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

    // Send notification email to affiliate with their new code(s)
    if (affiliate.user?.email) {
      try {
        const codesForEmail = [
          {
            code,
            discountText: discountText,
            allowanceAmount: data.allowanceAmount,
            freeShipping: false,
            expiresAt: expirationDate,
            description,
          },
        ];

        if (shippingCode) {
          codesForEmail.push({
            code: shippingCode,
            discountText: "Free shipping",
            allowanceAmount: undefined,
            freeShipping: true,
            expiresAt: expirationDate,
            description: shippingDescription || undefined,
          });
        }

        await emailService.sendAffiliateDiscountAssignedEmail(
          affiliate.user.email,
          affiliate.user.firstName,
          codesForEmail
        );
      } catch (emailErr) {
        console.warn("Failed to send affiliate code email:", emailErr);
        // Do not fail request if email fails
      }
    } else {
      console.warn("Skipping affiliate code email: affiliate missing email address");
    }

    if (shippingCode) {
      await prisma.coupon.create({
        data: {
          code: shippingCode,
          description: shippingDescription || `Free shipping code for ${affiliate.user.firstName} ${affiliate.user.lastName}`,
          discount: "0",
          affiliateId: data.affiliateId,
          validUntil: expirationDate,
          maxUsage: null, // Unlimited use for shipping code
          usage: 0,
          status: "ACTIVE",
          freeShipping: true,
          isAffiliate: true,
          syncedToShopify: shippingSyncedToShopify,
          shopifyPriceRuleIds: Object.keys(shippingShopifyPriceRuleIds).length > 0 ? shippingShopifyPriceRuleIds : undefined,
          shopifyDiscountIds: Object.keys(shippingShopifyDiscountIds).length > 0 ? shippingShopifyDiscountIds : undefined,
          syncedStores: shippingSyncedStores,
        },
      });
    }

    const responseMessage = shopifyErrors.length > 0
      ? `Codes created but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
      : allowanceSyncedToShopify
        ? `Allowance code "${code}" created and synced to Shopify (${allowanceSyncedStores.length} store${allowanceSyncedStores.length > 1 ? "s" : ""})${shippingCode ? `; shipping code "${shippingCode}" ${shippingSyncedToShopify ? "synced" : "created"}` : ""}`
        : `Allowance code "${code}" created${shippingCode ? ` and shipping code "${shippingCode}" created` : ""}`;

    res.status(201).json({
      message: responseMessage,
      code: affiliateCode,
      shippingCode,
      shopifySync: {
        synced: allowanceSyncedToShopify,
        stores: allowanceSyncedStores,
        shippingSynced: shippingSyncedToShopify,
        shippingStores: shippingSyncedStores,
        errors: shopifyErrors,
      },
    });
  } catch (error) {
    console.error("Error generating affiliate code:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Invalid request data", details: error.errors });
    }
    res.status(500).json({ error: "Failed to generate affiliate code" });
  }
});

// Bulk import affiliate allowance codes from CSV
router.post(
  "/import",
  authenticateToken,
  requireRole(["ADMIN"]),
  upload.single("csvFile") as any,
  async (req: Request, res: Response) => {
    try {
      if (!req.file?.buffer) {
        return res.status(400).json({ error: "No CSV file provided" });
      }

      const rows: Record<string, string>[] = [];
      const errors: string[] = [];

      await new Promise<void>((resolve, reject) => {
        Readable.from(req.file!.buffer)
          .pipe(csv())
          .on("data", (row) => rows.push(row))
          .on("end", () => resolve())
          .on("error", (err) => reject(err));
      });

      if (rows.length === 0) {
        return res.status(400).json({ error: "CSV file is empty" });
      }

      const existingCodes = new Set(
        (await prisma.coupon.findMany({ select: { code: true } })).map(
          (c) => c.code
        )
      );

      let imported = 0;
      let shippingCreated = 0;

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const rowLabel = `Row ${index + 1}`;

        try {
          const affiliateId = row.affiliateId?.trim();
          const affiliateEmail = row.affiliateEmail?.trim() || row.email?.trim();

          if (!affiliateId && !affiliateEmail) {
            throw new Error("affiliateId or affiliateEmail is required");
          }

          const allowanceAmount = Number.parseFloat(row.allowanceAmount || row.allowance || row.amount || "");
          if (Number.isNaN(allowanceAmount)) {
            throw new Error("allowanceAmount is required and must be a number");
          }

          const discountTypeRaw = row.discountType?.trim().toLowerCase();
          const discountType =
            discountTypeRaw === "percentage" ? "percentage" : "fixed_amount";
          const discountValue = Number.parseFloat(row.discountValue || "0");
          const freeShipping = parseCsvBoolean(row.freeShipping);
          const syncToShopify =
            row.syncToShopify === undefined
              ? true
              : parseCsvBoolean(row.syncToShopify);

          const customCode = row.code?.trim();

          const makeUniqueCode = () => {
            if (customCode) {
              const normalized = normalizeCode(customCode);
              if (existingCodes.has(normalized)) {
                throw new Error(`Code "${normalized}" already exists`);
              }
              existingCodes.add(normalized);
              return normalized;
            }

            let attempts = 0;
            let generated = "";
            do {
              const randomPart = crypto.randomBytes(4).toString("hex").toUpperCase();
              generated = `AFFILIATE-${randomPart}`;
              attempts++;
            } while (existingCodes.has(generated) && attempts < 10);

            if (attempts >= 10) {
              throw new Error("Unable to generate unique code");
            }

            existingCodes.add(generated);
            return generated;
          };

          const allowanceCode = makeUniqueCode();
          const shippingCode = freeShipping ? await generateUniqueShippingCode(allowanceCode) : null;
          if (shippingCode) {
            existingCodes.add(shippingCode);
          }

          const affiliate = affiliateId
            ? await prisma.affiliateProfile.findUnique({
                where: { id: affiliateId },
                include: { user: true },
              })
            : await prisma.affiliateProfile.findFirst({
                where: { user: { email: affiliateEmail } },
                include: { user: true },
              });

          if (!affiliate) {
            throw new Error("Affiliate not found");
          }

          const expirationDate = getNextFifteenthExpiration();

          const discountText = discountValue > 0
            ? discountType === "percentage"
              ? `${discountValue}% off`
              : `$${discountValue} off`
            : "No Discount";

          const shippingNote = shippingCode ? ` + Free Shipping (use code ${shippingCode})` : "";

          const description =
            row.description?.trim() ||
            `Affiliate allowance code for ${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() +
              ` - $${allowanceAmount} allowance - ${discountText}${shippingNote} - Expires ${expirationDate.toLocaleDateString()}`;

          const shippingDescription = shippingCode
            ? `Free shipping code for ${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim() +
              ` (paired with ${allowanceCode}) - Expires ${expirationDate.toLocaleDateString()}`
            : null;

          let allowanceSyncedToShopify = false;
          let allowanceShopifyPriceRuleIds: Record<string, any> = {};
          let allowanceShopifyDiscountIds: Record<string, any> = {};
          let allowanceSyncedStores: string[] = [];

          let shippingSyncedToShopify = false;
          let shippingShopifyPriceRuleIds: Record<string, any> = {};
          let shippingShopifyDiscountIds: Record<string, any> = {};
          let shippingSyncedStores: string[] = [];

          if (syncToShopify) {
            const stores = shopifyService.getAllStores();
            for (const store of stores) {
              // Allowance code via GraphQL
              try {
                const result = await shopifyService.createDiscountCodeGraphQL(store.id, {
                  title: `Affiliate Allowance Code: ${allowanceCode}`,
                  code: allowanceCode,
                  valueType: discountType,
                  value: discountValue > 0 ? discountValue : 0.01,
                  startsAt: new Date().toISOString(),
                  endsAt: expirationDate.toISOString(),
                  oncePerCustomer: true,
                  combinesWith: { shippingDiscounts: true },
                });

                allowanceShopifyPriceRuleIds[store.id] = result.graphqlId;
                allowanceShopifyDiscountIds[store.id] = result.graphqlId;
                allowanceSyncedStores.push(store.id);
              } catch (err: any) {
                errors.push(`${rowLabel} (${store.name} allowance): ${err.message}`);
              }

              // Shipping code via GraphQL
              if (shippingCode) {
                try {
                  const shipResult = await shopifyService.createFreeShippingCodeGraphQL(store.id, {
                    title: `Affiliate Shipping Code: ${shippingCode}`,
                    code: shippingCode,
                    startsAt: new Date().toISOString(),
                    endsAt: expirationDate.toISOString(),
                    oncePerCustomer: false,
                    combinesWith: {
                      orderDiscounts: true,
                      productDiscounts: true,
                    },
                  });

                  shippingShopifyPriceRuleIds[store.id] = shipResult.graphqlId;
                  shippingShopifyDiscountIds[store.id] = shipResult.graphqlId;
                  shippingSyncedStores.push(store.id);
                } catch (err: any) {
                  errors.push(`${rowLabel} (${store.name} shipping): ${err.message}`);
                }
              }
            }

            allowanceSyncedToShopify = allowanceSyncedStores.length > 0;
            shippingSyncedToShopify = shippingSyncedStores.length > 0;
          }

          await prisma.coupon.create({
            data: {
              code: allowanceCode,
              description,
              discount: discountValue.toString(),
              affiliateId: affiliate.id,
              validUntil: expirationDate,
              maxUsage: null, // Unlimited total uses - Shopify enforces oncePerCustomer: true
              usage: 0,
              status: "ACTIVE",
              freeShipping: false,
              isAffiliate: true,
              syncedToShopify: allowanceSyncedToShopify,
              shopifyPriceRuleIds: Object.keys(allowanceShopifyPriceRuleIds).length > 0 ? allowanceShopifyPriceRuleIds : undefined,
              shopifyDiscountIds: Object.keys(allowanceShopifyDiscountIds).length > 0 ? allowanceShopifyDiscountIds : undefined,
              syncedStores: allowanceSyncedStores,
            },
          });

          if (shippingCode) {
            await prisma.coupon.create({
              data: {
                code: shippingCode,
                description: shippingDescription || `Free shipping code for ${affiliate.user?.firstName || ""} ${affiliate.user?.lastName || ""}`.trim(),
                discount: "0",
                affiliateId: affiliate.id,
                validUntil: expirationDate,
                maxUsage: null,
                usage: 0,
                status: "ACTIVE",
                freeShipping: true,
                isAffiliate: true,
                syncedToShopify: shippingSyncedToShopify,
                shopifyPriceRuleIds: Object.keys(shippingShopifyPriceRuleIds).length > 0 ? shippingShopifyPriceRuleIds : undefined,
                shopifyDiscountIds: Object.keys(shippingShopifyDiscountIds).length > 0 ? shippingShopifyDiscountIds : undefined,
                syncedStores: shippingSyncedStores,
              },
            });
            shippingCreated++;
          }

          // Send notification email for this row (only if affiliate email present)
          if (affiliate.user?.email) {
            try {
              const codesForEmail = [
                {
                  code: allowanceCode,
                  discountText,
                  allowanceAmount,
                  freeShipping: false,
                  expiresAt: expirationDate,
                  description,
                },
              ];

              if (shippingCode) {
                codesForEmail.push({
                  code: shippingCode,
                  discountText: "Free shipping",
                  allowanceAmount: undefined,
                  freeShipping: true,
                  expiresAt: expirationDate,
                  description: shippingDescription || undefined,
                });
              }

              await emailService.sendAffiliateDiscountAssignedEmail(
                affiliate.user.email,
                affiliate.user.firstName || "there",
                codesForEmail
              );
            } catch (emailErr) {
              errors.push(`${rowLabel}: Email failed - ${emailErr?.message || emailErr}`);
            }
          } else {
            errors.push(`${rowLabel}: Email skipped (affiliate missing email)`);
          }

          imported++;
        } catch (err: any) {
          errors.push(`${rowLabel}: ${err.message || "Failed to import"}`);
        }
      }

      res.status(201).json({
        message: `Imported ${imported} allowance codes${shippingCreated ? ` and ${shippingCreated} shipping codes` : ""}`,
        imported,
        shippingCreated,
        errors: errors.slice(0, 50),
      });
    } catch (error: any) {
      console.error("Error importing affiliate codes:", error);
      res.status(500).json({ error: "Failed to import affiliate codes" });
    }
  }
);

// Delete affiliate code (also removes from Shopify)
router.delete("/:id", authenticateToken, requireRole(["ADMIN"]), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const code = await prisma.coupon.findUnique({
      where: { id },
    });

    if (!code || !code.isAffiliate) {
      return res.status(404).json({ error: "Affiliate code not found" });
    }

    // Delete from Shopify first (if synced) — handles both GraphQL and REST IDs
    const shopifyErrors: string[] = [];
    if (code.syncedToShopify && code.shopifyPriceRuleIds) {
      const ids = code.shopifyPriceRuleIds as Record<string, any>;
      for (const [key, idValue] of Object.entries(ids)) {
        const actualStoreId = key.replace(/-shipping$/, "");
        try {
          await shopifyService.deleteDiscountSmart(actualStoreId, idValue);
          console.log(`✅ Deleted discount from Shopify store ${actualStoreId} (key: ${key})`);
        } catch (err: any) {
          console.error(`❌ Failed to delete discount from ${actualStoreId}:`, err.message);
          shopifyErrors.push(`${actualStoreId}: ${err.message}`);
        }
      }
    }

    // Delete from database
    await prisma.coupon.delete({
      where: { id },
    });

    const message = shopifyErrors.length > 0
      ? `Code deleted from database but failed to remove from some Shopify stores: ${shopifyErrors.join("; ")}`
      : code.syncedToShopify
        ? "Affiliate code deleted from database and Shopify"
        : "Affiliate code deleted successfully";

    res.json({ message, shopifyErrors });
  } catch (error) {
    console.error("Error deleting affiliate code:", error);
    res.status(500).json({ error: "Failed to delete affiliate code" });
  }
});

// Update affiliate code status (activate/deactivate) — syncs to Shopify
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

    const shopifyErrors: string[] = [];

    if (status === "INACTIVE" && code.syncedToShopify && code.shopifyPriceRuleIds) {
      // DEACTIVATING: Delete from Shopify (handles both GraphQL and REST IDs)
      const ids = code.shopifyPriceRuleIds as Record<string, any>;
      for (const [key, idValue] of Object.entries(ids)) {
        const actualStoreId = key.replace(/-shipping$/, "");
        try {
          await shopifyService.deleteDiscountSmart(actualStoreId, idValue);
          console.log(`✅ Deactivated: deleted discount from Shopify store ${actualStoreId} (key: ${key})`);
        } catch (err: any) {
          console.error(`❌ Failed to deactivate code on ${actualStoreId}:`, err.message);
          shopifyErrors.push(`${actualStoreId}: ${err.message}`);
        }
      }

      // Update DB: mark as not synced since we removed from Shopify
      const updatedCode = await prisma.coupon.update({
        where: { id },
        data: {
          status,
          syncedToShopify: false,
          shopifyPriceRuleIds: undefined,
          shopifyDiscountIds: undefined,
          syncedStores: [],
        },
        include: {
          affiliate: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      const message = shopifyErrors.length > 0
        ? `Code deactivated in database but failed to remove from some Shopify stores: ${shopifyErrors.join("; ")}`
        : "Code deactivated and removed from Shopify";

      return res.json({ message, code: updatedCode, shopifyErrors });
    }

    if (status === "ACTIVE" && !code.syncedToShopify) {
      // REACTIVATING: Re-create discounts on Shopify via GraphQL
      const shopifyPriceRuleIds: Record<string, any> = {};
      const shopifyDiscountIds: Record<string, any> = {};
      const syncedStores: string[] = [];

      const stores = shopifyService.getAllStores();
      const discountValue = parseFloat(code.discount.replace(/[^0-9.]/g, "")) || 0;
      const valueType = code.discount.includes("$") ? "fixed_amount" as const : "percentage" as const;
      const hasDiscount = discountValue > 0;
      const hasFreeShipping = code.freeShipping === true;
      const oncePerCustomer = !!code.maxUsage;

      // Determine if the code has a real expiry or is set to "no expiry" (far future)
      const isFarFuture = code.validUntil.getFullYear() >= 2090;
      const reactivateEndsAt = isFarFuture ? null : code.validUntil.toISOString();

      for (const store of stores) {
        try {
          if (hasFreeShipping && !hasDiscount) {
            // Shipping-only code via GraphQL
            const result = await shopifyService.createFreeShippingCodeGraphQL(store.id, {
              title: `Affiliate Shipping Code: ${code.code}`,
              code: code.code,
              startsAt: new Date().toISOString(),
              endsAt: reactivateEndsAt,
              oncePerCustomer,
              combinesWith: {
                orderDiscounts: true,
                productDiscounts: true,
              },
            });

            shopifyPriceRuleIds[store.id] = result.graphqlId;
            shopifyDiscountIds[store.id] = result.graphqlId;
            syncedStores.push(store.id);

            console.log(`✅ Reactivated shipping code "${code.code}" on ${store.name} via GraphQL`);
          } else {
            // Discount code (allowance or general) via GraphQL
            const result = await shopifyService.createDiscountCodeGraphQL(store.id, {
              title: `Affiliate Code: ${code.code}`,
              code: code.code,
              valueType,
              value: hasDiscount ? discountValue : 0.01,
              startsAt: new Date().toISOString(),
              endsAt: reactivateEndsAt,
              oncePerCustomer,
              combinesWith: { shippingDiscounts: true },
            });

            shopifyPriceRuleIds[store.id] = result.graphqlId;
            shopifyDiscountIds[store.id] = result.graphqlId;
            syncedStores.push(store.id);

            // If also has free shipping, create separate shipping code
            if (hasFreeShipping && hasDiscount) {
              try {
                const shipResult = await shopifyService.createFreeShippingCodeGraphQL(store.id, {
                  title: `Auto Free Shipping (Affiliate: ${code.code})`,
                  code: `${code.code}-SHIP`,
                  startsAt: new Date().toISOString(),
                  endsAt: reactivateEndsAt,
                  oncePerCustomer: false,
                  combinesWith: {
                    orderDiscounts: true,
                    productDiscounts: true,
                  },
                });

                shopifyPriceRuleIds[`${store.id}-shipping`] = shipResult.graphqlId;
              } catch (fsErr: any) {
                console.warn(`⚠️ Failed to recreate auto free shipping for ${store.name}:`, fsErr.message);
                shopifyErrors.push(`${store.name} (free shipping): ${fsErr.message}`);
              }
            }

            console.log(`✅ Reactivated code "${code.code}" on ${store.name} via GraphQL`);
          }
        } catch (err: any) {
          console.error(`❌ Failed to re-sync code "${code.code}" to ${store.name}:`, err.message);
          shopifyErrors.push(`${store.name}: ${err.message}`);
        }
      }

      const syncedToShopify = syncedStores.length > 0;

      const updatedCode = await prisma.coupon.update({
        where: { id },
        data: {
          status,
          syncedToShopify,
          shopifyPriceRuleIds: Object.keys(shopifyPriceRuleIds).length > 0 ? shopifyPriceRuleIds : undefined,
          shopifyDiscountIds: Object.keys(shopifyDiscountIds).length > 0 ? shopifyDiscountIds : undefined,
          syncedStores,
        },
        include: {
          affiliate: {
            include: {
              user: {
                select: { id: true, email: true, firstName: true, lastName: true },
              },
            },
          },
        },
      });

      const message = shopifyErrors.length > 0
        ? `Code reactivated but failed to sync to some Shopify stores: ${shopifyErrors.join("; ")}`
        : syncedToShopify
          ? `Code reactivated and synced to Shopify (${syncedStores.length} store${syncedStores.length > 1 ? "s" : ""})`
          : "Code reactivated in database (Shopify sync unavailable)";

      return res.json({ message, code: updatedCode, shopifyErrors });
    }

    // Simple status update (e.g., already synced and just toggling)
    const updatedCode = await prisma.coupon.update({
      where: { id },
      data: { status },
      include: {
        affiliate: {
          include: {
            user: {
              select: { id: true, email: true, firstName: true, lastName: true },
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
    const now = new Date();

    const filters: any = { isAffiliate: true };
    if (affiliateId) {
      filters.affiliateId = affiliateId;
    }

    const visibleFilters = { ...filters, validUntil: { gt: now } };

    const totalCodes = await prisma.coupon.count({ where: visibleFilters });
    const activeCodes = await prisma.coupon.count({
      where: { ...visibleFilters, status: "ACTIVE" },
    });
    const usedCodes = await prisma.coupon.count({
      where: { ...visibleFilters, usage: { gt: 0 } },
    });
    const expiredCodes = await prisma.coupon.count({
      where: {
        ...filters,
        validUntil: { lte: now },
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
