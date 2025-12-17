"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { page = 1, limit = 50, status, month, affiliateId, } = req.query;
        const filters = {
            action: "deliverable_submitted",
        };
        if (status && status !== "all") {
            filters.status = status;
        }
        if (month) {
            filters.details = {
                path: ["month"],
                equals: month,
            };
        }
        if (affiliateId) {
            filters.userId = affiliateId;
        }
        const submissions = await prisma.activity.findMany({
            where: filters,
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
            orderBy: {
                createdAt: "desc",
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
        });
        const total = await prisma.activity.count({ where: filters });
        const formattedSubmissions = submissions.map((submission) => {
            const details = submission.details;
            return {
                id: submission.id,
                affiliateId: submission.userId,
                affiliateName: `${submission.user.firstName} ${submission.user.lastName}`,
                affiliateEmail: submission.user.email,
                month: details.month,
                platform: details.platform,
                url: details.url,
                photoUrl: details.photoUrl || null,
                status: submission.status || "PENDING",
                adminComment: submission.adminComment || null,
                reviewedAt: submission.reviewedAt,
                submittedAt: submission.createdAt,
            };
        });
        res.json({
            submissions: formattedSubmissions,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit)),
            },
        });
    }
    catch (error) {
        console.error("Error fetching deliverable submissions:", error);
        res.status(500).json({ error: "Failed to fetch deliverable submissions" });
    }
});
router.get("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const submission = await prisma.activity.findUnique({
            where: { id },
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
        });
        if (!submission || submission.action !== "deliverable_submitted") {
            return res.status(404).json({ error: "Deliverable submission not found" });
        }
        const details = submission.details;
        res.json({
            id: submission.id,
            affiliateId: submission.userId,
            affiliateName: `${submission.user.firstName} ${submission.user.lastName}`,
            affiliateEmail: submission.user.email,
            month: details.month,
            platform: details.platform,
            url: details.url,
            photoUrl: details.photoUrl || null,
            status: submission.status || "PENDING",
            adminComment: submission.adminComment || null,
            reviewedAt: submission.reviewedAt,
            submittedAt: submission.createdAt,
        });
    }
    catch (error) {
        console.error("Error fetching deliverable submission:", error);
        res.status(500).json({ error: "Failed to fetch deliverable submission" });
    }
});
router.patch("/:id/approve", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const approveSchema = zod_1.z.object({
            comment: zod_1.z.string().optional(),
        });
        const { comment } = approveSchema.parse(req.body);
        const submission = await prisma.activity.findUnique({
            where: { id },
        });
        if (!submission || submission.action !== "deliverable_submitted") {
            return res.status(404).json({ error: "Deliverable submission not found" });
        }
        const updatedSubmission = await prisma.activity.update({
            where: { id },
            data: {
                status: "APPROVED",
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
                adminComment: comment || null,
            },
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
        });
        res.json({
            message: "Deliverable approved successfully",
            submission: updatedSubmission,
        });
    }
    catch (error) {
        console.error("Error approving deliverable:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: "Invalid request data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to approve deliverable" });
    }
});
router.patch("/:id/reject", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const { id } = req.params;
        const rejectSchema = zod_1.z.object({
            comment: zod_1.z.string().min(1, "Comment is required when rejecting"),
        });
        const { comment } = rejectSchema.parse(req.body);
        const submission = await prisma.activity.findUnique({
            where: { id },
        });
        if (!submission || submission.action !== "deliverable_submitted") {
            return res.status(404).json({ error: "Deliverable submission not found" });
        }
        const updatedSubmission = await prisma.activity.update({
            where: { id },
            data: {
                status: "REJECTED",
                reviewedBy: req.user.id,
                reviewedAt: new Date(),
                adminComment: comment,
            },
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
        });
        res.json({
            message: "Deliverable rejected successfully",
            submission: updatedSubmission,
        });
    }
    catch (error) {
        console.error("Error rejecting deliverable:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ error: "Invalid request data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to reject deliverable" });
    }
});
router.get("/stats/overview", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), async (req, res) => {
    try {
        const totalSubmissions = await prisma.activity.count({
            where: { action: "deliverable_submitted" },
        });
        const pendingSubmissions = await prisma.activity.count({
            where: {
                action: "deliverable_submitted",
                status: "PENDING",
            },
        });
        const approvedSubmissions = await prisma.activity.count({
            where: {
                action: "deliverable_submitted",
                status: "APPROVED",
            },
        });
        const rejectedSubmissions = await prisma.activity.count({
            where: {
                action: "deliverable_submitted",
                status: "REJECTED",
            },
        });
        res.json({
            totalSubmissions,
            pendingSubmissions,
            approvedSubmissions,
            rejectedSubmissions,
        });
    }
    catch (error) {
        console.error("Error fetching deliverable statistics:", error);
        res.status(500).json({ error: "Failed to fetch statistics" });
    }
});
exports.default = router;
//# sourceMappingURL=admin-deliverables.js.map