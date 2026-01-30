import express, { Router } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { TiersModel } from "../models/Tiers";

const router: Router = express.Router();
const prisma = new PrismaClient();

// Get all tiers for an account
router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      // For now, we'll use a default accountId or get from user
      // In a multi-tenant system, this would come from the authenticated user's account
      const accountId = req.user.id; // Using user ID as account ID for now
      
      const tiers = await TiersModel.list(accountId);
      
      res.json({
        success: true,
        tiers,
      });
    } catch (error) {
      console.error("Error fetching tiers:", error);
      res.status(500).json({ error: "Failed to fetch tiers" });
    }
  }
);

// Get a single tier by ID
router.get(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      
      const tier = await TiersModel.findById(id);
      
      if (!tier) {
        return res.status(404).json({ error: "Tier not found" });
      }
      
      res.json({
        success: true,
        tier,
      });
    } catch (error) {
      console.error("Error fetching tier:", error);
      res.status(500).json({ error: "Failed to fetch tier" });
    }
  }
);

// Update tier name, description, requirements, and benefits
router.patch(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;
      const { name, description, requirements, benefits, commissionRate, status } = req.body;

      // Validate input
      const schema = z.object({
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        commissionRate: z.number().min(0).max(100).optional(),
        requirements: z.object({
          minimumClicks: z.number().min(0).optional(),
          minimumConversions: z.number().min(0).optional(),
          minimumEarnings: z.number().min(0).optional(),
          minimumReferrals: z.number().min(0).optional(),
          timePeriod: z.number().min(1).optional(),
          otherRequirements: z.array(z.string()).optional(),
        }).optional(),
        benefits: z.object({
          commissionRate: z.number().min(0).optional(),
          bonusRate: z.number().min(0).optional(),
          prioritySupport: z.boolean().optional(),
          customFeatures: z.array(z.string()).optional(),
          exclusiveOffers: z.boolean().optional(),
          higherPayouts: z.boolean().optional(),
          marketingMaterials: z.boolean().optional(),
          dedicatedManager: z.boolean().optional(),
        }).optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      });

      const validatedData = schema.parse({
        name,
        description,
        commissionRate,
        requirements,
        benefits,
        status,
      });

      // Get existing tier
      const existingTier = await TiersModel.findById(id);
      if (!existingTier) {
        return res.status(404).json({ error: "Tier not found" });
      }

      // Prepare update data
      const updateData: any = {};
      if (validatedData.name !== undefined) updateData.name = validatedData.name;
      if (validatedData.description !== undefined) updateData.description = validatedData.description;
      if (validatedData.commissionRate !== undefined) updateData.commissionRate = validatedData.commissionRate;
      if (validatedData.status !== undefined) updateData.status = validatedData.status;
      
      // Merge requirements if provided
      if (validatedData.requirements) {
        updateData.requirements = {
          ...(existingTier.requirements as any),
          ...validatedData.requirements,
        };
      }
      
      // Merge benefits if provided
      if (validatedData.benefits) {
        updateData.benefits = {
          ...(existingTier.benefits as any),
          ...validatedData.benefits,
        };
      }

      const updatedTier = await TiersModel.update(id, updateData);

      res.json({
        success: true,
        message: "Tier updated successfully",
        tier: updatedTier,
      });
    } catch (error) {
      console.error("Error updating tier:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to update tier" });
    }
  }
);

// Create a new tier
router.post(
  "/",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { name, description, level, requirements, benefits, commissionRate } = req.body;

      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        level: z.number().int().min(1),
        commissionRate: z.number().min(0).max(100).optional().default(0),
        requirements: z.object({
          minimumClicks: z.number().min(0).default(0),
          minimumConversions: z.number().min(0).default(0),
          minimumEarnings: z.number().min(0).default(0),
          minimumReferrals: z.number().min(0).default(0),
          timePeriod: z.number().min(1).default(30),
          otherRequirements: z.array(z.string()).default([]),
        }).optional(),
        benefits: z.object({
          commissionRate: z.number().min(0).default(0),
          bonusRate: z.number().min(0).default(0),
          prioritySupport: z.boolean().default(false),
          customFeatures: z.array(z.string()).default([]),
          exclusiveOffers: z.boolean().default(false),
          higherPayouts: z.boolean().default(false),
          marketingMaterials: z.boolean().default(false),
          dedicatedManager: z.boolean().default(false),
        }).optional(),
      });

      const validatedData = schema.parse({
        name,
        description,
        level,
        commissionRate,
        requirements,
        benefits,
      });

      const accountId = req.user.id; // Using user ID as account ID for now

      const newTier = await TiersModel.create({
        accountId,
        name: validatedData.name,
        description: validatedData.description || "",
        level: validatedData.level,
        commissionRate: validatedData.commissionRate,
        requirements: validatedData.requirements,
        benefits: validatedData.benefits,
        status: "ACTIVE",
      });

      res.json({
        success: true,
        message: "Tier created successfully",
        tier: newTier,
      });
    } catch (error) {
      console.error("Error creating tier:", error);
      if (error instanceof z.ZodError) {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create tier" });
    }
  }
);

// Delete a tier
router.delete(
  "/:id",
  authenticateToken,
  requireRole(["ADMIN"]),
  async (req: any, res) => {
    try {
      const { id } = req.params;

      const tier = await TiersModel.findById(id);
      if (!tier) {
        return res.status(404).json({ error: "Tier not found" });
      }

      await TiersModel.delete(id);

      res.json({
        success: true,
        message: "Tier deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting tier:", error);
      res.status(500).json({ error: "Failed to delete tier" });
    }
  }
);

export default router;
