"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KPITile } from "@/components/dashboard/kpi-tile";
import { LineChartComponent } from "@/components/charts/line-chart";
import { BarChartComponent } from "@/components/charts/bar-chart";
import { DataTable } from "@/components/dashboard/data-table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthRequired, AdminLoading } from "@/components/ui/loading";
import {
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Calendar,
  Bell,
  ExternalLink,
  RefreshCw,
  Tag,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { formatLastActivity } from "@/lib/date-utils";
import { EditModal } from "@/components/modals/edit-modal";


const payoutColumns = [
  { key: "id", label: "Payout ID", sortable: true },
  { key: "affiliate", label: "Affiliate", sortable: true },
  {
    key: "amount",
    label: "Amount",
    sortable: true,
    render: (value: number) => `$${value.toFixed(2)}`,
  },
  { key: "method", label: "Method", sortable: true },
  {
    key: "status",
    label: "Status",
    sortable: true,
    render: (value: string) => (
      <Badge variant="secondary">
        {value.charAt(0).toUpperCase() + value.slice(1)}
      </Badge>
    ),
  },
  { key: "requestDate", label: "Request Date", sortable: true },
  { key: "email", label: "Email", sortable: true },
];


const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600 text-white">Active</Badge>;
    case "pending":
      return <Badge className="bg-yellow-600 text-white">Pending</Badge>;
    case "suspended":
      return <Badge className="bg-red-600 text-white">Suspended</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

interface AdminDashboardData {
  statistics: {
    totalAffiliates: number;
    activeAffiliates: number;
    pendingAffiliates: number;
    totalRevenue: number;
    totalCommissions: number;
    averageCommissionRate: number;
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    changes?: {
      revenue: {
        value: number;
        type: "increase" | "decrease";
        period: string;
      };
      commissions: {
        value: number;
        type: "increase" | "decrease";
        period: string;
      };
      conversions: {
        value: number;
        type: "increase" | "decrease";
        period: string;
      };
      conversionRate: {
        value: number;
        type: "increase" | "decrease";
        period: string;
      };
    } | null;
  };
  dailyPerformance: Array<{
    date: string;
    totalClicks: number;
    conversions: number;
    revenue: number;
  }>;
  topAffiliates: Array<{
    id: string;
    name: string;
    email: string;
    status: string;
    commissionRate: number;
    spendingLimit: number | null;
    totalEarnings: number;
    totalConversions: number;
    totalClicks: number;
    discountCodes: string[];
    referralCodes: string[];
    lastActivity: Date | string | null;
  }>;
  pendingPayouts: Array<any>;
  systemAlerts: Array<any>;
}

export default function AdminDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(
    null
  );
  const [selectedPayout, setSelectedPayout] = useState<any | null>(null);
  const [isUpdatingPayout, setIsUpdatingPayout] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("7d");
  const [isDateRangeLoading, setIsDateRangeLoading] = useState(false);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleDateRangeChange = async (newDateRange: string) => {
    setDateRange(newDateRange);
    setIsDateRangeLoading(true);
    try {
      const response = await apiClient.get("/admin/dashboard/overview", {
        params: { dateRange: newDateRange },
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      // Error toast already handled by interceptor
    } finally {
      setIsDateRangeLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsDataLoading(true);
      const response = await apiClient.get("/admin/dashboard/overview", {
        params: { dateRange },
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      // Error toast already handled by interceptor
    } finally {
      setIsDataLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchDashboardData();
    setIsRefreshing(false);
    toast.success("Dashboard data refreshed");
  };

  const handleUpdatePayoutStatus = async (data: Record<string, any>) => {
    const payoutId = selectedPayout?.id;
    if (!payoutId) return;

    const status = String(data.status || "").toUpperCase();
    if (!status) {
      toast.error("Status is required");
      return;
    }

    setIsUpdatingPayout(true);
    try {
      await apiClient.patch(`/admin/payouts/${payoutId}/status`, { status });
      toast.success(`Payout status updated to ${status}`);
      setSelectedPayout(null);
      await fetchDashboardData();
    } catch (error: any) {
      console.error("Error updating payout status:", error);
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to update payout"
      );
    } finally {
      setIsUpdatingPayout(false);
    }
  };

  if (isLoading || isDataLoading || isDateRangeLoading) {
    return <AdminLoading message="Loading admin dashboard..." />;
  }

  if (!user) {
    return (
      <AuthRequired
        message="Admin Access Required"
        actionText="Go to Login"
        actionUrl="/auth/login"
      />
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Data Available
          </h2>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <EditModal
        isOpen={!!selectedPayout}
        onClose={() => {
          if (isUpdatingPayout) return;
          setSelectedPayout(null);
        }}
        onSave={handleUpdatePayoutStatus}
        title="Payout Action"
        data={{
          status: selectedPayout?.status
            ? String(selectedPayout.status).toUpperCase()
            : "PENDING",
        }}
        fields={[
          {
            key: "status",
            label: "Status",
            type: "select",
            required: true,
            options: [
              { value: "PENDING", label: "Pending" },
              { value: "PROCESSING", label: "Processing" },
              { value: "COMPLETED", label: "Completed" },
              { value: "FAILED", label: "Failed" },
              { value: "CANCELLED", label: "Cancelled" },
            ],
          },
        ]}
      />

      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-teal-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-blue-100">
              Manage your affiliate program and track overall performance
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            <Select 
              value={dateRange} 
              onValueChange={handleDateRangeChange}
              disabled={isDateRangeLoading}
            >
              <SelectTrigger className="w-auto min-w-[160px] bg-white/20 hover:bg-white/30 text-white border-white/30 focus:ring-white/50 [&_svg]:!text-white [&_svg]:!opacity-100 disabled:opacity-70">
                <Calendar className="h-4 w-4 mr-2 text-white" />
                <SelectValue className="text-white" />
              </SelectTrigger>
                <SelectContent className="bg-white">
                  <SelectItem value="7d" className="text-gray-900">
                    Last 7 Days
                  </SelectItem>
                  <SelectItem value="30d" className="text-gray-900">
                    Last 30 Days
                  </SelectItem>
                  <SelectItem value="90d" className="text-gray-900">
                    Last 90 Days
                  </SelectItem>
                  <SelectItem value="all" className="text-gray-900">
                    All Time
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

      {/* KPI Tiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPITile
          title="Total Affiliates"
          value={dashboardData.statistics.totalAffiliates}
          icon={Users}
          iconColor="text-blue-600"
          description={`${dashboardData.statistics.activeAffiliates} active, ${dashboardData.statistics.pendingAffiliates} pending`}
          formatAsCurrency={false}
        />
        <KPITile
          title="Total Revenue"
          value={Math.round(dashboardData.statistics.totalRevenue)}
          change={dashboardData.statistics.changes?.revenue}
          icon={DollarSign}
          iconColor="text-green-600"
          description="Revenue generated by affiliates"
        />
        <KPITile
          title="Total Commissions"
          value={Math.round(dashboardData.statistics.totalCommissions)}
          change={dashboardData.statistics.changes?.commissions}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          description="Commissions paid to affiliates"
        />
        <KPITile
          title="Conversion Rate"
          value={`${(
            Math.round(dashboardData.statistics.conversionRate * 10) / 10
          ).toFixed(1)}%`}
          change={dashboardData.statistics.changes?.conversionRate}
          icon={Target}
          iconColor="text-purple-600"
          description="Overall program conversion rate"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChartComponent
          data={dashboardData.dailyPerformance}
          title="Program Performance"
          description="Overall program metrics over time"
          dataKey="date"
          xAxisKey="date"
          lines={[
            { dataKey: "totalClicks", stroke: "#3b82f6", name: "Total Clicks" },
            {
              dataKey: "conversions",
              stroke: "#10b981",
              name: "Conversions",
            },
            {
              dataKey: "revenue",
              stroke: "#f59e0b",
              name: "Revenue ($)",
            },
          ]}
        />
        <BarChartComponent
          data={dashboardData.topAffiliates.map((aff) => ({
            affiliate: aff.name.split(" ")[0] || "Unknown",
            revenue: aff.totalEarnings,
          }))}
          title="Top Performing Affiliates"
          description="Best performing affiliates this month"
          dataKey="affiliate"
          xAxisKey="affiliate"
          bars={[{ dataKey: "revenue", fill: "#3b82f6", name: "Revenue ($)" }]}
        />
      </div>

      {/* Top Affiliates Detail Cards */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-gray-900">
                <Users className="h-5 w-5 mr-2" />
                Top Affiliates
              </CardTitle>
              <CardDescription>
                Affiliate codes, earnings, and key info at a glance
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/admin/affiliates")}
            >
              View All
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dashboardData.topAffiliates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No affiliate data available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {dashboardData.topAffiliates.map((aff) => (
                <div
                  key={aff.id}
                  className="rounded-lg border border-gray-200 p-4 hover:bg-gray-50/50 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                    {/* Left: Name, Email, Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-900 truncate">
                          {aff.name || "N/A"}
                        </span>
                        {getStatusBadge(aff.status.toLowerCase())}
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {aff.email || "N/A"}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Commission: <strong className="text-gray-900">{aff.commissionRate}%</strong></span>
                        {aff.spendingLimit && (
                          <span>Allowance: <strong className="text-gray-900">${Number(aff.spendingLimit).toFixed(2)}</strong></span>
                        )}
                        <span>Last active: {formatLastActivity(aff.lastActivity?.toString() || "Never")}</span>
                      </div>
                    </div>

                    {/* Right: Earnings & Stats */}
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          ${aff.totalEarnings.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {aff.totalConversions} conversions · {aff.totalClicks} clicks
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/commissions?affiliateId=${aff.id}`)}
                        title="View transactions"
                      >
                        <DollarSign className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Codes Row */}
                  {(aff.discountCodes.length > 0 || aff.referralCodes.length > 0) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                      {aff.discountCodes.map((code) => (
                        <Badge
                          key={`d-${code}`}
                          variant="secondary"
                          className="bg-emerald-50 text-emerald-700 border-emerald-200 font-mono text-xs"
                        >
                          <Tag className="h-3 w-3 mr-1" />
                          {code}
                        </Badge>
                      ))}
                      {aff.referralCodes.map((code) => (
                        <Badge
                          key={`r-${code}`}
                          variant="secondary"
                          className="bg-blue-50 text-blue-700 border-blue-200 font-mono text-xs"
                        >
                          <Link2 className="h-3 w-3 mr-1" />
                          {code}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Payouts */}
        <DataTable
          title="Pending Payouts"
          description="Affiliate payout requests awaiting approval"
          columns={payoutColumns}
          data={dashboardData.pendingPayouts}
          searchable={true}
          filterable={true}
          exportable={true}
          pagination={true}
          pageSize={5}
          onEdit={(row) => setSelectedPayout(row)}
        />

      {/* System Alerts */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center text-gray-900">
            <Bell className="h-5 w-5 mr-2" />
            System Alerts
          </CardTitle>
          <p className="text-sm text-gray-600">
            Important notifications and system updates
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboardData.systemAlerts.map((alert, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  alert.type === "warning"
                    ? "bg-yellow-50 border-yellow-200 text-yellow-800"
                    : alert.type === "info"
                    ? "bg-blue-50 border-blue-200 text-blue-800"
                    : "bg-green-50 border-green-200 text-green-800"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{alert.title}</h4>
                    <p className="text-sm opacity-90 mb-2">
                      {alert.description}
                    </p>
                    <p className="text-xs opacity-75">{alert.time}</p>
                  </div>
                  <div
                    className={`w-2 h-2 rounded-full mt-1 ${
                      alert.type === "warning"
                        ? "bg-yellow-600"
                        : alert.type === "info"
                        ? "bg-blue-600"
                        : "bg-green-600"
                    }`}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
