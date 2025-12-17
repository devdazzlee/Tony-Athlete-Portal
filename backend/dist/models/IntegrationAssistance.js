"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IntegrationAssistanceModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class IntegrationAssistanceModel {
    static async createRequest(data) {
        return (await prisma.integrationKnowledge.create({
            data: {
                accountId: data.accountId,
                title: data.title,
                content: data.description,
                category: data.category,
                tags: data.tags || [],
                isPublic: false,
                createdBy: data.userId,
            },
        }));
    }
    static async findRequestById(id) {
        return (await prisma.integrationKnowledge.findUnique({
            where: { id },
        }));
    }
    static async updateRequest(id, data) {
        return (await prisma.integrationKnowledge.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteRequest(id) {
        await prisma.integrationKnowledge.delete({
            where: { id },
        });
    }
    static async listRequests(accountId, filters = {}) {
        const where = { accountId };
        if (filters.category)
            where.category = filters.category;
        if (filters.createdBy)
            where.createdBy = filters.createdBy;
        return (await prisma.integrationKnowledge.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async addMessage(requestId, userId, content, type = "MESSAGE", attachments = [], isInternal = false) {
        const message = {
            id: Math.random().toString(36).substring(2, 15),
            requestId,
            userId,
            content,
            type,
            attachments,
            isInternal,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        return message;
    }
    static async getMessages(requestId, filters = {}) {
        return [];
    }
    static async addTimelineEvent(requestId, type, title, description, userId, data = {}) {
        return {
            id: Math.random().toString(36).substring(2, 15),
            requestId,
            type,
            title,
            description,
            userId,
            data,
            createdAt: new Date(),
        };
    }
    static async getTimeline(requestId) {
        return [];
    }
    static async updateStatus(requestId, status, userId, notes) {
        const request = await this.findRequestById(requestId);
        if (!request) {
            throw new Error("Request not found");
        }
        const updatedRequest = await this.updateRequest(requestId, {});
        return updatedRequest;
    }
    static async assignRequest(requestId, assignedTo, assignedBy) {
        const request = await this.findRequestById(requestId);
        if (!request) {
            throw new Error("Request not found");
        }
        const updatedRequest = await this.updateRequest(requestId, {});
        return updatedRequest;
    }
    static async addRequirement(requestId, data) {
        return {
            id: Math.random().toString(36).substring(2, 15),
            requestId,
            title: data.title,
            description: data.description,
            type: data.type,
            priority: data.priority || "SHOULD_HAVE",
            status: "PENDING",
            estimatedHours: data.estimatedHours || 0,
            actualHours: 0,
            notes: data.notes || "",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    static async updateRequirement(id, data) {
        return {
            id,
            ...data,
            updatedAt: new Date(),
        };
    }
    static async deleteRequirement(id) {
    }
    static async getRequirements(requestId) {
        return [];
    }
    static async addDeliverable(requestId, data) {
        return {
            id: Math.random().toString(36).substring(2, 15),
            requestId,
            title: data.title,
            description: data.description,
            type: data.type,
            status: "PENDING",
            dueDate: data.dueDate,
            attachments: data.attachments || [],
            notes: data.notes || "",
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    static async updateDeliverable(id, data) {
        return {
            id,
            ...data,
            updatedAt: new Date(),
        };
    }
    static async deleteDeliverable(id) {
    }
    static async getDeliverables(requestId) {
        return [];
    }
    static async createSpecialist(data) {
        return {
            id: Math.random().toString(36).substring(2, 15),
            accountId: data.accountId,
            userId: data.userId,
            name: data.name,
            email: data.email,
            title: data.title,
            bio: data.bio || "",
            skills: data.skills || [],
            certifications: data.certifications || [],
            experience: data.experience || 0,
            hourlyRate: data.hourlyRate || 0,
            currency: data.currency || "USD",
            availability: "AVAILABLE",
            timezone: data.timezone || "UTC",
            languages: data.languages || ["English"],
            specializations: data.specializations || [],
            rating: 0,
            totalProjects: 0,
            completedProjects: 0,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
    static async findSpecialistById(id) {
        return (await prisma.user.findUnique({
            where: { id },
        }));
    }
    static async updateSpecialist(id, data) {
        return (await prisma.user.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteSpecialist(id) {
        await prisma.user.update({
            where: { id },
            data: { status: "INACTIVE" },
        });
    }
    static async listSpecialists(accountId, filters = {}) {
        const where = { accountId, status: "ACTIVE" };
        return (await prisma.user.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async createTemplate(data) {
        return (await prisma.integrationKnowledge.create({
            data: {
                accountId: data.accountId,
                title: data.name,
                content: data.description || "",
                category: data.category,
                tags: data.tags || [],
                isPublic: data.isPublic || false,
                createdBy: data.createdBy,
            },
        }));
    }
    static async findTemplateById(id) {
        return (await prisma.integrationKnowledge.findUnique({
            where: { id },
        }));
    }
    static async updateTemplate(id, data) {
        return (await prisma.integrationKnowledge.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteTemplate(id) {
        await prisma.integrationKnowledge.delete({
            where: { id },
        });
    }
    static async listTemplates(accountId, filters = {}) {
        const where = { accountId };
        if (filters.category)
            where.category = filters.category;
        if (filters.isPublic !== undefined)
            where.isPublic = filters.isPublic;
        return (await prisma.integrationKnowledge.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async createKnowledge(data) {
        return (await prisma.integrationKnowledge.create({
            data: {
                accountId: data.accountId,
                title: data.title,
                content: data.content,
                category: data.category,
                tags: data.tags || [],
                isPublic: data.isPublic || false,
                createdBy: data.createdBy,
            },
        }));
    }
    static async findKnowledgeById(id) {
        return (await prisma.integrationKnowledge.findUnique({
            where: { id },
        }));
    }
    static async updateKnowledge(id, data) {
        return (await prisma.integrationKnowledge.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteKnowledge(id) {
        await prisma.integrationKnowledge.delete({
            where: { id },
        });
    }
    static async listKnowledge(accountId, filters = {}) {
        const where = { accountId, isPublic: true };
        if (filters.category)
            where.category = filters.category;
        if (filters.tags && filters.tags.length > 0) {
            where.tags = { hasSome: filters.tags };
        }
        return (await prisma.integrationKnowledge.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async recordKnowledgeView(id) {
        return;
    }
    static async recordKnowledgeFeedback(id, helpful) {
        return;
    }
    static async getIntegrationStats(accountId) {
        const requests = await this.listRequests(accountId);
        const specialists = await this.listSpecialists(accountId);
        const templates = await this.listTemplates(accountId);
        const knowledge = await this.listKnowledge(accountId);
        const stats = {
            totalRequests: requests.length,
            openRequests: requests.filter((r) => r.status === "OPEN").length,
            inProgressRequests: requests.filter((r) => r.status === "IN_PROGRESS")
                .length,
            resolvedRequests: requests.filter((r) => r.status === "RESOLVED").length,
            closedRequests: requests.filter((r) => r.status === "CLOSED").length,
            totalSpecialists: specialists.length,
            availableSpecialists: specialists.filter((s) => s.availability === "AVAILABLE").length,
            totalTemplates: templates.length,
            totalKnowledge: knowledge.length,
            totalHours: requests.reduce((sum, r) => sum + r.actualHours, 0),
            totalBudget: requests.reduce((sum, r) => sum + r.budget, 0),
            byCategory: {},
            byPriority: {},
            byType: {},
            byStatus: {},
        };
        requests.forEach((request) => {
            stats.byCategory[request.category] =
                (stats.byCategory[request.category] || 0) + 1;
            stats.byPriority[request.priority] =
                (stats.byPriority[request.priority] || 0) + 1;
            stats.byType[request.type] = (stats.byType[request.type] || 0) + 1;
            stats.byStatus[request.status] =
                (stats.byStatus[request.status] || 0) + 1;
        });
        return stats;
    }
    static async createDefaultTemplates(accountId) {
        const defaultTemplates = [
            {
                name: "Basic API Integration",
                description: "Template for basic API integration requests",
                category: "API",
                type: "INTEGRATION",
                template: {
                    category: "API",
                    type: "INTEGRATION",
                    priority: "MEDIUM",
                    estimatedHours: 8,
                    budget: 500,
                    currency: "USD",
                    tags: ["api", "integration", "basic"],
                    requirements: [
                        {
                            title: "API Documentation",
                            description: "Provide API documentation and endpoints",
                            type: "TECHNICAL",
                            priority: "MUST_HAVE",
                        },
                        {
                            title: "Authentication Setup",
                            description: "Set up API authentication and keys",
                            type: "TECHNICAL",
                            priority: "MUST_HAVE",
                        },
                    ],
                    deliverables: [
                        {
                            title: "Integration Code",
                            description: "Complete integration code with examples",
                            type: "CODE",
                        },
                        {
                            title: "Documentation",
                            description: "Integration documentation and setup guide",
                            type: "DOCUMENTATION",
                        },
                    ],
                },
                isPublic: true,
                isDefault: true,
            },
            {
                name: "Webhook Setup",
                description: "Template for webhook integration requests",
                category: "WEBHOOK",
                type: "INTEGRATION",
                template: {
                    category: "WEBHOOK",
                    type: "INTEGRATION",
                    priority: "MEDIUM",
                    estimatedHours: 4,
                    budget: 300,
                    currency: "USD",
                    tags: ["webhook", "integration", "real-time"],
                    requirements: [
                        {
                            title: "Webhook Endpoint",
                            description: "Provide webhook endpoint URL",
                            type: "TECHNICAL",
                            priority: "MUST_HAVE",
                        },
                        {
                            title: "Event Types",
                            description: "Specify which events to track",
                            type: "FUNCTIONAL",
                            priority: "MUST_HAVE",
                        },
                    ],
                    deliverables: [
                        {
                            title: "Webhook Configuration",
                            description: "Configured webhook settings",
                            type: "CONFIGURATION",
                        },
                        {
                            title: "Test Results",
                            description: "Webhook testing and validation results",
                            type: "TESTING",
                        },
                    ],
                },
                isPublic: true,
                isDefault: true,
            },
        ];
        const createdTemplates = [];
        for (const templateData of defaultTemplates) {
            const template = await this.createTemplate({
                accountId,
                ...templateData,
            });
            createdTemplates.push(template);
        }
        return createdTemplates;
    }
    static async getIntegrationAssistanceDashboard(accountId) {
        const requests = await this.listRequests(accountId);
        const specialists = await this.listSpecialists(accountId);
        const templates = await this.listTemplates(accountId);
        const knowledge = await this.listKnowledge(accountId);
        const stats = await this.getIntegrationStats(accountId);
        return {
            requests,
            specialists,
            templates,
            knowledge,
            stats,
        };
    }
}
exports.IntegrationAssistanceModel = IntegrationAssistanceModel;
//# sourceMappingURL=IntegrationAssistance.js.map