"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, RefreshCw, Users, DollarSign } from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardLoading } from "@/components/ui/loading";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { LineChart, Line, XAxis as LineXAxis, YAxis as LineYAxis, CartesianGrid as LineCartesianGrid, Tooltip as LineTooltip, ResponsiveContainer as LineResponsiveContainer, Legend } from "recharts";

export default function DashboardPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("Yesterday");
  const [selectedTab, setSelectedTab] = useState("conversions");
  const [showPrevious, setShowPrevious] = useState(true);
  const [profileData, setProfileData] = useState({
    instagram: null as string | null,
    tiktok: null as string | null,
    discountCodes: [] as Array<{
      code: string;
      value: string;
      description?: string;
      freeShipping?: boolean;
    }>,
    spendingLimit: "Not Set",
    tier: null as {
      name: string;
      description: string;
      level: number;
      commissionRate: number;
      benefits: any[];
    } | null,
    tierName: "Not Set" as string,
    commissionRate: 0 as number,
  });
  const [performanceData, setPerformanceData] = useState({
    conversions: 0,
    commissionEarned: "$0.00",
    conversionChange: 0,
    commissionChange: 0,
    currentDateRange: "",
    previousPeriod: "",
    conversionChartData: [] as any[],
    commissionChartData: [] as any[],
    discountCodeUsage: 0,
  });
  const [detailedPerformance, setDetailedPerformance] = useState({
    conversions: {
      current: [] as any[],
      previous: [] as any[],
    },
    commission: {
      current: [] as any[],
      previous: [] as any[],
    },
  });
  const [commissionSummary, setCommissionSummary] = useState({
    currentMonth: {
      month: "",
      status: "Pending",
      totalOrders: 0,
      totalUnits: 0,
      commission: "$0.00",
    },
    previousMonths: [] as any[],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dateRangeMap: Record<string, string> = {
    Yesterday: "yesterday",
    "Last 7 days": "last_7_days",
    "Last 30 days": "last_30_days",
    "Last 6 months": "last_6_months",
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, performanceRes, detailedRes, summaryRes] = await Promise.all([
        apiClient.get("/athlete/profile"),
        apiClient.get(`/athlete/performance?dateRange=${dateRangeMap[dateRange] || "yesterday"}`),
        apiClient.get(`/athlete/detailed-performance?dateRange=${dateRangeMap[dateRange] || "yesterday"}`).catch(() => ({ data: { conversions: { current: [], previous: [] }, commission: { current: [], previous: [] } } })),
        apiClient.get("/athlete/commission-summary").catch(() => ({ data: { currentMonth: { month: "", status: "Pending", totalOrders: 0, totalUnits: 0, commission: "$0.00" }, previousMonths: [] } })),
      ]);

      setProfileData(profileRes.data);
      setPerformanceData(performanceRes.data);
      setDetailedPerformance(detailedRes.data);
      setCommissionSummary(summaryRes.data);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  if (loading) {
    return <DashboardLoading message="Loading dashboard..." />;
  }

  // Generate bar chart data for KPI cards (mock data for now - will come from API)
  const conversionBarData = performanceData.conversionChartData.length > 0 
    ? performanceData.conversionChartData 
    : Array.from({ length: 6 }, (_, i) => ({ name: `M${i + 1}`, value: Math.floor(Math.random() * 30) }));
  
  const commissionBarData = performanceData.commissionChartData.length > 0 
    ? performanceData.commissionChartData 
    : Array.from({ length: 6 }, (_, i) => ({ name: `M${i + 1}`, value: Math.floor(Math.random() * 100) }));

  // Format commission earned to extract number and pending status
  const commissionMatch = performanceData.commissionEarned.match(/\$([\d.]+)(?:\s*\(Pending\))?/);
  const commissionAmount = commissionMatch ? commissionMatch[1] : "0.00";
  const isPending = performanceData.commissionEarned.includes("Pending");

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Your Profile Section */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Your Profile</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tier Information Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Tier Information</CardTitle>
              <CardDescription className="text-gray-600">
                Your current affiliate tier and benefits
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-gray-600">Tier: </span>
                <span className="text-gray-900 font-semibold">{profileData.tierName}</span>
              </div>
              {profileData.tier?.description && (
                <div>
                  <span className="text-gray-600">Description: </span>
                  <span className="text-gray-900">{profileData.tier.description}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Commission Rate: </span>
                <span className="text-gray-900 font-semibold">{profileData.commissionRate}%</span>
              </div>
              {profileData.tier?.benefits && profileData.tier.benefits.length > 0 && (
                <div>
                  <span className="text-gray-600">Benefits: </span>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {profileData.tier.benefits.map((benefit: any, index: number) => (
                      <li key={index} className="text-gray-900 text-sm">
                        {typeof benefit === 'string' ? benefit : JSON.stringify(benefit)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Social Media Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Social Media & Allowance</CardTitle>
              <CardDescription className="text-gray-600">
                Your social media profiles and monthly allowance
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-gray-600">Instagram: </span>
                <span className="text-gray-900">{profileData.instagram || "Not set"}</span>
              </div>
              <div>
                <span className="text-gray-600">TikTok: </span>
                <span className="text-gray-900">{profileData.tiktok || "Not set"}</span>
              </div>
              <div>
                <span className="text-gray-600">Monthly Allowance: </span>
                <span className="text-gray-900 font-semibold">{profileData.spendingLimit}</span>
              </div>
            </CardContent>
          </Card>

          {/* Discount Information Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Discount Information</CardTitle>
              <CardDescription className="text-gray-600">
                Your TC Nutrition discount code details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {profileData.discountCodes && profileData.discountCodes.length > 0 ? (
                <div className="space-y-3">
                  {profileData.discountCodes.map((discount: any, index: number) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-gray-900 font-semibold font-mono text-sm">
                          {discount.code}
                        </span>
                        <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                          {discount.value}
                        </Badge>
                      </div>
                      {discount.description && (
                        <p className="text-xs text-gray-600 mt-1">
                          {discount.description}
                        </p>
                      )}
                      {discount.freeShipping && (
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs mt-2">
                          Free Shipping
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No discount codes assigned yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Your Performance Section */}
      <div>
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Your Performance</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white border-gray-300 text-gray-900">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200">
                <SelectItem value="Yesterday" className="text-gray-900">
                  Yesterday
                </SelectItem>
                <SelectItem value="Last 7 days" className="text-gray-900">
                  Last 7 days
                </SelectItem>
                <SelectItem value="Last 30 days" className="text-gray-900">
                  Last 30 days
                </SelectItem>
                <SelectItem value="Last 6 months" className="text-gray-900">
                  Last 6 months
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-700 hover:bg-gray-100 w-full sm:w-auto"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>
        </div>

        <div className="mb-4 text-xs sm:text-sm text-gray-600 space-y-1">
          <div className="break-words">Current Date Range: {performanceData.currentDateRange}</div>
          <div className="break-words">Previous Period: {performanceData.previousPeriod}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Conversions Card */}
          <Card className="bg-white border-gray-200">
              <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-gray-900">Conversions</CardTitle>
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                {performanceData.conversions}
              </div>
              <div className="flex items-center text-green-600 mb-4">
                <TrendingUp className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {performanceData.conversionChange >= 0 ? "+" : ""}
                  {performanceData.conversionChange}% from previous period
                </span>
              </div>
              {/* Bar Chart */}
              <div className="h-32 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={conversionBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                    <YAxis stroke="#9ca3af" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "6px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          {/* Commission Earned Card */}
          <Card className="bg-white border-gray-200">
              <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <CardTitle className="text-gray-900">Commission Earned</CardTitle>
                <DollarSign className="h-5 w-5 text-gray-600" />
              </div>
              <div className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                ${commissionAmount}
                {isPending && (
                  <span className="text-base sm:text-lg font-normal text-gray-500 ml-2">
                    (Pending)
                  </span>
                )}
              </div>
              <div className="flex items-center text-green-600 mb-4">
                <TrendingUp className="h-4 w-4 mr-1 flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {performanceData.commissionChange >= 0 ? "+" : ""}
                  {performanceData.commissionChange}% from previous period
                </span>
              </div>
              {/* Bar Chart */}
              <div className="h-32 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={commissionBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} />
                    <YAxis stroke="#9ca3af" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1f2937",
                        border: "1px solid #374151",
                        borderRadius: "6px",
                        color: "#fff",
                      }}
                    />
                    <Bar dataKey="value" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                Pending commission can be subject to change due to returns and adjustments.
              </p>
              </CardContent>
            </Card>
          </div>

        {/* Detailed Performance Section */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900 text-xl sm:text-2xl md:text-3xl font-bold">Detailed Performance</CardTitle>
            <CardDescription className="text-gray-600">
              Track your conversions, revenue, and commission over time.
                </CardDescription>
              </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
                <div className="flex flex-col gap-4 mb-4">
                  <TabsList className="bg-transparent border border-gray-300 w-full sm:w-auto">
                    <TabsTrigger
                      value="conversions"
                      className="data-[state=active]:bg-gray-900 data-[state=active]:text-white flex-1 sm:flex-initial"
                    >
                      Conversions
                    </TabsTrigger>
                    <TabsTrigger
                      value="commission"
                      className="data-[state=active]:bg-gray-900 data-[state=active]:text-white flex-1 sm:flex-initial"
                    >
                      Commission
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="text-sm text-gray-600">
                      Prev: {performanceData.previousPeriod}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="show-previous"
                        checked={showPrevious}
                        onCheckedChange={(checked) => setShowPrevious(checked === true)}
                        className="border-gray-300"
                      />
                      <label
                        htmlFor="show-previous"
                        className="text-sm text-gray-600 cursor-pointer"
                      >
                        Show previous
                      </label>
                    </div>
                  </div>
                </div>

                <TabsContent value="conversions" className="mt-6">
                  <div className="h-64">
                    <LineResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={detailedPerformance.conversions.current.map((item, index) => ({
                          ...item,
                          previous: showPrevious
                            ? detailedPerformance.conversions.previous[index]?.value || 0
                            : null,
                        }))}
                      >
                        <LineCartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <LineXAxis
                          dataKey="name"
                          stroke="#9ca3af"
                          fontSize={12}
                        />
                        <LineYAxis stroke="#9ca3af" fontSize={12} />
                        <LineTooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "6px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#10b981"
                          strokeWidth={2}
                          name="Current"
                          dot={{ fill: "#10b981", strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        {showPrevious && (
                          <Line
                            type="monotone"
                            dataKey="previous"
                            stroke="#a855f7"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Previous"
                            dot={{ fill: "#a855f7", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                      </LineChart>
                    </LineResponsiveContainer>
                  </div>
                </TabsContent>

                <TabsContent value="commission" className="mt-6">
                  <div className="h-64">
                    <LineResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={detailedPerformance.commission.current.map((item, index) => ({
                          ...item,
                          previous: showPrevious
                            ? detailedPerformance.commission.previous[index]?.value || 0
                            : null,
                        }))}
                      >
                        <LineCartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <LineXAxis
                          dataKey="name"
                          stroke="#9ca3af"
                          fontSize={12}
                        />
                        <LineYAxis stroke="#9ca3af" fontSize={12} />
                        <LineTooltip
                          contentStyle={{
                            backgroundColor: "#1f2937",
                            border: "1px solid #374151",
                            borderRadius: "6px",
                            color: "#fff",
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="#f97316"
                          strokeWidth={2}
                          name="Current"
                          dot={{ fill: "#f97316", strokeWidth: 2, r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                        {showPrevious && (
                          <Line
                            type="monotone"
                            dataKey="previous"
                            stroke="#a855f7"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Previous"
                            dot={{ fill: "#a855f7", strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                      </LineChart>
                    </LineResponsiveContainer>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
            {profileData.discountCodes && profileData.discountCodes.length > 0 && (
              <div className="mt-6 text-sm sm:text-base text-gray-900 text-center break-words px-2">
                Your discount codes have been used <strong className="font-bold">{performanceData.discountCodeUsage}</strong> times total.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Summary Section */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Commission Summary</h2>
        
        {/* Current Month */}
        <Card className="bg-white border-gray-200 mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-gray-900">
                  {commissionSummary.currentMonth.month || new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" })} (Current Month)
                </CardTitle>
                <Badge
                  variant={commissionSummary.currentMonth.status === "Approved" ? "default" : "secondary"}
                  className="mt-2"
                >
                  {commissionSummary.currentMonth.status}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefresh}
                disabled={refreshing}
                className="text-gray-700 w-full sm:w-auto"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-gray-600">Total Orders</div>
                <div className="text-2xl font-bold text-gray-900">
                  {commissionSummary.currentMonth.totalOrders}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Units</div>
                <div className="text-2xl font-bold text-gray-900">
                  {commissionSummary.currentMonth.totalUnits}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Commission</div>
                <div className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
                  {commissionSummary.currentMonth.commission || "Commission not calculated yet"}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-4">
              * Commission amounts are subject to pending returns.
            </p>
              </CardContent>
            </Card>

        {/* Previous Months */}
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-4">Previous Months</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
            {commissionSummary.previousMonths.map((month: any, index: number) => (
              <Card
                key={index}
                className="bg-white border-gray-200"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-gray-900 text-base font-semibold">
                      {month.month}
                    </CardTitle>
                    <Badge
                      variant={month.status === "Approved" ? "default" : "secondary"}
                      className={
                        month.status === "Approved"
                          ? "bg-green-500/20 text-green-600 border-green-500"
                          : "bg-gray-500/20 text-gray-600 border-gray-500"
                      }
                    >
                      {month.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Total Orders:</div>
                      <div className="text-base font-semibold text-gray-900">
                        {month.totalOrders}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Total Units:</div>
                      <div className="text-base font-semibold text-gray-900">
                        {month.totalUnits}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 mb-1">Commission:</div>
                      <div className="text-base font-semibold text-gray-900">
                        {month.commission}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
