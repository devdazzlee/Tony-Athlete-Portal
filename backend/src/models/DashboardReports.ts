import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface DashboardWidget {
  id: string;
  accountId: string;
  name: string;
  type: "CHART" | "TABLE" | "METRIC" | "LIST" | "CUSTOM";
  title: string;
  description: string;
  dataSource: string;
  query: string;
  settings: WidgetSettings;
  position: WidgetPosition;
  size: WidgetSize;
  permissions: string[];
  roles: string[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface WidgetSettings {
  chartType?: "LINE" | "BAR" | "PIE" | "DOUGHNUT" | "AREA" | "SCATTER";
  colors: string[];
  showLegend: boolean;
  showGrid: boolean;
  showTooltip: boolean;
  animation: boolean;
  refreshInterval: number;
  customSettings: Record<string, any>;
}

export interface WidgetPosition {
  x: number;
  y: number;
  z: number;
}

export interface WidgetSize {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
}

export interface ReportTemplate {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type: "DASHBOARD" | "ANALYTICS" | "FINANCIAL" | "PERFORMANCE" | "CUSTOM";
  category: string;
  template: ReportTemplateData;
  isPublic: boolean;
  isDefault: boolean;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportTemplateData {
  widgets: WidgetTemplate[];
  layout: LayoutSettings;
  filters: FilterSettings;
  exportSettings: ExportSettings;
}

export interface WidgetTemplate {
  id: string;
  type: string;
  title: string;
  dataSource: string;
  query: string;
  settings: WidgetSettings;
  position: WidgetPosition;
  size: WidgetSize;
}

export interface LayoutSettings {
  columns: number;
  rows: number;
  gap: number;
  padding: number;
  responsive: boolean;
  breakpoints: Record<string, any>;
}

export interface FilterSettings {
  dateRange: {
    enabled: boolean;
    defaultRange: string;
    customRange: boolean;
  };
  filters: Filter[];
  presets: FilterPreset[];
}

export interface Filter {
  id: string;
  name: string;
  type: "SELECT" | "MULTI_SELECT" | "DATE" | "DATE_RANGE" | "NUMBER" | "TEXT";
  field: string;
  options?: string[];
  defaultValue?: any;
  required: boolean;
}

export interface FilterPreset {
  id: string;
  name: string;
  description: string;
  filters: Record<string, any>;
  isDefault: boolean;
}

export interface ExportSettings {
  formats: string[];
  includeCharts: boolean;
  includeData: boolean;
  includeFilters: boolean;
  customHeader: string;
  customFooter: string;
}

export interface CustomReport {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type: string;
  category: string;
  templateId?: string;
  widgets: DashboardWidget[];
  layout: LayoutSettings;
  filters: FilterSettings;
  exportSettings: ExportSettings;
  permissions: string[];
  roles: string[];
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  isPublic: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportSchedule {
  id: string;
  reportId: string;
  name: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY" | "CUSTOM";
  time: string;
  timezone: string;
  recipients: string[];
  format: string;
  filters: Record<string, any>;
  status: "ACTIVE" | "INACTIVE" | "PAUSED";
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReportExecution {
  id: string;
  reportId: string;
  scheduleId?: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  errorMessage?: string;
  fileUrl?: string;
  fileSize?: number;
  recipients: string[];
  filters: Record<string, any>;
}

export class DashboardReportsModel {
  static async createWidget(
    data: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    return (await (prisma as any).dashboardWidget.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        type: data.type!,
        title: data.title!,
        description: data.description || "",
        dataSource: data.dataSource!,
        query: data.query!,
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
    })) as DashboardWidget;
  }

  static async findWidgetById(id: string): Promise<DashboardWidget | null> {
    return (await (prisma as any).dashboardWidget.findUnique({
      where: { id },
    })) as DashboardWidget | null;
  }

  static async updateWidget(
    id: string,
    data: Partial<DashboardWidget>
  ): Promise<DashboardWidget> {
    return (await (prisma as any).dashboardWidget.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as DashboardWidget;
  }

  static async deleteWidget(id: string): Promise<void> {
    await (prisma as any).dashboardWidget.delete({
      where: { id },
    });
  }

  static async listWidgets(
    accountId: string,
    filters: any = {}
  ): Promise<DashboardWidget[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    return (await (prisma as any).dashboardWidget.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as DashboardWidget[];
  }

  static async createReportTemplate(
    data: Partial<ReportTemplate>
  ): Promise<ReportTemplate> {
    return (await (prisma as any).reportTemplate.create({
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
    })) as ReportTemplate;
  }

  static async findReportTemplateById(
    id: string
  ): Promise<ReportTemplate | null> {
    return (await (prisma as any).reportTemplate.findUnique({
      where: { id },
    })) as ReportTemplate | null;
  }

  static async updateReportTemplate(
    id: string,
    data: Partial<ReportTemplate>
  ): Promise<ReportTemplate> {
    return (await (prisma as any).reportTemplate.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as ReportTemplate;
  }

  static async deleteReportTemplate(id: string): Promise<void> {
    await (prisma as any).reportTemplate.delete({
      where: { id },
    });
  }

  static async listReportTemplates(
    accountId: string,
    filters: any = {}
  ): Promise<ReportTemplate[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await (prisma as any).reportTemplate.findMany({
      where,
      orderBy: { name: "asc" },
    })) as ReportTemplate[];
  }

  static async createCustomReport(
    data: Partial<CustomReport>
  ): Promise<CustomReport> {
    return (await (prisma as any).customReport.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        type: data.type!,
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
        createdBy: data.createdBy!,
      },
    })) as CustomReport;
  }

  static async findCustomReportById(id: string): Promise<CustomReport | null> {
    return (await (prisma as any).customReport.findUnique({
      where: { id },
    })) as CustomReport | null;
  }

  static async updateCustomReport(
    id: string,
    data: Partial<CustomReport>
  ): Promise<CustomReport> {
    return (await (prisma as any).customReport.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as CustomReport;
  }

  static async deleteCustomReport(id: string): Promise<void> {
    await (prisma as any).customReport.delete({
      where: { id },
    });
  }

  static async listCustomReports(
    accountId: string,
    filters: any = {}
  ): Promise<CustomReport[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.createdBy) where.createdBy = filters.createdBy;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;

    return (await (prisma as any).customReport.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as CustomReport[];
  }

  static async createReportSchedule(
    data: Partial<ReportSchedule>
  ): Promise<ReportSchedule> {
    return (await (prisma as any).reportSchedule.create({
      data: {
        reportId: data.reportId!,
        name: data.name!,
        frequency: data.frequency!,
        time: data.time!,
        timezone: data.timezone || "UTC",
        recipients: data.recipients || [],
        format: data.format || "PDF",
        filters: data.filters || {},
        status: data.status || "ACTIVE",
        nextRun: this.calculateNextRun(
          data.frequency!,
          data.time!,
          data.timezone || "UTC"
        ),
      },
    })) as ReportSchedule;
  }

  static async findReportScheduleById(
    id: string
  ): Promise<ReportSchedule | null> {
    return (await (prisma as any).reportSchedule.findUnique({
      where: { id },
    })) as ReportSchedule | null;
  }

  static async updateReportSchedule(
    id: string,
    data: Partial<ReportSchedule>
  ): Promise<ReportSchedule> {
    return (await (prisma as any).reportSchedule.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as ReportSchedule;
  }

  static async deleteReportSchedule(id: string): Promise<void> {
    await (prisma as any).reportSchedule.delete({
      where: { id },
    });
  }

  static async listReportSchedules(
    reportId: string,
    filters: any = {}
  ): Promise<ReportSchedule[]> {
    const where: any = { reportId };

    if (filters.status) where.status = filters.status;
    if (filters.frequency) where.frequency = filters.frequency;

    return (await (prisma as any).reportSchedule.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as ReportSchedule[];
  }

  static async executeReport(
    reportId: string,
    filters: Record<string, any> = {},
    recipients: string[] = []
  ): Promise<ReportExecution> {
    const report = await this.findCustomReportById(reportId);
    if (!report) {
      throw new Error("Report not found");
    }

    const execution = (await (prisma as any).reportExecution.create({
      data: {
        reportId,
        status: "PENDING",
        startedAt: new Date(),
        recipients,
        filters,
      },
    })) as ReportExecution;

    try {
      // Update status to running
      await (prisma as any).reportExecution.update({
        where: { id: execution.id },
        data: { status: "RUNNING" },
      });

      // Generate report data
      const reportData = await this.generateReportData(report, filters);

      // Export report
      const exportResult = await this.exportReport(report, reportData, filters);

      // Update execution with results
      await (prisma as any).reportExecution.update({
        where: { id: execution.id },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
          duration: Date.now() - execution.startedAt.getTime(),
          fileUrl: exportResult.url,
          fileSize: exportResult.size,
        },
      });

      // Send to recipients
      if (recipients.length > 0) {
        await this.sendReportToRecipients(
          execution.id,
          recipients,
          exportResult
        );
      }

      return execution;
    } catch (error: any) {
      // Update execution with error
      await (prisma as any).reportExecution.update({
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

  private static async generateReportData(
    report: CustomReport,
    filters: Record<string, any>
  ): Promise<any> {
    const data: any = {};

    for (const widget of report.widgets) {
      try {
        const widgetData = await this.executeWidgetQuery(widget, filters);
        data[widget.id] = widgetData;
      } catch (error: any) {
        console.error(`Failed to execute widget ${widget.id}:`, error);
        data[widget.id] = { error: error.message };
      }
    }

    return data;
  }

  private static async executeWidgetQuery(
    widget: DashboardWidget,
    filters: Record<string, any>
  ): Promise<any> {
    // This would execute the actual query based on the widget's dataSource and query
    // For now, return mock data
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

  private static async getAffiliateData(
    query: string,
    filters: Record<string, any>
  ): Promise<any> {
    // Implementation for affiliate data
    return { data: [], total: 0 };
  }

  private static async getOfferData(
    query: string,
    filters: Record<string, any>
  ): Promise<any> {
    // Implementation for offer data
    return { data: [], total: 0 };
  }

  private static async getClickData(
    query: string,
    filters: Record<string, any>
  ): Promise<any> {
    // Implementation for click data
    return { data: [], total: 0 };
  }

  private static async getConversionData(
    query: string,
    filters: Record<string, any>
  ): Promise<any> {
    // Implementation for conversion data
    return { data: [], total: 0 };
  }

  private static async getPayoutData(
    query: string,
    filters: Record<string, any>
  ): Promise<any> {
    // Implementation for payout data
    return { data: [], total: 0 };
  }

  private static async exportReport(
    report: CustomReport,
    data: any,
    filters: Record<string, any>
  ): Promise<{ url: string; size: number }> {
    // Implementation for report export
    return { url: "https://example.com/report.pdf", size: 1024 };
  }

  private static async sendReportToRecipients(
    executionId: string,
    recipients: string[],
    exportResult: any
  ): Promise<void> {
    // Implementation for sending reports
    console.log("Sending report to recipients:", recipients);
  }

  private static calculateNextRun(
    frequency: string,
    time: string,
    timezone: string
  ): Date {
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

  static async getReportExecutions(
    reportId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ReportExecution[]> {
    const skip = (page - 1) * limit;
    return (await (prisma as any).reportExecution.findMany({
      where: { reportId },
      skip,
      take: limit,
      orderBy: { startedAt: "desc" },
    })) as ReportExecution[];
  }

  static async getDashboardStats(accountId: string): Promise<any> {
    const widgets = await this.listWidgets(accountId);
    const templates = await this.listReportTemplates(accountId);
    const reports = await this.listCustomReports(accountId);
    const schedules = await (prisma as any).reportSchedule.findMany({
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
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    // Count by type and status
    widgets.forEach((widget) => {
      stats.byType[widget.type] = (stats.byType[widget.type] || 0) + 1;
      stats.byStatus[widget.status] = (stats.byStatus[widget.status] || 0) + 1;
    });

    return stats;
  }

  static async createDefaultTemplates(
    accountId: string
  ): Promise<ReportTemplate[]> {
    const defaultTemplates = [
      {
        name: "Affiliate Performance Dashboard",
        description:
          "Comprehensive dashboard for affiliate performance metrics",
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
              query:
                "SELECT (COUNT(*) / (SELECT COUNT(*) FROM click)) * 100 as value FROM conversion",
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

    const createdTemplates: ReportTemplate[] = [];
    for (const templateData of defaultTemplates) {
      const template = await this.createReportTemplate({
        accountId,
        ...templateData,
      } as any);
      createdTemplates.push(template);
    }

    return createdTemplates;
  }

  static async getDashboardReportsDashboard(accountId: string): Promise<any> {
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
