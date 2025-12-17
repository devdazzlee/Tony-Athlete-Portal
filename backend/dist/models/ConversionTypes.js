"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConversionTypesModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class ConversionTypesModel {
    static async create(data) {
        return (await prisma.conversionType.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                code: data.code,
                category: data.category,
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
        }));
    }
    static async findById(id) {
        return (await prisma.conversionType.findUnique({
            where: { id },
        }));
    }
    static async findByCode(accountId, code) {
        return (await prisma.conversionType.findFirst({
            where: {
                accountId,
                code,
                status: "ACTIVE",
            },
        }));
    }
    static async update(id, data) {
        return (await prisma.conversionType.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.conversionType.delete({
            where: { id },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.category)
            where.category = filters.category;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.conversionType.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createEvent(data) {
        return (await prisma.conversionEvent.create({
            data: {
                conversionTypeId: data.conversionTypeId,
                affiliateId: data.affiliateId,
                offerId: data.offerId,
                clickId: data.clickId,
                userId: data.userId,
                sessionId: data.sessionId,
                value: data.value,
                currency: data.currency || "USD",
                status: "PENDING",
                data: data.data || {},
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                timestamp: data.timestamp || new Date(),
            },
        }));
    }
    static async findEventById(id) {
        return (await prisma.conversionEvent.findUnique({
            where: { id },
        }));
    }
    static async updateEvent(id, data) {
        return (await prisma.conversionEvent.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteEvent(id) {
        await prisma.conversionEvent.delete({
            where: { id },
        });
    }
    static async listEvents(conversionTypeId, filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = { conversionTypeId };
        if (filters.status)
            where.status = filters.status;
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.offerId)
            where.offerId = filters.offerId;
        if (filters.startDate && filters.endDate) {
            where.timestamp = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.conversionEvent.findMany({
            where,
            skip,
            take: limit,
            orderBy: { timestamp: "desc" },
        }));
    }
    static async validateEvent(eventId) {
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
        const errors = [];
        const warnings = [];
        if (!conversionType.validation.enabled) {
            return { valid: true, errors: [], warnings: [] };
        }
        for (const rule of conversionType.validation.rules) {
            if (!rule.enabled)
                continue;
            const validation = await this.validateRule(rule, event);
            if (validation.status === "FAILED") {
                errors.push(validation.message);
            }
            else if (validation.status === "SKIPPED") {
                warnings.push(validation.message);
            }
        }
        if (errors.length === 0) {
            await this.updateEvent(eventId, {
                status: "VALIDATED",
                validatedAt: new Date(),
            });
        }
        else {
            await this.updateEvent(eventId, {
                status: "REJECTED",
                rejectedAt: new Date(),
                rejectionReason: errors.join("; "),
            });
        }
        return { valid: errors.length === 0, errors, warnings };
    }
    static async validateRule(rule, event) {
        let status = "PASSED";
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
                    break;
            }
        }
        catch (error) {
            status = "SKIPPED";
            message = `Validation error: ${error.message}`;
        }
        return (await prisma.conversionValidation.create({
            data: {
                conversionEventId: event.id,
                ruleId: rule.id,
                status,
                message,
                data: { rule, event: event.data },
                timestamp: new Date(),
            },
        }));
    }
    static getFieldValue(data, field) {
        const fields = field.split(".");
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static validateFormat(value, format) {
        if (format === "email") {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
        }
        else if (format === "phone") {
            return /^\+?[\d\s\-\(\)]+$/.test(String(value));
        }
        else if (format === "url") {
            try {
                new URL(String(value));
                return true;
            }
            catch {
                return false;
            }
        }
        else if (format.startsWith("regex:")) {
            const regex = new RegExp(format.substring(6));
            return regex.test(String(value));
        }
        return true;
    }
    static validateValue(value, operator, expectedValue) {
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
    static async approveEvent(eventId, approvedBy) {
        return await this.updateEvent(eventId, {
            status: "APPROVED",
            approvedAt: new Date(),
        });
    }
    static async rejectEvent(eventId, rejectedBy, reason) {
        return await this.updateEvent(eventId, {
            status: "REJECTED",
            rejectedAt: new Date(),
            rejectionReason: reason,
        });
    }
    static async markAsFraud(eventId, markedBy, reason) {
        return await this.updateEvent(eventId, {
            status: "FRAUD",
            rejectedAt: new Date(),
            rejectionReason: reason,
        });
    }
    static async calculateValue(conversionTypeId, data) {
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
                const baseValue = this.getFieldValue(data, valueSettings.field || "orderValue");
                value = (baseValue * (valueSettings.percentage || 0)) / 100;
                break;
            case "DYNAMIC":
                value = this.getFieldValue(data, valueSettings.field || "orderValue");
                break;
            case "CUSTOM":
                value = this.evaluateFormula(valueSettings.formula || "0", data);
                break;
        }
        if (valueSettings.minimumValue && value < valueSettings.minimumValue) {
            value = valueSettings.minimumValue;
        }
        if (valueSettings.maximumValue && value > valueSettings.maximumValue) {
            value = valueSettings.maximumValue;
        }
        return value;
    }
    static evaluateFormula(formula, data) {
        try {
            let evaluatedFormula = formula;
            for (const [key, value] of Object.entries(data)) {
                const placeholder = `{{${key}}}`;
                evaluatedFormula = evaluatedFormula.replace(new RegExp(placeholder, "g"), String(value));
            }
            return eval(evaluatedFormula) || 0;
        }
        catch (error) {
            return 0;
        }
    }
    static async getConversionStats(accountId, startDate, endDate) {
        const where = { conversionType: { accountId } };
        if (startDate && endDate) {
            where.timestamp = {
                gte: startDate,
                lte: endDate,
            };
        }
        const events = await prisma.conversionEvent.findMany({
            where,
            include: {
                conversionType: true,
            },
        });
        const stats = {
            totalEvents: events.length,
            pendingEvents: events.filter((e) => e.status === "PENDING")
                .length,
            validatedEvents: events.filter((e) => e.status === "VALIDATED")
                .length,
            approvedEvents: events.filter((e) => e.status === "APPROVED")
                .length,
            rejectedEvents: events.filter((e) => e.status === "REJECTED")
                .length,
            fraudEvents: events.filter((e) => e.status === "FRAUD").length,
            totalValue: events.reduce((sum, e) => sum + e.value, 0),
            byType: {},
            byStatus: {},
            byCategory: {},
            byAffiliate: {},
            byOffer: {},
        };
        events.forEach((event) => {
            const type = event.conversionType.name;
            const category = event.conversionType.category;
            if (!stats.byType[type]) {
                stats.byType[type] = { count: 0, value: 0 };
            }
            stats.byType[type].count++;
            stats.byType[type].value += event.value;
            stats.byStatus[event.status] =
                (stats.byStatus[event.status] || 0) + 1;
            if (!stats.byCategory[category]) {
                stats.byCategory[category] = { count: 0, value: 0 };
            }
            stats.byCategory[category].count++;
            stats.byCategory[category].value += event.value;
            if (!stats.byAffiliate[event.affiliateId]) {
                stats.byAffiliate[event.affiliateId] = { count: 0, value: 0 };
            }
            stats.byAffiliate[event.affiliateId].count++;
            stats.byAffiliate[event.affiliateId].value += event.value;
            if (!stats.byOffer[event.offerId]) {
                stats.byOffer[event.offerId] = { count: 0, value: 0 };
            }
            stats.byOffer[event.offerId].count++;
            stats.byOffer[event.offerId].value += event.value;
        });
        return stats;
    }
    static async createDefaultTypes(accountId) {
        const defaultTypes = [
            {
                name: "Sale",
                description: "Product or service sale",
                code: "SALE",
                category: "SALE",
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
                category: "LEAD",
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
                category: "SIGNUP",
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
        const createdTypes = [];
        for (const typeData of defaultTypes) {
            const type = await this.create({
                accountId,
                ...typeData,
            });
            createdTypes.push(type);
        }
        return createdTypes;
    }
    static async getConversionTypesDashboard(accountId) {
        const types = await this.list(accountId);
        const stats = await this.getConversionStats(accountId);
        return {
            types,
            stats,
        };
    }
}
exports.ConversionTypesModel = ConversionTypesModel;
//# sourceMappingURL=ConversionTypes.js.map