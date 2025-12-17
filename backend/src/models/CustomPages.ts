import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export class CustomPagesModel {
  static async create(data: Partial<CustomPage>): Promise<CustomPage> {
    return (await (prisma as any).customPage.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        title: data.title!,
        slug: data.slug!,
        description: data.description || "",
        content: data.content!,
        htmlContent: data.htmlContent || "",
        type: data.type!,
        category: data.category || "General",
        status: data.status || "DRAFT",
        visibility: data.visibility || "PUBLIC",
        roles: data.roles || [],
        permissions: data.permissions || [],
        seo: data.seo || {
          metaTitle: data.title!,
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
    })) as CustomPage;
  }

  static async findById(id: string): Promise<CustomPage | null> {
    return (await (prisma as any).customPage.findUnique({
      where: { id },
    })) as CustomPage | null;
  }

  static async findBySlug(
    accountId: string,
    slug: string
  ): Promise<CustomPage | null> {
    return (await (prisma as any).customPage.findFirst({
      where: {
        accountId,
        slug,
        status: "PUBLISHED",
      },
    })) as CustomPage | null;
  }

  static async update(
    id: string,
    data: Partial<CustomPage>
  ): Promise<CustomPage> {
    return (await (prisma as any).customPage.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as CustomPage;
  }

  static async delete(id: string): Promise<void> {
    await (prisma as any).customPage.delete({
      where: { id },
    });
  }

  static async list(
    accountId: string,
    filters: any = {}
  ): Promise<CustomPage[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.visibility) where.visibility = filters.visibility;
    if (filters.parentId !== undefined) where.parentId = filters.parentId;

    return (await (prisma as any).customPage.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    })) as CustomPage[];
  }

  static async getPageTree(
    accountId: string,
    parentId?: string
  ): Promise<CustomPage[]> {
    const pages = await this.list(accountId);
    return this.buildPageTree(pages, parentId);
  }

  private static buildPageTree(
    pages: CustomPage[],
    parentId?: string
  ): CustomPage[] {
    return pages
      .filter((page) => page.parentId === parentId)
      .map((page) => ({
        ...page,
        children: this.buildPageTree(pages, page.id),
      }));
  }

  static async publish(id: string): Promise<CustomPage> {
    const page = await this.findById(id);
    if (!page) {
      throw new Error("Page not found");
    }

    // Create version before publishing
    await this.createVersion(id, page, "Published");

    return await this.update(id, {
      status: "PUBLISHED",
      publishedAt: new Date(),
    });
  }

  static async unpublish(id: string): Promise<CustomPage> {
    return await this.update(id, {
      status: "DRAFT",
      publishedAt: undefined,
    });
  }

  static async archive(id: string): Promise<CustomPage> {
    return await this.update(id, {
      status: "ARCHIVED",
    });
  }

  static async setHomepage(id: string, accountId: string): Promise<CustomPage> {
    // Remove homepage flag from all pages
    await (prisma as any).customPage.updateMany({
      where: { accountId },
      data: { isHomepage: false },
    });

    // Set new homepage
    return await this.update(id, {
      isHomepage: true,
      status: "PUBLISHED",
    });
  }

  static async createVersion(
    pageId: string,
    page: CustomPage,
    changes: string
  ): Promise<PageVersion> {
    const existingVersions = await (prisma as any).pageVersion.count({
      where: { pageId },
    });

    return (await (prisma as any).pageVersion.create({
      data: {
        pageId,
        version: existingVersions + 1,
        title: page.title,
        content: page.content,
        htmlContent: page.htmlContent,
        changes,
        createdBy: "system", // This should be the actual user ID
      },
    })) as PageVersion;
  }

  static async getVersions(pageId: string): Promise<PageVersion[]> {
    return (await (prisma as any).pageVersion.findMany({
      where: { pageId },
      orderBy: { version: "desc" },
    })) as PageVersion[];
  }

  static async restoreVersion(
    pageId: string,
    version: number
  ): Promise<CustomPage> {
    const pageVersion = await (prisma as any).pageVersion.findFirst({
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

  static async createTemplate(
    data: Partial<PageTemplate>
  ): Promise<PageTemplate> {
    return (await (prisma as any).pageTemplate.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        type: data.type!,
        category: data.category || "General",
        template: data.template!,
        isPublic: data.isPublic || false,
        isDefault: data.isDefault || false,
        status: data.status || "ACTIVE",
      },
    })) as PageTemplate;
  }

  static async findTemplateById(id: string): Promise<PageTemplate | null> {
    return (await (prisma as any).pageTemplate.findUnique({
      where: { id },
    })) as PageTemplate | null;
  }

  static async updateTemplate(
    id: string,
    data: Partial<PageTemplate>
  ): Promise<PageTemplate> {
    return (await (prisma as any).pageTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as PageTemplate;
  }

  static async deleteTemplate(id: string): Promise<void> {
    await (prisma as any).pageTemplate.delete({
      where: { id },
    });
  }

  static async listTemplates(
    accountId: string,
    filters: any = {}
  ): Promise<PageTemplate[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await (prisma as any).pageTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    })) as PageTemplate[];
  }

  static async applyTemplate(
    templateId: string,
    accountId: string,
    customizations: any = {}
  ): Promise<CustomPage> {
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const pageData = template.template;
    pageData.accountId = accountId;
    pageData.id = undefined; // Remove ID to create new page
    pageData.slug = await this.generateUniqueSlug(accountId, pageData.slug);
    pageData.status = "DRAFT";
    pageData.isDefault = false;
    pageData.isHomepage = false;

    // Apply customizations
    Object.assign(pageData, customizations);

    return await this.create(pageData);
  }

  private static async generateUniqueSlug(
    accountId: string,
    baseSlug: string
  ): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.findBySlug(accountId, slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  static async addComment(
    pageId: string,
    userId: string,
    content: string,
    parentId?: string,
    ipAddress: string = "127.0.0.1",
    userAgent: string = "System"
  ): Promise<PageComment> {
    return (await (prisma as any).pageComment.create({
      data: {
        pageId,
        parentId,
        userId,
        content,
        status: "PENDING",
        ipAddress,
        userAgent,
      },
    })) as PageComment;
  }

  static async findCommentById(id: string): Promise<PageComment | null> {
    return (await (prisma as any).pageComment.findUnique({
      where: { id },
    })) as PageComment | null;
  }

  static async updateCommentStatus(
    id: string,
    status: string
  ): Promise<PageComment> {
    return (await (prisma as any).pageComment.update({
      where: { id },
      data: {
        status: status as any,
        updatedAt: new Date(),
      },
    })) as PageComment;
  }

  static async deleteComment(id: string): Promise<void> {
    await (prisma as any).pageComment.delete({
      where: { id },
    });
  }

  static async getComments(
    pageId: string,
    filters: any = {}
  ): Promise<PageComment[]> {
    const where: any = { pageId };

    if (filters.status) where.status = filters.status;
    if (filters.parentId !== undefined) where.parentId = filters.parentId;

    return (await (prisma as any).pageComment.findMany({
      where,
      orderBy: { createdAt: "asc" },
    })) as PageComment[];
  }

  static async getCommentTree(pageId: string): Promise<PageComment[]> {
    const comments = await this.getComments(pageId, { status: "APPROVED" });
    return this.buildCommentTree(comments);
  }

  private static buildCommentTree(
    comments: PageComment[],
    parentId?: string
  ): PageComment[] {
    return comments
      .filter((comment) => comment.parentId === parentId)
      .map((comment) => ({
        ...comment,
        replies: this.buildCommentTree(comments, comment.id),
      }));
  }

  static async checkPageAccess(
    pageId: string,
    userId: string,
    userRole: string
  ): Promise<boolean> {
    const page = await this.findById(pageId);
    if (!page) {
      return false;
    }

    // Check if page is published
    if (page.status !== "PUBLISHED") {
      return false;
    }

    // Check visibility
    switch (page.visibility) {
      case "PUBLIC":
        return true;
      case "AUTHENTICATED":
        return !!userId;
      case "ROLE_BASED":
        return page.roles.includes(userRole);
      case "PRIVATE":
        return false; // Private pages require specific permissions
      default:
        return false;
    }
  }

  static async getPageStats(accountId: string): Promise<any> {
    const pages = await this.list(accountId);
    const templates = await this.listTemplates(accountId);

    const stats = {
      totalPages: pages.length,
      publishedPages: pages.filter((p) => p.status === "PUBLISHED").length,
      draftPages: pages.filter((p) => p.status === "DRAFT").length,
      archivedPages: pages.filter((p) => p.status === "ARCHIVED").length,
      totalTemplates: templates.length,
      activeTemplates: templates.filter((t) => t.status === "ACTIVE").length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byVisibility: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    // Count by type, status, visibility, and category
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

  static async createDefaultPages(accountId: string): Promise<CustomPage[]> {
    const defaultPages = [
      {
        name: "Terms of Service",
        title: "Terms of Service",
        slug: "terms-of-service",
        description: "Terms and conditions for using our service",
        content: "Terms of Service content...",
        htmlContent:
          "<h1>Terms of Service</h1><p>Terms of Service content...</p>",
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

    const createdPages: CustomPage[] = [];
    for (const pageData of defaultPages) {
      const page = await this.create({
        accountId,
        ...pageData,
      } as any);
      createdPages.push(page);
    }

    return createdPages;
  }

  static async createDefaultTemplates(
    accountId: string
  ): Promise<PageTemplate[]> {
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
          htmlContent:
            "<h1>Welcome to Our Service</h1><p>Landing page content...</p>",
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

    const createdTemplates: PageTemplate[] = [];
    for (const templateData of defaultTemplates) {
      const template = await this.createTemplate({
        accountId,
        ...templateData,
      } as any);
      createdTemplates.push(template);
    }

    return createdTemplates;
  }

  static async getCustomPagesDashboard(accountId: string): Promise<any> {
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
