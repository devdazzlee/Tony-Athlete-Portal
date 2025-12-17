import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface OfferCategory {
  id: string;
  accountId: string;
  name: string;
  description: string;
  order: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferTag {
  id: string;
  accountId: string;
  name: string;
  color: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferGroup {
  id: string;
  accountId: string;
  name: string;
  description: string;
  offers: string[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface GroupCriteria {
  categories?: string[];
  tags?: string[];
  countries?: string[];
  devices?: string[];
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  customRules?: CustomRule[];
}

export interface CustomRule {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "IN"
    | "NOT_IN";
  value: any;
  logic: "AND" | "OR";
}

export interface OfferTemplate {
  id: string;
  accountId: string;
  name: string;
  description: string;
  template: any;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OfferTemplateData {
  name: string;
  description: string;
  categoryId: string;
  tags: string[];
  commissionType: string;
  commissionRate: number;
  payoutType: string;
  payoutAmount: number;
  requirements: string[];
  restrictions: string[];
  creativeAssets: CreativeAsset[];
  trackingSettings: TrackingSettings;
  approvalSettings: ApprovalSettings;
}

export interface CreativeAsset {
  id: string;
  type: "BANNER" | "LOGO" | "TEXT" | "VIDEO" | "AUDIO" | "DOCUMENT";
  name: string;
  url: string;
  size: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  alt: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface TrackingSettings {
  clickTracking: boolean;
  conversionTracking: boolean;
  postbackUrl?: string;
  customParameters: Record<string, string>;
  attributionWindow: number;
  cookieLifetime: number;
}

export interface ApprovalSettings {
  requireApproval: boolean;
  autoApprove: boolean;
  approvalWorkflow: string[];
  requiredDocuments: string[];
}

export interface OfferOrganization {
  id: string;
  accountId: string;
  name: string;
  description: string;
  settings: any;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface OrganizationStructure {
  categories: OfferCategory[];
  tags: OfferTag[];
  groups: OfferGroup[];
  templates: OfferTemplate[];
}

export interface OrganizationRule {
  id: string;
  name: string;
  description: string;
  type:
    | "AUTO_CATEGORIZE"
    | "AUTO_TAG"
    | "AUTO_GROUP"
    | "VALIDATION"
    | "APPROVAL";
  conditions: RuleCondition[];
  actions: RuleAction[];
  priority: number;
  enabled: boolean;
}

export interface RuleCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "IN"
    | "NOT_IN";
  value: any;
  logic: "AND" | "OR";
}

export interface RuleAction {
  type:
    | "ASSIGN_CATEGORY"
    | "ADD_TAG"
    | "ADD_TO_GROUP"
    | "VALIDATE"
    | "REQUIRE_APPROVAL"
    | "AUTO_APPROVE";
  parameters: Record<string, any>;
  enabled: boolean;
}

export class OfferOrganizationModel {
  static async createCategory(
    data: Partial<OfferCategory>
  ): Promise<OfferCategory> {
    return (await prisma.offerCategory.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        order: data.order || 0,
      },
    })) as OfferCategory;
  }

  static async findCategoryById(id: string): Promise<OfferCategory | null> {
    return (await prisma.offerCategory.findUnique({
      where: { id },
    })) as OfferCategory | null;
  }

  static async updateCategory(
    id: string,
    data: Partial<OfferCategory>
  ): Promise<OfferCategory> {
    return (await prisma.offerCategory.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as OfferCategory;
  }

  static async deleteCategory(id: string): Promise<void> {
    await prisma.offerCategory.delete({
      where: { id },
    });
  }

  static async listCategories(
    accountId: string,
    filters: any = {}
  ): Promise<OfferCategory[]> {
    const where: any = { accountId };

    return (await prisma.offerCategory.findMany({
      where,
      orderBy: [{ order: "asc" }, { name: "asc" }],
    })) as OfferCategory[];
  }

  static async getCategoryTree(accountId: string): Promise<OfferCategory[]> {
    const categories = await this.listCategories(accountId);
    return this.buildCategoryTree(categories);
  }

  private static buildCategoryTree(
    categories: OfferCategory[]
  ): OfferCategory[] {
    return categories;
  }

  static async createTag(data: Partial<OfferTag>): Promise<OfferTag> {
    return (await prisma.offerTag.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        color: data.color || "#3b82f6",
      },
    })) as OfferTag;
  }

  static async findTagById(id: string): Promise<OfferTag | null> {
    return (await prisma.offerTag.findUnique({
      where: { id },
    })) as OfferTag | null;
  }

  static async updateTag(
    id: string,
    data: Partial<OfferTag>
  ): Promise<OfferTag> {
    return (await prisma.offerTag.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as OfferTag;
  }

  static async deleteTag(id: string): Promise<void> {
    await prisma.offerTag.delete({
      where: { id },
    });
  }

  static async listTags(
    accountId: string,
    filters: any = {}
  ): Promise<OfferTag[]> {
    const where: any = { accountId };

    return (await prisma.offerTag.findMany({
      where,
      orderBy: { name: "asc" },
    })) as OfferTag[];
  }

  static async createGroup(data: Partial<OfferGroup>): Promise<OfferGroup> {
    return (await prisma.offerGroup.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        offers: data.offers || [],
      },
    })) as OfferGroup;
  }

  static async findGroupById(id: string): Promise<OfferGroup | null> {
    return (await prisma.offerGroup.findUnique({
      where: { id },
    })) as OfferGroup | null;
  }

  static async updateGroup(
    id: string,
    data: Partial<OfferGroup>
  ): Promise<OfferGroup> {
    return (await prisma.offerGroup.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as OfferGroup;
  }

  static async deleteGroup(id: string): Promise<void> {
    await prisma.offerGroup.delete({
      where: { id },
    });
  }

  static async listGroups(
    accountId: string,
    filters: any = {}
  ): Promise<OfferGroup[]> {
    const where: any = { accountId };

    return (await prisma.offerGroup.findMany({
      where,
      orderBy: { name: "asc" },
    })) as OfferGroup[];
  }

  static async createTemplate(
    data: Partial<OfferTemplate>
  ): Promise<OfferTemplate> {
    return (await prisma.offerTemplate.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        template: data.template || {},
        isDefault: data.isDefault || false,
      },
    })) as OfferTemplate;
  }

  static async findTemplateById(id: string): Promise<OfferTemplate | null> {
    return (await prisma.offerTemplate.findUnique({
      where: { id },
    })) as OfferTemplate | null;
  }

  static async updateTemplate(
    id: string,
    data: Partial<OfferTemplate>
  ): Promise<OfferTemplate> {
    return (await prisma.offerTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as OfferTemplate;
  }

  static async deleteTemplate(id: string): Promise<void> {
    await prisma.offerTemplate.delete({
      where: { id },
    });
  }

  static async listTemplates(
    accountId: string,
    filters: any = {}
  ): Promise<OfferTemplate[]> {
    const where: any = { accountId };

    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await prisma.offerTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    })) as OfferTemplate[];
  }

  static async createOrganization(
    data: Partial<OfferOrganization>
  ): Promise<OfferOrganization> {
    return (await prisma.offerOrganization.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        settings: data.settings || {},
      },
    })) as OfferOrganization;
  }

  static async findOrganizationById(
    id: string
  ): Promise<OfferOrganization | null> {
    return (await prisma.offerOrganization.findUnique({
      where: { id },
    })) as OfferOrganization | null;
  }

  static async updateOrganization(
    id: string,
    data: Partial<OfferOrganization>
  ): Promise<OfferOrganization> {
    return (await prisma.offerOrganization.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as OfferOrganization;
  }

  static async deleteOrganization(id: string): Promise<void> {
    await prisma.offerOrganization.delete({
      where: { id },
    });
  }

  static async listOrganizations(
    accountId: string,
    filters: any = {}
  ): Promise<OfferOrganization[]> {
    const where: any = { accountId };

    return (await prisma.offerOrganization.findMany({
      where,
      orderBy: { name: "asc" },
    })) as OfferOrganization[];
  }

  static async applyOrganizationRules(
    offerId: string,
    organizationId: string
  ): Promise<void> {
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

    // Note: Rules functionality would need to be implemented separately
    // as the rules property doesn't exist in the current schema
    // const rules = organization.settings?.rules || [];
    // for (const rule of rules) {
    //   if (!rule.enabled) continue;
    //   const conditionsMet = await this.evaluateRuleConditions(rule.conditions, offer);
    //   if (conditionsMet) {
    //     await this.executeRuleActions(rule.actions, offer);
    //   }
    // }
  }

  private static async evaluateRuleConditions(
    conditions: RuleCondition[],
    offer: any
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    let result = true;
    let logic = "AND";

    for (const condition of conditions) {
      const conditionResult = await this.evaluateRuleCondition(
        condition,
        offer
      );

      if (logic === "AND") {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      logic = condition.logic;
    }

    return result;
  }

  private static async evaluateRuleCondition(
    condition: RuleCondition,
    offer: any
  ): Promise<boolean> {
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
        return (
          Array.isArray(condition.value) && condition.value.includes(value)
        );
      case "NOT_IN":
        return (
          Array.isArray(condition.value) && !condition.value.includes(value)
        );
      default:
        return false;
    }
  }

  private static getFieldValue(data: any, field: string): any {
    const fields = field.split(".");
    let value = data;

    for (const f of fields) {
      value = value?.[f];
    }

    return value;
  }

  private static async executeRuleActions(
    actions: RuleAction[],
    offer: any
  ): Promise<void> {
    for (const action of actions) {
      if (!action.enabled) continue;

      try {
        switch (action.type) {
          case "ASSIGN_CATEGORY":
            // Category assignment removed - this action is no longer supported
            console.warn(
              "ASSIGN_CATEGORY action is no longer supported as category field has been removed"
            );
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
            // Implementation for adding to group
            break;
          case "VALIDATE":
            // Implementation for validation
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
      } catch (error: any) {
        console.error(`Failed to execute rule action ${action.type}:`, error);
      }
    }
  }

  static async getOrganizationStats(accountId: string): Promise<any> {
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
      activeTags: tags.length, // All tags are considered active in current schema
      totalGroups: groups.length,
      activeGroups: groups.filter((g) => g.status === "ACTIVE").length,
      totalTemplates: templates.length,
      activeTemplates: templates.length, // All templates are considered active in current schema
      totalOrganizations: organizations.length,
      activeOrganizations: organizations.filter((o) => o.status === "ACTIVE")
        .length,
      totalOffers: offers.length,
      offersByTag: {} as Record<string, number>,
      offersByGroup: {} as Record<string, number>,
    };

    // Count offers by tag
    offers.forEach((offer) => {
      if (offer.tags) {
        offer.tags.forEach((tagId: string) => {
          stats.offersByTag[tagId] = (stats.offersByTag[tagId] || 0) + 1;
        });
      }
    });

    return stats;
  }

  static async createDefaultOrganization(
    accountId: string
  ): Promise<OfferOrganization> {
    // Create default categories
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

    // Create default tags
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

    // Create default groups
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

    // Create default templates
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

    // Create organization
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

  static async getOrganizationDashboard(accountId: string): Promise<any> {
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
