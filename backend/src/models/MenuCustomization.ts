import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface MenuItem {
  id: string;
  accountId: string;
  name: string;
  label: string;
  type: string;
  url?: string;
  icon?: string;
  parentId?: string;
  level: number;
  order: number;
  permissions: string[];
  roles: string[];
  status: string;
  isVisible: boolean;
  isExternal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuStructure {
  id: string;
  accountId: string;
  name: string;
  items: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuSettings {
  theme: "DEFAULT" | "DARK" | "LIGHT" | "CUSTOM";
  position: "TOP" | "SIDE" | "BOTTOM" | "FLOATING";
  style: "HORIZONTAL" | "VERTICAL" | "ACCORDION" | "TABS";
  animation: "NONE" | "FADE" | "SLIDE" | "BOUNCE";
  responsive: boolean;
  mobileBreakpoint: number;
  customCss?: string;
  customJs?: string;
}

export interface MenuTemplate {
  id: string;
  name: string;
  description: string;
  structure: any;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MenuPermission {
  id: string;
  menuItemId: string;
  role: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export class MenuCustomizationModel {
  static async createMenuItem(data: Partial<MenuItem>): Promise<MenuItem> {
    return (await prisma.menuItem.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        label: data.label!,
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
    })) as MenuItem;
  }

  static async findMenuItemById(id: string): Promise<MenuItem | null> {
    return (await prisma.menuItem.findUnique({
      where: { id },
    })) as MenuItem | null;
  }

  static async updateMenuItem(
    id: string,
    data: Partial<MenuItem>
  ): Promise<MenuItem> {
    return (await prisma.menuItem.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as MenuItem;
  }

  static async deleteMenuItem(id: string): Promise<void> {
    // Delete child items first
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

  static async listMenuItems(
    accountId: string,
    filters: any = {}
  ): Promise<MenuItem[]> {
    const where: any = { accountId };

    return (await prisma.menuItem.findMany({
      where,
      orderBy: [{ level: "asc" }, { order: "asc" }, { name: "asc" }],
    })) as MenuItem[];
  }

  static async getMenuTree(
    accountId: string,
    parentId?: string
  ): Promise<MenuItem[]> {
    const items = await this.listMenuItems(accountId);
    return this.buildMenuTree(items, parentId);
  }

  private static buildMenuTree(
    items: MenuItem[],
    parentId?: string
  ): MenuItem[] {
    return items
      .filter((item) => item.parentId === parentId)
      .map((item) => ({
        ...item,
        children: this.buildMenuTree(items, item.id),
      }));
  }

  static async createMenuStructure(
    data: Partial<MenuStructure>
  ): Promise<MenuStructure> {
    return (await prisma.menuStructure.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        items: data.items || [],
        status: data.status || "ACTIVE",
      },
    })) as MenuStructure;
  }

  static async findMenuStructureById(
    id: string
  ): Promise<MenuStructure | null> {
    return (await prisma.menuStructure.findUnique({
      where: { id },
    })) as MenuStructure | null;
  }

  static async findMenuStructureByType(
    accountId: string,
    type: string
  ): Promise<MenuStructure | null> {
    return (await prisma.menuStructure.findFirst({
      where: {
        accountId,
        status: "ACTIVE",
      },
    })) as MenuStructure | null;
  }

  static async updateMenuStructure(
    id: string,
    data: Partial<MenuStructure>
  ): Promise<MenuStructure> {
    return (await prisma.menuStructure.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as MenuStructure;
  }

  static async deleteMenuStructure(id: string): Promise<void> {
    await prisma.menuStructure.delete({
      where: { id },
    });
  }

  static async listMenuStructures(
    accountId: string,
    filters: any = {}
  ): Promise<MenuStructure[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;

    return (await prisma.menuStructure.findMany({
      where,
      orderBy: { name: "asc" },
    })) as MenuStructure[];
  }

  static async createMenuTemplate(
    data: Partial<MenuTemplate>
  ): Promise<MenuTemplate> {
    return (await prisma.menuTemplate.create({
      data: {
        name: data.name!,
        description: data.description || "",
        structure: data.structure!,
        isDefault: data.isDefault || false,
      },
    })) as MenuTemplate;
  }

  static async findMenuTemplateById(id: string): Promise<MenuTemplate | null> {
    return (await prisma.menuTemplate.findUnique({
      where: { id },
    })) as MenuTemplate | null;
  }

  static async updateMenuTemplate(
    id: string,
    data: Partial<MenuTemplate>
  ): Promise<MenuTemplate> {
    return (await prisma.menuTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as MenuTemplate;
  }

  static async deleteMenuTemplate(id: string): Promise<void> {
    await prisma.menuTemplate.delete({
      where: { id },
    });
  }

  static async listMenuTemplates(
    accountId: string,
    filters: any = {}
  ): Promise<MenuTemplate[]> {
    const where: any = {};

    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await prisma.menuTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    })) as MenuTemplate[];
  }

  static async applyMenuTemplate(
    templateId: string,
    accountId: string
  ): Promise<MenuStructure> {
    const template = await this.findMenuTemplateById(templateId);
    if (!template) {
      throw new Error("Menu template not found");
    }

    const menuStructure = template.structure;
    menuStructure.accountId = accountId;
    menuStructure.id = undefined; // Remove ID to create new structure

    return await this.createMenuStructure(menuStructure);
  }

  static async checkMenuPermission(
    menuItemId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    const menuItem = await this.findMenuItemById(menuItemId);
    if (!menuItem) {
      return false;
    }

    // Check if menu item is active and visible
    if (menuItem.status !== "ACTIVE" || !menuItem.isVisible) {
      return false;
    }

    // Check role-based permissions
    if (menuItem.roles.length > 0 && !menuItem.roles.includes(userRole)) {
      return false;
    }

    // Check role-based permissions
    const rolePermission = await prisma.menuPermission.findFirst({
      where: {
        menuItemId,
        role: userRole,
      },
    });

    return !!rolePermission;
  }

  static async grantMenuPermission(
    menuItemId: string,
    userId?: string,
    role?: string,
    permission: string = "VIEW"
  ): Promise<MenuPermission> {
    return (await prisma.menuPermission.create({
      data: {
        menuItemId,
        role: role!,
        permissions: [permission],
      },
    })) as MenuPermission;
  }

  static async revokeMenuPermission(
    menuItemId: string,
    userId?: string,
    role?: string
  ): Promise<void> {
    await prisma.menuPermission.deleteMany({
      where: {
        menuItemId,
        role,
      },
    });
  }

  static async getMenuPermissions(
    menuItemId: string
  ): Promise<MenuPermission[]> {
    return (await prisma.menuPermission.findMany({
      where: { menuItemId },
    })) as MenuPermission[];
  }

  static async getVisibleMenuItems(
    accountId: string,
    userId: string,
    userRole: string,
    menuType: string
  ): Promise<MenuItem[]> {
    const menuStructure = await this.findMenuStructureByType(
      accountId,
      menuType
    );
    if (!menuStructure) {
      return [];
    }

    const allItems = await this.listMenuItems(accountId);
    const visibleItems: MenuItem[] = [];

    for (const item of allItems) {
      const hasPermission = await this.checkMenuPermission(
        item.id,
        userId,
        userRole
      );
      if (hasPermission) {
        visibleItems.push(item);
      }
    }

    return this.buildMenuTree(visibleItems);
  }

  static async reorderMenuItems(
    accountId: string,
    itemOrders: Array<{ id: string; order: number; parentId?: string }>
  ): Promise<void> {
    for (const itemOrder of itemOrders) {
      await this.updateMenuItem(itemOrder.id, {
        order: itemOrder.order,
        parentId: itemOrder.parentId,
      });
    }
  }

  static async duplicateMenuItem(
    menuItemId: string,
    newParentId?: string
  ): Promise<MenuItem> {
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
      status: "INACTIVE", // Start as inactive
      isVisible: originalItem.isVisible,
      isExternal: originalItem.isExternal,
    });

    // Duplicate child items
    const childItems = await this.listMenuItems(originalItem.accountId, {
      parentId: menuItemId,
    });
    for (const child of childItems) {
      await this.duplicateMenuItem(child.id, newItem.id);
    }

    return newItem;
  }

  static async getMenuStats(accountId: string): Promise<any> {
    const menuItems = await this.listMenuItems(accountId);
    const menuStructures = await this.listMenuStructures(accountId);
    const menuTemplates = await this.listMenuTemplates(accountId);

    const stats = {
      totalMenuItems: menuItems.length,
      activeMenuItems: menuItems.filter((item) => item.status === "ACTIVE")
        .length,
      totalMenuStructures: menuStructures.length,
      activeMenuStructures: menuStructures.filter(
        (structure) => structure.status === "ACTIVE"
      ).length,
      totalMenuTemplates: menuTemplates.length,
      activeMenuTemplates: menuTemplates.filter(
        (template) => template.isDefault
      ).length,
      byType: {} as Record<string, number>,
      byLevel: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    // Count by type, level, and status
    menuItems.forEach((item) => {
      stats.byType[item.type] = (stats.byType[item.type] || 0) + 1;
      stats.byLevel[item.level.toString()] =
        (stats.byLevel[item.level.toString()] || 0) + 1;
      stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
    });

    return stats;
  }

  static async createDefaultMenuStructures(
    accountId: string
  ): Promise<MenuStructure[]> {
    const adminMenuItems: MenuItem[] = [
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

    const affiliateMenuItems: MenuItem[] = [
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

    const createdStructures: MenuStructure[] = [];

    // Create admin menu structure
    const adminStructure = await this.createMenuStructure({
      accountId,
      name: "Admin Menu",
      items: adminMenuItems,
    });
    createdStructures.push(adminStructure);

    // Create affiliate menu structure
    const affiliateStructure = await this.createMenuStructure({
      accountId,
      name: "Affiliate Menu",
      items: affiliateMenuItems,
    });
    createdStructures.push(affiliateStructure);

    return createdStructures;
  }

  static async getMenuCustomizationDashboard(accountId: string): Promise<any> {
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
