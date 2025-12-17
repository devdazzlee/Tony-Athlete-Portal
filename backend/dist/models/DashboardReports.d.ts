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
export declare class DashboardReportsModel {
    static createWidget(data: Partial<DashboardWidget>): Promise<DashboardWidget>;
    static findWidgetById(id: string): Promise<DashboardWidget | null>;
    static updateWidget(id: string, data: Partial<DashboardWidget>): Promise<DashboardWidget>;
    static deleteWidget(id: string): Promise<void>;
    static listWidgets(accountId: string, filters?: any): Promise<DashboardWidget[]>;
    static createReportTemplate(data: Partial<ReportTemplate>): Promise<ReportTemplate>;
    static findReportTemplateById(id: string): Promise<ReportTemplate | null>;
    static updateReportTemplate(id: string, data: Partial<ReportTemplate>): Promise<ReportTemplate>;
    static deleteReportTemplate(id: string): Promise<void>;
    static listReportTemplates(accountId: string, filters?: any): Promise<ReportTemplate[]>;
    static createCustomReport(data: Partial<CustomReport>): Promise<CustomReport>;
    static findCustomReportById(id: string): Promise<CustomReport | null>;
    static updateCustomReport(id: string, data: Partial<CustomReport>): Promise<CustomReport>;
    static deleteCustomReport(id: string): Promise<void>;
    static listCustomReports(accountId: string, filters?: any): Promise<CustomReport[]>;
    static createReportSchedule(data: Partial<ReportSchedule>): Promise<ReportSchedule>;
    static findReportScheduleById(id: string): Promise<ReportSchedule | null>;
    static updateReportSchedule(id: string, data: Partial<ReportSchedule>): Promise<ReportSchedule>;
    static deleteReportSchedule(id: string): Promise<void>;
    static listReportSchedules(reportId: string, filters?: any): Promise<ReportSchedule[]>;
    static executeReport(reportId: string, filters?: Record<string, any>, recipients?: string[]): Promise<ReportExecution>;
    private static generateReportData;
    private static executeWidgetQuery;
    private static getAffiliateData;
    private static getOfferData;
    private static getClickData;
    private static getConversionData;
    private static getPayoutData;
    private static exportReport;
    private static sendReportToRecipients;
    private static calculateNextRun;
    static getReportExecutions(reportId: string, page?: number, limit?: number): Promise<ReportExecution[]>;
    static getDashboardStats(accountId: string): Promise<any>;
    static createDefaultTemplates(accountId: string): Promise<ReportTemplate[]>;
    static getDashboardReportsDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=DashboardReports.d.ts.map