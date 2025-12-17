import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface EmailTemplate {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type:
    | "WELCOME"
    | "COMMISSION_EARNED"
    | "PAYOUT_PROCESSED"
    | "ACCOUNT_UPDATE"
    | "PROMOTIONAL"
    | "SYSTEM_ALERT"
    | "CUSTOM";
  category: string;
  subject: string;
  content: string;
  htmlContent: string;
  variables: string[];
  settings: EmailTemplateSettings;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailTemplateSettings {
  fromName: string;
  fromEmail: string;
  replyTo?: string;
  priority: "LOW" | "NORMAL" | "HIGH";
  trackOpens: boolean;
  trackClicks: boolean;
  unsubscribeLink: boolean;
  footer: string;
  header: string;
  customCss?: string;
  customJs?: string;
}

export interface EmailCampaign {
  id: string;
  accountId: string;
  name: string;
  description: string;
  templateId: string;
  subject: string;
  content: string;
  htmlContent: string;
  recipientType:
    | "ALL_AFFILIATES"
    | "SPECIFIC_AFFILIATES"
    | "AFFILIATE_GROUP"
    | "TIER_BASED"
    | "CUSTOM_LIST";
  recipientIds: string[];
  filters: any;
  schedule: CampaignSchedule;
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "CANCELLED";
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignSchedule {
  type: "IMMEDIATE" | "SCHEDULED" | "RECURRING";
  scheduledAt?: Date;
  timezone: string;
  frequency?: "DAILY" | "WEEKLY" | "MONTHLY";
  endDate?: Date;
}

export interface EmailDesign {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type: "HEADER" | "FOOTER" | "BUTTON" | "BANNER" | "CUSTOM";
  html: string;
  css: string;
  assets: DesignAsset[];
  isDefault: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface DesignAsset {
  id: string;
  name: string;
  type: "IMAGE" | "FONT" | "ICON" | "LOGO";
  url: string;
  size: number;
  mimeType: string;
  alt?: string;
}

export interface EmailVariable {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type: "AFFILIATE" | "OFFER" | "COMMISSION" | "PAYOUT" | "SYSTEM" | "CUSTOM";
  source: string;
  format: string;
  defaultValue?: string;
  isRequired: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface EmailAutomation {
  id: string;
  accountId: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  status: "ACTIVE" | "INACTIVE" | "PAUSED";
  createdAt: Date;
  updatedAt: Date;
}

export interface AutomationTrigger {
  type:
    | "AFFILIATE_REGISTERED"
    | "COMMISSION_EARNED"
    | "PAYOUT_PROCESSED"
    | "ACCOUNT_ACTIVATED"
    | "TIER_UPGRADED"
    | "CUSTOM";
  parameters: Record<string, any>;
}

export interface AutomationCondition {
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "CONTAINS"
    | "NOT_CONTAINS";
  value: any;
  logic: "AND" | "OR";
}

export interface AutomationAction {
  type:
    | "SEND_EMAIL"
    | "SEND_SMS"
    | "ADD_TAG"
    | "REMOVE_TAG"
    | "UPDATE_FIELD"
    | "WEBHOOK";
  parameters: Record<string, any>;
  delay?: number;
  enabled: boolean;
}

export class EmailCustomizationModel {
  static async createTemplate(
    data: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    return (await (prisma as any).emailTemplate.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        type: data.type!,
        category: data.category || "General",
        subject: data.subject!,
        content: data.content!,
        htmlContent: data.htmlContent || "",
        variables: data.variables || [],
        settings: data.settings || {
          fromName: "TC Nutrition Athlete Portal",
          fromEmail: "noreply@tcnutrition.com",
          priority: "NORMAL",
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true,
          footer: "Thank you for using TC Nutrition Athlete Portal",
          header: "",
        },
        status: data.status || "DRAFT",
        isDefault: data.isDefault || false,
      },
    })) as EmailTemplate;
  }

  static async findTemplateById(id: string): Promise<EmailTemplate | null> {
    return (await (prisma as any).emailTemplate.findUnique({
      where: { id },
    })) as EmailTemplate | null;
  }

  static async updateTemplate(
    id: string,
    data: Partial<EmailTemplate>
  ): Promise<EmailTemplate> {
    return (await (prisma as any).emailTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as EmailTemplate;
  }

  static async deleteTemplate(id: string): Promise<void> {
    await (prisma as any).emailTemplate.delete({
      where: { id },
    });
  }

  static async listTemplates(
    accountId: string,
    filters: any = {}
  ): Promise<EmailTemplate[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await (prisma as any).emailTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    })) as EmailTemplate[];
  }

  static async createCampaign(
    data: Partial<EmailCampaign>
  ): Promise<EmailCampaign> {
    return (await (prisma as any).emailCampaign.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        templateId: data.templateId!,
        subject: data.subject!,
        content: data.content!,
        htmlContent: data.htmlContent || "",
        recipientType: data.recipientType!,
        recipientIds: data.recipientIds || [],
        filters: data.filters || {},
        schedule: data.schedule || {
          type: "IMMEDIATE",
          timezone: "UTC",
        },
        status: data.status || "DRAFT",
      },
    })) as EmailCampaign;
  }

  static async findCampaignById(id: string): Promise<EmailCampaign | null> {
    return (await (prisma as any).emailCampaign.findUnique({
      where: { id },
    })) as EmailCampaign | null;
  }

  static async updateCampaign(
    id: string,
    data: Partial<EmailCampaign>
  ): Promise<EmailCampaign> {
    return (await (prisma as any).emailCampaign.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as EmailCampaign;
  }

  static async deleteCampaign(id: string): Promise<void> {
    await (prisma as any).emailCampaign.delete({
      where: { id },
    });
  }

  static async listCampaigns(
    accountId: string,
    filters: any = {}
  ): Promise<EmailCampaign[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.recipientType) where.recipientType = filters.recipientType;

    return (await (prisma as any).emailCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as EmailCampaign[];
  }

  static async createDesign(data: Partial<EmailDesign>): Promise<EmailDesign> {
    return (await (prisma as any).emailDesign.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        type: data.type!,
        html: data.html!,
        css: data.css || "",
        assets: data.assets || [],
        isDefault: data.isDefault || false,
        status: data.status || "ACTIVE",
      },
    })) as EmailDesign;
  }

  static async findDesignById(id: string): Promise<EmailDesign | null> {
    return (await (prisma as any).emailDesign.findUnique({
      where: { id },
    })) as EmailDesign | null;
  }

  static async updateDesign(
    id: string,
    data: Partial<EmailDesign>
  ): Promise<EmailDesign> {
    return (await (prisma as any).emailDesign.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as EmailDesign;
  }

  static async deleteDesign(id: string): Promise<void> {
    await (prisma as any).emailDesign.delete({
      where: { id },
    });
  }

  static async listDesigns(
    accountId: string,
    filters: any = {}
  ): Promise<EmailDesign[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await (prisma as any).emailDesign.findMany({
      where,
      orderBy: { name: "asc" },
    })) as EmailDesign[];
  }

  static async createVariable(
    data: Partial<EmailVariable>
  ): Promise<EmailVariable> {
    return (await (prisma as any).emailVariable.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        type: data.type!,
        source: data.source!,
        format: data.format || "{{value}}",
        defaultValue: data.defaultValue,
        isRequired: data.isRequired || false,
        status: data.status || "ACTIVE",
      },
    })) as EmailVariable;
  }

  static async findVariableById(id: string): Promise<EmailVariable | null> {
    return (await (prisma as any).emailVariable.findUnique({
      where: { id },
    })) as EmailVariable | null;
  }

  static async updateVariable(
    id: string,
    data: Partial<EmailVariable>
  ): Promise<EmailVariable> {
    return (await (prisma as any).emailVariable.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as EmailVariable;
  }

  static async deleteVariable(id: string): Promise<void> {
    await (prisma as any).emailVariable.delete({
      where: { id },
    });
  }

  static async listVariables(
    accountId: string,
    filters: any = {}
  ): Promise<EmailVariable[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return (await (prisma as any).emailVariable.findMany({
      where,
      orderBy: { name: "asc" },
    })) as EmailVariable[];
  }

  static async createAutomation(
    data: Partial<EmailAutomation>
  ): Promise<EmailAutomation> {
    return (await (prisma as any).emailAutomation.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        trigger: data.trigger!,
        conditions: data.conditions || [],
        actions: data.actions || [],
        status: data.status || "ACTIVE",
      },
    })) as EmailAutomation;
  }

  static async findAutomationById(id: string): Promise<EmailAutomation | null> {
    return (await (prisma as any).emailAutomation.findUnique({
      where: { id },
    })) as EmailAutomation | null;
  }

  static async updateAutomation(
    id: string,
    data: Partial<EmailAutomation>
  ): Promise<EmailAutomation> {
    return (await (prisma as any).emailAutomation.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as EmailAutomation;
  }

  static async deleteAutomation(id: string): Promise<void> {
    await (prisma as any).emailAutomation.delete({
      where: { id },
    });
  }

  static async listAutomations(
    accountId: string,
    filters: any = {}
  ): Promise<EmailAutomation[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.triggerType) where.trigger = { type: filters.triggerType };

    return (await (prisma as any).emailAutomation.findMany({
      where,
      orderBy: { name: "asc" },
    })) as EmailAutomation[];
  }

  static async processTemplate(
    templateId: string,
    variables: Record<string, any>
  ): Promise<{ subject: string; content: string; htmlContent: string }> {
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    let subject = template.subject;
    let content = template.content;
    let htmlContent = template.htmlContent;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, "g"), String(value));
      content = content.replace(new RegExp(placeholder, "g"), String(value));
      htmlContent = htmlContent.replace(
        new RegExp(placeholder, "g"),
        String(value)
      );
    }

    return { subject, content, htmlContent };
  }

  static async executeAutomation(
    automationId: string,
    triggerData: any
  ): Promise<void> {
    const automation = await this.findAutomationById(automationId);
    if (!automation) {
      return;
    }

    if (automation.status !== "ACTIVE") {
      return;
    }

    // Check conditions
    const conditionsMet = await this.evaluateAutomationConditions(
      automation.conditions,
      triggerData
    );
    if (!conditionsMet) {
      return;
    }

    // Execute actions
    for (const action of automation.actions) {
      if (!action.enabled) continue;

      try {
        await this.executeAutomationAction(action, triggerData);
      } catch (error: any) {
        console.error(
          `Failed to execute automation action ${action.type}:`,
          error
        );
      }
    }
  }

  private static async evaluateAutomationConditions(
    conditions: AutomationCondition[],
    data: any
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    let result = true;
    let logic = "AND";

    for (const condition of conditions) {
      const conditionResult = await this.evaluateAutomationCondition(
        condition,
        data
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

  private static async evaluateAutomationCondition(
    condition: AutomationCondition,
    data: any
  ): Promise<boolean> {
    const value = this.getFieldValue(data, condition.field);

    switch (condition.operator) {
      case "EQUALS":
        return value === condition.value;
      case "NOT_EQUALS":
        return value !== condition.value;
      case "GREATER_THAN":
        return Number(value) > Number(condition.value);
      case "LESS_THAN":
        return Number(value) < Number(condition.value);
      case "CONTAINS":
        return String(value).includes(String(condition.value));
      case "NOT_CONTAINS":
        return !String(value).includes(String(condition.value));
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

  private static async executeAutomationAction(
    action: AutomationAction,
    data: any
  ): Promise<void> {
    switch (action.type) {
      case "SEND_EMAIL":
        await this.sendEmail(action.parameters, data);
        break;
      case "SEND_SMS":
        await this.sendSMS(action.parameters, data);
        break;
      case "ADD_TAG":
        await this.addTag(action.parameters, data);
        break;
      case "REMOVE_TAG":
        await this.removeTag(action.parameters, data);
        break;
      case "UPDATE_FIELD":
        await this.updateField(action.parameters, data);
        break;
      case "WEBHOOK":
        await this.callWebhook(action.parameters, data);
        break;
    }
  }

  private static async sendEmail(parameters: any, data: any): Promise<void> {
    // Implementation for sending email
    console.log("Sending email:", parameters);
  }

  private static async sendSMS(parameters: any, data: any): Promise<void> {
    // Implementation for sending SMS
    console.log("Sending SMS:", parameters);
  }

  private static async addTag(parameters: any, data: any): Promise<void> {
    // Implementation for adding tag
    console.log("Adding tag:", parameters);
  }

  private static async removeTag(parameters: any, data: any): Promise<void> {
    // Implementation for removing tag
    console.log("Removing tag:", parameters);
  }

  private static async updateField(parameters: any, data: any): Promise<void> {
    // Implementation for updating field
    console.log("Updating field:", parameters);
  }

  private static async callWebhook(parameters: any, data: any): Promise<void> {
    // Implementation for calling webhook
    console.log("Calling webhook:", parameters);
  }

  static async getEmailStats(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = { accountId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const templates = await this.listTemplates(accountId);
    const campaigns = await this.listCampaigns(accountId);
    const automations = await this.listAutomations(accountId);

    const stats = {
      totalTemplates: templates.length,
      activeTemplates: templates.filter((t) => t.status === "ACTIVE").length,
      totalCampaigns: campaigns.length,
      activeCampaigns: campaigns.filter((c) => c.status === "SENT").length,
      totalAutomations: automations.length,
      activeAutomations: automations.filter((a) => a.status === "ACTIVE")
        .length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
    };

    // Count by type, status, and category
    templates.forEach((template) => {
      stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
      stats.byStatus[template.status] =
        (stats.byStatus[template.status] || 0) + 1;
      stats.byCategory[template.category] =
        (stats.byCategory[template.category] || 0) + 1;
    });

    return stats;
  }

  static async createDefaultTemplates(
    accountId: string
  ): Promise<EmailTemplate[]> {
    const defaultTemplates = [
      {
        name: "Welcome Email",
        description: "Welcome email for new affiliates",
        type: "WELCOME",
        category: "Onboarding",
        subject: "Welcome to {{companyName}} Affiliate Program!",
        content: `
          Hi {{firstName}},
          
          Welcome to the {{companyName}} affiliate program!
          
          Your affiliate ID is: {{affiliateId}}
          
          You can start promoting our products and earn commissions.
          
          Best regards,
          The {{companyName}} Team
        `,
        htmlContent: `
          <h1>Welcome {{firstName}}!</h1>
          <p>Welcome to the {{companyName}} affiliate program!</p>
          <p>Your affiliate ID is: <strong>{{affiliateId}}</strong></p>
          <p>You can start promoting our products and earn commissions.</p>
          <p>Best regards,<br>The {{companyName}} Team</p>
        `,
        variables: ["firstName", "companyName", "affiliateId"],
        settings: {
          fromName: "TC Nutrition Athlete Portal",
          fromEmail: "noreply@tcnutrition.com",
          priority: "NORMAL",
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: false,
          footer: "Thank you for using TC Nutrition Athlete Portal",
          header: "",
        },
        isDefault: true,
      },
      {
        name: "Commission Earned",
        description: "Notification when commission is earned",
        type: "COMMISSION_EARNED",
        category: "Notifications",
        subject: "You earned ${{amount}} commission!",
        content: `
          Hi {{firstName}},
          
          Congratulations! You have earned $\{\{amount\}\} commission from \{\{offerName\}\}.
          
          Your total earnings are now $\{\{totalEarnings\}\}.
          
          Keep up the great work!
        `,
        htmlContent: `
          <h1>Commission Earned!</h1>
          <p>Hi {{firstName}},</p>
          <p>Congratulations! You have earned <strong>$\{\{amount\}\}</strong> commission from \{\{offerName\}\}.</p>
          <p>Your total earnings are now <strong>$\{\{totalEarnings\}\}</strong>.</p>
          <p>Keep up the great work!</p>
        `,
        variables: ["firstName", "amount", "offerName", "totalEarnings"],
        settings: {
          fromName: "TC Nutrition Athlete Portal",
          fromEmail: "noreply@tcnutrition.com",
          priority: "NORMAL",
          trackOpens: true,
          trackClicks: true,
          unsubscribeLink: true,
          footer: "Thank you for using TC Nutrition Athlete Portal",
          header: "",
        },
        isDefault: true,
      },
    ];

    const createdTemplates: EmailTemplate[] = [];
    for (const templateData of defaultTemplates) {
      const template = await this.createTemplate({
        accountId,
        ...templateData,
      } as any);
      createdTemplates.push(template);
    }

    return createdTemplates;
  }

  static async createDefaultVariables(
    accountId: string
  ): Promise<EmailVariable[]> {
    const defaultVariables = [
      {
        name: "firstName",
        description: "Affiliate first name",
        type: "AFFILIATE",
        source: "user.firstName",
        format: "{{value}}",
        isRequired: true,
      },
      {
        name: "lastName",
        description: "Affiliate last name",
        type: "AFFILIATE",
        source: "user.lastName",
        format: "{{value}}",
        isRequired: true,
      },
      {
        name: "email",
        description: "Affiliate email",
        type: "AFFILIATE",
        source: "user.email",
        format: "{{value}}",
        isRequired: true,
      },
      {
        name: "affiliateId",
        description: "Affiliate ID",
        type: "AFFILIATE",
        source: "id",
        format: "{{value}}",
        isRequired: true,
      },
      {
        name: "companyName",
        description: "Company name",
        type: "SYSTEM",
        source: "system.companyName",
        format: "{{value}}",
        defaultValue: "Trackdesk",
        isRequired: true,
      },
      {
        name: "amount",
        description: "Commission amount",
        type: "COMMISSION",
        source: "commission.amount",
        format: "${{value}}",
        isRequired: true,
      },
      {
        name: "totalEarnings",
        description: "Total earnings",
        type: "AFFILIATE",
        source: "totalEarnings",
        format: "${{value}}",
        isRequired: true,
      },
    ];

    const createdVariables: EmailVariable[] = [];
    for (const variableData of defaultVariables) {
      const variable = await this.createVariable({
        accountId,
        ...variableData,
      } as any);
      createdVariables.push(variable);
    }

    return createdVariables;
  }

  static async getEmailCustomizationDashboard(accountId: string): Promise<any> {
    const templates = await this.listTemplates(accountId);
    const campaigns = await this.listCampaigns(accountId);
    const designs = await this.listDesigns(accountId);
    const variables = await this.listVariables(accountId);
    const automations = await this.listAutomations(accountId);
    const stats = await this.getEmailStats(accountId);

    return {
      templates,
      campaigns,
      designs,
      variables,
      automations,
      stats,
    };
  }
}
