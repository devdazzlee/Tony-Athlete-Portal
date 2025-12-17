export interface CustomPage {
    id: string;
    accountId: string;
    name: string;
    title: string;
    slug: string;
    description: string;
    content: string;
    htmlContent: string;
    type: "LANDING" | "TERMS" | "PRIVACY" | "HELP" | "FAQ" | "CUSTOM";
    category: string;
    status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
    visibility: "PUBLIC" | "PRIVATE" | "AUTHENTICATED" | "ROLE_BASED";
    roles: string[];
    permissions: string[];
    seo: SEOSettings;
    design: DesignSettings;
    settings: PageSettings;
    isHomepage: boolean;
    isDefault: boolean;
    parentId?: string;
    order: number;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface SEOSettings {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string[];
    canonicalUrl?: string;
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    twitterCard?: string;
    robots: string;
    sitemap: boolean;
}
export interface DesignSettings {
    layout: "DEFAULT" | "CUSTOM" | "LANDING" | "BLOG";
    theme: "LIGHT" | "DARK" | "CUSTOM";
    colors: {
        primary: string;
        secondary: string;
        accent: string;
        background: string;
        text: string;
    };
    fonts: {
        heading: string;
        body: string;
        size: string;
    };
    spacing: {
        padding: number;
        margin: number;
        gap: number;
    };
    customCss?: string;
    customJs?: string;
}
export interface PageSettings {
    showBreadcrumbs: boolean;
    showSidebar: boolean;
    showComments: boolean;
    allowComments: boolean;
    showShareButtons: boolean;
    showPrintButton: boolean;
    showLastUpdated: boolean;
    showAuthor: boolean;
    showReadingTime: boolean;
    customFields: Record<string, any>;
}
export interface PageTemplate {
    id: string;
    accountId: string;
    name: string;
    description: string;
    type: string;
    category: string;
    template: CustomPage;
    isPublic: boolean;
    isDefault: boolean;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface PageVersion {
    id: string;
    pageId: string;
    version: number;
    title: string;
    content: string;
    htmlContent: string;
    changes: string;
    createdBy: string;
    createdAt: Date;
}
export interface PageComment {
    id: string;
    pageId: string;
    parentId?: string;
    userId: string;
    content: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "SPAM";
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare class CustomPagesModel {
    static create(data: Partial<CustomPage>): Promise<CustomPage>;
    static findById(id: string): Promise<CustomPage | null>;
    static findBySlug(accountId: string, slug: string): Promise<CustomPage | null>;
    static update(id: string, data: Partial<CustomPage>): Promise<CustomPage>;
    static delete(id: string): Promise<void>;
    static list(accountId: string, filters?: any): Promise<CustomPage[]>;
    static getPageTree(accountId: string, parentId?: string): Promise<CustomPage[]>;
    private static buildPageTree;
    static publish(id: string): Promise<CustomPage>;
    static unpublish(id: string): Promise<CustomPage>;
    static archive(id: string): Promise<CustomPage>;
    static setHomepage(id: string, accountId: string): Promise<CustomPage>;
    static createVersion(pageId: string, page: CustomPage, changes: string): Promise<PageVersion>;
    static getVersions(pageId: string): Promise<PageVersion[]>;
    static restoreVersion(pageId: string, version: number): Promise<CustomPage>;
    static createTemplate(data: Partial<PageTemplate>): Promise<PageTemplate>;
    static findTemplateById(id: string): Promise<PageTemplate | null>;
    static updateTemplate(id: string, data: Partial<PageTemplate>): Promise<PageTemplate>;
    static deleteTemplate(id: string): Promise<void>;
    static listTemplates(accountId: string, filters?: any): Promise<PageTemplate[]>;
    static applyTemplate(templateId: string, accountId: string, customizations?: any): Promise<CustomPage>;
    private static generateUniqueSlug;
    static addComment(pageId: string, userId: string, content: string, parentId?: string, ipAddress?: string, userAgent?: string): Promise<PageComment>;
    static findCommentById(id: string): Promise<PageComment | null>;
    static updateCommentStatus(id: string, status: string): Promise<PageComment>;
    static deleteComment(id: string): Promise<void>;
    static getComments(pageId: string, filters?: any): Promise<PageComment[]>;
    static getCommentTree(pageId: string): Promise<PageComment[]>;
    private static buildCommentTree;
    static checkPageAccess(pageId: string, userId: string, userRole: string): Promise<boolean>;
    static getPageStats(accountId: string): Promise<any>;
    static createDefaultPages(accountId: string): Promise<CustomPage[]>;
    static createDefaultTemplates(accountId: string): Promise<PageTemplate[]>;
    static getCustomPagesDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=CustomPages.d.ts.map