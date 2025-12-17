"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactSettingsModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ContactSettingsModel {
    static async create(data) {
        return (await prisma.contactSettings.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                type: data.type,
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
                        outOfHoursMessage: "Thank you for your message. We will respond during business hours.",
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
        }));
    }
    static async findById(id) {
        return (await prisma.contactSettings.findUnique({
            where: { id },
        }));
    }
    static async findByAccountAndType(accountId, type) {
        return (await prisma.contactSettings.findFirst({
            where: {
                accountId,
                type: type,
                status: "ACTIVE",
            },
        }));
    }
    static async update(id, data) {
        return (await prisma.contactSettings.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.contactSettings.delete({
            where: { id },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.type)
            where.type = filters.type;
        if (filters.status)
            where.status = filters.status;
        return (await prisma.contactSettings.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async isBusinessHours(contactSettingsId) {
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
        if (currentTime < daySchedule.startTime ||
            currentTime > daySchedule.endTime) {
            return false;
        }
        for (const breakTime of daySchedule.breaks) {
            if (currentTime >= breakTime.startTime &&
                currentTime <= breakTime.endTime) {
                return false;
            }
        }
        const today = now.toISOString().split("T")[0];
        const holiday = businessHours.holidaySchedule.find((h) => h.date === today);
        if (holiday && !holiday.isWorkingDay) {
            return false;
        }
        return true;
    }
    static async createMessage(data) {
        return (await prisma.contactMessage.create({
            data: {
                contactSettingsId: data.contactSettingsId,
                fromUserId: data.fromUserId,
                toUserId: data.toUserId,
                subject: data.subject,
                message: data.message,
                type: data.type,
                priority: data.priority || "NORMAL",
                status: "NEW",
                assignedTo: data.assignedTo,
                tags: data.tags || [],
                customFields: data.customFields || {},
                attachments: data.attachments || [],
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
            },
        }));
    }
    static async findMessageById(id) {
        return (await prisma.contactMessage.findUnique({
            where: { id },
        }));
    }
    static async updateMessage(id, data) {
        return (await prisma.contactMessage.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteMessage(id) {
        await prisma.contactMessage.delete({
            where: { id },
        });
    }
    static async listMessages(contactSettingsId, filters = {}, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = { contactSettingsId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.priority)
            where.priority = filters.priority;
        if (filters.assignedTo)
            where.assignedTo = filters.assignedTo;
        if (filters.tags)
            where.tags = { hasSome: filters.tags };
        if (filters.startDate && filters.endDate) {
            where.createdAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.contactMessage.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async assignMessage(messageId, assignedTo) {
        return await this.updateMessage(messageId, {
            status: "IN_PROGRESS",
            assignedTo,
        });
    }
    static async resolveMessage(messageId, resolvedBy) {
        return await this.updateMessage(messageId, {
            status: "RESOLVED",
            resolvedAt: new Date(),
        });
    }
    static async closeMessage(messageId, closedBy) {
        return await this.updateMessage(messageId, {
            status: "CLOSED",
            closedAt: new Date(),
        });
    }
    static async addResponse(messageId, fromUserId, message, isInternal = false, attachments = []) {
        return (await prisma.contactResponse.create({
            data: {
                messageId,
                fromUserId,
                message,
                isInternal,
                attachments,
            },
        }));
    }
    static async getResponses(messageId) {
        return (await prisma.contactResponse.findMany({
            where: { messageId },
            orderBy: { createdAt: "asc" },
        }));
    }
    static async processEscalation(messageId) {
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
            if (!rule.enabled)
                continue;
            const conditionsMet = await this.evaluateEscalationConditions(rule.conditions, message);
            if (conditionsMet) {
                await this.executeEscalationActions(rule.actions, message);
            }
        }
    }
    static async evaluateEscalationConditions(conditions, message) {
        if (conditions.length === 0) {
            return true;
        }
        let result = true;
        let logic = "AND";
        for (const condition of conditions) {
            const conditionResult = await this.evaluateEscalationCondition(condition, message);
            if (logic === "AND") {
                result = result && conditionResult;
            }
            else {
                result = result || conditionResult;
            }
            logic = condition.logic;
        }
        return result;
    }
    static async evaluateEscalationCondition(condition, message) {
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
    static getFieldValue(data, field) {
        const fields = field.split(".");
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static async executeEscalationActions(actions, message) {
        for (const action of actions) {
            if (!action.enabled)
                continue;
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
                        await this.addResponse(message.id, "system", action.parameters.message, true);
                        break;
                    case "CREATE_TASK":
                        await this.createTask(action.parameters, message);
                        break;
                }
            }
            catch (error) {
                console.error(`Failed to execute escalation action ${action.type}:`, error);
            }
        }
    }
    static async sendNotification(parameters, message) {
        console.log("Sending notification:", parameters);
    }
    static async createTask(parameters, message) {
        console.log("Creating task:", parameters);
    }
    static async getContactStats(contactSettingsId, startDate, endDate) {
        const where = { contactSettingsId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const messages = await prisma.contactMessage.findMany({
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
            byType: {},
            byPriority: {},
            byStatus: {},
            byDay: {},
        };
        const resolvedMessages = messages.filter((m) => m.resolvedAt);
        if (resolvedMessages.length > 0) {
            const totalResponseTime = resolvedMessages.reduce((sum, m) => {
                return sum + (m.resolvedAt.getTime() - m.createdAt.getTime());
            }, 0);
            stats.averageResponseTime = totalResponseTime / resolvedMessages.length;
        }
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
    static async createDefaultSettings(accountId) {
        return await this.create({
            accountId,
            name: "Default Affiliate Contact",
            type: "AFFILIATE_CONTACT",
            settings: {
                allowDirectContact: true,
                requireApproval: false,
                autoResponse: true,
                autoResponseTemplate: "Thank you for contacting us. We will respond within 24 hours.",
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
                    outOfHoursMessage: "Thank you for your message. We will respond during business hours.",
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
                                    recipients: ["admin@trackdesk.com"],
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
    static async getContactDashboard(contactSettingsId) {
        const settings = await this.findById(contactSettingsId);
        if (!settings) {
            return null;
        }
        const stats = await this.getContactStats(contactSettingsId);
        const recentMessages = await this.listMessages(contactSettingsId, {}, 1, 10);
        const isBusinessHours = await this.isBusinessHours(contactSettingsId);
        return {
            settings,
            stats,
            recentMessages,
            isBusinessHours,
        };
    }
}
exports.ContactSettingsModel = ContactSettingsModel;
//# sourceMappingURL=ContactSettings.js.map