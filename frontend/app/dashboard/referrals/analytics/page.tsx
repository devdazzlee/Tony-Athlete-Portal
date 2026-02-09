"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Calendar,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { DashboardLoading } from "@/components/ui/loading";

interface ReferralAnalytics {
  totalReferrals: number;
  totalCommissions: number;
  totalRevenue: number;
  conversionRate: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    referrals: number;
    commissions: number;
    conversionRate?: number;
  }>;
  dailyStats: Array<{
    date: string;
    referrals: number;
    commissions: number;
  }>;
  platformStats: Array<{
    platform: string;
    clicks: number;
    conversions: number;
    revenue: number;
  }>;
}

export default function ReferralAnalyticsPage() {
  const [analytics, setAnalytics] = useState<ReferralAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("30d");

  useEffect(() => {
    setIsLoading(true);
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get(
        `/referral/analytics?period=${timeRange}`
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load analytics"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!analytics) return;

    const exportData = {
      period: timeRange,
      generatedAt: new Date().toISOString(),
      totals: {
        totalReferrals: analytics.totalReferrals,
        totalRevenue: analytics.totalRevenue,
        totalCommissions: analytics.totalCommissions,
        conversionRate: analytics.conversionRate,
      },
      dailyStats: analytics.dailyStats,
      platformStats: analytics.platformStats,
      topProducts: analytics.topProducts,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `referral-analytics-${timeRange}-${new Date()
      .toISOString()
      .split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <DashboardLoading message="Loading analytics..." />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Referral Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Detailed insights into your referral performance
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleExport}
            disabled={!analytics}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Referrals
              </CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.totalReferrals}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                +12% from last period
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                ${analytics.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                +8% from last period
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Conversion Rate
              </CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analytics.conversionRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="w-3 h-3 inline mr-1" />
                +2.1% from last period
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg. Commission
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                $
                {analytics.totalReferrals > 0
                  ? (
                      analytics.totalCommissions / analytics.totalReferrals
                    ).toFixed(2)
                  : "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">Per referral</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Daily Performance</CardTitle>
            <CardDescription>
              Referrals and commissions over time
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-64 flex items-center justify-center text-muted-foreground bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-blue-500" />
                <p className="font-medium">Chart visualization would go here</p>
                <p className="text-sm">Daily referral and commission data</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Platform Performance */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Platform Performance</CardTitle>
            <CardDescription>Performance by sharing platform</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {analytics?.platformStats?.length ? (
                analytics.platformStats.map((platform) => (
                  <div
                    key={platform.platform}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {platform.platform.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 capitalize">
                          {platform.platform}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {platform.clicks} clicks
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">
                        ${platform.revenue.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {platform.conversions} conversions
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No platform data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      {analytics?.topProducts && analytics.topProducts.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Top Performing Products</CardTitle>
            <CardDescription>
              Your best performing products by referrals
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-4">
              {analytics?.topProducts?.length ? (
                analytics.topProducts.map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {product.productName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {product.referrals} referrals
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600 text-lg">
                        ${product.commissions.toFixed(2)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {product.conversionRate != null
                          ? `${product.conversionRate.toFixed(1)}% conversion rate`
                          : product.referrals > 0
                            ? `${(
                                (product.commissions / product.referrals) *
                                100
                              ).toFixed(1)}% avg commission`
                            : "0.0% avg commission"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No product data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
