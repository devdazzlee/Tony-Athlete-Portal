export interface StatsParams {
    timeRange?: "7d" | "30d" | "90d" | "1y";
    startDate?: string;
    endDate?: string;
}
export interface PerformanceChartParams {
    timeRange?: "7d" | "30d" | "90d" | "1y";
    metric?: "clicks" | "conversions" | "revenue" | "commission";
    groupBy?: "day" | "week" | "month";
}
export declare class DashboardService {
    getStats(userId: string, userRole: string, params: StatsParams): Promise<{
        totalClicks: number;
        totalConversions: number;
        totalEarnings: number;
        totalPayouts: number;
        conversionRate: number;
        availableBalance: number;
        totalAffiliates?: undefined;
        totalRevenue?: undefined;
        totalCommissions?: undefined;
    } | {
        totalAffiliates: number;
        totalClicks: number;
        totalConversions: number;
        totalRevenue: number;
        totalCommissions: number;
        conversionRate: number;
        totalEarnings?: undefined;
        totalPayouts?: undefined;
        availableBalance?: undefined;
    }>;
    getRecentActivity(userId: string, limit: number): Promise<({
        user: {
            email: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        status: string | null;
        createdAt: Date;
        userId: string;
        ipAddress: string | null;
        userAgent: string | null;
        action: string;
        resource: string;
        details: import("@prisma/client/runtime/library").JsonValue | null;
        reviewedBy: string | null;
        reviewedAt: Date | null;
        adminComment: string | null;
    })[]>;
    getPerformanceChart(userId: string, userRole: string, params: PerformanceChartParams): Promise<any[]>;
    getTopOffers(userId: string, userRole: string, limit: number): Promise<{
        id: string;
        name: string;
        commissionRate: number;
        totalClicks: number;
        totalConversions: number;
        conversionRate: number;
    }[]>;
    getNotifications(userId: string, page: number, limit: number, unreadOnly: boolean): Promise<{
        notifications: {
            id: string;
            createdAt: Date;
            userId: string;
            title: string;
            message: string;
            type: import(".prisma/client").$Enums.NotificationType;
            read: boolean;
            data: import("@prisma/client/runtime/library").JsonValue | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    markNotificationAsRead(userId: string, notificationId: string): Promise<void>;
}
//# sourceMappingURL=DashboardService.d.ts.map