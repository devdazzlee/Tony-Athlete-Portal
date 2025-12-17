"use client";

import { useState, useEffect } from "react";
import { DataLoading } from "@/components/ui/loading";
import { DataTable } from "@/components/dashboard/data-table";
import { LineChartComponent } from "@/components/charts/line-chart";
import { BarChartComponent } from "@/components/charts/bar-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Calendar,
  Download,
  Filter,
  TrendingUp,
  MousePointer,
  Target,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";

interface ClickData {
  id: string;
  timestamp: string;
  referralCode: string;
  storeId: string;
  url: string;
  referrer: string;
  userAgent: string;
  ipAddress: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  country: string;
  device: string;
  browser: string;
}

interface ConversionData {
  id: string;
  date: string;
  clickId: string;
  status: string;
  referralType: string;
  commissionAmount: number;
  customerValue: number;
  offer: string;
  customerEmail: string;
  referralCode: string;
}

interface TrafficData {
  period: string;
  summary: {
    totalClicks: number;
    uniqueVisitors: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  trafficBySource: Array<{
    source: string;
    clicks: number;
    percentage: number;
  }>;
  deviceStats: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  dailyTraffic: Array<{
    date: string;
    clicks: number;
    uniqueVisitors: number;
    bounceRate: number;
  }>;
  topPages: Array<{
    url: string;
    clicks: number;
    percentage: number;
  }>;
}

interface PerformanceData {
  period: string;
  metrics: {
    totalClicks: number;
    totalConversions: number;
    conversionRate: number;
    totalRevenue: number;
    avgOrderValue: number;
    revenuePerClick: number;
  };
  performanceByCode: Array<{
    referralCode: string;
    clicks: number;
    conversions: number;
    revenue: number;
    conversionRate: number;
    commissionRate: number;
  }>;
}

export default function StatisticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Data states
  const [clicksData, setClicksData] = useState<ClickData[]>([]);
  const [conversionsData, setConversionsData] = useState<ConversionData[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [performanceData, setPerformanceData] =
    useState<PerformanceData | null>(null);

  useEffect(() => {
    fetchAllData();
  }, [selectedPeriod]);

  const fetchAllData = async () => {
    setIsLoading(true);
    await Promise.all([
      fetchClicksData(),
      fetchConversionsData(),
      fetchTrafficData(),
      fetchPerformanceData(),
    ]);
    setIsLoading(false);
  };

  const fetchClicksData = async () => {
    try {
      const response = await fetch(
        `${config.apiUrl}/statistics/clicks?period=${selectedPeriod}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClicksData(data.data || []);
      } else {
        console.error("Failed to fetch clicks data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching clicks data:", error);
    }
  };

  const fetchConversionsData = async () => {
    try {
      const response = await fetch(
        `${config.apiUrl}/statistics/conversions?period=${selectedPeriod}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setConversionsData(data.data || []);
      } else {
        console.error("Failed to fetch conversions data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching conversions data:", error);
    }
  };

  const fetchTrafficData = async () => {
    try {
      const response = await fetch(
        `${config.apiUrl}/statistics/traffic?period=${selectedPeriod}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setTrafficData(data);
      } else {
        console.error("Failed to fetch traffic data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching traffic data:", error);
    }
  };

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch(
        `${config.apiUrl}/statistics/performance?period=${selectedPeriod}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data);
      } else {
        console.error("Failed to fetch performance data:", response.status);
      }
    } catch (error) {
      console.error("Error fetching performance data:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAllData();
    setIsRefreshing(false);
    toast.success("Statistics data refreshed");
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: "default",
      pending: "secondary",
      declined: "destructive",
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (isLoading) {
    return <DataLoading message="Loading statistics..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Statistics & Analytics
          </h1>
          <p className="text-muted-foreground">
            Track your affiliate performance and traffic insights
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
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
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Performance Overview */}
      {performanceData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Clicks
              </CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceData.metrics.totalClicks.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedPeriod} period
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {performanceData.metrics.totalConversions}
              </div>
              <p className="text-xs text-muted-foreground">
                {performanceData.metrics.conversionRate.toFixed(2)}% conversion
                rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${performanceData.metrics.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                ${performanceData.metrics.revenuePerClick.toFixed(2)} per click
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Order Value
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${performanceData.metrics.avgOrderValue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                Average per conversion
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="clicks">Clicks</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {performanceData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Performance by Referral Code */}
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Referral Code</CardTitle>
                  <CardDescription>
                    Top performing referral codes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {performanceData.performanceByCode.length === 0 ? (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No performance data available
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {performanceData.performanceByCode
                        .slice(0, 5)
                        .map((code, index) => (
                          <div
                            key={code.referralCode}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-medium">
                                  {code.referralCode}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {code.clicks} clicks, {code.conversions}{" "}
                                  conversions
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">
                                ${code.revenue.toFixed(2)}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {code.conversionRate.toFixed(1)}% rate
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Daily Performance Chart */}
              {trafficData && (
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Traffic</CardTitle>
                    <CardDescription>
                      Clicks and visitors over time
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <LineChartComponent
                        data={trafficData.dailyTraffic.map((day) => ({
                          date: day.date,
                          clicks: day.clicks,
                          visitors: day.uniqueVisitors,
                        }))}
                        title="Daily Traffic Trend"
                        description="Clicks and visitors over time"
                        dataKey="clicks"
                        xAxisKey="date"
                        lines={[
                          {
                            dataKey: "clicks",
                            stroke: "#3b82f6",
                            name: "Clicks",
                          },
                          {
                            dataKey: "visitors",
                            stroke: "#10b981",
                            name: "Visitors",
                          },
                        ]}
                        height={256}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* Clicks Tab */}
        <TabsContent value="clicks" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Click Log</CardTitle>
              <CardDescription>Detailed click tracking data</CardDescription>
            </CardHeader>
            <CardContent>
              {clicksData.length === 0 ? (
                <div className="text-center py-8">
                  <MousePointer className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No click data available
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Timestamp</th>
                        <th className="text-left p-4 font-medium">
                          Referral Code
                        </th>
                        <th className="text-left p-4 font-medium">URL</th>
                        <th className="text-left p-4 font-medium">Referrer</th>
                        <th className="text-left p-4 font-medium">Device</th>
                        <th className="text-left p-4 font-medium">Browser</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clicksData.slice(0, 20).map((click) => (
                        <tr
                          key={click.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-4 text-sm">
                            {new Date(click.timestamp).toLocaleString()}
                          </td>
                          <td className="p-4 font-mono text-sm">
                            {click.referralCode}
                          </td>
                          <td
                            className="p-4 text-sm truncate max-w-xs"
                            title={click.url}
                          >
                            {click.url}
                          </td>
                          <td className="p-4 text-sm">{click.referrer}</td>
                          <td className="p-4">
                            <Badge variant="outline">{click.device}</Badge>
                          </td>
                          <td className="p-4 text-sm">{click.browser}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversions Log</CardTitle>
              <CardDescription>
                All conversion events and their details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {conversionsData.length === 0 ? (
                <div className="text-center py-8">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    No conversion data available
                  </p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">
                          Conversion ID
                        </th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Click ID</th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">Type</th>
                        <th className="text-left p-4 font-medium">
                          Commission
                        </th>
                        <th className="text-left p-4 font-medium">
                          Customer Value
                        </th>
                        <th className="text-left p-4 font-medium">Offer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {conversionsData.slice(0, 20).map((conversion) => (
                        <tr
                          key={conversion.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-4 font-mono text-sm">
                            {conversion.id}
                          </td>
                          <td className="p-4 text-sm">{conversion.date}</td>
                          <td className="p-4 font-mono text-sm">
                            {conversion.clickId}
                          </td>
                          <td className="p-4">
                            {getStatusBadge(conversion.status)}
                          </td>
                          <td className="p-4">
                            <Badge variant="outline">
                              {conversion.referralType}
                            </Badge>
                          </td>
                          <td className="p-4 font-medium text-green-600">
                            ${conversion.commissionAmount.toFixed(2)}
                          </td>
                          <td className="p-4">
                            ${conversion.customerValue.toFixed(2)}
                          </td>
                          <td className="p-4">{conversion.offer}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Traffic Tab */}
        <TabsContent value="traffic" className="space-y-6">
          {trafficData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Traffic Sources */}
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>
                    Where your traffic comes from
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {trafficData.trafficBySource.length === 0 ? (
                    <div className="text-center py-8">
                      <Filter className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        No traffic source data available
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trafficData.trafficBySource.map((source, index) => (
                        <div
                          key={source.source}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{source.source}</p>
                              <p className="text-sm text-muted-foreground">
                                {source.clicks} clicks
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{source.clicks}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Stats */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Breakdown</CardTitle>
                  <CardDescription>Traffic by device type</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Desktop</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (trafficData.deviceStats.desktop /
                                  trafficData.summary.totalClicks) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {trafficData.deviceStats.desktop}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium">Mobile</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (trafficData.deviceStats.mobile /
                                  trafficData.summary.totalClicks) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {trafficData.deviceStats.mobile}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-medium">Tablet</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-purple-600 h-2 rounded-full"
                            style={{
                              width: `${
                                (trafficData.deviceStats.tablet /
                                  trafficData.summary.totalClicks) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {trafficData.deviceStats.tablet}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
