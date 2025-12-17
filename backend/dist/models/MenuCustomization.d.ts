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
export declare class MenuCustomizationModel {
    static createMenuItem(data: Partial<MenuItem>): Promise<MenuItem>;
    static findMenuItemById(id: string): Promise<MenuItem | null>;
    static updateMenuItem(id: string, data: Partial<MenuItem>): Promise<MenuItem>;
    static deleteMenuItem(id: string): Promise<void>;
    static listMenuItems(accountId: string, filters?: any): Promise<MenuItem[]>;
    static getMenuTree(accountId: string, parentId?: string): Promise<MenuItem[]>;
    private static buildMenuTree;
    static createMenuStructure(data: Partial<MenuStructure>): Promise<MenuStructure>;
    static findMenuStructureById(id: string): Promise<MenuStructure | null>;
    static findMenuStructureByType(accountId: string, type: string): Promise<MenuStructure | null>;
    static updateMenuStructure(id: string, data: Partial<MenuStructure>): Promise<MenuStructure>;
    static deleteMenuStructure(id: string): Promise<void>;
    static listMenuStructures(accountId: string, filters?: any): Promise<MenuStructure[]>;
    static createMenuTemplate(data: Partial<MenuTemplate>): Promise<MenuTemplate>;
    static findMenuTemplateById(id: string): Promise<MenuTemplate | null>;
    static updateMenuTemplate(id: string, data: Partial<MenuTemplate>): Promise<MenuTemplate>;
    static deleteMenuTemplate(id: string): Promise<void>;
    static listMenuTemplates(accountId: string, filters?: any): Promise<MenuTemplate[]>;
    static applyMenuTemplate(templateId: string, accountId: string): Promise<MenuStructure>;
    static checkMenuPermission(menuItemId: string, userId: string, userRole: string): Promise<boolean>;
    static grantMenuPermission(menuItemId: string, userId?: string, role?: string, permission?: string): Promise<MenuPermission>;
    static revokeMenuPermission(menuItemId: string, userId?: string, role?: string): Promise<void>;
    static getMenuPermissions(menuItemId: string): Promise<MenuPermission[]>;
    static getVisibleMenuItems(accountId: string, userId: string, userRole: string, menuType: string): Promise<MenuItem[]>;
    static reorderMenuItems(accountId: string, itemOrders: Array<{
        id: string;
        order: number;
        parentId?: string;
    }>): Promise<void>;
    static duplicateMenuItem(menuItemId: string, newParentId?: string): Promise<MenuItem>;
    static getMenuStats(accountId: string): Promise<any>;
    static createDefaultMenuStructures(accountId: string): Promise<MenuStructure[]>;
    static getMenuCustomizationDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=MenuCustomization.d.ts.map