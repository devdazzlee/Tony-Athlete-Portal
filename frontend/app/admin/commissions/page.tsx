"use client";

import { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DollarSign,
  TrendingUp,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  Filter,
  Download,
  Eye,
  Edit,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { AdminLoading } from "@/components/ui/loading";
import { DatePicker } from "@/components/ui/date-picker";

interface AffiliateOption {
  id: string;
  name: string;
  email: string;
}

interface Commission {
  id: string;
  orderId?: string | null;
  amount: number;
  rate: number;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  createdAt: string;
  payoutDate?: string;
  bankDetails?: CommissionBankDetails | null;
  affiliate: {
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  conversion?: {
    orderValue: number;
    offer: {
      name: string;
      description: string;
    };
  };
}

interface AffiliateTotals {
  commissions: {
    pendingCount: number;
    pendingAmount: number;
    approvedCount: number;
    approvedAmount: number;
    paidCount: number;
    paidAmount: number;
  };
  payouts: {
    paidCount: number;
    paidAmount: number;
    pendingCount: number;
    pendingAmount: number;
  };
}

interface CommissionAnalytics {
  period: string;
  totalCommissions: number;
  totalAmount: number;
  statusBreakdown: Array<{
    status: string;
    _sum: { commissionAmount: number };
    _count: { id: number };
  }>;
  topAffiliates: Array<{
    affiliateId: string;
    affiliateName: string;
    affiliateEmail: string;
    _sum: { commissionAmount: number };
    _count: { id: number };
  }>;
  dailyStats: Array<{
    createdAt: string;
    _sum: { commissionAmount: number };
    _count: { id: number };
  }>;
}

interface CommissionBankDetails {
  accountHolder?: string;
  bankName?: string;
  accountNumber?: string;
  routingNumber?: string;
  swiftCode?: string;
  iban?: string;
  currency?: string;
  notes?: string;
  address?: string;
  payoutMethod?: string;
  payoutEmail?: string;
  payoutFrequency?: string;
  minimumPayout?: number;
}

type SortByOption =
  | "createdAt"
  | "commissionAmount"
  | "orderValue"
  | "status";

type FiltersState = {
  status: string;
  affiliateId: string;
  affiliateSearch: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
  sortBy: SortByOption;
  sortOrder: "asc" | "desc";
};

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [analytics, setAnalytics] = useState<CommissionAnalytics | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For initial page load
  const [isTableLoading, setIsTableLoading] = useState(false); // For table filtering/loading
  const [isExporting, setIsExporting] = useState(false);
  const [updatingCommissions, setUpdatingCommissions] = useState<
    Map<string, string>
  >(new Map()); // Track which commission is being updated and the action type
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<
    Set<string>
  >(new Set());
  const [affiliates, setAffiliates] = useState<AffiliateOption[]>([]);
  const [isAffiliatesLoading, setIsAffiliatesLoading] = useState(false);
  const [affiliateTotals, setAffiliateTotals] = useState<AffiliateTotals | null>(
    null
  );
  const [filters, setFilters] = useState<FiltersState>({
    status: "all",
    affiliateId: "",
    affiliateSearch: "", // Search by affiliate name or email
    dateFrom: undefined,
    dateTo: undefined,
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10, // 10 per page to match payouts
    total: 0,
    pages: 0,
  });
  const [bankDetailsModal, setBankDetailsModal] = useState<{
    isOpen: boolean;
    affiliateName: string;
    bankDetails: CommissionBankDetails | null;
  }>({
    isOpen: false,
    affiliateName: "",
    bankDetails: null,
  });

  const [topAffiliatesModalOpen, setTopAffiliatesModalOpen] = useState(false);

  const formatMethodLabel = (method?: string | null) => {
    if (!method) return "Not Set";
    return method
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const renderDetail = (
    label: string,
    value?: string | number | null,
    formatter?: (val: string) => string
  ) => {
    const displayValue =
      value === undefined || value === null || value === ""
        ? "Not provided"
        : formatter
        ? formatter(String(value))
        : String(value);

    return (
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground break-words">
          {displayValue}
        </p>
      </div>
    );
  };

  const openBankDetailsModal = (
    affiliateName: string,
    bankDetails: CommissionBankDetails | null
  ) => {
    setBankDetailsModal({
      isOpen: true,
      affiliateName,
      bankDetails,
    });
  };

  const closeBankDetailsModal = () => {
    setBankDetailsModal((prev) => ({ ...prev, isOpen: false }));
  };

  const applyStatusFilter = (
    status: "all" | "PENDING" | "APPROVED" | "PAID"
  ) => {
    setFilters((prev) => ({ ...prev, status }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const fetchAffiliates = async () => {
    setIsAffiliatesLoading(true);
    try {
      const response = await apiClient.get("/admin/affiliates?limit=500");
      const data = response.data;
      const list = (data?.data || []).map((aff: any) => ({
        id: aff.id,
        name: aff.name || "Unknown",
        email: aff.email || "",
      }));
      setAffiliates(list);
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      setAffiliates([]);
    } finally {
      setIsAffiliatesLoading(false);
    }
  };

  const fetchAffiliateTotals = async (affiliateId: string) => {
    try {
      const response = await apiClient.get(
        `/commission-management/affiliate-totals?affiliateId=${affiliateId}`
      );
      setAffiliateTotals(response.data);
    } catch (error) {
      console.error("Error fetching affiliate totals:", error);
      setAffiliateTotals(null);
    }
  };

  const buildCommissionQueryParams = (override?: {
    page?: number;
    limit?: number;
  }) => {
    const params = new URLSearchParams();
    params.append("page", String(override?.page ?? pagination.page));
    params.append("limit", String(override?.limit ?? pagination.limit));

    if (filters.status && filters.status !== "all") {
      params.append("status", filters.status);
    }
    if (filters.affiliateId) {
      params.append("affiliateId", filters.affiliateId);
    }
    if (filters.affiliateSearch) {
      params.append("affiliateSearch", filters.affiliateSearch);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      from.setHours(0, 0, 0, 0);
      params.append("dateFrom", from.toISOString());
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      params.append("dateTo", to.toISOString());
    }
    if (filters.sortBy) {
      params.append("sortBy", filters.sortBy);
    }
    if (filters.sortOrder) {
      params.append("sortOrder", filters.sortOrder);
    }

    return params;
  };

  const handleBulkStatusUpdate = async (status: "APPROVED" | "PAID") => {
    const ids = Array.from(selectedCommissionIds);
    if (ids.length === 0) {
      toast.error("Select at least one commission");
      return;
    }

    try {
      setIsTableLoading(true);
      await apiClient.patch("/commission-management/bulk-status", {
        commissionIds: ids,
        status,
      });
      toast.success(
        status === "APPROVED"
          ? "Selected commissions approved"
          : "Selected commissions marked as paid"
      );
      await fetchCommissions();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Bulk update failed"
      );
    } finally {
      setIsTableLoading(false);
    }
  };

  const exportCsv = async () => {
    try {
      setIsExporting(true);
      const params = buildCommissionQueryParams({ page: 1, limit: 5000 });
      const response = await apiClient.get(
        `/commission-management?${params.toString()}`
      );
      const rows: Commission[] = response.data?.data || [];

      const header = [
        "commission_id",
        "order_id",
        "affiliate_name",
        "affiliate_email",
        "amount",
        "rate",
        "status",
        "created_at",
      ];

      const csvLines = [
        header.join(","),
        ...rows.map((c) => {
          const affiliateName = `${c.affiliate.user.firstName} ${c.affiliate.user.lastName}`;
          const values = [
            c.id,
            c.orderId || "",
            affiliateName,
            c.affiliate.user.email,
            String(c.amount ?? ""),
            String(c.rate ?? ""),
            c.status,
            c.createdAt,
          ];
          return values
            .map((v) => {
              const safe = String(v ?? "").replace(/\r?\n/g, " ");
              const escaped = safe.replace(/"/g, '""');
              return `"${escaped}"`;
            })
            .join(",");
        }),
      ].join("\n");

      const blob = new Blob([csvLines], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `commissions_export_${new Date()
        .toISOString()
        .slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success("Export downloaded");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Export failed"
      );
    } finally {
      setIsExporting(false);
    }
  };

  // Fetch analytics on mount and when filters change
  useEffect(() => {
    fetchAnalytics();
    fetchAffiliates();
  }, []);

  useEffect(() => {
    if (filters.affiliateId) {
      fetchAffiliateTotals(filters.affiliateId);
    } else {
      setAffiliateTotals(null);
    }
  }, [filters.affiliateId]);

  // Debounce affiliate search to avoid too many API calls
  useEffect(() => {
    if (!filters.affiliateSearch) {
      // If no search, fetch immediately
      fetchCommissions();
      return;
    }

    // Debounce search input
    const timer = setTimeout(() => {
      fetchCommissions();
    }, 500); // 500ms delay for search

    return () => clearTimeout(timer);
  }, [filters.affiliateSearch]);

  // Fetch commissions when other filters change (excluding affiliateSearch)
  useEffect(() => {
    if (!filters.affiliateSearch) {
      // Only fetch if not searching (to avoid duplicate calls)
      fetchCommissions();
    }
  }, [
    filters.status,
    filters.affiliateId,
    filters.dateFrom,
    filters.dateTo,
    filters.sortBy,
    filters.sortOrder,
    pagination.page,
  ]);

  const fetchCommissions = async () => {
    try {
      // Use table loading for subsequent loads, initial loading for first load
      if (isInitialLoading) {
        setIsInitialLoading(true);
      } else {
        setIsTableLoading(true);
      }

      // Build query parameters properly
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());

      // Add filters only if they have values
      if (filters.status && filters.status !== "all") {
        params.append("status", filters.status);
      }

      if (filters.affiliateId) {
        params.append("affiliateId", filters.affiliateId);
      }

      if (filters.affiliateSearch) {
        params.append("affiliateSearch", filters.affiliateSearch);
      }

      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom);
        from.setHours(0, 0, 0, 0);
        params.append("dateFrom", from.toISOString());
      }

      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setHours(23, 59, 59, 999);
        params.append("dateTo", to.toISOString());
      }

      if (filters.sortBy) {
        params.append("sortBy", filters.sortBy);
      }

      if (filters.sortOrder) {
        params.append("sortOrder", filters.sortOrder);
      }

      const response = await apiClient.get(
        `/commission-management?${params.toString()}`
      );
      const data = response.data;
      setCommissions(data.data || data.commissions || []);
      setSelectedCommissionIds(new Set());
      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        }
      );
    } catch (error: any) {
      console.error("Error fetching commissions:", error);
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error.message ||
          "Failed to load commissions"
      );
    } finally {
      setIsInitialLoading(false);
      setIsTableLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await apiClient.get(
        "/commission-management/analytics?period=all"
      );
      setAnalytics(response.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const updateCommissionStatus = async (
    commissionId: string,
    status: string,
    notes?: string
  ) => {
    // Set loading state for this commission and action
    setUpdatingCommissions((prev) => {
      const newMap = new Map(prev);
      newMap.set(commissionId, status);
      return newMap;
    });

    try {
      await apiClient.patch(
        `/commission-management/${commissionId}/status`,
        { status, notes }
      );
      toast.success("Commission status updated successfully");
      // Update the commission in the list immediately for better UX
      setCommissions((prev) =>
        prev.map((commission) =>
          commission.id === commissionId
            ? { ...commission, status: status as any }
            : commission
        )
      );
      // Refresh the full list to ensure data consistency
      fetchCommissions();
    } catch (error) {
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to update commission status"
      );
    } finally {
      // Clear loading state
      setUpdatingCommissions((prev) => {
        const newMap = new Map(prev);
        newMap.delete(commissionId);
        return newMap;
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: "secondary",
      APPROVED: "default",
      PAID: "default",
      CANCELLED: "destructive",
    } as const;

    const icons = {
      PENDING: Clock,
      APPROVED: CheckCircle,
      PAID: CheckCircle,
      CANCELLED: XCircle,
    };

    const Icon = icons[status as keyof typeof icons];

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  // Show full page loading only on initial load
  if (isInitialLoading) {
    return <AdminLoading message="Loading commissions..." />;
  }

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <Dialog
        open={topAffiliatesModalOpen}
        onOpenChange={(open) => setTopAffiliatesModalOpen(open)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Top Affiliates</DialogTitle>
            <DialogDescription>
              Click an affiliate to filter the commissions table.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {(analytics?.topAffiliates || []).length === 0 ? (
              <div className="text-sm text-muted-foreground">No data</div>
            ) : (
              <div className="space-y-2">
                {analytics!.topAffiliates.map((a) => (
                  <button
                    key={a.affiliateId}
                    type="button"
                    className="w-full text-left rounded-lg border p-3 hover:bg-muted/40 transition-colors"
                    onClick={() => {
                      setFilters((prev) => ({
                        ...prev,
                        affiliateId: a.affiliateId,
                        affiliateSearch: "",
                      }));
                      setPagination((prev) => ({ ...prev, page: 1 }));
                      setTopAffiliatesModalOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">
                          {a.affiliateName}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {a.affiliateEmail}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-semibold">
                          ${(a._sum.commissionAmount || 0).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a._count.id} commissions
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Commission Management
          </h1>
          <p className="text-muted-foreground">
            Manage affiliate commissions and payouts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={isTableLoading || isExporting}
            onClick={exportCsv}
          >
            <Download className="w-4 h-4 mr-2" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => applyStatusFilter("all")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Total Commissions
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {analytics.totalCommissions}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ${analytics.totalAmount.toFixed(2)} total value
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                  <DollarSign className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => applyStatusFilter("PAID")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Paid
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {analytics.statusBreakdown.find((s) => s.status === "PAID")
                      ?._count.id || 0}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    $
                    {analytics.statusBreakdown
                      .find((s) => s.status === "PAID")
                      ?._sum.commissionAmount.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                  <CheckCircle className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => applyStatusFilter("PENDING")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Pending
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {analytics.statusBreakdown.find((s) => s.status === "PENDING")
                      ?._count.id || 0}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    $
                    {analytics.statusBreakdown
                      .find((s) => s.status === "PENDING")
                      ?._sum.commissionAmount.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => applyStatusFilter("APPROVED")}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Approved
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {analytics.statusBreakdown.find((s) => s.status === "APPROVED")
                      ?._count.id || 0}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    $
                    {analytics.statusBreakdown
                      .find((s) => s.status === "APPROVED")
                      ?._sum.commissionAmount.toFixed(2) || "0.00"}
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => setTopAffiliatesModalOpen(true)}
          >
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-muted-foreground">
                    Top Affiliates
                  </div>
                  <div className="mt-1 text-2xl font-bold">
                    {analytics.topAffiliates.length}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    View and filter
                  </div>
                </div>
                <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5 text-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                Filters
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Search, filter, and sort commissions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Search Affiliate</Label>
              <Input
                type="text"
                placeholder="Name or email..."
                value={filters.affiliateSearch}
                onChange={(e) => {
                  setFilters((prev) => ({
                    ...prev,
                    affiliateSearch: e.target.value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-11 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label>Affiliate</Label>
              <Select
                value={filters.affiliateId || "all"}
                onValueChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    affiliateId: value === "all" ? "" : value,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue
                    placeholder={
                      isAffiliatesLoading
                        ? "Loading affiliates..."
                        : "All affiliates"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All affiliates</SelectItem>
                  {affiliates.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} {a.email ? `(${a.email})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>From Date</Label>
              <DatePicker
                value={filters.dateFrom}
                onChange={(date) => {
                  setFilters((prev) => ({
                    ...prev,
                    dateFrom: date,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="dd/mm/yyyy"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <DatePicker
                value={filters.dateTo}
                onChange={(date) => {
                  setFilters((prev) => ({
                    ...prev,
                    dateTo: date,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                placeholder="dd/mm/yyyy"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => {
                  setFilters((prev) => ({ ...prev, status: value }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Sort By</Label>
              <Select
                value={filters.sortBy}
                onValueChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    sortBy: value as SortByOption,
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="commissionAmount">
                    Commission Amount
                  </SelectItem>
                  <SelectItem value="orderValue">Order Value</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <Select
                value={filters.sortOrder}
                onValueChange={(value) => {
                  setFilters((prev) => ({
                    ...prev,
                    sortOrder: value as "asc" | "desc",
                  }));
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Descending</SelectItem>
                  <SelectItem value="asc">Ascending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setFilters({
                    status: "all",
                    affiliateId: "",
                    affiliateSearch: "",
                    dateFrom: undefined,
                    dateTo: undefined,
                    sortBy: "createdAt",
                    sortOrder: "desc",
                  });
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                variant="outline"
                className="w-full h-11 rounded-lg gap-2"
              >
                <Filter className="w-4 h-4" />
                Clear Filters
              </Button>
            </div>
          </div>

          {filters.affiliateId && affiliateTotals && (
            <div className="mt-4 rounded-xl border bg-white p-4">
              <div className="text-sm font-semibold text-gray-900 mb-3">
                Affiliate Totals
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Pending (Not Approved)</div>
                  <div className="text-sm font-semibold">
                    ${affiliateTotals.commissions.pendingAmount.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {affiliateTotals.commissions.pendingCount} commissions
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Approved (Not Paid)</div>
                  <div className="text-sm font-semibold">
                    ${affiliateTotals.commissions.approvedAmount.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {affiliateTotals.commissions.approvedCount} commissions
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Paid Commissions</div>
                  <div className="text-sm font-semibold">
                    ${affiliateTotals.commissions.paidAmount.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {affiliateTotals.commissions.paidCount} commissions
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Paid Payouts</div>
                  <div className="text-sm font-semibold">
                    ${affiliateTotals.payouts.paidAmount.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {affiliateTotals.payouts.paidCount} payouts
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Pending Payouts</div>
                  <div className="text-sm font-semibold">
                    ${affiliateTotals.payouts.pendingAmount.toFixed(2)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {affiliateTotals.payouts.pendingCount} payouts
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <CardTitle>Commissions</CardTitle>
                <CardDescription>
                  Review transactions, approve, and mark as paid.
                </CardDescription>
              </div>

              {selectedCommissionIds.size > 0 && (
                <div className="flex flex-col sm:items-end gap-2">
                  <div className="text-sm font-medium">
                    {selectedCommissionIds.size} selected
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTableLoading}
                      onClick={() => handleBulkStatusUpdate("APPROVED")}
                    >
                      Bulk Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isTableLoading}
                      onClick={() => handleBulkStatusUpdate("PAID")}
                    >
                      Bulk Mark Paid
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative rounded-md border overflow-x-auto">
            {/* Loading Overlay */}
            {isTableLoading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-md">
                <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">
                    <Checkbox
                      checked={
                        commissions.length > 0 &&
                        selectedCommissionIds.size === commissions.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedCommissionIds(
                            new Set(commissions.map((c) => c.id))
                          );
                        } else {
                          setSelectedCommissionIds(new Set());
                        }
                      }}
                    />
                  </TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Order #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Rate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isTableLoading && commissions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No commissions found. Create some referral codes to
                      generate commissions.
                    </TableCell>
                  </TableRow>
                ) : (
                  commissions.map((commission) => (
                    <TableRow key={commission.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedCommissionIds.has(commission.id)}
                          onCheckedChange={(checked) => {
                            setSelectedCommissionIds((prev) => {
                              const next = new Set(prev);
                              if (checked) next.add(commission.id);
                              else next.delete(commission.id);
                              return next;
                            });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {commission.affiliate.user.firstName}{" "}
                            {commission.affiliate.user.lastName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {commission.affiliate.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {commission.orderId || "-"}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${commission.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{commission.rate}%</TableCell>
                      <TableCell>{getStatusBadge(commission.status)}</TableCell>
                      <TableCell>
                        {new Date(commission.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "2-digit",
                            day: "2-digit",
                          }
                        )}
                      </TableCell>
                      <TableCell>
                        {commission.bankDetails ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openBankDetailsModal(
                                `${commission.affiliate.user.firstName} ${commission.affiliate.user.lastName}`,
                                commission.bankDetails ?? null
                              )
                            }
                          >
                            <Eye className="h-4 w-4 mr-2" /> View
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Not provided
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateCommissionStatus(commission.id, "APPROVED")
                            }
                            disabled={
                              commission.status === "APPROVED" ||
                              commission.status === "PAID" ||
                              isTableLoading ||
                              updatingCommissions.has(commission.id)
                            }
                          >
                            {updatingCommissions.get(commission.id) ===
                            "APPROVED" ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              "Approve"
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              updateCommissionStatus(commission.id, "PAID")
                            }
                            disabled={
                              commission.status === "PAID" ||
                              isTableLoading ||
                              updatingCommissions.has(commission.id)
                            }
                          >
                            {updatingCommissions.get(commission.id) ===
                            "PAID" ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Marking...
                              </>
                            ) : (
                              "Mark Paid"
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
                of {pagination.total} commissions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page - 1 })
                  }
                  disabled={pagination.page === 1 || isTableLoading}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setPagination({ ...pagination, page: pagination.page + 1 })
                  }
                  disabled={
                    pagination.page === pagination.pages || isTableLoading
                  }
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={bankDetailsModal.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            closeBankDetailsModal();
          }
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Bank Details</DialogTitle>
            <DialogDescription>
              {bankDetailsModal.affiliateName || "Affiliate information"}
            </DialogDescription>
          </DialogHeader>

          {bankDetailsModal.bankDetails ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderDetail(
                  "Account Holder",
                  bankDetailsModal.bankDetails.accountHolder
                )}
                {renderDetail(
                  "Bank Name",
                  bankDetailsModal.bankDetails.bankName
                )}
                {renderDetail(
                  "Account Number",
                  bankDetailsModal.bankDetails.accountNumber
                )}
                {renderDetail(
                  "Routing Number",
                  bankDetailsModal.bankDetails.routingNumber
                )}
                {renderDetail(
                  "SWIFT / BIC",
                  bankDetailsModal.bankDetails.swiftCode
                )}
                {renderDetail("IBAN", bankDetailsModal.bankDetails.iban)}
                {renderDetail(
                  "Currency",
                  bankDetailsModal.bankDetails.currency
                )}
                {renderDetail(
                  "Payout Method",
                  bankDetailsModal.bankDetails.payoutMethod
                )}
                {renderDetail(
                  "Payout Email",
                  bankDetailsModal.bankDetails.payoutEmail
                )}
                {renderDetail(
                  "Payout Frequency",
                  bankDetailsModal.bankDetails.payoutFrequency
                )}
                {renderDetail(
                  "Minimum Payout",
                  bankDetailsModal.bankDetails.minimumPayout,
                  (val) => `$${Number(val).toFixed(2)}`
                )}
              </div>

              {bankDetailsModal.bankDetails.address && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Bank Address
                  </p>
                  <p className="text-sm font-semibold whitespace-pre-wrap">
                    {bankDetailsModal.bankDetails.address}
                  </p>
                </div>
              )}

              {bankDetailsModal.bankDetails.notes && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Notes
                  </p>
                  <p className="text-sm font-semibold whitespace-pre-wrap">
                    {bankDetailsModal.bankDetails.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This affiliate has not provided bank details yet.
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
