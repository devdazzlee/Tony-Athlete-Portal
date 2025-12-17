"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MenuCustomizationModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MenuCustomizationModel {
    static async createMenuItem(data) {
        return (await prisma.menuItem.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                label: data.label,
                type: data.type || "LINK",
                url: data.url,
                icon: data.icon,
                parentId: data.parentId,
                level: data.level || 0,
                order: data.order || 0,
                permissions: data.permissions || [],
                roles: data.roles || [],
                status: data.status || "ACTIVE",
                isVisible: data.isVisible !== undefined ? data.isVisible : true,
                isExternal: data.isExternal || false,
            },
        }));
    }
    static async findMenuItemById(id) {
        return (await prisma.menuItem.findUnique({
            where: { id },
        }));
    }
    static async updateMenuItem(id, data) {
        return (await prisma.menuItem.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteMenuItem(id) {
        const childItems = await prisma.menuItem.findMany({
            where: { parentId: id },
        });
        for (const child of childItems) {
            await this.deleteMenuItem(child.id);
        }
        await prisma.menuItem.delete({
            where: { id },
        });
    }
    static async listMenuItems(accountId, filters = {}) {
        const where = { accountId };
        return (await prisma.menuItem.findMany({
            where,
            orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }],
        }));
    }
    static async getMenuTree(accountId, parentId) {
        const items = await this.listMenuItems(accountId);
        return this.buildMenuTree(items, parentId);
    }
    static buildMenuTree(items, parentId) {
        return items
            .filter((item) => item.parentId === parentId)
            .map((item) => ({
            ...item,
            children: this.buildMenuTree(items, item.id),
        }));
    }
    static async createMenuStructure(data) {
        return (await prisma.menuStructure.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                items: data.items || [],
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findMenuStructureById(id) {
        return (await prisma.menuStructure.findUnique({
            where: { id },
        }));
    }
    static async findMenuStructureByType(accountId, type) {
        return (await prisma.menuStructure.findFirst({
            where: {
                accountId,
                status: "ACTIVE",
            },
        }));
    }
    static async updateMenuStructure(id, data) {
        return (await prisma.menuStructure.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteMenuStructure(id) {
        await prisma.menuStructure.delete({
            where: { id },
        });
    }
    static async listMenuStructures(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        return (await prisma.menuStructure.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createMenuTemplate(data) {
        return (await prisma.menuTemplate.create({
            data: {
                name: data.name,
                description: data.description || "",
                structure: data.structure,
                isDefault: data.isDefault || false,
            },
        }));
    }
    static async findMenuTemplateById(id) {
        return (await prisma.menuTemplate.findUnique({
            where: { id },
        }));
    }
    static async updateMenuTemplate(id, data) {
        return (await prisma.menuTemplate.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteMenuTemplate(id) {
        await prisma.menuTemplate.delete({
            where: { id },
        });
    }
    static async listMenuTemplates(accountId, filters = {}) {
        const where = {};
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.menuTemplate.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async applyMenuTemplate(templateId, accountId) {
        const template = await this.findMenuTemplateById(templateId);
        if (!template) {
            throw new Error("Menu template not found");
        }
        const menuStructure = template.structure;
        menuStructure.accountId = accountId;
        menuStructure.id = undefined;
        return await this.createMenuStructure(menuStructure);
    }
    static async checkMenuPermission(menuItemId, userId, userRole) {
        const menuItem = await this.findMenuItemById(menuItemId);
        if (!menuItem) {
            return false;
        }
        if (menuItem.status !== "ACTIVE" || !menuItem.isVisible) {
            return false;
        }
        if (menuItem.roles.length > 0 && !menuItem.roles.includes(userRole)) {
            return false;
        }
        const rolePermission = await prisma.menuPermission.findFirst({
            where: {
                menuItemId,
                role: userRole,
            },
        });
        return !!rolePermission;
    }
    static async grantMenuPermission(menuItemId, userId, role, permission = "VIEW") {
        return (await prisma.menuPermission.create({
            data: {
                menuItemId,
                role: role,
                permissions: [permission],
            },
        }));
    }
    static async revokeMenuPermission(menuItemId, userId, role) {
        await prisma.menuPermission.deleteMany({
            where: {
                menuItemId,
                role,
            },
        });
    }
    static async getMenuPermissions(menuItemId) {
        return (await prisma.menuPermission.findMany({
            where: { menuItemId },
        }));
    }
    static async getVisibleMenuItems(accountId, userId, userRole, menuType) {
        const menuStructure = await this.findMenuStructureByType(accountId, menuType);
        if (!menuStructure) {
            return [];
        }
        const allItems = await this.listMenuItems(accountId);
        const visibleItems = [];
        for (const item of allItems) {
            const hasPermission = await this.checkMenuPermission(item.id, userId, userRole);
            if (hasPermission) {
                visibleItems.push(item);
            }
        }
        return this.buildMenuTree(visibleItems);
    }
    static async reorderMenuItems(accountId, itemOrders) {
        for (const itemOrder of itemOrders) {
            await this.updateMenuItem(itemOrder.id, {
                order: itemOrder.order,
                parentId: itemOrder.parentId,
            });
        }
    }
    static async duplicateMenuItem(menuItemId, newParentId) {
        const originalItem = await this.findMenuItemById(menuItemId);
        if (!originalItem) {
            throw new Error("Menu item not found");
        }
        const newItem = await this.createMenuItem({
            accountId: originalItem.accountId,
            name: `${originalItem.name}_copy`,
            label: `${originalItem.label} (Copy)`,
            type: originalItem.type,
            url: originalItem.url,
            icon: originalItem.icon,
            parentId: newParentId || originalItem.parentId,
            level: originalItem.level,
            order: originalItem.order + 1,
            permissions: originalItem.permissions,
            roles: originalItem.roles,
            status: "INACTIVE",
            isVisible: originalItem.isVisible,
            isExternal: originalItem.isExternal,
        });
        const childItems = await this.listMenuItems(originalItem.accountId, {
            parentId: menuItemId,
        });
        for (const child of childItems) {
            await this.duplicateMenuItem(child.id, newItem.id);
        }
        return newItem;
    }
    static async getMenuStats(accountId) {
        const menuItems = await this.listMenuItems(accountId);
        const menuStructures = await this.listMenuStructures(accountId);
        const menuTemplates = await this.listMenuTemplates(accountId);
        const stats = {
            totalMenuItems: menuItems.length,
            activeMenuItems: menuItems.filter((item) => item.status === "ACTIVE")
                .length,
            totalMenuStructures: menuStructures.length,
            activeMenuStructures: menuStructures.filter((structure) => structure.status === "ACTIVE").length,
            totalMenuTemplates: menuTemplates.length,
            activeMenuTemplates: menuTemplates.filter((template) => template.isDefault).length,
            byType: {},
            byLevel: {},
            byStatus: {},
        };
        menuItems.forEach((item) => {
            stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
            stats.byLevel[item.level.toString()] =
                (stats.byLevel[item.level.toString()] || 0) + 1;
            stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
        });
        return stats;
    }
    static async createDefaultMenuStructures(accountId) {
        const adminMenuItems = [
            {
                id: "admin-dashboard",
                accountId,
                name: "dashboard",
                label: "Dashboard",
                type: "LINK",
                url: "/admin/dashboard",
                icon: "home",
                level: 0,
                order: 1,
                permissions: [],
                roles: ["ADMIN", "MANAGER"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "admin-affiliates",
                accountId,
                name: "affiliates",
                label: "Affiliates",
                type: "DROPDOWN",
                icon: "users",
                level: 0,
                order: 2,
                permissions: [],
                roles: ["ADMIN", "MANAGER"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "admin-offers",
                accountId,
                name: "offers",
                label: "Offers",
                type: "DROPDOWN",
                icon: "target",
                level: 0,
                order: 3,
                permissions: [],
                roles: ["ADMIN", "MANAGER"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "admin-reports",
                accountId,
                name: "reports",
                label: "Reports",
                type: "DROPDOWN",
                icon: "bar-chart",
                level: 0,
                order: 4,
                permissions: [],
                roles: ["ADMIN", "MANAGER"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "admin-settings",
                accountId,
                name: "settings",
                label: "Settings",
                type: "DROPDOWN",
                icon: "settings",
                level: 0,
                order: 5,
                permissions: [],
                roles: ["ADMIN"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        const affiliateMenuItems = [
            {
                id: "affiliate-dashboard",
                accountId,
                name: "dashboard",
                label: "Dashboard",
                type: "LINK",
                url: "/dashboard",
                icon: "home",
                level: 0,
                order: 1,
                permissions: [],
                roles: ["AFFILIATE"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "affiliate-statistics",
                accountId,
                name: "statistics",
                label: "Statistics",
                type: "DROPDOWN",
                icon: "trending-up",
                level: 0,
                order: 2,
                permissions: [],
                roles: ["AFFILIATE"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "affiliate-links",
                accountId,
                name: "links",
                label: "My Links & Assets",
                type: "DROPDOWN",
                icon: "link",
                level: 0,
                order: 3,
                permissions: [],
                roles: ["AFFILIATE"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "affiliate-commissions",
                accountId,
                name: "commissions",
                label: "Commissions & Payouts",
                type: "DROPDOWN",
                icon: "dollar-sign",
                level: 0,
                order: 4,
                permissions: [],
                roles: ["AFFILIATE"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "affiliate-resources",
                accountId,
                name: "resources",
                label: "Resources & Support",
                type: "DROPDOWN",
                icon: "help-circle",
                level: 0,
                order: 5,
                permissions: [],
                roles: ["AFFILIATE"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: "affiliate-account",
                accountId,
                name: "account",
                label: "Account Settings",
                type: "DROPDOWN",
                icon: "user",
                level: 0,
                order: 6,
                permissions: [],
                roles: ["AFFILIATE"],
                status: "ACTIVE",
                isVisible: true,
                isExternal: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        const createdStructures = [];
        const adminStructure = await this.createMenuStructure({
            accountId,
            name: "Admin Menu",
            items: adminMenuItems,
        });
        createdStructures.push(adminStructure);
        const affiliateStructure = await this.createMenuStructure({
            accountId,
            name: "Affiliate Menu",
            items: affiliateMenuItems,
        });
        createdStructures.push(affiliateStructure);
        return createdStructures;
    }
    static async getMenuCustomizationDashboard(accountId) {
        const menuItems = await this.getMenuTree(accountId);
        const menuStructures = await this.listMenuStructures(accountId);
        const menuTemplates = await this.listMenuTemplates(accountId);
        const stats = await this.getMenuStats(accountId);
        return {
            menuItems,
            menuStructures,
            menuTemplates,
            stats,
        };
    }
}
exports.MenuCustomizationModel = MenuCustomizationModel;
//# sourceMappingURL=MenuCustomization.js.map