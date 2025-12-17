import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface ContactSettings {
  id: string;
  accountId: string;
  name: string;
  type:
    | "AFFILIATE_CONTACT"
    | "SUPPORT_CONTACT"
    | "SALES_CONTACT"
    | "TECHNICAL_CONTACT"
    | "CUSTOM";
  settings: ContactConfiguration;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactConfiguration {
  allowDirectContact: boolean;
  requireApproval: boolean;
  autoResponse: boolean;
  autoResponseTemplate?: string;
  businessHours: BusinessHours;
  contactMethods: ContactMethod[];
  escalationRules: EscalationRule[];
  notificationSettings: NotificationSettings;
  customFields: CustomField[];
}

export interface BusinessHours {
  enabled: boolean;
  timezone: string;
  schedule: DaySchedule[];
  holidaySchedule: HolidaySchedule[];
  outOfHoursMessage: string;
}

export interface DaySchedule {
  day:
    | "MONDAY"
    | "TUESDAY"
    | "WEDNESDAY"
    | "THURSDAY"
    | "FRIDAY"
    | "SATURDAY"
    | "SUNDAY";
  isWorkingDay: boolean;
  startTime: string;
  endTime: string;
  breaks: BreakTime[];
}

export interface BreakTime {
  startTime: string;
  endTime: string;
  description: string;
}

export interface HolidaySchedule {
  date: string;
  name: string;
  isWorkingDay: boolean;
  message?: string;
}

export interface ContactMethod {
  type: "EMAIL" | "PHONE" | "CHAT" | "TICKET" | "FORM" | "CUSTOM";
  enabled: boolean;
  settings: Record<string, any>;
  priority: number;
}

export interface EscalationRule {
  id: string;
  name: string;
  conditions: EscalationCondition[];
  actions: EscalationAction[];
  priority: number;
  enabled: boolean;
}

export interface EscalationCondition {
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

export interface EscalationAction {
  type:
    | "ASSIGN_TO"
    | "NOTIFY"
    | "CHANGE_PRIORITY"
    | "AUTO_RESPOND"
    | "CREATE_TASK";
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface NotificationSettings {
  email: {
    enabled: boolean;
    recipients: string[];
    templates: Record<string, string>;
  };
  sms: {
    enabled: boolean;
    recipients: string[];
    templates: Record<string, string>;
  };
  push: {
    enabled: boolean;
    recipients: string[];
  };
  webhook: {
    enabled: boolean;
    url: string;
    events: string[];
  };
}

export interface CustomField {
  id: string;
  name: string;
  label: string;
  type:
    | "TEXT"
    | "EMAIL"
    | "PHONE"
    | "SELECT"
    | "CHECKBOX"
    | "RADIO"
    | "TEXTAREA"
    | "FILE";
  required: boolean;
  options?: string[];
  validation?: FieldValidation;
  order: number;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface ContactMessage {
  id: string;
  contactSettingsId: string;
  fromUserId: string;
  toUserId?: string;
  subject: string;
  message: string;
  type: "INQUIRY" | "SUPPORT" | "SALES" | "TECHNICAL" | "GENERAL";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: "NEW" | "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignedTo?: string;
  tags: string[];
  customFields: Record<string, any>;
  attachments: string[];
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  closedAt?: Date;
}

export interface ContactResponse {
  id: string;
  messageId: string;
  fromUserId: string;
  message: string;
  isInternal: boolean;
  attachments: string[];
  createdAt: Date;
}

export class ContactSettingsModel {
  static async create(
    data: Partial<ContactSettings>
  ): Promise<ContactSettings> {
    return (await (prisma as any).contactSettings.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        type: data.type!,
        settings: data.settings || {
          allowDirectContact: true,
          requireApproval: false,
          autoResponse: true,
          businessHours: {
            enabled: true,
            timezone: "UTC",
            schedule: [
              {
                day: "MONDAY",
                isWorkingDay: true,
                startTime: "09:00",
                endTime: "17:00",
                breaks: [],
              },
              {
                day: "TUESDAY",
                isWorkingDay: true,
                startTime: "09:00",
                endTime: "17:00",
                breaks: [],
              },
              {
                day: "WEDNESDAY",
                isWorkingDay: true,
                startTime: "09:00",
                endTime: "17:00",
                breaks: [],
              },
              {
                day: "THURSDAY",
                isWorkingDay: true,
                startTime: "09:00",
                endTime: "17:00",
                breaks: [],
              },
              {
                day: "FRIDAY",
                isWorkingDay: true,
                startTime: "09:00",
                endTime: "17:00",
                breaks: [],
              },
              {
                day: "SATURDAY",
                isWorkingDay: false,
                startTime: "09:00",
                endTime: "17:00",
                breaks: [],
              },
              {
                day: "SUNDAY",
                isWorkingDay: false,
                startTime: "09:00",
                endTime: "17:00",
                breaks: [],
              },
            ],
            holidaySchedule: [],
            outOfHoursMessage:
              "Thank you for your message. We will respond during business hours.",
          },
          contactMethods: [
            { type: "EMAIL", enabled: true, settings: {}, priority: 1 },
            { type: "CHAT", enabled: true, settings: {}, priority: 2 },
            { type: "TICKET", enabled: true, settings: {}, priority: 3 },
          ],
          escalationRules: [],
          notificationSettings: {
            email: { enabled: true, recipients: [], templates: {} },
            sms: { enabled: false, recipients: [], templates: {} },
            push: { enabled: true, recipients: [] },
            webhook: { enabled: false, url: "", events: [] },
          },
          customFields: [],
        },
        status: data.status || "ACTIVE",
      },
    })) as ContactSettings;
  }

  static async findById(id: string): Promise<ContactSettings | null> {
    return (await (prisma as any).contactSettings.findUnique({
      where: { id },
    })) as ContactSettings | null;
  }

  static async findByAccountAndType(
    accountId: string,
    type: string
  ): Promise<ContactSettings | null> {
    return (await (prisma as any).contactSettings.findFirst({
      where: {
        accountId,
        type: type as any,
        status: "ACTIVE",
      },
    })) as ContactSettings | null;
  }

  static async update(
    id: string,
    data: Partial<ContactSettings>
  ): Promise<ContactSettings> {
    return (await (prisma as any).contactSettings.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as ContactSettings;
  }

  static async delete(id: string): Promise<void> {
    await (prisma as any).contactSettings.delete({
      where: { id },
    });
  }

  static async list(
    accountId: string,
    filters: any = {}
  ): Promise<ContactSettings[]> {
    const where: any = { accountId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    return (await (prisma as any).contactSettings.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as ContactSettings[];
  }

  static async isBusinessHours(contactSettingsId: string): Promise<boolean> {
    const settings = await this.findById(contactSettingsId);
    if (!settings) {
      return false;
    }

    const businessHours = settings.settings.businessHours;
    if (!businessHours.enabled) {
      return true;
    }

    const now = new Date();
    const dayName = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toUpperCase();
    const currentTime = now.toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    const daySchedule = businessHours.schedule.find((s) => s.day === dayName);
    if (!daySchedule || !daySchedule.isWorkingDay) {
      return false;
    }

    // Check if current time is within working hours
    if (
      currentTime < daySchedule.startTime ||
      currentTime > daySchedule.endTime
    ) {
      return false;
    }

    // Check breaks
    for (const breakTime of daySchedule.breaks) {
      if (
        currentTime >= breakTime.startTime &&
        currentTime <= breakTime.endTime
      ) {
        return false;
      }
    }

    // Check holidays
    const today = now.toISOString().split("T")[0];
    const holiday = businessHours.holidaySchedule.find((h) => h.date === today);
    if (holiday && !holiday.isWorkingDay) {
      return false;
    }

    return true;
  }

  static async createMessage(
    data: Partial<ContactMessage>
  ): Promise<ContactMessage> {
    return (await (prisma as any).contactMessage.create({
      data: {
        contactSettingsId: data.contactSettingsId!,
        fromUserId: data.fromUserId!,
        toUserId: data.toUserId,
        subject: data.subject!,
        message: data.message!,
        type: data.type!,
        priority: data.priority || "NORMAL",
        status: "NEW",
        assignedTo: data.assignedTo,
        tags: data.tags || [],
        customFields: data.customFields || {},
        attachments: data.attachments || [],
        ipAddress: data.ipAddress!,
        userAgent: data.userAgent!,
      },
    })) as ContactMessage;
  }

  static async findMessageById(id: string): Promise<ContactMessage | null> {
    return (await (prisma as any).contactMessage.findUnique({
      where: { id },
    })) as ContactMessage | null;
  }

  static async updateMessage(
    id: string,
    data: Partial<ContactMessage>
  ): Promise<ContactMessage> {
    return (await (prisma as any).contactMessage.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as ContactMessage;
  }

  static async deleteMessage(id: string): Promise<void> {
    await (prisma as any).contactMessage.delete({
      where: { id },
    });
  }

  static async listMessages(
    contactSettingsId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<ContactMessage[]> {
    const skip = (page - 1) * limit;
    const where: any = { contactSettingsId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.priority) where.priority = filters.priority;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.tags) where.tags = { hasSome: filters.tags };
    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate,
      };
    }

    return (await (prisma as any).contactMessage.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as ContactMessage[];
  }

  static async assignMessage(
    messageId: string,
    assignedTo: string
  ): Promise<ContactMessage> {
    return await this.updateMessage(messageId, {
      status: "IN_PROGRESS",
      assignedTo,
    });
  }

  static async resolveMessage(
    messageId: string,
    resolvedBy: string
  ): Promise<ContactMessage> {
    return await this.updateMessage(messageId, {
      status: "RESOLVED",
      resolvedAt: new Date(),
    });
  }

  static async closeMessage(
    messageId: string,
    closedBy: string
  ): Promise<ContactMessage> {
    return await this.updateMessage(messageId, {
      status: "CLOSED",
      closedAt: new Date(),
    });
  }

  static async addResponse(
    messageId: string,
    fromUserId: string,
    message: string,
    isInternal: boolean = false,
    attachments: string[] = []
  ): Promise<ContactResponse> {
    return (await (prisma as any).contactResponse.create({
      data: {
        messageId,
        fromUserId,
        message,
        isInternal,
        attachments,
      },
    })) as ContactResponse;
  }

  static async getResponses(messageId: string): Promise<ContactResponse[]> {
    return (await (prisma as any).contactResponse.findMany({
      where: { messageId },
      orderBy: { createdAt: "asc" },
    })) as ContactResponse[];
  }

  static async processEscalation(messageId: string): Promise<void> {
    const message = await this.findMessageById(messageId);
    if (!message) {
      return;
    }

    const settings = await this.findById(message.contactSettingsId);
    if (!settings) {
      return;
    }

    const escalationRules = settings.settings.escalationRules;

    for (const rule of escalationRules) {
      if (!rule.enabled) continue;

      const conditionsMet = await this.evaluateEscalationConditions(
        rule.conditions,
        message
      );
      if (conditionsMet) {
        await this.executeEscalationActions(rule.actions, message);
      }
    }
  }

  private static async evaluateEscalationConditions(
    conditions: EscalationCondition[],
    message: ContactMessage
  ): Promise<boolean> {
    if (conditions.length === 0) {
      return true;
    }

    let result = true;
    let logic = "AND";

    for (const condition of conditions) {
      const conditionResult = await this.evaluateEscalationCondition(
        condition,
        message
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

  private static async evaluateEscalationCondition(
    condition: EscalationCondition,
    message: ContactMessage
  ): Promise<boolean> {
    const value = this.getFieldValue(message, condition.field);

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

  private static async executeEscalationActions(
    actions: EscalationAction[],
    message: ContactMessage
  ): Promise<void> {
    for (const action of actions) {
      if (!action.enabled) continue;

      try {
        switch (action.type) {
          case "ASSIGN_TO":
            await this.assignMessage(message.id, action.parameters.userId);
            break;
          case "NOTIFY":
            await this.sendNotification(action.parameters, message);
            break;
          case "CHANGE_PRIORITY":
            await this.updateMessage(message.id, {
              priority: action.parameters.priority,
            });
            break;
          case "AUTO_RESPOND":
            await this.addResponse(
              message.id,
              "system",
              action.parameters.message,
              true
            );
            break;
          case "CREATE_TASK":
            await this.createTask(action.parameters, message);
            break;
        }
      } catch (error: any) {
        console.error(
          `Failed to execute escalation action ${action.type}:`,
          error
        );
      }
    }
  }

  private static async sendNotification(
    parameters: any,
    message: ContactMessage
  ): Promise<void> {
    // Implementation for sending notifications
    console.log("Sending notification:", parameters);
  }

  private static async createTask(
    parameters: any,
    message: ContactMessage
  ): Promise<void> {
    // Implementation for creating tasks
    console.log("Creating task:", parameters);
  }

  static async getContactStats(
    contactSettingsId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = { contactSettingsId };

    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const messages = await (prisma as any).contactMessage.findMany({
      where,
    });

    const stats = {
      totalMessages: messages.length,
      newMessages: messages.filter((m) => m.status === "NEW").length,
      openMessages: messages.filter((m) => m.status === "OPEN").length,
      inProgressMessages: messages.filter((m) => m.status === "IN_PROGRESS")
        .length,
      resolvedMessages: messages.filter((m) => m.status === "RESOLVED").length,
      closedMessages: messages.filter((m) => m.status === "CLOSED").length,
      averageResponseTime: 0,
      byType: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
    };

    // Calculate average response time
    const resolvedMessages = messages.filter((m) => m.resolvedAt);
    if (resolvedMessages.length > 0) {
      const totalResponseTime = resolvedMessages.reduce((sum, m) => {
        return sum + (m.resolvedAt!.getTime() - m.createdAt.getTime());
      }, 0);
      stats.averageResponseTime = totalResponseTime / resolvedMessages.length;
    }

    // Count by type, priority, and status
    messages.forEach((message) => {
      stats.byType[message.type] = (stats.byType[message.type] || 0) + 1;
      stats.byPriority[message.priority] =
        (stats.byPriority[message.priority] || 0) + 1;
      stats.byStatus[message.status] =
        (stats.byStatus[message.status] || 0) + 1;

      const day = message.createdAt.toISOString().split("T")[0];
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;
    });

    return stats;
  }

  static async createDefaultSettings(
    accountId: string
  ): Promise<ContactSettings> {
    return await this.create({
      accountId,
      name: "Default Affiliate Contact",
      type: "AFFILIATE_CONTACT",
      settings: {
        allowDirectContact: true,
        requireApproval: false,
        autoResponse: true,
        autoResponseTemplate:
          "Thank you for contacting us. We will respond within 24 hours.",
        businessHours: {
          enabled: true,
          timezone: "UTC",
          schedule: [
            {
              day: "MONDAY",
              isWorkingDay: true,
              startTime: "09:00",
              endTime: "17:00",
              breaks: [],
            },
            {
              day: "TUESDAY",
              isWorkingDay: true,
              startTime: "09:00",
              endTime: "17:00",
              breaks: [],
            },
            {
              day: "WEDNESDAY",
              isWorkingDay: true,
              startTime: "09:00",
              endTime: "17:00",
              breaks: [],
            },
            {
              day: "THURSDAY",
              isWorkingDay: true,
              startTime: "09:00",
              endTime: "17:00",
              breaks: [],
            },
            {
              day: "FRIDAY",
              isWorkingDay: true,
              startTime: "09:00",
              endTime: "17:00",
              breaks: [],
            },
            {
              day: "SATURDAY",
              isWorkingDay: false,
              startTime: "09:00",
              endTime: "17:00",
              breaks: [],
            },
            {
              day: "SUNDAY",
              isWorkingDay: false,
              startTime: "09:00",
              endTime: "17:00",
              breaks: [],
            },
          ],
          holidaySchedule: [],
          outOfHoursMessage:
            "Thank you for your message. We will respond during business hours.",
        },
        contactMethods: [
          { type: "EMAIL", enabled: true, settings: {}, priority: 1 },
          { type: "CHAT", enabled: true, settings: {}, priority: 2 },
          { type: "TICKET", enabled: true, settings: {}, priority: 3 },
        ],
        escalationRules: [
          {
            id: "urgent_escalation",
            name: "Urgent Message Escalation",
            conditions: [
              {
                field: "priority",
                operator: "EQUALS",
                value: "URGENT",
                logic: "AND",
              },
            ],
            actions: [
              {
                type: "NOTIFY",
                parameters: {
                  method: "email",
                  recipients: ["admin@tcnutrition.com"],
                },
                enabled: true,
              },
            ],
            priority: 1,
            enabled: true,
          },
        ],
        notificationSettings: {
          email: {
            enabled: true,
            recipients: ["admin@trackdesk.com"],
            templates: {},
          },
          sms: { enabled: false, recipients: [], templates: {} },
          push: { enabled: true, recipients: [] },
          webhook: { enabled: false, url: "", events: [] },
        },
        customFields: [
          {
            id: "affiliate_id",
            name: "affiliateId",
            label: "Affiliate ID",
            type: "TEXT",
            required: false,
            order: 1,
          },
          {
            id: "issue_type",
            name: "issueType",
            label: "Issue Type",
            type: "SELECT",
            required: true,
            options: ["Technical", "Billing", "Account", "Other"],
            order: 2,
          },
        ],
      },
    });
  }

  static async getContactDashboard(contactSettingsId: string): Promise<any> {
    const settings = await this.findById(contactSettingsId);
    if (!settings) {
      return null;
    }

    const stats = await this.getContactStats(contactSettingsId);
    const recentMessages = await this.listMessages(
      contactSettingsId,
      {},
      1,
      10
    );
    const isBusinessHours = await this.isBusinessHours(contactSettingsId);

    return {
      settings,
      stats,
      recentMessages,
      isBusinessHours,
    };
  }
}
