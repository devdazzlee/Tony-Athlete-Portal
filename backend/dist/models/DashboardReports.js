"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardReportsModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class DashboardReportsModel {
    static async createWidget(data) {
        return (await prisma.dashboardWidget.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                type: data.type,
                title: data.title,
                description: data.description || "",
                dataSource: data.dataSource,
                query: data.query,
                settings: data.settings || {
                    colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
                    showLegend: true,
                    showGrid: true,
                    showTooltip: true,
                    animation: true,
                    refreshInterval: 300,
                    customSettings: {},
                },
                position: data.position || { x: 0, y: 0, z: 0 },
                size: data.size || {
                    width: 4,
                    height: 3,
                    minWidth: 2,
                    minHeight: 2,
                    maxWidth: 12,
                    maxHeight: 8,
                },
                permissions: data.permissions || [],
                roles: data.roles || [],
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findWidgetById(id) {
        return (await prisma.dashboardWidget.findUnique({
            where: { id },
        }));
    }
    static async updateWidget(id, data) {
        return (await prisma.dashboardWidget.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteWidget(id) {
        await prisma.dashboardWidget.delete({
            where: { id },
        });
    }
    static async listWidgets(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        return (await prisma.dashboardWidget.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async createReportTemplate(data) {
        return (await prisma.reportTemplate.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                category: data.category || "General",
                template: data.template,
                isPublic: data.isPublic || false,
                isDefault: data.isDefault || false,
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findReportTemplateById(id) {
        return (await prisma.reportTemplate.findUnique({
            where: { id },
        }));
    }
    static async updateReportTemplate(id, data) {
        return (await prisma.reportTemplate.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteReportTemplate(id) {
        await prisma.reportTemplate.delete({
            where: { id },
        });
    }
    static async listReportTemplates(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.category)
            where.category = filters.category;
        if (filters.isPublic !== undefined)
            where.isPublic = filters.isPublic;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.reportTemplate.findMany({
            where,
            orderBy: { name: "asc" },
        }));
    }
    static async createCustomReport(data) {
        return (await prisma.customReport.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                type: data.type,
                category: data.category || "General",
                templateId: data.templateId,
                widgets: data.widgets || [],
                layout: data.layout || {
                    columns: 12,
                    rows: 8,
                    gap: 16,
                    padding: 16,
                    responsive: true,
                    breakpoints: {},
                },
                filters: data.filters || {
                    dateRange: {
                        enabled: true,
                        defaultRange: "30d",
                        customRange: true,
                    },
                    filters: [],
                    presets: [],
                },
                exportSettings: data.exportSettings || {
                    formats: ["PDF", "CSV", "EXCEL"],
                    includeCharts: true,
                    includeData: true,
                    includeFilters: true,
                    customHeader: "",
                    customFooter: "",
                },
                permissions: data.permissions || [],
                roles: data.roles || [],
                status: data.status || "DRAFT",
                isPublic: data.isPublic || false,
                createdBy: data.createdBy,
            },
        }));
    }
    static async findCustomReportById(id) {
        return (await prisma.customReport.findUnique({
            where: { id },
        }));
    }
    static async updateCustomReport(id, data) {
        return (await prisma.customReport.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteCustomReport(id) {
        await prisma.customReport.delete({
            where: { id },
        });
    }
    static async listCustomReports(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.category)
            where.category = filters.category;
        if (filters.createdBy)
            where.createdBy = filters.createdBy;
        if (filters.isPublic !== undefined)
            where.isPublic = filters.isPublic;
        return (await prisma.customReport.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async createReportSchedule(data) {
        return (await prisma.reportSchedule.create({
            data: {
                reportId: data.reportId,
                name: data.name,
                frequency: data.frequency,
                time: data.time,
                timezone: data.timezone || "UTC",
                recipients: data.recipients || [],
                format: data.format || "PDF",
                filters: data.filters || {},
                status: data.status || "ACTIVE",
                nextRun: this.calculateNextRun(data.frequency, data.time, data.timezone || "UTC"),
            },
        }));
    }
    static async findReportScheduleById(id) {
        return (await prisma.reportSchedule.findUnique({
            where: { id },
        }));
    }
    static async updateReportSchedule(id, data) {
        return (await prisma.reportSchedule.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteReportSchedule(id) {
        await prisma.reportSchedule.delete({
            where: { id },
        });
    }
    static async listReportSchedules(reportId, filters = {}) {
        const where = { reportId };
        if (filters.status)
            where.status = filters.status;
        if (filters.frequency)
            where.frequency = filters.frequency;
        return (await prisma.reportSchedule.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async executeReport(reportId, filters = {}, recipients = []) {
        const report = await this.findCustomReportById(reportId);
        if (!report) {
            throw new Error("Report not found");
        }
        const execution = (await prisma.reportExecution.create({
            data: {
                reportId,
                status: "PENDING",
                startedAt: new Date(),
                recipients,
                filters,
            },
        }));
        try {
            await prisma.reportExecution.update({
                where: { id: execution.id },
                data: { status: "RUNNING" },
            });
            const reportData = await this.generateReportData(report, filters);
            const exportResult = await this.exportReport(report, reportData, filters);
            await prisma.reportExecution.update({
                where: { id: execution.id },
                data: {
                    status: "COMPLETED",
                    completedAt: new Date(),
                    duration: Date.now() - execution.startedAt.getTime(),
                    fileUrl: exportResult.url,
                    fileSize: exportResult.size,
                },
            });
            if (recipients.length > 0) {
                await this.sendReportToRecipients(execution.id, recipients, exportResult);
            }
            return execution;
        }
        catch (error) {
            await prisma.reportExecution.update({
                where: { id: execution.id },
                data: {
                    status: "FAILED",
                    completedAt: new Date(),
                    duration: Date.now() - execution.startedAt.getTime(),
                    errorMessage: error.message,
                },
            });
            throw error;
        }
    }
    static async generateReportData(report, filters) {
        const data = {};
        for (const widget of report.widgets) {
            try {
                const widgetData = await this.executeWidgetQuery(widget, filters);
                data[widget.id] = widgetData;
            }
            catch (error) {
                console.error(`Failed to execute widget ${widget.id}:`, error);
                data[widget.id] = { error: error.message };
            }
        }
        return data;
    }
    static async executeWidgetQuery(widget, filters) {
        switch (widget.dataSource) {
            case "affiliates":
                return await this.getAffiliateData(widget.query, filters);
            case "offers":
                return await this.getOfferData(widget.query, filters);
            case "clicks":
                return await this.getClickData(widget.query, filters);
            case "conversions":
                return await this.getConversionData(widget.query, filters);
            case "payouts":
                return await this.getPayoutData(widget.query, filters);
            default:
                return { error: "Unknown data source" };
        }
    }
    static async getAffiliateData(query, filters) {
        return { data: [], total: 0 };
    }
    static async getOfferData(query, filters) {
        return { data: [], total: 0 };
    }
    static async getClickData(query, filters) {
        return { data: [], total: 0 };
    }
    static async getConversionData(query, filters) {
        return { data: [], total: 0 };
    }
    static async getPayoutData(query, filters) {
        return { data: [], total: 0 };
    }
    static async exportReport(report, data, filters) {
        return { url: "https://example.com/report.pdf", size: 1024 };
    }
    static async sendReportToRecipients(executionId, recipients, exportResult) {
        console.log("Sending report to recipients:", recipients);
    }
    static calculateNextRun(frequency, time, timezone) {
        const now = new Date();
        const [hours, minutes] = time.split(":").map(Number);
        let nextRun = new Date(now);
        nextRun.setHours(hours, minutes, 0, 0);
        switch (frequency) {
            case "DAILY":
                if (nextRun <= now) {
                    nextRun.setDate(nextRun.getDate() + 1);
                }
                break;
            case "WEEKLY":
                nextRun.setDate(nextRun.getDate() + 7);
                break;
            case "MONTHLY":
                nextRun.setMonth(nextRun.getMonth() + 1);
                break;
            case "QUARTERLY":
                nextRun.setMonth(nextRun.getMonth() + 3);
                break;
            case "YEARLY":
                nextRun.setFullYear(nextRun.getFullYear() + 1);
                break;
        }
        return nextRun;
    }
    static async getReportExecutions(reportId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        return (await prisma.reportExecution.findMany({
            where: { reportId },
            skip,
            take: limit,
            orderBy: { startedAt: "desc" },
        }));
    }
    static async getDashboardStats(accountId) {
        const widgets = await this.listWidgets(accountId);
        const templates = await this.listReportTemplates(accountId);
        const reports = await this.listCustomReports(accountId);
        const schedules = await prisma.reportSchedule.findMany({
            where: { report: { accountId } },
        });
        const stats = {
            totalWidgets: widgets.length,
            activeWidgets: widgets.filter((w) => w.status === "ACTIVE").length,
            totalTemplates: templates.length,
            activeTemplates: templates.filter((t) => t.status === "ACTIVE").length,
            totalReports: reports.length,
            activeReports: reports.filter((r) => r.status === "ACTIVE").length,
            totalSchedules: schedules.length,
            activeSchedules: schedules.filter((s) => s.status === "ACTIVE").length,
            byType: {},
            byStatus: {},
        };
        widgets.forEach((widget) => {
            stats.byType[widget.type] = (stats.byType[widget.type] || 0) + 1;
            stats.byStatus[widget.status] = (stats.byStatus[widget.status] || 0) + 1;
        });
        return stats;
    }
    static async createDefaultTemplates(accountId) {
        const defaultTemplates = [
            {
                name: "Affiliate Performance Dashboard",
                description: "Comprehensive dashboard for affiliate performance metrics",
                type: "DASHBOARD",
                category: "Performance",
                template: {
                    widgets: [
                        {
                            id: "total-earnings",
                            type: "METRIC",
                            title: "Total Earnings",
                            dataSource: "affiliates",
                            query: "SELECT SUM(totalEarnings) as value FROM affiliateProfile",
                            settings: {
                                colors: ["#10b981"],
                                showLegend: false,
                                showGrid: false,
                                showTooltip: false,
                                animation: false,
                                refreshInterval: 300,
                                customSettings: {},
                            },
                            position: { x: 0, y: 0, z: 0 },
                            size: {
                                width: 3,
                                height: 2,
                                minWidth: 2,
                                minHeight: 2,
                                maxWidth: 12,
                                maxHeight: 8,
                            },
                        },
                        {
                            id: "total-clicks",
                            type: "METRIC",
                            title: "Total Clicks",
                            dataSource: "clicks",
                            query: "SELECT COUNT(*) as value FROM click",
                            settings: {
                                colors: ["#3b82f6"],
                                showLegend: false,
                                showGrid: false,
                                showTooltip: false,
                                animation: false,
                                refreshInterval: 300,
                                customSettings: {},
                            },
                            position: { x: 3, y: 0, z: 0 },
                            size: {
                                width: 3,
                                height: 2,
                                minWidth: 2,
                                minHeight: 2,
                                maxWidth: 12,
                                maxHeight: 8,
                            },
                        },
                        {
                            id: "total-conversions",
                            type: "METRIC",
                            title: "Total Conversions",
                            dataSource: "conversions",
                            query: "SELECT COUNT(*) as value FROM conversion",
                            settings: {
                                colors: ["#f59e0b"],
                                showLegend: false,
                                showGrid: false,
                                showTooltip: false,
                                animation: false,
                                refreshInterval: 300,
                                customSettings: {},
                            },
                            position: { x: 6, y: 0, z: 0 },
                            size: {
                                width: 3,
                                height: 2,
                                minWidth: 2,
                                minHeight: 2,
                                maxWidth: 12,
                                maxHeight: 8,
                            },
                        },
                        {
                            id: "conversion-rate",
                            type: "METRIC",
                            title: "Conversion Rate",
                            dataSource: "conversions",
                            query: "SELECT (COUNT(*) / (SELECT COUNT(*) FROM click)) * 100 as value FROM conversion",
                            settings: {
                                colors: ["#ef4444"],
                                showLegend: false,
                                showGrid: false,
                                showTooltip: false,
                                animation: false,
                                refreshInterval: 300,
                                customSettings: {},
                            },
                            position: { x: 9, y: 0, z: 0 },
                            size: {
                                width: 3,
                                height: 2,
                                minWidth: 2,
                                minHeight: 2,
                                maxWidth: 12,
                                maxHeight: 8,
                            },
                        },
                    ],
                    layout: {
                        columns: 12,
                        rows: 8,
                        gap: 16,
                        padding: 16,
                        responsive: true,
                        breakpoints: {},
                    },
                    filters: {
                        dateRange: {
                            enabled: true,
                            defaultRange: "30d",
                            customRange: true,
                        },
                        filters: [],
                        presets: [],
                    },
                    exportSettings: {
                        formats: ["PDF", "CSV", "EXCEL"],
                        includeCharts: true,
                        includeData: true,
                        includeFilters: true,
                        customHeader: "",
                        customFooter: "",
                    },
                },
                isDefault: true,
            },
        ];
        const createdTemplates = [];
        for (const templateData of defaultTemplates) {
            const template = await this.createReportTemplate({
                accountId,
                ...templateData,
            });
            createdTemplates.push(template);
        }
        return createdTemplates;
    }
    static async getDashboardReportsDashboard(accountId) {
        const widgets = await this.listWidgets(accountId);
        const templates = await this.listReportTemplates(accountId);
        const reports = await this.listCustomReports(accountId);
        const stats = await this.getDashboardStats(accountId);
        return {
            widgets,
            templates,
            reports,
            stats,
        };
    }
}
exports.DashboardReportsModel = DashboardReportsModel;
//# sourceMappingURL=DashboardReports.js.map