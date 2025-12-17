import express, { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { authenticateToken, requireAdmin } from "../middleware/auth";
import * as crypto from "crypto";

const router: Router = express.Router();

// Validation schemas
const createWebsiteSchema = z.object({
  name: z.string().min(1, "Website name is required"),
  domain: z.string().min(1, "Domain is required"),
  description: z.string().optional(),
  websiteId: z.string().optional(), // Optional - will be generated if not provided
});

const updateWebsiteSchema = z.object({
  name: z.string().min(1).optional(),
  domain: z.string().min(1).optional(),
  description: z.string().optional(),
});

// Generate website ID from domain
const generateWebsiteId = (domain: string): string => {
  return domain
    .replace(/https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\./g, "-")
    .toLowerCase();
};

// GET /api/websites - Get all websites (affiliates can view, admins can view all)
router.get("/", authenticateToken, async (req: any, res) => {
  try {
    const user = req.user;

    // Fetch all websites from database
    const websites = await prisma.website.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      websites,
      message: "Websites fetched successfully",
    });
  } catch (error: any) {
    console.error("Error fetching websites:", error);
    res.status(500).json({ error: "Failed to fetch websites" });
  }
});

// GET /api/websites/:id - Get website by ID
router.get("/:id", authenticateToken, async (req: any, res) => {
  try {
    const { id } = req.params;

    const website = await prisma.website.findUnique({
      where: { id },
    });

    if (!website) {
      return res.status(404).json({
        success: false,
        error: "Website not found",
      });
    }

    res.json({
      success: true,
      website,
      message: "Website fetched successfully",
    });
  } catch (error: any) {
    console.error("Error fetching website:", error);
    res.status(500).json({ error: "Failed to fetch website" });
  }
});

// POST /api/websites - Create website (Admin only)
router.post("/", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const user = req.user;
    const data = createWebsiteSchema.parse(req.body);

    // Generate website ID if not provided
    const websiteId = data.websiteId || generateWebsiteId(data.domain);

    // Check if websiteId already exists
    const existingWebsite = await prisma.website.findUnique({
      where: { websiteId },
    });

    if (existingWebsite) {
      return res.status(400).json({
        success: false,
        error: "Website ID already exists. Please use a different ID.",
      });
    }

    // Clean domain (preserve protocol if provided, remove trailing slash)
    let cleanDomain = data.domain.trim();

    // Remove trailing slash if present
    if (cleanDomain.endsWith("/")) {
      cleanDomain = cleanDomain.slice(0, -1);
    }

    // If no protocol is provided, add https://
    if (!cleanDomain.match(/^https?:\/\//)) {
      cleanDomain = `https://${cleanDomain}`;
    }

    // Create website in database
    const website = await prisma.website.create({
      data: {
        websiteId,
        name: data.name,
        domain: cleanDomain,
        description: data.description || null,
        status: "ACTIVE",
        createdBy: user.id,
      },
    });

    res.status(201).json({
      success: true,
      website,
      message: "Website created successfully",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    if (error.code === "P2002") {
      // Prisma unique constraint violation
      return res.status(400).json({
        success: false,
        error: "Website ID already exists. Please use a different ID.",
      });
    }
    console.error("Error creating website:", error);
    res.status(500).json({ error: "Failed to create website" });
  }
});

// PUT /api/websites/:id - Update website (Admin only)
router.put("/:id", authenticateToken, requireAdmin, async (req: any, res) => {
  try {
    const { id } = req.params;
    const data = updateWebsiteSchema.parse(req.body);

    // Check if website exists
    const existingWebsite = await prisma.website.findUnique({
      where: { id },
    });

    if (!existingWebsite) {
      return res.status(404).json({
        success: false,
        error: "Website not found",
      });
    }

    // Prepare update data
    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.domain) {
      // Clean domain (preserve protocol if provided, remove trailing slash)
      let cleanDomain = data.domain.trim();

      // Remove trailing slash if present
      if (cleanDomain.endsWith("/")) {
        cleanDomain = cleanDomain.slice(0, -1);
      }

      // If no protocol is provided, add https://
      if (!/^https?:\/\//.test(cleanDomain)) {
        cleanDomain = `https://${cleanDomain}`;
      }

      updateData.domain = cleanDomain;
    }
    if (data.description !== undefined) {
      updateData.description = data.description || null;
    }

    // Update website in database
    const website = await prisma.website.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      website,
      message: "Website updated successfully",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return res.status(400).json({
        error: "Validation error",
        details: error.errors,
      });
    }
    console.error("Error updating website:", error);
    res.status(500).json({ error: "Failed to update website" });
  }
});

// DELETE /api/websites/:id - Delete website (Admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireAdmin,
  async (req: any, res) => {
    try {
      const { id } = req.params;

      // Check if website exists
      const existingWebsite = await prisma.website.findUnique({
        where: { id },
      });

      if (!existingWebsite) {
        return res.status(404).json({
          success: false,
          error: "Website not found",
        });
      }

      // Delete website from database
      await prisma.website.delete({
        where: { id },
      });

      res.json({
        success: true,
        message: "Website deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting website:", error);
      res.status(500).json({ error: "Failed to delete website" });
    }
  }
);

export default router;
