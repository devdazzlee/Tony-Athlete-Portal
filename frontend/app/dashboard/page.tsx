"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRef, useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TrendingUp, RefreshCw, Users, DollarSign, Copy, Check, Target, Award, Tag } from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardLoading } from "@/components/ui/loading";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function DashboardPage() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("Yesterday");
  const [isSavingSocials, setIsSavingSocials] = useState(false);
  const [copiedAllowanceCode, setCopiedAllowanceCode] = useState<string | null>(null);
  const copiedAllowanceCodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [referralCodes, setReferralCodes] = useState<any[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
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
      const [profileRes, performanceRes, summaryRes, referralCodesRes, referralStatsRes] = await Promise.all([
        apiClient.get("/athlete/profile"),
        apiClient.get(`/athlete/performance?dateRange=${dateRangeMap[dateRange] || "yesterday"}`),
        apiClient.get("/athlete/commission-summary").catch(() => ({ data: { currentMonth: { month: "", status: "Pending", totalOrders: 0, totalUnits: 0, commission: "$0.00" }, previousMonths: [] } })),
        apiClient.get("/referral/codes").catch(() => ({ data: [] })),
        apiClient.get("/referral/stats").catch(() => ({ data: null })),
      ]);

      setProfileData(profileRes.data);
      setPerformanceData(performanceRes.data);
      setCommissionSummary(summaryRes.data);
      setReferralCodes(referralCodesRes.data);
      setReferralStats(referralStatsRes.data);
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const saveSocialHandles = async () => {
    setIsSavingSocials(true);
    try {
      const response = await apiClient.put("/athlete/profile/social", {
        instagram: profileData.instagram,
        tiktok: profileData.tiktok,
      });

      setProfileData((prev) => ({
        ...prev,
        instagram: response.data?.instagram ?? prev.instagram,
        tiktok: response.data?.tiktok ?? prev.tiktok,
      }));

      toast.success("Social handles updated");
    } catch (error) {
      toast.error("Failed to update social handles");
    } finally {
      setIsSavingSocials(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  useEffect(() => {
    return () => {
      if (copiedAllowanceCodeTimeoutRef.current) {
        clearTimeout(copiedAllowanceCodeTimeoutRef.current);
      }
    };
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success("Data refreshed");
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
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
          {/* Monthly allowance & commission rate */}
          <Card className="bg-white border-gray-200 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-gray-900">Monthly allowance &amp; commission rate</CardTitle>
                  <div className="text-sm text-gray-500 mt-1">Your current monthly allowance and earnings rate</div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-600">Monthly allowance</div>
                    <DollarSign className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="mt-2 text-2xl font-bold text-gray-900">{profileData.spendingLimit}</div>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-600">Commission rate</div>
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <div className="text-2xl font-bold text-gray-900">{profileData.commissionRate}%</div>
                    <Badge className="bg-purple-100 text-purple-800 border-purple-200">Current</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Social Media Card */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Social Media Information</CardTitle>
              <CardDescription className="text-gray-600">
                Your social media profiles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-gray-700 block mb-2">Instagram</Label>
                <Input
                  value={profileData.instagram || ""}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, instagram: e.target.value }))
                  }
                  placeholder="yourhandle"
                  className="h-11 !bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  disabled={isSavingSocials}
                />
              </div>
              <div>
                <Label className="text-gray-700 block mb-2">TikTok</Label>
                <Input
                  value={profileData.tiktok || ""}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, tiktok: e.target.value }))
                  }
                  placeholder="yourhandle"
                  className="h-11 !bg-white border-gray-300 text-gray-900 placeholder:text-gray-500"
                  disabled={isSavingSocials}
                />
              </div>
              <Button
                className="w-full"
                onClick={saveSocialHandles}
                disabled={isSavingSocials}
              >
                {isSavingSocials ? "Saving..." : "Save"}
              </Button>
            </CardContent>
          </Card>

          {/* Allowance Code & Monthly Allowance Information Card */}
          <Card className="bg-white border-gray-200 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-600" />
                    Allowance &amp; Codes
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Your monthly allowance and personal discount codes
                  </CardDescription>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <Copy className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Your Discount Codes</div>
                <Badge variant="outline" className="text-[11px]">
                  {referralCodes.filter((c) => c.type === "COUPON").length} codes
                </Badge>
              </div>

              {referralCodes.filter((c) => c.type === "COUPON").length > 0 ? (
                <div className="space-y-3">
                  {referralCodes
                    .filter((c) => c.type === "COUPON")
                    .map((code: any, index: number) => (
                      <div
                        key={index}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100/60 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-gray-900 font-bold font-mono text-base sm:text-lg break-all">
                              {code.code}
                            </div>
                            <div className="text-xs text-gray-500 italic mt-1">Allowance Code</div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                              {code.commissionRate}% OFF
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await copyToClipboard(code.code, "Allowance code");

                                setCopiedAllowanceCode(code.code);
                                if (copiedAllowanceCodeTimeoutRef.current) {
                                  clearTimeout(copiedAllowanceCodeTimeoutRef.current);
                                }
                                copiedAllowanceCodeTimeoutRef.current = setTimeout(() => {
                                  setCopiedAllowanceCode(null);
                                }, 1500);
                              }}
                              className="h-9 px-3"
                            >
                              {copiedAllowanceCode === code.code ? (
                                <>
                                  <Check className="h-4 w-4 mr-2" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Copy
                                </>
                              )}
                            </Button>
                          </div>
                        </div>

                        {code.description && (
                          <div className="mt-3 text-sm text-gray-700 rounded-lg border border-gray-200 bg-white px-3 py-2">
                            {code.description}
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          {code.freeShipping && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px]">
                              Free Shipping
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[11px]">
                            {code.currentUses} uses
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  No allowance codes assigned yet
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

        {/* Referral System Section - Integrated from Tracking */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-6 w-6 text-gray-900" />
            <h3 className="text-xl font-bold text-gray-900">Referral System</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Referral Stats Summary */}
            <Card className="bg-white border-gray-200 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">Total Referrals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">{referralStats?.totalReferrals || 0}</div>
                <div className="flex items-center text-sm text-blue-600 mt-1">
                  <Target className="h-4 w-4 mr-1" />
                  {referralStats?.conversionRate.toFixed(1) || 0}% conversion rate
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">Referral Earnings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">${referralStats?.totalCommissions.toFixed(2) || "0.00"}</div>
                <div className="text-xs text-gray-500 mt-1">${referralStats?.pendingCommissions.toFixed(2) || "0.00"} pending</div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200 md:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500 uppercase">Active Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900">
                  {referralCodes.filter(c => c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date())).length}
                </div>
                <div className="text-xs text-gray-500 mt-1">{referralCodes.length} total codes</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {referralCodes.filter(c => c.type !== "COUPON").slice(0, 4).map((code: any) => (
              <Card key={code.id} className="bg-white border-gray-200 hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold font-mono text-gray-900">{code.code}</span>
                        <Badge variant={code.isActive ? "default" : "secondary"} className="text-[10px]">
                          {code.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        {code.commissionRate}% commission • {code.currentUses} uses
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(code.code, "Referral code")}
                      className="h-9"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {referralCodes.filter(c => c.type !== "COUPON").length === 0 && (
              <div className="lg:col-span-2 text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500">No referral tracking codes assigned yet.</p>
              </div>
            )}
          </div>
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
