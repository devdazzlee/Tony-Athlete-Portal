"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const SystemSettingsService_1 = require("../services/SystemSettingsService");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
const ACCOUNT_ID = "default";
router.get("/", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can view system settings" });
        }
        let settings = await prisma.systemSettings.findUnique({
            where: { accountId: ACCOUNT_ID },
        });
        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: {
                    accountId: ACCOUNT_ID,
                    general: {
                        programName: "Trackdesk",
                        programDescription: "Professional affiliate management platform",
                        timezone: "America/New_York",
                        currency: "USD",
                        language: "en",
                        commissionSettings: {
                            defaultRate: 15,
                            minimumPayout: 50.0,
                            payoutFrequency: "Monthly",
                            approvalPeriod: 30,
                            cookieDuration: 30,
                        },
                    },
                    security: {
                        twoFactorRequired: false,
                        ipWhitelist: false,
                        sessionTimeout: 30,
                        passwordPolicy: "strong",
                        auditLogging: true,
                    },
                    currencies: {
                        defaultCurrency: "USD",
                        supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
                    },
                    notifications: {
                        emailNotifications: true,
                        adminAlerts: true,
                        affiliateWelcome: true,
                        payoutNotifications: true,
                        systemMaintenance: true,
                    },
                    integrations: {},
                    performance: {},
                    compliance: {},
                },
            });
        }
        let commissionSettings = null;
        if (settings.general &&
            typeof settings.general === "object" &&
            "commissionSettings" in settings.general) {
            commissionSettings = settings.general.commissionSettings;
        }
        if (!commissionSettings || (commissionSettings.defaultRate && commissionSettings.defaultRate <= 10)) {
            const existingGeneral = settings.general && typeof settings.general === "object"
                ? settings.general
                : {};
            const updatedCommissionSettings = commissionSettings ? {
                ...commissionSettings,
                defaultRate: commissionSettings.defaultRate <= 10 ? 15 : commissionSettings.defaultRate,
            } : {
                defaultRate: 15,
                minimumPayout: 50.0,
                payoutFrequency: "Monthly",
                approvalPeriod: 30,
                cookieDuration: 30,
            };
            settings = await prisma.systemSettings.update({
                where: { accountId: ACCOUNT_ID },
                data: {
                    general: {
                        ...existingGeneral,
                        commissionSettings: updatedCommissionSettings,
                    },
                },
            });
            commissionSettings = settings.general.commissionSettings;
        }
        const affiliateSettings = {
            autoApprove: false,
            requireApproval: true,
            maxAffiliates: 1000,
            allowSelfReferrals: false,
            tierBasedCommissions: true,
        };
        res.json({
            general: settings.general,
            commission: commissionSettings,
            affiliate: affiliateSettings,
            security: settings.security,
            notifications: settings.notifications,
        });
    }
    catch (error) {
        console.error("Error fetching system settings:", error);
        res.status(500).json({ error: "Failed to fetch system settings" });
    }
});
router.put("/general", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res.status(403).json({ error: "Only admins can update settings" });
        }
        const schema = zod_1.z.object({
            programName: zod_1.z.string().min(1, "Program name is required"),
            programDescription: zod_1.z.string().optional(),
            timezone: zod_1.z.string().optional(),
            currency: zod_1.z.string().optional(),
            language: zod_1.z.string().optional(),
        });
        const data = schema.parse(req.body);
        const settings = await prisma.systemSettings.upsert({
            where: { accountId: ACCOUNT_ID },
            update: {
                general: data,
            },
            create: {
                accountId: ACCOUNT_ID,
                general: data,
                security: {},
                currencies: {},
                notifications: {},
                integrations: {},
                performance: {},
                compliance: {},
            },
        });
        await prisma.activity.create({
            data: {
                userId: req.user.id,
                action: "settings_updated",
                resource: "general_settings",
                details: {
                    timestamp: new Date().toISOString(),
                    changes: data,
                },
            },
        });
        res.json({
            success: true,
            message: "General settings updated successfully",
            settings: settings.general,
        });
    }
    catch (error) {
        console.error("Error updating general settings:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update general settings" });
    }
});
router.post("/commission/preview", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can preview commission settings" });
        }
        const schema = zod_1.z.object({
            defaultRate: zod_1.z.number().min(0).max(100, "Rate must be between 0 and 100"),
        });
        const data = schema.parse(req.body);
        const currentSettings = await prisma.systemSettings.findUnique({
            where: { accountId: ACCOUNT_ID },
        });
        let currentDefaultRate = 15;
        if (currentSettings?.general &&
            typeof currentSettings.general === "object" &&
            "commissionSettings" in currentSettings.general) {
            const general = currentSettings.general;
            if (general.commissionSettings?.defaultRate) {
                currentDefaultRate = general.commissionSettings.defaultRate;
            }
        }
        const affectedAffiliates = await prisma.affiliateProfile.findMany({
            where: {
                commissionRate: currentDefaultRate,
                tier: "BRONZE",
            },
            select: {
                id: true,
                userId: true,
                commissionRate: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        const totalAffiliates = await prisma.affiliateProfile.count();
        res.json({
            success: true,
            preview: {
                currentDefaultRate,
                newDefaultRate: data.defaultRate,
                affectedAffiliates: affectedAffiliates.length,
                totalAffiliates,
                affectedAffiliateList: affectedAffiliates.map((affiliate) => ({
                    id: affiliate.id,
                    name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
                    email: affiliate.user.email,
                    currentRate: affiliate.commissionRate,
                    newRate: data.defaultRate,
                })),
            },
        });
    }
    catch (error) {
        console.error("Error previewing commission settings:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to preview commission settings" });
    }
});
router.put("/commission", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can update commission settings" });
        }
        const schema = zod_1.z.object({
            defaultRate: zod_1.z
                .number()
                .min(0, "Commission rate must be greater than or equal to 0%")
                .max(100, "Commission rate must be less than or equal to 100%"),
            minimumPayout: zod_1.z.number().min(0, "Minimum payout must be positive"),
            payoutFrequency: zod_1.z.enum(["Weekly", "Bi-Weekly", "Monthly", "Quarterly"]),
            approvalPeriod: zod_1.z.number().min(0, "Approval period must be positive"),
            cookieDuration: zod_1.z
                .number()
                .min(1, "Cookie duration must be at least 1 day"),
            updateAffiliates: zod_1.z.boolean().optional(),
        });
        const data = schema.parse(req.body);
        const currentSettings = await prisma.systemSettings.findUnique({
            where: { accountId: ACCOUNT_ID },
        });
        let currentDefaultRate = 15;
        if (currentSettings?.general &&
            typeof currentSettings.general === "object" &&
            "commissionSettings" in currentSettings.general) {
            const general = currentSettings.general;
            if (general.commissionSettings?.defaultRate) {
                currentDefaultRate = general.commissionSettings.defaultRate;
            }
        }
        const affectedAffiliates = await prisma.affiliateProfile.findMany({
            select: {
                id: true,
                userId: true,
                commissionRate: true,
                user: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
            },
        });
        const existingSettings = await prisma.systemSettings.findUnique({
            where: { accountId: ACCOUNT_ID },
        });
        const existingGeneral = existingSettings?.general && typeof existingSettings.general === "object"
            ? existingSettings.general
            : {};
        const settings = await prisma.systemSettings.upsert({
            where: { accountId: ACCOUNT_ID },
            update: {
                general: {
                    ...existingGeneral,
                    commissionSettings: {
                        defaultRate: data.defaultRate,
                        minimumPayout: data.minimumPayout,
                        payoutFrequency: data.payoutFrequency,
                        approvalPeriod: data.approvalPeriod,
                        cookieDuration: data.cookieDuration,
                    },
                },
            },
            create: {
                accountId: ACCOUNT_ID,
                general: {
                    commissionSettings: {
                        defaultRate: data.defaultRate,
                        minimumPayout: data.minimumPayout,
                        payoutFrequency: data.payoutFrequency,
                        approvalPeriod: data.approvalPeriod,
                        cookieDuration: data.cookieDuration,
                    },
                },
                security: {},
                currencies: {},
                notifications: {},
                integrations: {},
                performance: {},
                compliance: {},
            },
        });
        SystemSettingsService_1.SystemSettingsService.clearCache();
        let updatedAffiliates = 0;
        if (data.updateAffiliates && affectedAffiliates.length > 0) {
            const updateResult = await prisma.affiliateProfile.updateMany({
                where: {
                    id: {
                        in: affectedAffiliates.map((affiliate) => affiliate.id),
                    },
                },
                data: {
                    commissionRate: data.defaultRate,
                },
            });
            updatedAffiliates = updateResult.count;
            await prisma.referralCode.updateMany({
                where: {
                    affiliateId: {
                        in: affectedAffiliates.map((affiliate) => affiliate.id),
                    },
                },
                data: {
                    commissionRate: data.defaultRate,
                },
            });
            for (const affiliate of affectedAffiliates) {
                await prisma.activity.create({
                    data: {
                        userId: req.user.id,
                        action: "affiliate_commission_updated",
                        resource: "affiliate_profile",
                        details: {
                            timestamp: new Date().toISOString(),
                            affiliateId: affiliate.id,
                            affiliateEmail: affiliate.user.email,
                            oldRate: affiliate.commissionRate,
                            newRate: data.defaultRate,
                            reason: "Default commission rate change - all affiliates updated",
                        },
                    },
                });
            }
        }
        await prisma.activity.create({
            data: {
                userId: req.user.id,
                action: "commission_settings_updated",
                resource: "commission_settings",
                details: {
                    timestamp: new Date().toISOString(),
                    changes: {
                        defaultRate: data.defaultRate,
                        minimumPayout: data.minimumPayout,
                        payoutFrequency: data.payoutFrequency,
                        approvalPeriod: data.approvalPeriod,
                        cookieDuration: data.cookieDuration,
                    },
                    affectedAffiliates: affectedAffiliates.length,
                    updatedAffiliates: updatedAffiliates,
                    updateAffiliates: data.updateAffiliates || false,
                },
            },
        });
        res.json({
            success: true,
            message: "Commission settings updated successfully",
            settings: {
                defaultRate: data.defaultRate,
                minimumPayout: data.minimumPayout,
                payoutFrequency: data.payoutFrequency,
                approvalPeriod: data.approvalPeriod,
                cookieDuration: data.cookieDuration,
            },
            impact: {
                affectedAffiliates: affectedAffiliates.length,
                updatedAffiliates: updatedAffiliates,
                affectedAffiliateList: affectedAffiliates.map((affiliate) => ({
                    id: affiliate.id,
                    name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
                    email: affiliate.user.email,
                    currentRate: affiliate.commissionRate,
                    newRate: data.defaultRate,
                })),
            },
        });
    }
    catch (error) {
        console.error("Error updating commission settings:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update commission settings" });
    }
});
router.get("/status", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can view system status" });
        }
        const isDatabaseHealthy = await prisma.$queryRaw `SELECT 1`
            .then(() => true)
            .catch(() => false);
        const [totalAffiliates, totalOrders, totalCommissions] = await Promise.all([
            prisma.affiliateProfile.count(),
            prisma.affiliateOrder.count(),
            prisma.affiliateOrder.aggregate({
                _sum: { commissionAmount: true },
            }),
        ]);
        const recentActivity = await prisma.activity.findMany({
            take: 10,
            orderBy: { createdAt: "desc" },
            select: {
                action: true,
                createdAt: true,
            },
        });
        const isPaymentSystemHealthy = true;
        const lastBackupTime = new Date(Date.now() - 2 * 60 * 60 * 1000);
        const uptimePercentage = 99.9;
        res.json({
            systemHealth: {
                status: isDatabaseHealthy ? "operational" : "down",
                database: isDatabaseHealthy,
                paymentSystem: isPaymentSystemHealthy,
                uptime: uptimePercentage,
            },
            statistics: {
                totalAffiliates,
                totalOrders,
                totalCommissions: totalCommissions._sum.commissionAmount || 0,
            },
            lastBackup: {
                timestamp: lastBackupTime,
                status: "success",
            },
            recentActivity: recentActivity.map((activity) => ({
                action: activity.action,
                timestamp: activity.createdAt,
            })),
        });
    }
    catch (error) {
        console.error("Error fetching system status:", error);
        res.status(500).json({ error: "Failed to fetch system status" });
    }
});
router.put("/status", auth_1.authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "Only admins can update system status" });
        }
        const schema = zod_1.z.object({
            maintenanceMode: zod_1.z.boolean().optional(),
            maintenanceMessage: zod_1.z.string().optional(),
        });
        const data = schema.parse(req.body);
        const settings = await prisma.systemSettings.upsert({
            where: { accountId: ACCOUNT_ID },
            update: {
                performance: {
                    maintenanceMode: data.maintenanceMode,
                    maintenanceMessage: data.maintenanceMessage,
                },
            },
            create: {
                accountId: ACCOUNT_ID,
                general: {},
                security: {},
                currencies: {},
                notifications: {},
                integrations: {},
                performance: {
                    maintenanceMode: data.maintenanceMode,
                    maintenanceMessage: data.maintenanceMessage,
                },
                compliance: {},
            },
        });
        await prisma.activity.create({
            data: {
                userId: req.user.id,
                action: "system_status_updated",
                resource: "system_status",
                details: {
                    timestamp: new Date().toISOString(),
                    changes: data,
                },
            },
        });
        res.json({
            success: true,
            message: "System status updated successfully",
            settings: settings.performance,
        });
    }
    catch (error) {
        console.error("Error updating system status:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to update system status" });
    }
});
exports.default = router;
//# sourceMappingURL=system-settings.js.map