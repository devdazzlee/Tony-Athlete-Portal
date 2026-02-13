"use client";

import { useState, useEffect } from "react";
import { DataLoading, DashboardLoading } from "@/components/ui/loading";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Copy,
  Plus,
  Eye,
  TrendingUp,
  DollarSign,
  Users,
  Target,
  Edit,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api-client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ReferralCode {
  id: string;
  code: string;
  commissionRate: number;
  productId?: string | null;
  maxUses?: number | null;
  currentUses: number;
  expiresAt?: string | null;
  isActive: boolean;
  createdAt: string;
  type?: string; // "COUPON" for admin-created codes, undefined for tracking codes
  description?: string;
  freeShipping?: boolean;
}

interface ReferralStats {
  totalReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  conversionRate: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    referrals: number;
    commissions: number;
  }>;
}

export default function ReferralsPage() {
  const { user } = useAuth();
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCode, setIsCreatingCode] = useState(false);
  const [isUpdatingCode, setIsUpdatingCode] = useState(false);
  const [isDeletingCode, setIsDeletingCode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    codeId: string | null;
    codeName: string | null;
  }>({ isOpen: false, codeId: null, codeName: null });
  const [editingCode, setEditingCode] = useState<ReferralCode | null>(null);
  const [affiliateCommissionRate, setAffiliateCommissionRate] =
    useState<number>(15);

  // Performance metrics state (moved from dashboard)
  const [dateRange, setDateRange] = useState("Yesterday");
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
  const [refreshingPerformance, setRefreshingPerformance] = useState(false);

  const dateRangeMap: Record<string, string> = {
    Yesterday: "yesterday",
    "Last 7 days": "last_7_days",
    "Last 30 days": "last_30_days",
    "Last 6 months": "last_6_months",
  };

  // Form state for creating referral code
  type NewReferralCode = {
    commissionRate: number;
    expiresAt: Date;
  };

  const [newCode, setNewCode] = useState<NewReferralCode>({
    commissionRate: 15, // Will be set from system settings
    expiresAt: new Date(),
  });

  const formatDateOnly = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const parseDateOnly = (value?: string | null) => {
    if (!value) return undefined;
    const normalized = value.includes("T") ? value.split("T")[0] : value;
    const [year, month, day] = normalized.split("-").map(Number);
    if (
      Number.isNaN(year) ||
      Number.isNaN(month) ||
      Number.isNaN(day) ||
      !year ||
      !month ||
      !day
    ) {
      return undefined;
    }
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    fetchReferralData();
  }, []);

  // Fetch performance data when dateRange changes
  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange]);

  // Refresh commission rate from system settings when create dialog opens
  useEffect(() => {
    if (showCreateDialog) {
      const fetchSystemSettings = async () => {
        try {
          const response = await apiClient.get("/system/settings/public");
          const settingsData = response.data;
          if (settingsData.commission?.defaultRate) {
            setNewCode((prev) => ({
              ...prev,
              commissionRate: settingsData.commission.defaultRate,
            }));
          }
        } catch (error) {
          console.error("Error fetching system settings:", error);
        }
      };
      fetchSystemSettings();
    }
  }, [showCreateDialog]);

  const fetchPerformanceData = async () => {
    try {
      const performanceRes = await apiClient.get(
        `/athlete/performance?dateRange=${dateRangeMap[dateRange] || "yesterday"}`
      );
      setPerformanceData(performanceRes.data);
    } catch (error) {
      console.error("Error fetching performance data:", error);
    }
  };

  const fetchReferralData = async () => {
    try {
      const [codesResponse, statsResponse, profileResponse, settingsResponse] =
        await Promise.all([
          apiClient.get("/referral/codes"),
          apiClient.get("/referral/stats"),
          apiClient.get("/settings/profile"),
          apiClient.get("/system/settings/public"),
        ]);

      const codes = codesResponse.data;
      // Use the actual commissionRate from database - don't transform it
      const formattedCodes = (codes || []).map((code: any) => ({
        ...code,
        // Use the actual commissionRate from database response
        // Only default to 0 if it's truly undefined/null
        commissionRate: code.commissionRate != null ? Number(code.commissionRate) : 0,
      }));
      setReferralCodes(formattedCodes);

      const statsData = statsResponse.data;
      setStats(statsData);

      // Get default commission rate from system settings (not from affiliate profile)
      let defaultCommissionRate = 15; // Fallback
      const settingsData = settingsResponse.data;
      if (settingsData.commission?.defaultRate) {
        defaultCommissionRate = settingsData.commission.defaultRate;
      }

      // Fetch affiliate profile to get their current commission rate (for display only)
      const profileData = profileResponse.data;
      if (profileData.affiliate?.commissionRate) {
        const commissionRate = profileData.affiliate.commissionRate;
        setAffiliateCommissionRate(commissionRate);
      }

      // Use system default commission rate for new codes
      setNewCode((prev) => ({
        ...prev,
        commissionRate: defaultCommissionRate,
      }));
    } catch (error) {
      console.error("Error fetching referral data:", error);
      toast.error("Failed to load referral data");
    } finally {
      setIsLoading(false);
    }
  };

  const createReferralCode = async () => {
    if (!newCode.expiresAt) {
      toast.error("Please select an expiration date");
      return;
    }

    setIsCreatingCode(true);
    try {
      await apiClient.post("/referral/codes", {
        commissionRate: newCode.commissionRate,
        expiresAt: formatDateOnly(newCode.expiresAt),
      });

      toast.success("Referral code created successfully!");
      setShowCreateDialog(false);
      // Reset to system default commission rate
      const settingsResponse = await apiClient.get("/system/settings/public");
      let defaultCommissionRate = 15;
      if (settingsResponse.data?.commission?.defaultRate) {
        defaultCommissionRate = settingsResponse.data.commission.defaultRate;
      }
      setNewCode({
        commissionRate: defaultCommissionRate,
        expiresAt: new Date(),
      });
      fetchReferralData();
    } catch (error) {
      toast.error("Failed to create referral code");
    } finally {
      setIsCreatingCode(false);
    }
  };

  const handleEditClick = (code: ReferralCode) => {
    // Use the actual commissionRate from the code object
    // This should be the value from the database
    const normalizedExpires =
      code.expiresAt && code.expiresAt.includes("T")
        ? code.expiresAt.split("T")[0]
        : formatDateOnly(code.expiresAt ? new Date(code.expiresAt) : new Date());
    setEditingCode({
      ...code,
      commissionRate:
        code.commissionRate != null ? Number(code.commissionRate) : 0,
      expiresAt: normalizedExpires,
    });
    setShowEditDialog(true);
  };

  const handleUpdateReferralCode = async () => {
    if (!editingCode) return;

    if (!editingCode.expiresAt) {
      toast.error("Please select an expiration date");
      return;
    }

    setIsUpdatingCode(true);
    try {
      await apiClient.put(`/referral/codes/${editingCode.id}`, {
        // Commission rate is not sent in update - it's controlled by admin only
        productId: editingCode.productId || null,
        expiresAt: editingCode.expiresAt,
        isActive: editingCode.isActive,
      });

      toast.success("Referral code updated successfully!");
      setShowEditDialog(false);
      setEditingCode(null);
      fetchReferralData();
    } catch (error) {
      console.error("Error updating referral code:", error);
      toast.error("Failed to update referral code");
    } finally {
      setIsUpdatingCode(false);
    }
  };

  const handleDeleteClick = (codeId: string, codeName: string) => {
    setDeleteModal({ isOpen: true, codeId, codeName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.codeId) return;

    setIsDeletingCode(true);
    try {
      await apiClient.delete(`/referral/codes/${deleteModal.codeId}`);
      toast.success("Referral code deleted successfully!");
      setDeleteModal({ isOpen: false, codeId: null, codeName: null });
      fetchReferralData();
    } catch (error) {
      console.error("Error deleting referral code:", error);
      toast.error("Failed to delete referral code");
    } finally {
      setIsDeletingCode(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied to clipboard!`);
    } catch (error) {
      toast.error("Failed to copy to clipboard");
    }
  };

  const getStatusBadge = (code: ReferralCode) => {
    if (!code.isActive) return <Badge variant="destructive">Inactive</Badge>;
    if (code.expiresAt && new Date(code.expiresAt) < new Date())
      return <Badge variant="destructive">Expired</Badge>;
    if (code.maxUses && code.currentUses >= code.maxUses)
      return <Badge variant="destructive">Limit Reached</Badge>;
    return <Badge variant="default">Active</Badge>;
  };

  const handleRefreshAll = async () => {
    setRefreshingPerformance(true);
    await Promise.all([fetchPerformanceData(), fetchReferralData()]);
    setRefreshingPerformance(false);
    toast.success("Data refreshed");
  };

  if (isLoading) {
    return <DashboardLoading message="Loading tracking data..." />;
  }

  // Generate bar chart data for performance cards
  const conversionBarData = performanceData.conversionChartData.length > 0 
    ? performanceData.conversionChartData 
    : Array.from({ length: 6 }, (_, i) => ({ name: `M${i + 1}`, value: Math.floor(Math.random() * 30) }));
  
  const commissionBarData = performanceData.commissionChartData.length > 0 
    ? performanceData.commissionChartData 
    : Array.from({ length: 6 }, (_, i) => ({ name: `M${i + 1}`, value: Math.floor(Math.random() * 100) }));

  // Format commission earned
  const commissionMatch = performanceData.commissionEarned.match(/\$([\d.]+)(?:\s*\(Pending\))?/);
  const commissionAmount = commissionMatch ? commissionMatch[1] : "0.00";
  const isPending = performanceData.commissionEarned.includes("Pending");

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Performance & Tracking</h1>
          <p className="text-muted-foreground mt-1">
            Track your performance metrics, conversions, and manage referral codes
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={refreshingPerformance}
            className="w-full sm:w-auto"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshingPerformance ? "animate-spin" : ""}`} />
            {refreshingPerformance ? "Refreshing..." : "Refresh All"}
          </Button>
        </div>
      </div>

      {/* ===== REFERRAL STATS SECTION ===== */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Referral Overview</h2>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Total Referrals
                </CardTitle>
                <Users className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.totalReferrals}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.conversionRate.toFixed(1)}% conversion rate
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Total Earnings
                </CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  ${stats.totalCommissions.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${stats.pendingCommissions.toFixed(2)} pending
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Conversion Rate
                </CardTitle>
                <Target className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {stats.conversionRate.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
            <Card className="shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Active Tracking Codes
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {
                    referralCodes.filter(
                      (c) =>
                        c.type !== "COUPON" &&
                        c.isActive &&
                        (!c.expiresAt || new Date(c.expiresAt) > new Date())
                    ).length
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  {referralCodes.filter((c) => c.type !== "COUPON").length} total tracking codes
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ===== PERFORMANCE METRICS SECTION ===== */}
      <div>
        <div className="flex flex-col gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Performance Metrics</h2>
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
          </div>
        </div>

        <div className="mb-4 text-xs sm:text-sm text-gray-600 space-y-1">
          <div className="break-words">Current Date Range: {performanceData.currentDateRange}</div>
          <div className="break-words">Previous Period: {performanceData.previousPeriod}</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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

      {/* Edit Referral Code Dialog - Only allow activating/deactivating */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Referral Code</DialogTitle>
            <DialogDescription>
              View your referral code details. Only active/inactive status can be changed.
            </DialogDescription>
          </DialogHeader>
          {editingCode && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editCode">Referral Code</Label>
                <Input
                  id="editCode"
                  value={editingCode.code}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Code cannot be changed
                </p>
              </div>
              <div>
                <Label htmlFor="editCommissionRate">Commission Rate (%)</Label>
                <Input
                  id="editCommissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={editingCode.commissionRate}
                  disabled
                  className="bg-muted"
                  readOnly
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Commission rate: {editingCode.commissionRate}% (Only admins can change this)
                </p>
              </div>
              <div>
                <Label>Expires At</Label>
                <Input
                  value={editingCode.expiresAt 
                    ? parseDateOnly(editingCode.expiresAt)?.toLocaleDateString() || "Never"
                    : "Never"}
                  disabled
                  className="bg-muted mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Expiry date cannot be changed
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editingCode.isActive}
                  onChange={(e) =>
                    setEditingCode({
                      ...editingCode,
                      isActive: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="editIsActive" className="cursor-pointer">
                  Active
                </Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditDialog(false);
                setEditingCode(null);
              }}
              disabled={isUpdatingCode}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateReferralCode}
              disabled={isUpdatingCode}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {isUpdatingCode ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4 mr-2" />
                  Update Status
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, codeId: null, codeName: null })
        }
        onConfirm={handleDeleteConfirm}
        title="Delete Referral Code?"
        message="Are you sure you want to delete this referral code?"
        itemName={deleteModal.codeName || undefined}
        description="This action cannot be undone. Referral codes that have been used cannot be deleted."
        isLoading={isDeletingCode}
        confirmText="Delete"
      />
    </div>
  );
}
