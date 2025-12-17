"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get("/profile", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                phone: true,
                avatar: true,
                createdAt: true,
                role: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const affiliate = await prisma.affiliateProfile.findFirst({
            where: { userId },
        });
        res.json({
            user,
            affiliate: affiliate
                ? {
                    id: affiliate.id,
                    companyName: affiliate.companyName,
                    website: affiliate.website,
                    tier: affiliate.tier,
                    status: affiliate.status,
                    commissionRate: affiliate.commissionRate,
                }
                : null,
        });
    }
    catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ error: "Failed to fetch user profile" });
    }
});
router.put("/profile", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { firstName, lastName, phone, companyName, website } = req.body;
        const schema = zod_1.z.object({
            firstName: zod_1.z.string().min(1).optional(),
            lastName: zod_1.z.string().min(1).optional(),
            phone: zod_1.z.string().optional(),
            companyName: zod_1.z.string().optional(),
            website: zod_1.z.string().url().optional(),
        });
        const validatedData = schema.parse({
            firstName,
            lastName,
            phone,
            companyName,
            website,
        });
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                firstName: validatedData.firstName,
                lastName: validatedData.lastName,
                phone: validatedData.phone,
            },
        });
        if (validatedData.companyName || validatedData.website) {
            const affiliate = await prisma.affiliateProfile.findFirst({
                where: { userId },
            });
            if (affiliate) {
                await prisma.affiliateProfile.update({
                    where: { id: affiliate.id },
                    data: {
                        companyName: validatedData.companyName,
                        website: validatedData.website,
                    },
                });
            }
        }
        res.json({
            success: true,
            message: "Profile updated successfully",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                firstName: updatedUser.firstName,
                lastName: updatedUser.lastName,
                phone: updatedUser.phone,
            },
        });
    }
    catch (error) {
        console.error("Error updating profile:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update profile" });
    }
});
router.get("/security", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const loginActivities = await prisma.activity.findMany({
            where: {
                userId: userId,
                action: "LOGIN",
            },
            orderBy: {
                createdAt: "desc",
            },
            take: 10,
        });
        const loginHistory = loginActivities.map((activity) => {
            const userAgent = activity.userAgent || "Unknown Device";
            let device = "Unknown Device";
            if (userAgent.includes("Chrome") && !userAgent.includes("Edge")) {
                device = "Chrome";
            }
            else if (userAgent.includes("Safari") &&
                !userAgent.includes("Chrome")) {
                device = "Safari";
            }
            else if (userAgent.includes("Firefox")) {
                device = "Firefox";
            }
            else if (userAgent.includes("Edge") || userAgent.includes("Edg/")) {
                device = "Edge";
            }
            if (userAgent.includes("Macintosh") || userAgent.includes("Mac OS")) {
                device += " on MacOS";
            }
            else if (userAgent.includes("Windows")) {
                device += " on Windows";
            }
            else if (userAgent.includes("Linux") &&
                !userAgent.includes("Android")) {
                device += " on Linux";
            }
            else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
                device += " on iOS";
            }
            else if (userAgent.includes("Android")) {
                device += " on Android";
            }
            return {
                id: activity.id,
                timestamp: activity.createdAt,
                ipAddress: activity.ipAddress || "Unknown",
                device: device,
                location: "Unknown",
                status: "Success",
            };
        });
        res.json({
            email: user.email,
            lastPasswordChange: user.updatedAt,
            loginHistory: loginHistory,
        });
    }
    catch (error) {
        console.error("Error fetching security settings:", error);
        res.status(500).json({ error: "Failed to fetch security settings" });
    }
});
router.post("/security/change-password", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const schema = zod_1.z.object({
            currentPassword: zod_1.z.string().min(6),
            newPassword: zod_1.z.string().min(6),
            confirmPassword: zod_1.z.string().min(6),
        });
        const validatedData = schema.parse({
            currentPassword,
            newPassword,
            confirmPassword,
        });
        if (validatedData.newPassword !== validatedData.confirmPassword) {
            return res.status(400).json({ error: "New passwords do not match" });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const isValid = await bcryptjs_1.default.compare(validatedData.currentPassword, user.password);
        if (!isValid) {
            return res.status(400).json({ error: "Current password is incorrect" });
        }
        const hashedPassword = await bcryptjs_1.default.hash(validatedData.newPassword, 10);
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        res.json({
            success: true,
            message: "Password changed successfully",
        });
    }
    catch (error) {
        console.error("Error changing password:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to change password" });
    }
});
router.get("/notifications", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const settings = {
            email: {
                newCommission: true,
                payoutProcessed: true,
                weeklyReport: true,
                monthlyReport: true,
                systemUpdates: false,
                marketingEmails: false,
            },
            push: {
                newCommission: true,
                payoutProcessed: true,
                highValueSale: true,
                systemAlerts: true,
            },
            preferences: {
                frequency: "Immediate",
                quietHours: {
                    enabled: false,
                    start: "22:00",
                    end: "08:00",
                },
            },
        };
        res.json(settings);
    }
    catch (error) {
        console.error("Error fetching notification settings:", error);
        res.status(500).json({ error: "Failed to fetch notification settings" });
    }
});
router.put("/notifications", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { email, push, preferences } = req.body;
        const schema = zod_1.z.object({
            email: zod_1.z
                .object({
                newCommission: zod_1.z.boolean().optional(),
                payoutProcessed: zod_1.z.boolean().optional(),
                weeklyReport: zod_1.z.boolean().optional(),
                monthlyReport: zod_1.z.boolean().optional(),
                systemUpdates: zod_1.z.boolean().optional(),
                marketingEmails: zod_1.z.boolean().optional(),
            })
                .optional(),
            push: zod_1.z
                .object({
                newCommission: zod_1.z.boolean().optional(),
                payoutProcessed: zod_1.z.boolean().optional(),
                highValueSale: zod_1.z.boolean().optional(),
                systemAlerts: zod_1.z.boolean().optional(),
            })
                .optional(),
            preferences: zod_1.z
                .object({
                frequency: zod_1.z
                    .enum(["Immediate", "Daily Digest", "Weekly Digest"])
                    .optional(),
                quietHours: zod_1.z
                    .object({
                    enabled: zod_1.z.boolean(),
                    start: zod_1.z.string(),
                    end: zod_1.z.string(),
                })
                    .optional(),
            })
                .optional(),
        });
        const validatedData = schema.parse({ email, push, preferences });
        res.json({
            success: true,
            message: "Notification settings updated successfully",
            settings: validatedData,
        });
    }
    catch (error) {
        console.error("Error updating notification settings:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update notification settings" });
    }
});
router.delete("/account", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { password, confirmation } = req.body;
        if (confirmation !== "DELETE") {
            return res.status(400).json({ error: "Please type DELETE to confirm" });
        }
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        const isValid = await bcryptjs_1.default.compare(password, user.password);
        if (!isValid) {
            return res.status(400).json({ error: "Password is incorrect" });
        }
        res.json({
            success: true,
            message: "Account deletion request received. Your account will be deleted within 24 hours.",
        });
    }
    catch (error) {
        console.error("Error deleting account:", error);
        res.status(500).json({ error: "Failed to delete account" });
    }
});
exports.default = router;
//# sourceMappingURL=settings.js.map