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
import {
  TrendingUp,
  RefreshCw,
  Users,
  DollarSign,
  Copy,
  Check,
  Target,
  Tag,
  Bell,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardLoading } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";


export default function DashboardPage() {
  const { user } = useAuth();
  const [isSavingSocials, setIsSavingSocials] = useState(false);
  const [copiedAudienceCode, setCopiedAudienceCode] = useState<string | null>(null);
  const copiedAudienceCodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dashboardNotifications, setDashboardNotifications] = useState<any[]>([]);
  const [profileData, setProfileData] = useState({
    instagram: null as string | null,
    tiktok: null as string | null,
    other: null as string | null,
    discountCodes: [] as Array<{
      code: string;
      value: string;
      description?: string;
      freeShipping?: boolean;
    }>,
    spendingLimit: "Not Set",
    commissionRate: 0 as number,
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
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [profileRes, summaryRes, referralStatsRes, notificationsRes] = await Promise.all([
        apiClient.get("/athlete/profile"),
        apiClient.get("/athlete/commission-summary").catch(() => ({ data: { currentMonth: { month: "", status: "Pending", totalOrders: 0, totalUnits: 0, commission: "$0.00" }, previousMonths: [] } })),
        apiClient.get("/referral/stats").catch(() => ({ data: null })),
        apiClient.get("/athlete/dashboard-notifications").catch(() => ({ data: { items: [] } })),
      ]);

      setProfileData(profileRes.data);
      setCommissionSummary(summaryRes.data);
      setReferralStats(referralStatsRes.data);
      setDashboardNotifications(notificationsRes.data.items || []);
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
        other: profileData.other,
      });

      setProfileData((prev) => ({
        ...prev,
        instagram: response.data?.instagram ?? prev.instagram,
        tiktok: response.data?.tiktok ?? prev.tiktok,
        other: response.data?.other ?? prev.other,
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
  }, []);

  useEffect(() => {
    return () => {
      if (copiedAudienceCodeTimeoutRef.current) {
        clearTimeout(copiedAudienceCodeTimeoutRef.current);
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

  return (
    <div className="p-4 sm:p-6 space-y-6 sm:space-y-8 w-full max-w-full overflow-x-hidden">
      {/* Quick Overview Stats */}
      <div>
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Dashboard</h1>
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-700 hover:bg-gray-100"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Commission Rate */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Commission Rate</span>
                <TrendingUp className="h-4 w-4 text-purple-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{profileData.commissionRate}%</div>
            </CardContent>
          </Card>

          {/* Monthly Allowance */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Monthly Allowance</span>
                <DollarSign className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{profileData.spendingLimit}</div>
            </CardContent>
          </Card>

          {/* Total Referrals */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Total Referrals</span>
                <Users className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{referralStats?.totalReferrals || 0}</div>
              <p className="text-xs text-gray-500 mt-1">{referralStats?.conversionRate?.toFixed(1) || 0}% conversion</p>
            </CardContent>
          </Card>

          {/* Referral Earnings */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-500">Referral Earnings</span>
                <Target className="h-4 w-4 text-orange-500" />
              </div>
              <div className="text-2xl font-bold text-gray-900">${referralStats?.totalCommissions?.toFixed(2) || "0.00"}</div>
              <p className="text-xs text-gray-500 mt-1">${referralStats?.pendingCommissions?.toFixed(2) || "0.00"} pending</p>
            </CardContent>
          </Card>
        </div>

        {dashboardNotifications.length > 0 && (
          <Card className="bg-white border-gray-200 mb-6">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Notifications
              </CardTitle>
              <CardDescription className="text-gray-600">
                Updates from admin about your deliverables
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {dashboardNotifications.slice(0, 3).map((item) => (
                <div key={item.id} className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                  <p className="text-sm font-medium text-blue-900">{item.title}</p>
                  <p className="text-sm text-blue-800">{item.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

      </div>

      {/* Your Profile Section */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Your Profile</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <div>
                <Label className="text-gray-700 block mb-2">Other (App + Handle)</Label>
                <Input
                  value={profileData.other || ""}
                  onChange={(e) =>
                    setProfileData((prev) => ({ ...prev, other: e.target.value }))
                  }
                  placeholder="e.g., YouTube: @yourhandle"
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

          {/* Audience Discount Codes Card */}
          <Card className="bg-white border-gray-200 overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <CardTitle className="text-gray-900 flex items-center gap-2">
                    <Tag className="h-5 w-5 text-purple-600" />
                    Audience Discount Code
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Share these codes with your audience
                  </CardDescription>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <Copy className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Audience Discount Codes</div>
                <Badge variant="outline" className="text-[11px]">
                  {profileData.discountCodes.length} codes
                </Badge>
              </div>

              {profileData.discountCodes.length > 0 ? (
                <div className="space-y-3">
                  {profileData.discountCodes.map((code: any, index: number) => (
                      <div
                        key={index}
                        className="rounded-xl border border-gray-200 bg-gray-50 p-4 hover:bg-gray-100/60 transition-colors"
                      >
                          <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-gray-900 font-bold font-mono text-base sm:text-lg break-all">
                              {code.code}
                            </div>
                            <div className="text-xs text-gray-500 italic mt-1">
                              {code.description || "Discount Code"}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                              {code.value}
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={async () => {
                                await copyToClipboard(code.code, "Audience code");

                                setCopiedAudienceCode(code.code);
                                if (copiedAudienceCodeTimeoutRef.current) {
                                  clearTimeout(copiedAudienceCodeTimeoutRef.current);
                                }
                                copiedAudienceCodeTimeoutRef.current = setTimeout(() => {
                                  setCopiedAudienceCode(null);
                                }, 1500);
                              }}
                              className="h-9 px-3"
                            >
                              {copiedAudienceCode === code.code ? (
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

                        <div className="flex flex-wrap items-center gap-2 mt-3">
                          <Badge variant="outline" className="text-[11px]">
                            Shareable code
                          </Badge>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-xl border border-dashed border-gray-300">
                  No discount codes assigned yet
                </div>
              )}
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
            {commissionSummary.previousMonths.length > 0 ? (
              commissionSummary.previousMonths.map((month: any, index: number) => (
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
              ))
            ) : (
              <Card className="col-span-full bg-white border-gray-200">
                <CardContent className="py-8 text-center text-gray-500 text-sm">
                  No previous month data available yet.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
