"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailCustomizationModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class EmailCustomizationModel {
    static async createTemplate(data) {
        return (await prisma.emailTemplate.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                category: data.category || "General",
                subject: data.subject,
                content: data.content,
                htmlContent: data.htmlContent || "",
                variables: data.variables || [],
                settings: data.settings || {
                    fromName: "Trackdesk",
                    fromEmail: "noreply@trackdesk.com",
                    priority: "NORMAL",
                    trackOpens: true,
                    trackClicks: true,
                    unsubscribeLink: true,
                    footer: "Thank you for using Trackdesk",
                    header: "",
                },
                status: data.status || "DRAFT",
                isDefault: data.isDefault || false,
            },
        }));
    }
    static async findTemplateById(id) {
        return (await prisma.emailTemplate.findUnique({
            where: { id },
        }));
    }
    static async updateTemplate(id, data) {
        return (await prisma.emailTemplate.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteTemplate(id) {
        await prisma.emailTemplate.delete({
            where: { id },
        });
    }
    static async listTemplates(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.category)
            where.category = filters.category;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.emailTemplate.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createCampaign(data) {
        return (await prisma.emailCampaign.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                templateId: data.templateId,
                subject: data.subject,
                content: data.content,
                htmlContent: data.htmlContent || "",
                recipientType: data.recipientType,
                recipientIds: data.recipientIds || [],
                filters: data.filters || {},
                schedule: data.schedule || {
                    type: "IMMEDIATE",
                    timezone: "UTC",
                },
                status: data.status || "DRAFT",
            },
        }));
    }
    static async findCampaignById(id) {
        return (await prisma.emailCampaign.findUnique({
            where: { id },
        }));
    }
    static async updateCampaign(id, data) {
        return (await prisma.emailCampaign.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteCampaign(id) {
        await prisma.emailCampaign.delete({
            where: { id },
        });
    }
    static async listCampaigns(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.recipientType)
            where.recipientType = filters.recipientType;
        return (await prisma.emailCampaign.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async createDesign(data) {
        return (await prisma.emailDesign.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                html: data.html,
                css: data.css || "",
                assets: data.assets || [],
                isDefault: data.isDefault || false,
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findDesignById(id) {
        return (await prisma.emailDesign.findUnique({
            where: { id },
        }));
    }
    static async updateDesign(id, data) {
        return (await prisma.emailDesign.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteDesign(id) {
        await prisma.emailDesign.delete({
            where: { id },
        });
    }
    static async listDesigns(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.emailDesign.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createVariable(data) {
        return (await prisma.emailVariable.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                source: data.source,
                format: data.format || "{{value}}",
                defaultValue: data.defaultValue,
                isRequired: data.isRequired || false,
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findVariableById(id) {
        return (await prisma.emailVariable.findUnique({
            where: { id },
        }));
    }
    static async updateVariable(id, data) {
        return (await prisma.emailVariable.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteVariable(id) {
        await prisma.emailVariable.delete({
            where: { id },
        });
    }
    static async listVariables(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        return (await prisma.emailVariable.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createAutomation(data) {
        return (await prisma.emailAutomation.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                trigger: data.trigger,
                conditions: data.conditions || [],
                actions: data.actions || [],
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findAutomationById(id) {
        return (await prisma.emailAutomation.findUnique({
            where: { id },
        }));
    }
    static async updateAutomation(id, data) {
        return (await prisma.emailAutomation.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteAutomation(id) {
        await prisma.emailAutomation.delete({
            where: { id },
        });
    }
    static async listAutomations(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.triggerType)
            where.trigger = { type: filters.triggerType };
        return (await prisma.emailAutomation.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async processTemplate(templateId, variables) {
        const template = await this.findTemplateById(templateId);
        if (!template) {
            throw new Error("Template not found");
        }
        let subject = template.subject;
        let content = template.content;
        let htmlContent = template.htmlContent;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            subject = subject.replace(new RegExp(placeholder, "g"), String(value));
            content = content.replace(new RegExp(placeholder, "g"), String(value));
            htmlContent = htmlContent.replace(new RegExp(placeholder, "g"), String(value));
        }
        return { subject, content, htmlContent };
    }
    static async executeAutomation(automationId, triggerData) {
        const automation = await this.findAutomationById(automationId);
        if (!automation) {
            return;
        }
        if (automation.status !== "ACTIVE") {
            return;
        }
        const conditionsMet = await this.evaluateAutomationConditions(automation.conditions, triggerData);
        if (!conditionsMet) {
            return;
        }
        for (const action of automation.actions) {
            if (!action.enabled)
                continue;
            try {
                await this.executeAutomationAction(action, triggerData);
            }
            catch (error) {
                console.error(`Failed to execute automation action ${action.type}:`, error);
            }
        }
    }
    static async evaluateAutomationConditions(conditions, data) {
        if (conditions.length === 0) {
            return true;
        }
        let result = true;
        let logic = "AND";
        for (const condition of conditions) {
            const conditionResult = await this.evaluateAutomationCondition(condition, data);
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
    static async evaluateAutomationCondition(condition, data) {
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
    static getFieldValue(data, field) {
        const fields = field.split(".");
        let value = data;
        for (const f of fields) {
            value = value?.[f];
        }
        return value;
    }
    static async executeAutomationAction(action, data) {
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
    static async sendEmail(parameters, data) {
        console.log("Sending email:", parameters);
    }
    static async sendSMS(parameters, data) {
        console.log("Sending SMS:", parameters);
    }
    static async addTag(parameters, data) {
        console.log("Adding tag:", parameters);
    }
    static async removeTag(parameters, data) {
        console.log("Removing tag:", parameters);
    }
    static async updateField(parameters, data) {
        console.log("Updating field:", parameters);
    }
    static async callWebhook(parameters, data) {
        console.log("Calling webhook:", parameters);
    }
    static async getEmailStats(accountId, startDate, endDate) {
        const where = { accountId };
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
            byType: {},
            byStatus: {},
            byCategory: {},
        };
        templates.forEach((template) => {
            stats.byType[template.type] = (stats.byType[template.type] || 0) + 1;
            stats.byStatus[template.status] =
                (stats.byStatus[template.status] || 0) + 1;
            stats.byCategory[template.category] =
                (stats.byCategory[template.category] || 0) + 1;
        });
        return stats;
    }
    static async createDefaultTemplates(accountId) {
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
                    fromName: "Trackdesk",
                    fromEmail: "noreply@trackdesk.com",
                    priority: "NORMAL",
                    trackOpens: true,
                    trackClicks: true,
                    unsubscribeLink: false,
                    footer: "Thank you for using Trackdesk",
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
                    fromName: "Trackdesk",
                    fromEmail: "noreply@trackdesk.com",
                    priority: "NORMAL",
                    trackOpens: true,
                    trackClicks: true,
                    unsubscribeLink: true,
                    footer: "Thank you for using Trackdesk",
                    header: "",
                },
                isDefault: true,
            },
        ];
        const createdTemplates = [];
        for (const templateData of defaultTemplates) {
            const template = await this.createTemplate({
                accountId,
                ...templateData,
            });
            createdTemplates.push(template);
        }
        return createdTemplates;
    }
    static async createDefaultVariables(accountId) {
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
        const createdVariables = [];
        for (const variableData of defaultVariables) {
            const variable = await this.createVariable({
                accountId,
                ...variableData,
            });
            createdVariables.push(variable);
        }
        return createdVariables;
    }
    static async getEmailCustomizationDashboard(accountId) {
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
exports.EmailCustomizationModel = EmailCustomizationModel;
//# sourceMappingURL=EmailCustomization.js.map