"use client";

import { useState, useEffect } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, DollarSign, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { AdminLoading } from "@/components/ui/loading";

interface Payout {
  id: string;
  affiliateId: string;
  affiliateName: string;
  amount: number;
  method: string;
  status: string;
  requestDate: string;
  email: string;
  commissionsCount: number;
  processedDate?: string;
}

interface PayoutSummary {
  pending: number;
  processing: number;
  completed: number;
  totalPendingAmount: number;
}

export default function PayoutsManagementPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true); // For initial page load
  const [isTableLoading, setIsTableLoading] = useState(false); // For table filtering/loading
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10, // 10 per page as requested
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    fetchPayouts();
  }, [statusFilter, pagination.page]);

  const fetchPayouts = async () => {
    // Use table loading for subsequent loads, initial loading for first load
    if (isInitialLoading) {
      setIsInitialLoading(true);
    } else {
      setIsTableLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
      if (statusFilter !== "all") {
        params.append("status", statusFilter.toUpperCase());
      }

      const response = await apiClient.get(`/admin/payouts?${params.toString()}`);
      const data = response.data;
      setPayouts(data.data || []);
      setSummary(data.summary || null);
      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0,
        }
      );
    } catch (error: any) {
      console.error("Error fetching payouts:", error);
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          error.message ||
          "Failed to load payouts"
      );
    } finally {
      setIsInitialLoading(false);
      setIsTableLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchPayouts();
    setIsRefreshing(false);
    toast.success("Payouts data refreshed");
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const variants = {
      pending: "secondary",
      processing: "default",
      completed: "outline",
      failed: "destructive",
    } as const;

    const icons: Record<string, typeof CheckCircle | null> = {
      pending: null,
      processing: null,
      completed: CheckCircle,
      failed: null,
    };

    const Icon = icons[statusLower] || null;

    return (
      <Badge variant={variants[statusLower as keyof typeof variants]}>
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {status}
      </Badge>
    );
  };

  // Show full page loading only on initial load
  if (isInitialLoading) {
    return <AdminLoading message="Loading payouts..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Payout Queue</h1>
          <p className="text-muted-foreground">
            Process and manage affiliate payouts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing || isTableLoading}
            className="w-full sm:w-auto"
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.completed}</div>
              <p className="text-xs text-muted-foreground">Successfully paid</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Payouts
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{payouts.length}</div>
              <p className="text-xs text-muted-foreground">All time</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payouts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Requests</CardTitle>
          <CardDescription>{payouts.length} payout requests</CardDescription>
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
                  <TableHead>Payout ID</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Request Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!isTableLoading && payouts.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No payout requests found.
                    </TableCell>
                  </TableRow>
                ) : (
                  payouts.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="font-mono text-sm">
                        {payout.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {payout.affiliateName}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {payout.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        ${payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>{payout.method}</TableCell>
                      <TableCell>{getStatusBadge(payout.status)}</TableCell>
                      <TableCell>{payout.requestDate}</TableCell>
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
                of {pagination.total} payouts
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
    </div>
  );
}
