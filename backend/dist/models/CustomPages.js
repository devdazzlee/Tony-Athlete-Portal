"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomPagesModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CustomPagesModel {
    static async create(data) {
        return (await prisma.customPage.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                title: data.title,
                slug: data.slug,
                description: data.description || "",
                content: data.content,
                htmlContent: data.htmlContent || "",
                type: data.type,
                category: data.category || "General",
                status: data.status || "DRAFT",
                visibility: data.visibility || "PUBLIC",
                roles: data.roles || [],
                permissions: data.permissions || [],
                seo: data.seo || {
                    metaTitle: data.title,
                    metaDescription: data.description || "",
                    metaKeywords: [],
                    robots: "index, follow",
                    sitemap: true,
                },
                design: data.design || {
                    layout: "DEFAULT",
                    theme: "LIGHT",
                    colors: {
                        primary: "#3b82f6",
                        secondary: "#10b981",
                        accent: "#f59e0b",
                        background: "#ffffff",
                        text: "#1f2937",
                    },
                    fonts: {
                        heading: "Inter",
                        body: "Inter",
                        size: "16px",
                    },
                    spacing: {
                        padding: 16,
                        margin: 16,
                        gap: 16,
                    },
                },
                settings: data.settings || {
                    showBreadcrumbs: true,
                    showSidebar: false,
                    showComments: false,
                    allowComments: false,
                    showShareButtons: false,
                    showPrintButton: false,
                    showLastUpdated: true,
                    showAuthor: false,
                    showReadingTime: false,
                    customFields: {},
                },
                isHomepage: data.isHomepage || false,
                isDefault: data.isDefault || false,
                parentId: data.parentId,
                order: data.order || 0,
            },
        }));
    }
    static async findById(id) {
        return (await prisma.customPage.findUnique({
            where: { id },
        }));
    }
    static async findBySlug(accountId, slug) {
        return (await prisma.customPage.findFirst({
            where: {
                accountId,
                slug,
                status: "PUBLISHED",
            },
        }));
    }
    static async update(id, data) {
        return (await prisma.customPage.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.customPage.delete({
            where: { id },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.category)
            where.category = filters.category;
        if (filters.visibility)
            where.visibility = filters.visibility;
        if (filters.parentId !== undefined)
            where.parentId = filters.parentId;
        return (await prisma.customPage.findMany({
            where,
            orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        }));
    }
    static async getPageTree(accountId, parentId) {
        const pages = await this.list(accountId);
        return this.buildPageTree(pages, parentId);
    }
    static buildPageTree(pages, parentId) {
        return pages
            .filter((page) => page.parentId === parentId)
            .map((page) => ({
            ...page,
            children: this.buildPageTree(pages, page.id),
        }));
    }
    static async publish(id) {
        const page = await this.findById(id);
        if (!page) {
            throw new Error("Page not found");
        }
        await this.createVersion(id, page, "Published");
        return await this.update(id, {
            status: "PUBLISHED",
            publishedAt: new Date(),
        });
    }
    static async unpublish(id) {
        return await this.update(id, {
            status: "DRAFT",
            publishedAt: undefined,
        });
    }
    static async archive(id) {
        return await this.update(id, {
            status: "ARCHIVED",
        });
    }
    static async setHomepage(id, accountId) {
        await prisma.customPage.updateMany({
            where: { accountId },
            data: { isHomepage: false },
        });
        return await this.update(id, {
            isHomepage: true,
            status: "PUBLISHED",
        });
    }
    static async createVersion(pageId, page, changes) {
        const existingVersions = await prisma.pageVersion.count({
            where: { pageId },
        });
        return (await prisma.pageVersion.create({
            data: {
                pageId,
                version: existingVersions + 1,
                title: page.title,
                content: page.content,
                htmlContent: page.htmlContent,
                changes,
                createdBy: "system",
            },
        }));
    }
    static async getVersions(pageId) {
        return (await prisma.pageVersion.findMany({
            where: { pageId },
            orderBy: { version: "desc" },
        }));
    }
    static async restoreVersion(pageId, version) {
        const pageVersion = await prisma.pageVersion.findFirst({
            where: { pageId, version },
        });
        if (!pageVersion) {
            throw new Error("Version not found");
        }
        return await this.update(pageId, {
            title: pageVersion.title,
            content: pageVersion.content,
            htmlContent: pageVersion.htmlContent,
        });
    }
    static async createTemplate(data) {
        return (await prisma.pageTemplate.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                category: data.category || "General",
                template: data.template,
                isPublic: data.isPublic || false,
                isDefault: data.isDefault || false,
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findTemplateById(id) {
        return (await prisma.pageTemplate.findUnique({
            where: { id },
        }));
    }
    static async updateTemplate(id, data) {
        return (await prisma.pageTemplate.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteTemplate(id) {
        await prisma.pageTemplate.delete({
            where: { id },
        });
    }
    static async listTemplates(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.category)
            where.category = filters.category;
        if (filters.isPublic !== undefined)
            where.isPublic = filters.isPublic;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.pageTemplate.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async applyTemplate(templateId, accountId, customizations = {}) {
        const template = await this.findTemplateById(templateId);
        if (!template) {
            throw new Error("Template not found");
        }
        const pageData = template.template;
        pageData.accountId = accountId;
        pageData.id = undefined;
        pageData.slug = await this.generateUniqueSlug(accountId, pageData.slug);
        pageData.status = "DRAFT";
        pageData.isDefault = false;
        pageData.isHomepage = false;
        Object.assign(pageData, customizations);
        return await this.create(pageData);
    }
    static async generateUniqueSlug(accountId, baseSlug) {
        let slug = baseSlug;
        let counter = 1;
        while (await this.findBySlug(accountId, slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
        }
        return slug;
    }
    static async addComment(pageId, userId, content, parentId, ipAddress = "127.0.0.1", userAgent = "System") {
        return (await prisma.pageComment.create({
            data: {
                pageId,
                parentId,
                userId,
                content,
                status: "PENDING",
                ipAddress,
                userAgent,
            },
        }));
    }
    static async findCommentById(id) {
        return (await prisma.pageComment.findUnique({
            where: { id },
        }));
    }
    static async updateCommentStatus(id, status) {
        return (await prisma.pageComment.update({
            where: { id },
            data: {
                status: status,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteComment(id) {
        await prisma.pageComment.delete({
            where: { id },
        });
    }
    static async getComments(pageId, filters = {}) {
        const where = { pageId };
        if (filters.status)
            where.status = filters.status;
        if (filters.parentId !== undefined)
            where.parentId = filters.parentId;
        return (await prisma.pageComment.findMany({
            where,
            orderBy: { createdAt: "asc" },
        }));
    }
    static async getCommentTree(pageId) {
        const comments = await this.getComments(pageId, { status: "APPROVED" });
        return this.buildCommentTree(comments);
    }
    static buildCommentTree(comments, parentId) {
        return comments
            .filter((comment) => comment.parentId === parentId)
            .map((comment) => ({
            ...comment,
            replies: this.buildCommentTree(comments, comment.id),
        }));
    }
    static async checkPageAccess(pageId, userId, userRole) {
        const page = await this.findById(pageId);
        if (!page) {
            return false;
        }
        if (page.status !== "PUBLISHED") {
            return false;
        }
        switch (page.visibility) {
            case "PUBLIC":
                return true;
            case "AUTHENTICATED":
                return !!userId;
            case "ROLE_BASED":
                return page.roles.includes(userRole);
            case "PRIVATE":
                return false;
            default:
                return false;
        }
    }
    static async getPageStats(accountId) {
        const pages = await this.list(accountId);
        const templates = await this.listTemplates(accountId);
        const stats = {
            totalPages: pages.length,
            publishedPages: pages.filter((p) => p.status === "PUBLISHED").length,
            draftPages: pages.filter((p) => p.status === "DRAFT").length,
            archivedPages: pages.filter((p) => p.status === "ARCHIVED").length,
            totalTemplates: templates.length,
            activeTemplates: templates.filter((t) => t.status === "ACTIVE").length,
            byType: {},
            byStatus: {},
            byVisibility: {},
            byCategory: {},
        };
        pages.forEach((page) => {
            stats.byType[page.type] = (stats.byType[page.type] || 0) + 1;
            stats.byStatus[page.status] = (stats.byStatus[page.status] || 0) + 1;
            stats.byVisibility[page.visibility] =
                (stats.byVisibility[page.visibility] || 0) + 1;
            stats.byCategory[page.category] =
                (stats.byCategory[page.category] || 0) + 1;
        });
        return stats;
    }
    static async createDefaultPages(accountId) {
        const defaultPages = [
            {
                name: "Terms of Service",
                title: "Terms of Service",
                slug: "terms-of-service",
                description: "Terms and conditions for using our service",
                content: "Terms of Service content...",
                htmlContent: "<h1>Terms of Service</h1><p>Terms of Service content...</p>",
                type: "TERMS",
                category: "Legal",
                status: "PUBLISHED",
                visibility: "PUBLIC",
                isDefault: true,
            },
            {
                name: "Privacy Policy",
                title: "Privacy Policy",
                slug: "privacy-policy",
                description: "Privacy policy and data protection information",
                content: "Privacy Policy content...",
                htmlContent: "<h1>Privacy Policy</h1><p>Privacy Policy content...</p>",
                type: "PRIVACY",
                category: "Legal",
                status: "PUBLISHED",
                visibility: "PUBLIC",
                isDefault: true,
            },
            {
                name: "Help Center",
                title: "Help Center",
                slug: "help",
                description: "Help and support information",
                content: "Help Center content...",
                htmlContent: "<h1>Help Center</h1><p>Help Center content...</p>",
                type: "HELP",
                category: "Support",
                status: "PUBLISHED",
                visibility: "PUBLIC",
                isDefault: true,
            },
            {
                name: "FAQ",
                title: "Frequently Asked Questions",
                slug: "faq",
                description: "Common questions and answers",
                content: "FAQ content...",
                htmlContent: "<h1>Frequently Asked Questions</h1><p>FAQ content...</p>",
                type: "FAQ",
                category: "Support",
                status: "PUBLISHED",
                visibility: "PUBLIC",
                isDefault: true,
            },
        ];
        const createdPages = [];
        for (const pageData of defaultPages) {
            const page = await this.create({
                accountId,
                ...pageData,
            });
            createdPages.push(page);
        }
        return createdPages;
    }
    static async createDefaultTemplates(accountId) {
        const defaultTemplates = [
            {
                name: "Landing Page Template",
                description: "Template for landing pages",
                type: "LANDING",
                category: "Marketing",
                template: {
                    id: "template-landing",
                    accountId,
                    name: "Landing Page",
                    title: "Welcome to Our Service",
                    slug: "landing-page",
                    description: "A compelling landing page template",
                    content: "Landing page content...",
                    htmlContent: "<h1>Welcome to Our Service</h1><p>Landing page content...</p>",
                    type: "LANDING",
                    category: "Marketing",
                    status: "DRAFT",
                    visibility: "PUBLIC",
                    seo: {
                        metaTitle: "Welcome to Our Service",
                        metaDescription: "A compelling landing page template",
                        metaKeywords: ["landing", "page", "template"],
                        robots: "index, follow",
                        sitemap: true,
                    },
                    design: {
                        layout: "LANDING",
                        theme: "LIGHT",
                        colors: {
                            primary: "#3b82f6",
                            secondary: "#10b981",
                            accent: "#f59e0b",
                            background: "#ffffff",
                            text: "#1f2937",
                        },
                        fonts: {
                            heading: "Inter",
                            body: "Inter",
                            size: "16px",
                        },
                        spacing: {
                            padding: 16,
                            margin: 16,
                            gap: 16,
                        },
                    },
                    settings: {
                        showBreadcrumbs: false,
                        showSidebar: false,
                        showComments: false,
                        allowComments: false,
                        showShareButtons: true,
                        showPrintButton: false,
                        showLastUpdated: false,
                        showAuthor: false,
                        showReadingTime: false,
                        customFields: {},
                    },
                    isHomepage: false,
                    isDefault: false,
                    order: 0,
                },
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
    static async getCustomPagesDashboard(accountId) {
        const pages = await this.getPageTree(accountId);
        const templates = await this.listTemplates(accountId);
        const stats = await this.getPageStats(accountId);
        return {
            pages,
            templates,
            stats,
        };
    }
}
exports.CustomPagesModel = CustomPagesModel;
//# sourceMappingURL=CustomPages.js.map