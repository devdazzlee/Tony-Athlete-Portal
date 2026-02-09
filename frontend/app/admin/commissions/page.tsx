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

interface Commission {
  id: string;
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
  const [updatingCommissions, setUpdatingCommissions] = useState<
    Map<string, string>
  >(new Map()); // Track which commission is being updated and the action type
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

  // Fetch analytics on mount and when filters change
  useEffect(() => {
    fetchAnalytics();
  }, []);

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
        "/commission-management/analytics?period=30d"
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
            disabled={isTableLoading}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Commissions
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.totalCommissions}
              </div>
              <p className="text-xs text-muted-foreground">
                ${analytics.totalAmount.toFixed(2)} total value
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Paid Commissions
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.statusBreakdown.find((s) => s.status === "PAID")
                  ?._count.id || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                $
                {analytics.statusBreakdown
                  .find((s) => s.status === "PAID")
                  ?._sum.commissionAmount.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.statusBreakdown.find((s) => s.status === "PENDING")
                  ?._count.id || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                $
                {analytics.statusBreakdown
                  .find((s) => s.status === "PENDING")
                  ?._sum.commissionAmount.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Top Affiliates
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.topAffiliates.length}
              </div>
              <p className="text-xs text-muted-foreground">Active performers</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            Filters
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Refine the commissions list by status, affiliate, date range, and sort order.
          </CardDescription>
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
        </CardContent>
      </Card>

      {/* Commissions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Commissions</CardTitle>
          <CardDescription>
            Manage and track affiliate commission payments
          </CardDescription>
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
                  <TableHead>Affiliate</TableHead>
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
                      colSpan={6}
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
