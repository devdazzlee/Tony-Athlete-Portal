import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ConversionType {
  id: string;
  accountId: string;
  name: string;
  description: string;
  code: string;
  category:
    | "SALE"
    | "LEAD"
    | "SIGNUP"
    | "DOWNLOAD"
    | "CLICK"
    | "VIEW"
    | "CUSTOM";
  value: ConversionValue;
  tracking: TrackingSettings;
  validation: ValidationSettings;
  attribution: AttributionSettings;
  status: "ACTIVE" | "INACTIVE";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversionValue {
  type: "FIXED" | "PERCENTAGE" | "DYNAMIC" | "CUSTOM";
  fixedAmount?: number;
  percentage?: number;
  field?: string;
  formula?: string;
  currency: string;
  minimumValue?: number;
  maximumValue?: number;
}

export interface TrackingSettings {
  method: "PIXEL" | "POSTBACK" | "API" | "JAVASCRIPT" | "SERVER_TO_SERVER";
  pixelCode?: string;
  postbackUrl?: string;
  apiEndpoint?: string;
  javascriptCode?: string;
  parameters: Record<string, string>;
  customFields: Record<string, any>;
  requireValidation: boolean;
  allowDuplicates: boolean;
  duplicateWindow: number; // minutes
}

export interface ValidationSettings {
  enabled: boolean;
  rules: ValidationRule[];
  timeout: number; // minutes
  retryAttempts: number;
  retryDelay: number; // minutes
}

export interface ValidationRule {
  id: string;
  name: string;
  type: "REQUIRED_FIELD" | "FIELD_FORMAT" | "FIELD_VALUE" | "CUSTOM_LOGIC";
  field: string;
  operator:
    | "EQUALS"
    | "NOT_EQUALS"
    | "CONTAINS"
    | "GREATER_THAN"
    | "LESS_THAN"
    | "REGEX";
  value: any;
  message: string;
  enabled: boolean;
}

export interface AttributionSettings {
  enabled: boolean;
  lookbackWindow: number; // days
  clickLookbackWindow: number; // days
  attributionModel: string;
  includeDirectTraffic: boolean;
  includeOrganicTraffic: boolean;
  includePaidTraffic: boolean;
  includeSocialTraffic: boolean;
  includeEmailTraffic: boolean;
  includeReferralTraffic: boolean;
  customRules: AttributionRule[];
}

export interface AttributionRule {
  id: string;
  name: string;
  conditions: AttributionCondition[];
  actions: AttributionAction[];
  priority: number;
  enabled: boolean;
}

export interface AttributionCondition {
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

export interface AttributionAction {
  type: "ASSIGN_CREDIT" | "MODIFY_CREDIT" | "EXCLUDE" | "INCLUDE" | "CUSTOM";
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface ConversionEvent {
  id: string;
  conversionTypeId: string;
  affiliateId: string;
  offerId: string;
  clickId?: string;
  userId?: string;
  sessionId?: string;
  value: number;
  currency: string;
  status: "PENDING" | "VALIDATED" | "APPROVED" | "REJECTED" | "FRAUD";
  data: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  validatedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface ConversionValidation {
  id: string;
  conversionEventId: string;
  ruleId: string;
  status: "PASSED" | "FAILED" | "SKIPPED";
  message: string;
  data: any;
  timestamp: Date;
}

export class ConversionTypesModel {
  static async create(data: Partial<ConversionType>): Promise<ConversionType> {
    return (await (prisma as any).conversionType.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        code: data.code!,
        category: data.category!,
        value: data.value || {
          type: "FIXED",
          fixedAmount: 0,
          currency: "USD",
        },
        tracking: data.tracking || {
          method: "PIXEL",
          parameters: {},
          customFields: {},
          requireValidation: false,
          allowDuplicates: true,
          duplicateWindow: 0,
        },
        validation: data.validation || {
          enabled: false,
          rules: [],
          timeout: 30,
          retryAttempts: 3,
          retryDelay: 5,
        },
        attribution: data.attribution || {
          enabled: true,
          lookbackWindow: 30,
          clickLookbackWindow: 30,
          attributionModel: "last_click",
          includeDirectTraffic: true,
          includeOrganicTraffic: true,
          includePaidTraffic: true,
          includeSocialTraffic: true,
          includeEmailTraffic: true,
          includeReferralTraffic: true,
          customRules: [],
        },
        status: data.status || "ACTIVE",
        isDefault: data.isDefault || false,
      },
    })) as ConversionType;
  }

  static async findById(id: string): Promise<ConversionType | null> {
    return (await (prisma as any).conversionType.findUnique({
      where: { id },
    })) as ConversionType | null;
  }

  static async findByCode(
    accountId: string,
    code: string
  ): Promise<ConversionType | null> {
    return (await (prisma as any).conversionType.findFirst({
      where: {
        accountId,
        code,
        status: "ACTIVE",
      },
    })) as ConversionType | null;
  }

  static async update(
    id: string,
    data: Partial<ConversionType>
  ): Promise<ConversionType> {
    return (await (prisma as any).conversionType.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as ConversionType;
  }

  static async delete(id: string): Promise<void> {
    await (prisma as any).conversionType.delete({
      where: { id },
    });
  }

  static async list(
    accountId: string,
    filters: any = {}
  ): Promise<ConversionType[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.category) where.category = filters.category;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await (prisma as any).conversionType.findMany({
      where,
      orderBy: { name: "asc" },
    })) as ConversionType[];
  }

  static async createEvent(
    data: Partial<ConversionEvent>
  ): Promise<ConversionEvent> {
    return (await (prisma as any).conversionEvent.create({
      data: {
        conversionTypeId: data.conversionTypeId!,
        affiliateId: data.affiliateId!,
        offerId: data.offerId!,
        clickId: data.clickId,
        userId: data.userId,
        sessionId: data.sessionId,
        value: data.value!,
        currency: data.currency || "USD",
        status: "PENDING",
        data: data.data || {},
        ipAddress: data.ipAddress!,
        userAgent: data.userAgent!,
        timestamp: data.timestamp || new Date(),
      } as any,
    })) as ConversionEvent;
  }

  static async findEventById(id: string): Promise<ConversionEvent | null> {
    return (await (prisma as any).conversionEvent.findUnique({
      where: { id },
    })) as ConversionEvent | null;
  }

  static async updateEvent(
    id: string,
    data: Partial<ConversionEvent>
  ): Promise<ConversionEvent> {
    return (await (prisma as any).conversionEvent.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      } as any,
    })) as ConversionEvent;
  }

  static async deleteEvent(id: string): Promise<void> {
    await (prisma as any).conversionEvent.delete({
      where: { id },
    });
  }

  static async listEvents(
    conversionTypeId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<ConversionEvent[]> {
    const skip = (page - 1) * limit;
    const where: any = { conversionTypeId };

    if (filters.status) where.status = filters.status;
    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.offerId) where.offerId = filters.offerId;
    if (filters.startDate && filters.endDate) {
      where.timestamp = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return (await (prisma as any).conversionEvent.findMany({
      where,
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    })) as ConversionEvent[];
  }

  static async validateEvent(
    eventId: string
  ): Promise<{ valid: boolean; errors: string[]; warnings: string[] }> {
    const event = await this.findEventById(eventId);
    if (!event) {
      return { valid: false, errors: ["Event not found"], warnings: [] };
    }

    const conversionType = await this.findById(event.conversionTypeId);
    if (!conversionType) {
      return {
        valid: false,
        errors: ["Conversion type not found"],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if validation is enabled
    if (!conversionType.validation.enabled) {
      return { valid: true, errors: [], warnings: [] };
    }

    // Run validation rules
    for (const rule of conversionType.validation.rules) {
      if (!rule.enabled) continue;

      const validation = await this.validateRule(rule, event);
      if (validation.status === "FAILED") {
        errors.push(validation.message);
      } else if (validation.status === "SKIPPED") {
        warnings.push(validation.message);
      }
    }

    // Update event status
    if (errors.length === 0) {
      await this.updateEvent(eventId, {
        status: "VALIDATED",
        validatedAt: new Date(),
      });
    } else {
      await this.updateEvent(eventId, {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: errors.join("; "),
      });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private static async validateRule(
    rule: ValidationRule,
    event: ConversionEvent
  ): Promise<ConversionValidation> {
    let status: "PASSED" | "FAILED" | "SKIPPED" = "PASSED";
    let message = "";

    try {
      const value = this.getFieldValue(event.data, rule.field);

      switch (rule.type) {
        case "REQUIRED_FIELD":
          if (!value || value === "") {
            status = "FAILED";
            message = rule.message;
          }
          break;

        case "FIELD_FORMAT":
          if (value && !this.validateFormat(value, rule.value)) {
            status = "FAILED";
            message = rule.message;
          }
          break;

        case "FIELD_VALUE":
          if (!this.validateValue(value, rule.operator, rule.value)) {
            status = "FAILED";
            message = rule.message;
          }
          break;

        case "CUSTOM_LOGIC":
          // Implement custom logic validation
          break;
      }
    } catch (error: any) {
      status = "SKIPPED";
      message = `Validation error: ${error.message}`;
    }

    return (await (prisma as any).conversionValidation.create({
      data: {
        conversionEventId: event.id,
        ruleId: rule.id,
        status,
        message,
        data: { rule, event: event.data },
        timestamp: new Date(),
      },
    })) as ConversionValidation;
  }

  private static getFieldValue(data: any, field: string): any {
    const fields = field.split(".");
    let value = data;

    for (const f of fields) {
      value = value?.[f];
    }

    return value;
  }

  private static validateFormat(value: any, format: string): boolean {
    if (format === "email") {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
    } else if (format === "phone") {
      return /^\+?[\d\s\-\(\)]+$/.test(String(value));
    } else if (format === "url") {
      try {
        new URL(String(value));
        return true;
      } catch {
        return false;
      }
    } else if (format.startsWith("regex:")) {
      const regex = new RegExp(format.substring(6));
      return regex.test(String(value));
    }

    return true;
  }

  private static validateValue(
    value: any,
    operator: string,
    expectedValue: any
  ): boolean {
    switch (operator) {
      case "EQUALS":
        return value === expectedValue;
      case "NOT_EQUALS":
        return value !== expectedValue;
      case "CONTAINS":
        return String(value).includes(String(expectedValue));
      case "GREATER_THAN":
        return Number(value) > Number(expectedValue);
      case "LESS_THAN":
        return Number(value) < Number(expectedValue);
      default:
        return true;
    }
  }

  static async approveEvent(
    eventId: string,
    approvedBy: string
  ): Promise<ConversionEvent> {
    return await this.updateEvent(eventId, {
      status: "APPROVED",
      approvedAt: new Date(),
    });
  }

  static async rejectEvent(
    eventId: string,
    rejectedBy: string,
    reason: string
  ): Promise<ConversionEvent> {
    return await this.updateEvent(eventId, {
      status: "REJECTED",
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
  }

  static async markAsFraud(
    eventId: string,
    markedBy: string,
    reason: string
  ): Promise<ConversionEvent> {
    return await this.updateEvent(eventId, {
      status: "FRAUD",
      rejectedAt: new Date(),
      rejectionReason: reason,
    });
  }

  static async calculateValue(
    conversionTypeId: string,
    data: any
  ): Promise<number> {
    const conversionType = await this.findById(conversionTypeId);
    if (!conversionType) {
      throw new Error("Conversion type not found");
    }

    const valueSettings = conversionType.value;
    let value = 0;

    switch (valueSettings.type) {
      case "FIXED":
        value = valueSettings.fixedAmount || 0;
        break;

      case "PERCENTAGE":
        const baseValue = this.getFieldValue(
          data,
          valueSettings.field || "orderValue"
        );
        value = (baseValue * (valueSettings.percentage || 0)) / 100;
        break;

      case "DYNAMIC":
        value = this.getFieldValue(data, valueSettings.field || "orderValue");
        break;

      case "CUSTOM":
        // Implement custom formula calculation
        value = this.evaluateFormula(valueSettings.formula || "0", data);
        break;
    }

    // Apply minimum and maximum constraints
    if (valueSettings.minimumValue && value < valueSettings.minimumValue) {
      value = valueSettings.minimumValue;
    }
    if (valueSettings.maximumValue && value > valueSettings.maximumValue) {
      value = valueSettings.maximumValue;
    }

    return value;
  }

  private static evaluateFormula(formula: string, data: any): number {
    // Simple formula evaluation - in production, use a proper expression evaluator
    try {
      // Replace variables in formula with actual values
      let evaluatedFormula = formula;
      for (const [key, value] of Object.entries(data)) {
        const placeholder = `{{${key}}}`;
        evaluatedFormula = evaluatedFormula.replace(
          new RegExp(placeholder, "g"),
          String(value)
        );
      }

      // Evaluate the formula (this is a simplified implementation)
      return eval(evaluatedFormula) || 0;
    } catch (error) {
      return 0;
    }
  }

  static async getConversionStats(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = { conversionType: { accountId } };

    if (startDate && endDate) {
      where.timestamp = {
        gte: startDate,
        lte: endDate,
      };
    }

    const events = await (prisma as any).conversionEvent.findMany({
      where,
      include: {
        conversionType: true,
      } as any,
    });

    const stats = {
      totalEvents: events.length,
      pendingEvents: events.filter((e) => (e as any).status === "PENDING")
        .length,
      validatedEvents: events.filter((e) => (e as any).status === "VALIDATED")
        .length,
      approvedEvents: events.filter((e) => (e as any).status === "APPROVED")
        .length,
      rejectedEvents: events.filter((e) => (e as any).status === "REJECTED")
        .length,
      fraudEvents: events.filter((e) => (e as any).status === "FRAUD").length,
      totalValue: events.reduce((sum, e) => sum + e.value, 0),
      byType: {} as Record<string, any>,
      byStatus: {} as Record<string, number>,
      byCategory: {} as Record<string, any>,
      byAffiliate: {} as Record<string, any>,
      byOffer: {} as Record<string, any>,
    };

    // Aggregate by type, status, category, affiliate, and offer
    events.forEach((event) => {
      const type = event.conversionType.name;
      const category = event.conversionType.category;

      // By type
      if (!stats.byType[type]) {
        stats.byType[type] = { count: 0, value: 0 };
      }
      stats.byType[type].count++;
      stats.byType[type].value += event.value;

      // By status
      stats.byStatus[(event as any).status] =
        (stats.byStatus[(event as any).status] || 0) + 1;

      // By category
      if (!stats.byCategory[category]) {
        stats.byCategory[category] = { count: 0, value: 0 };
      }
      stats.byCategory[category].count++;
      stats.byCategory[category].value += event.value;

      // By affiliate
      if (!stats.byAffiliate[event.affiliateId]) {
        stats.byAffiliate[event.affiliateId] = { count: 0, value: 0 };
      }
      stats.byAffiliate[event.affiliateId].count++;
      stats.byAffiliate[event.affiliateId].value += event.value;

      // By offer
      if (!stats.byOffer[event.offerId]) {
        stats.byOffer[event.offerId] = { count: 0, value: 0 };
      }
      stats.byOffer[event.offerId].count++;
      stats.byOffer[event.offerId].value += event.value;
    });

    return stats;
  }

  static async createDefaultTypes(
    accountId: string
  ): Promise<ConversionType[]> {
    const defaultTypes = [
      {
        name: "Sale",
        description: "Product or service sale",
        code: "SALE",
        category: "SALE" as const,
        value: {
          type: "DYNAMIC",
          field: "orderValue",
          currency: "USD",
        },
        tracking: {
          method: "PIXEL",
          parameters: {
            orderId: "{{orderId}}",
            orderValue: "{{orderValue}}",
            currency: "{{currency}}",
          },
          customFields: {},
          requireValidation: true,
          allowDuplicates: false,
          duplicateWindow: 60,
        },
        validation: {
          enabled: true,
          rules: [
            {
              id: "required_order_id",
              name: "Required Order ID",
              type: "REQUIRED_FIELD",
              field: "orderId",
              operator: "EQUALS",
              value: "",
              message: "Order ID is required",
              enabled: true,
            },
            {
              id: "required_order_value",
              name: "Required Order Value",
              type: "REQUIRED_FIELD",
              field: "orderValue",
              operator: "GREATER_THAN",
              value: 0,
              message: "Order value must be greater than 0",
              enabled: true,
            },
          ],
          timeout: 30,
          retryAttempts: 3,
          retryDelay: 5,
        },
        isDefault: true,
      },
      {
        name: "Lead",
        description: "Lead generation",
        code: "LEAD",
        category: "LEAD" as const,
        value: {
          type: "FIXED",
          fixedAmount: 10,
          currency: "USD",
        },
        tracking: {
          method: "PIXEL",
          parameters: {
            leadId: "{{leadId}}",
            email: "{{email}}",
            phone: "{{phone}}",
          },
          customFields: {},
          requireValidation: true,
          allowDuplicates: false,
          duplicateWindow: 30,
        },
        validation: {
          enabled: true,
          rules: [
            {
              id: "required_lead_id",
              name: "Required Lead ID",
              type: "REQUIRED_FIELD",
              field: "leadId",
              operator: "EQUALS",
              value: "",
              message: "Lead ID is required",
              enabled: true,
            },
            {
              id: "valid_email",
              name: "Valid Email",
              type: "FIELD_FORMAT",
              field: "email",
              operator: "REGEX",
              value: "email",
              message: "Valid email is required",
              enabled: true,
            },
          ],
          timeout: 30,
          retryAttempts: 3,
          retryDelay: 5,
        },
        isDefault: true,
      },
      {
        name: "Signup",
        description: "User registration",
        code: "SIGNUP",
        category: "SIGNUP" as const,
        value: {
          type: "FIXED",
          fixedAmount: 5,
          currency: "USD",
        },
        tracking: {
          method: "PIXEL",
          parameters: {
            userId: "{{userId}}",
            email: "{{email}}",
          },
          customFields: {},
          requireValidation: true,
          allowDuplicates: false,
          duplicateWindow: 0,
        },
        validation: {
          enabled: true,
          rules: [
            {
              id: "required_user_id",
              name: "Required User ID",
              type: "REQUIRED_FIELD",
              field: "userId",
              operator: "EQUALS",
              value: "",
              message: "User ID is required",
              enabled: true,
            },
          ],
          timeout: 30,
          retryAttempts: 3,
          retryDelay: 5,
        },
        isDefault: true,
      },
    ];

    const createdTypes: ConversionType[] = [];
    for (const typeData of defaultTypes) {
      const type = await this.create({
        accountId,
        ...typeData,
      } as any);
      createdTypes.push(type);
    }

    return createdTypes;
  }

  static async getConversionTypesDashboard(accountId: string): Promise<any> {
    const types = await this.list(accountId);
    const stats = await this.getConversionStats(accountId);

    return {
      types,
      stats,
    };
  }
}
