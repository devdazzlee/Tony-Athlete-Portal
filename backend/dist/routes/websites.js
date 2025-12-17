"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const createWebsiteSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Website name is required"),
    domain: zod_1.z.string().min(1, "Domain is required"),
    description: zod_1.z.string().optional(),
    websiteId: zod_1.z.string().optional(),
});
const updateWebsiteSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    domain: zod_1.z.string().min(1).optional(),
    description: zod_1.z.string().optional(),
});
const generateWebsiteId = (domain) => {
    return domain
        .replace(/https?:\/\//, "")
        .replace(/^www\./, "")
        .replace(/\./g, "-")
        .toLowerCase();
};
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        const user = req.user;
        const websites = await prisma_1.prisma.website.findMany({
            orderBy: {
                createdAt: "desc",
            },
        });
        res.json({
            success: true,
            websites,
            message: "Websites fetched successfully",
        });
    }
    catch (error) {
        console.error("Error fetching websites:", error);
        res.status(500).json({ error: "Failed to fetch websites" });
    }
});
router.get("/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const website = await prisma_1.prisma.website.findUnique({
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
    }
    catch (error) {
        console.error("Error fetching website:", error);
        res.status(500).json({ error: "Failed to fetch website" });
    }
});
router.post("/", auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const user = req.user;
        const data = createWebsiteSchema.parse(req.body);
        const websiteId = data.websiteId || generateWebsiteId(data.domain);
        const existingWebsite = await prisma_1.prisma.website.findUnique({
            where: { websiteId },
        });
        if (existingWebsite) {
            return res.status(400).json({
                success: false,
                error: "Website ID already exists. Please use a different ID.",
            });
        }
        let cleanDomain = data.domain.trim();
        if (cleanDomain.endsWith("/")) {
            cleanDomain = cleanDomain.slice(0, -1);
        }
        if (!cleanDomain.match(/^https?:\/\//)) {
            cleanDomain = `https://${cleanDomain}`;
        }
        const website = await prisma_1.prisma.website.create({
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
    }
    catch (error) {
        if (error.name === "ZodError") {
            return res.status(400).json({
                error: "Validation error",
                details: error.errors,
            });
        }
        if (error.code === "P2002") {
            return res.status(400).json({
                success: false,
                error: "Website ID already exists. Please use a different ID.",
            });
        }
        console.error("Error creating website:", error);
        res.status(500).json({ error: "Failed to create website" });
    }
});
router.put("/:id", auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const data = updateWebsiteSchema.parse(req.body);
        const existingWebsite = await prisma_1.prisma.website.findUnique({
            where: { id },
        });
        if (!existingWebsite) {
            return res.status(404).json({
                success: false,
                error: "Website not found",
            });
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.domain) {
            let cleanDomain = data.domain.trim();
            if (cleanDomain.endsWith("/")) {
                cleanDomain = cleanDomain.slice(0, -1);
            }
            if (!/^https?:\/\//.test(cleanDomain)) {
                cleanDomain = `https://${cleanDomain}`;
            }
            updateData.domain = cleanDomain;
        }
        if (data.description !== undefined) {
            updateData.description = data.description || null;
        }
        const website = await prisma_1.prisma.website.update({
            where: { id },
            data: updateData,
        });
        res.json({
            success: true,
            website,
            message: "Website updated successfully",
        });
    }
    catch (error) {
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
router.delete("/:id", auth_1.authenticateToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const existingWebsite = await prisma_1.prisma.website.findUnique({
            where: { id },
        });
        if (!existingWebsite) {
            return res.status(404).json({
                success: false,
                error: "Website not found",
            });
        }
        await prisma_1.prisma.website.delete({
            where: { id },
        });
        res.json({
            success: true,
            message: "Website deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting website:", error);
        res.status(500).json({ error: "Failed to delete website" });
    }
});
exports.default = router;
//# sourceMappingURL=websites.js.map