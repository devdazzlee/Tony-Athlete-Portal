"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OfferOrganizationModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class OfferOrganizationModel {
    static async createCategory(data) {
        return (await prisma.offerCategory.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                order: data.order || 0,
            },
        }));
    }
    static async findCategoryById(id) {
        return (await prisma.offerCategory.findUnique({
            where: { id },
        }));
    }
    static async updateCategory(id, data) {
        return (await prisma.offerCategory.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteCategory(id) {
        await prisma.offerCategory.delete({
            where: { id },
        });
    }
    static async listCategories(accountId, filters = {}) {
        const where = { accountId };
        return (await prisma.offerCategory.findMany({
            where,
            orderBy: [{ order: "asc" }, { name: "asc" }],
        }));
    }
    static async getCategoryTree(accountId) {
        const categories = await this.listCategories(accountId);
        return this.buildCategoryTree(categories);
    }
    static buildCategoryTree(categories) {
        return categories;
    }
    static async createTag(data) {
        return (await prisma.offerTag.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                color: data.color || "#3b82f6",
            },
        }));
    }
    static async findTagById(id) {
        return (await prisma.offerTag.findUnique({
            where: { id },
        }));
    }
    static async updateTag(id, data) {
        return (await prisma.offerTag.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteTag(id) {
        await prisma.offerTag.delete({
            where: { id },
        });
    }
    static async listTags(accountId, filters = {}) {
        const where = { accountId };
        return (await prisma.offerTag.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createGroup(data) {
        return (await prisma.offerGroup.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                offers: data.offers || [],
            },
        }));
    }
    static async findGroupById(id) {
        return (await prisma.offerGroup.findUnique({
            where: { id },
        }));
    }
    static async updateGroup(id, data) {
        return (await prisma.offerGroup.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteGroup(id) {
        await prisma.offerGroup.delete({
            where: { id },
        });
    }
    static async listGroups(accountId, filters = {}) {
        const where = { accountId };
        return (await prisma.offerGroup.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createTemplate(data) {
        return (await prisma.offerTemplate.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                template: data.template || {},
                isDefault: data.isDefault || false,
            },
        }));
    }
    static async findTemplateById(id) {
        return (await prisma.offerTemplate.findUnique({
            where: { id },
        }));
    }
    static async updateTemplate(id, data) {
        return (await prisma.offerTemplate.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteTemplate(id) {
        await prisma.offerTemplate.delete({
            where: { id },
        });
    }
    static async listTemplates(accountId, filters = {}) {
        const where = { accountId };
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.offerTemplate.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createOrganization(data) {
        return (await prisma.offerOrganization.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                settings: data.settings || {},
            },
        }));
    }
    static async findOrganizationById(id) {
        return (await prisma.offerOrganization.findUnique({
            where: { id },
        }));
    }
    static async updateOrganization(id, data) {
        return (await prisma.offerOrganization.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteOrganization(id) {
        await prisma.offerOrganization.delete({
            where: { id },
        });
    }
    static async listOrganizations(accountId, filters = {}) {
        const where = { accountId };
        return (await prisma.offerOrganization.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async applyOrganizationRules(offerId, organizationId) {
        const organization = await this.findOrganizationById(organizationId);
        if (!organization) {
            return;
        }
        const offer = await prisma.offer.findUnique({
            where: { id: offerId },
        });
        if (!offer) {
            return;
        }
    }
    static async evaluateRuleConditions(conditions, offer) {
        if (conditions.length === 0) {
            return true;
        }
        let result = true;
        let logic = "AND";
        for (const condition of conditions) {
            const conditionResult = await this.evaluateRuleCondition(condition, offer);
            if (logic === "AND") {
                result = result && conditionResult;
            }
            else {
                result = result || conditionResult;
            }
            logic = condition.logic;
        }
        return result;
    }
    static async evaluateRuleCondition(condition, offer) {
        const value = this.getFieldValue(offer, condition.field);
        switch (condition.operator) {
            case "EQUALS":
                return value === condition.value;
            case "NOT_EQUALS":
                return value !== condition.value;
            case "CONTAINS":
                return String(value).includes(String(condition.value));
            case "GREATER_THAN":
                return Number(value) > Number(condition.value);
            case "LESS_THAN":
                return Number(value) < Number(condition.value);
            case "IN":
                return (Array.isArray(condition.value) && condition.value.includes(value));
            case "NOT_IN":
                return (Array.isArray(condition.value) && !condition.value.includes(value));
            default:
                return false;
        }
    }
    static getFieldValue(data, field) {
        const fields = field.split(".");
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static async executeRuleActions(actions, offer) {
        for (const action of actions) {
            if (!action.enabled)
                continue;
            try {
                switch (action.type) {
                    case "ASSIGN_CATEGORY":
                        console.warn("ASSIGN_CATEGORY action is no longer supported as category field has been removed");
                        break;
                    case "ADD_TAG":
                        const currentTags = offer.tags || [];
                        const updatedTags = [...currentTags, action.parameters.tagId];
                        await prisma.offer.update({
                            where: { id: offer.id },
                            data: { tags: updatedTags },
                        });
                        break;
                    case "ADD_TO_GROUP":
                        break;
                    case "VALIDATE":
                        break;
                    case "REQUIRE_APPROVAL":
                        await prisma.offer.update({
                            where: { id: offer.id },
                            data: { status: "PAUSED" },
                        });
                        break;
                    case "AUTO_APPROVE":
                        await prisma.offer.update({
                            where: { id: offer.id },
                            data: { status: "ACTIVE" },
                        });
                        break;
                }
            }
            catch (error) {
                console.error(`Failed to execute rule action ${action.type}:`, error);
            }
        }
    }
    static async getOrganizationStats(accountId) {
        const categories = await this.listCategories(accountId);
        const tags = await this.listTags(accountId);
        const groups = await this.listGroups(accountId);
        const templates = await this.listTemplates(accountId);
        const organizations = await this.listOrganizations(accountId);
        const offers = await prisma.offer.findMany({
            where: { accountId },
        });
        const stats = {
            totalCategories: categories.length,
            activeCategories: categories.filter((c) => c.status === "ACTIVE").length,
            totalTags: tags.length,
            activeTags: tags.length,
            totalGroups: groups.length,
            activeGroups: groups.filter((g) => g.status === "ACTIVE").length,
            totalTemplates: templates.length,
            activeTemplates: templates.length,
            totalOrganizations: organizations.length,
            activeOrganizations: organizations.filter((o) => o.status === "ACTIVE")
                .length,
            totalOffers: offers.length,
            offersByTag: {},
            offersByGroup: {},
        };
        offers.forEach((offer) => {
            if (offer.tags) {
                offer.tags.forEach((tagId) => {
                    stats.offersByTag[tagId] = (stats.offersByTag[tagId] || 0) + 1;
                });
            }
        });
        return stats;
    }
    static async createDefaultOrganization(accountId) {
        const categories = await Promise.all([
            this.createCategory({
                accountId,
                name: "E-commerce",
                description: "E-commerce and retail offers",
                order: 1,
            }),
            this.createCategory({
                accountId,
                name: "Finance",
                description: "Financial services and products",
                order: 2,
            }),
            this.createCategory({
                accountId,
                name: "Health & Beauty",
                description: "Health and beauty products",
                order: 3,
            }),
            this.createCategory({
                accountId,
                name: "Technology",
                description: "Technology products and services",
                order: 4,
            }),
        ]);
        const tags = await Promise.all([
            this.createTag({
                accountId,
                name: "High Converting",
                description: "Offers with high conversion rates",
                color: "#10b981",
            }),
            this.createTag({
                accountId,
                name: "New",
                description: "Newly added offers",
                color: "#3b82f6",
            }),
            this.createTag({
                accountId,
                name: "Seasonal",
                description: "Seasonal or time-limited offers",
                color: "#f59e0b",
            }),
            this.createTag({
                accountId,
                name: "Premium",
                description: "Premium or high-value offers",
                color: "#8b5cf6",
            }),
        ]);
        const groups = await Promise.all([
            this.createGroup({
                accountId,
                name: "Holiday Campaigns",
                description: "Offers for holiday seasons",
                offers: [],
            }),
            this.createGroup({
                accountId,
                name: "Top Performers",
                description: "High-performing offers",
                offers: [],
            }),
        ]);
        const templates = await Promise.all([
            this.createTemplate({
                accountId,
                name: "Standard CPA Offer",
                description: "Standard cost-per-action offer template",
                template: {
                    name: "",
                    description: "",
                    categoryId: categories[0].id,
                    tags: [],
                    commissionType: "CPA",
                    commissionRate: 5,
                    payoutType: "FIXED",
                    payoutAmount: 10,
                    requirements: [],
                    restrictions: [],
                    creativeAssets: [],
                    trackingSettings: {
                        clickTracking: true,
                        conversionTracking: true,
                        customParameters: {},
                        attributionWindow: 30,
                        cookieLifetime: 30,
                    },
                    approvalSettings: {
                        requireApproval: true,
                        autoApprove: false,
                        approvalWorkflow: [],
                        requiredDocuments: [],
                    },
                },
                isDefault: true,
            }),
        ]);
        return await this.createOrganization({
            accountId,
            name: "Default Organization",
            description: "Default offer organization structure",
            settings: {
                categories,
                tags,
                groups,
                templates,
            },
        });
    }
    static async getOrganizationDashboard(accountId) {
        const categories = await this.getCategoryTree(accountId);
        const tags = await this.listTags(accountId);
        const groups = await this.listGroups(accountId);
        const templates = await this.listTemplates(accountId);
        const organizations = await this.listOrganizations(accountId);
        const stats = await this.getOrganizationStats(accountId);
        return {
            categories,
            tags,
            groups,
            templates,
            organizations,
            stats,
        };
    }
}
exports.OfferOrganizationModel = OfferOrganizationModel;
//# sourceMappingURL=OfferOrganization.js.map