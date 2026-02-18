"use client";

import { useState, useEffect, useMemo } from "react";
import { DataLoading, SectionLoading } from "@/components/ui/loading";
import { DataTable } from "@/components/dashboard/data-table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DollarSign,
  CreditCard,
  Calendar,
  Download,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";

interface Commission {
  id: string;
  date: string;
  customer: string;
  offer: string;
  saleAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  expectedPayout: string;
  referralCode: string;
  type: string;
}

interface CommissionSummary {
  pendingAmount: number;
  pendingCount: number;
  approvedAmount: number;
  approvedCount: number;
  paidAmount: number;
  paidCount: number;
  nextPayoutDate: string | null;
  nextPayoutAmount: number;
  payoutMethod?: string;
  payoutEmail?: string;
  payoutFrequency?: string;
  minimumPayout?: number;
  currency?: string;
  bankDetails?: BankDetails | null;
}

interface BankDetails {
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

interface PayoutHistoryItem {
  id: string;
  date: string;
  amount: number;
  status: string;
  method?: string;
  payoutEmail?: string;
  orderId?: string;
  referralCode?: string;
  saleAmount?: number;
  commissionRate?: number;
  commissionAmount?: number;
  payoutDate?: string | null;
  currency?: string;
}

interface PayoutSettings {
  minimumPayout: number;
  payoutMethod: string;
  payoutEmail: string;
  payoutFrequency: string;
  nextPayoutDate?: string | null;
  lastPayoutDate?: string | null;
  bankDetails?: BankDetails | null;
  taxInfo: {
    taxId: string;
    businessName: string;
    address: string | null;
  };
  notifications: {
    payoutProcessed: boolean;
    payoutPending: boolean;
    payoutFailed: boolean;
  };
}

export default function CommissionsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("30d");
  const [selectedTab, setSelectedTab] = useState("pending");
  const [selectedStatus, setSelectedStatus] = useState("PENDING");
  const [pendingCommissions, setPendingCommissions] = useState<Commission[]>(
    []
  );
  const [commissionSummary, setCommissionSummary] =
    useState<CommissionSummary | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<PayoutHistoryItem[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [settingsForm, setSettingsForm] = useState({
    payoutMethod: "PAYPAL",
    payoutEmail: "",
  });
  const [initialSettingsForm, setInitialSettingsForm] = useState(settingsForm);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [payoutSettings, setPayoutSettings] = useState<PayoutSettings | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [payoutRequestAmount, setPayoutRequestAmount] = useState("");
  const [payoutRequestReason, setPayoutRequestReason] = useState("");

  const formatPayoutMethodDisplay = (method?: string | null) => {
    if (!method) return "PayPal";

    const normalized = method.toUpperCase().replace(/\s+/g, "_");
    if (normalized === "PAYPAL") return "PayPal";

    return method
      .toString()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const isSettingsDirty = useMemo(() => {
    return JSON.stringify(settingsForm) !== JSON.stringify(initialSettingsForm);
  }, [settingsForm, initialSettingsForm]);

  const applySettingsResponse = (data: PayoutSettings) => {
    setPayoutSettings(data);

    const normalizedMethod = data.payoutMethod
      ? data.payoutMethod.toUpperCase().replace(/\s+/g, "_")
      : "PAYPAL";

    const formState = {
      payoutMethod: normalizedMethod === "PAYPAL" ? "PAYPAL" : "PAYPAL",
      payoutEmail: data.payoutEmail || "",
    };

    setSettingsForm(formState);
    setInitialSettingsForm(formState);
  };

  useEffect(() => {
    fetchCommissionsData();
    fetchPayoutSettings();
  }, [selectedPeriod, selectedStatus]);

  useEffect(() => {
    fetchPayoutHistory(historyPage);
  }, [historyPage]);

  const fetchCommissionsData = async () => {
    setPendingLoading(true);
    try {
      const response = await apiClient.get(
        `/commissions/pending?period=${selectedPeriod}&status=${selectedStatus}`
      );
      const data = response.data;
      setPendingCommissions(data?.data || []);
      setCommissionSummary(data?.summary || null);
    } catch (error) {
      console.error("Error fetching commissions:", error);
      toast.error("Failed to load commissions data");
    } finally {
      setPendingLoading(false);
    }
  };

  const fetchPayoutHistory = async (page = 1) => {
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      const response = await apiClient.get(
        `/commissions/history?${params.toString()}`
      );
      const data = response.data;
      setPayoutHistory(data?.data || []);
      if (data?.pagination) {
        setHistoryPage(data.pagination.page || 1);
        setHistoryTotalPages(data.pagination.pages || 1);
      }
    } catch (error) {
      console.error("Error fetching payout history:", error);
      toast.error("Failed to load payout history");
    } finally {
      setHistoryLoading(false);
    }
  };

  const fetchPayoutSettings = async () => {
    setSettingsLoading(true);
    try {
      const response = await apiClient.get("/commissions/settings");
      applySettingsResponse(response.data);
    } catch (error) {
      console.error("Error fetching payout settings:", error);
    } finally {
      setSettingsLoading(false);
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchCommissionsData(),
      fetchPayoutHistory(historyPage),
      fetchPayoutSettings(),
    ]);
    setIsRefreshing(false);
    toast.success("Commissions data refreshed");
  };

  const handleRequestPayout = async () => {
    if (!payoutRequestAmount || parseFloat(payoutRequestAmount) <= 0) {
      toast.error("Please enter a valid payout amount");
      return;
    }

    try {
      await apiClient.post("/commissions/request-payout", {
        amount: parseFloat(payoutRequestAmount),
        reason: payoutRequestReason,
      });
      toast.success("Payout request submitted successfully");
      setPayoutRequestAmount("");
      setPayoutRequestReason("");
      fetchCommissionsData(); // Refresh data
    } catch (error) {
      console.error("Error requesting payout:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to submit payout request"
      );
    }
  };

  const handleSaveSettings = async () => {
    if (isSavingSettings) return;

    setIsSavingSettings(true);
    try {
      const payload = {
        payoutMethod: "PAYPAL",
        payoutEmail: settingsForm.payoutEmail,
      };

      const response = await apiClient.put("/commissions/settings", payload);
      applySettingsResponse(response.data);
      toast.success("Payout settings updated");
      fetchCommissionsData();
    } catch (error) {
      console.error("Error saving payout settings:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to update payout settings"
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

  const formatCurrency = (value: number, currencyOverride?: string) => {
    const currency = currencyOverride || commissionSummary?.currency || "USD";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(value || 0);
  };

  const formatDate = (value: string | null) => {
    if (!value) return "N/A";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const getStatusBadge = (status: string) => {
    if (!status) {
      return (
        <Badge variant="secondary">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }

    const normalizedStatus = status.toLowerCase();
    const variants = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      processing: "default",
      approved: "default",
      paid: "default",
      cancelled: "destructive",
    } as const;

    const icons = {
      pending: Clock,
      completed: CheckCircle,
      failed: XCircle,
      processing: Clock,
      approved: CheckCircle,
      paid: CheckCircle,
      cancelled: XCircle,
    };

    const iconKey = normalizedStatus as keyof typeof icons;
    const variantKey = normalizedStatus as keyof typeof variants;
    const Icon = icons[iconKey] || Clock;
    const variant = variants[variantKey] || "secondary";
    const label =
      normalizedStatus.charAt(0).toUpperCase() +
      normalizedStatus.slice(1).replace(/_/g, " ");

    return (
      <Badge variant={variant}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </Badge>
    );
  };

  const totalPendingAmount =
    commissionSummary?.pendingAmount ||
    pendingCommissions.reduce((sum, comm) => sum + comm.commissionAmount, 0);
  const totalPaidAmount =
    commissionSummary?.paidAmount ||
    payoutHistory
      .filter((payout) => payout.status === "completed")
      .reduce((sum, payout) => sum + payout.amount, 0);
  const nextPayoutDate = commissionSummary?.nextPayoutDate
    ? formatDate(commissionSummary.nextPayoutDate)
    : formatDate(payoutSettings?.nextPayoutDate || null);
  const nextPayoutAmount =
    commissionSummary?.nextPayoutAmount || totalPendingAmount;
  const payoutMethodDisplay =
    formatPayoutMethodDisplay(commissionSummary?.payoutMethod) ||
    formatPayoutMethodDisplay(payoutSettings?.payoutMethod) ||
    "Not Set";
  const payoutEmailDisplay =
    commissionSummary?.payoutEmail ||
    payoutSettings?.payoutEmail ||
    "No email set";

  if (isLoading) {
    return <DataLoading message="Loading commissions..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">
            Commissions & Payouts
          </h1>
          <p className="text-muted-foreground">
            Manage your commissions and payout requests
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
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
          <Button variant="outline" className="w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Commissions
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPendingAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissionSummary?.pendingCount ?? pendingCommissions.length}{" "}
              commissions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalPaidAmount)}
            </div>
            <p className="text-xs text-muted-foreground">
              {commissionSummary?.paidCount ??
                payoutHistory.filter((p) => p.status === "completed")
                  .length}{" "}
              payouts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payout</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nextPayoutDate}</div>
            <p className="text-xs text-muted-foreground">
              Amount: {formatCurrency(nextPayoutAmount)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Payout Method</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payoutMethodDisplay}</div>
            <p className="text-xs text-muted-foreground">
              {payoutEmailDisplay}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending">Pending Commissions</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Pending Commissions Tab */}
        <TabsContent value="pending" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Pending Commissions</CardTitle>
                  <CardDescription>
                    Track your commissions by status and payout schedule
                  </CardDescription>
                </div>
                <div className="flex flex-col lg:flex-row gap-3">
                  <Select
                    value={selectedStatus}
                    onValueChange={setSelectedStatus}
                  >
                    <SelectTrigger className="w-full lg:w-48">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="ALL">All statuses</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={selectedPeriod}
                    onValueChange={setSelectedPeriod}
                  >
                    <SelectTrigger className="w-full lg:w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">Last 7 days</SelectItem>
                      <SelectItem value="30d">Last 30 days</SelectItem>
                      <SelectItem value="90d">Last 90 days</SelectItem>
                      <SelectItem value="180d">Last 180 days</SelectItem>
                      <SelectItem value="all">All time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {pendingLoading ? (
                <SectionLoading message="Loading commissions..." size="lg" />
              ) : pendingCommissions.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Pending Commissions
                  </h3>
                  <p className="text-muted-foreground">
                    You don't have any pending commissions at the moment.
                  </p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">
                          Commission ID
                        </th>
                        <th className="text-left p-4 font-medium">Date</th>
                        <th className="text-left p-4 font-medium">Customer</th>
                        <th className="text-left p-4 font-medium">Offer</th>
                        <th className="text-left p-4 font-medium">
                          Sale Amount
                        </th>
                        <th className="text-left p-4 font-medium">
                          Commission
                        </th>
                        <th className="text-left p-4 font-medium">Status</th>
                        <th className="text-left p-4 font-medium">
                          Expected Payout
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCommissions.map((commission) => (
                        <tr
                          key={commission.id}
                          className="border-b hover:bg-muted/50"
                        >
                          <td className="p-4 font-mono text-sm">
                            {commission.id}
                          </td>
                          <td className="p-4">{commission.date}</td>
                          <td className="p-4">{commission.customer}</td>
                          <td className="p-4">{commission.offer}</td>
                          <td className="p-4">
                            {formatCurrency(commission.saleAmount)}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium">
                                {formatCurrency(commission.commissionAmount)}
                              </span>
                              <Badge variant="outline">
                                {commission.commissionRate}%
                              </Badge>
                            </div>
                          </td>
                          <td className="p-4">
                            {getStatusBadge(commission.status)}
                          </td>
                          <td className="p-4">
                            {formatDate(commission.expectedPayout)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* Payout History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border border-muted">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Payout History</CardTitle>
                  <CardDescription>
                    Commissions that have already been paid to you
                  </CardDescription>
                </div>
                {historyTotalPages > 1 && (
                  <span className="text-sm text-muted-foreground">
                    Page {historyPage} of {historyTotalPages}
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <SectionLoading message="Loading payout history..." size="lg" />
              ) : payoutHistory.length === 0 ? (
                <div className="text-center py-8">
                  <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No Paid Commissions Yet
                  </h3>
                  <p className="text-muted-foreground">
                    Once payouts are processed, they will appear here with full
                    details.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-4 font-medium">
                            Commission ID
                          </th>
                          <th className="text-left p-4 font-medium">
                            Payout Date
                          </th>
                          <th className="text-left p-4 font-medium">
                            Sale Amount
                          </th>
                          <th className="text-left p-4 font-medium">
                            Commission
                          </th>
                          <th className="text-left p-4 font-medium">Offer</th>
                          <th className="text-left p-4 font-medium">
                            Payout Method
                          </th>
                          <th className="text-left p-4 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payoutHistory.map((payout) => (
                          <tr
                            key={payout.id}
                            className="border-b hover:bg-muted/50"
                          >
                            <td className="p-4 font-mono text-sm">
                              {payout.id}
                            </td>
                            <td className="p-4">
                              {formatDate(payout.payoutDate || payout.date)}
                            </td>
                            <td className="p-4 font-medium">
                              {formatCurrency(
                                payout.saleAmount || payout.amount,
                                payout.currency
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">
                                  {formatCurrency(
                                    payout.commissionAmount || payout.amount,
                                    payout.currency
                                  )}
                                </span>
                                {payout.commissionRate !== undefined && (
                                  <Badge variant="outline">
                                    {payout.commissionRate}%
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              {payout.referralCode || payout.orderId || "N/A"}
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col">
                                <span>
                                  {payout.method ||
                                    commissionSummary?.payoutMethod ||
                                    "Paid"}
                                </span>
                                {payout.payoutEmail && (
                                  <span className="text-xs text-muted-foreground">
                                    {payout.payoutEmail}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-4">
                              {getStatusBadge(payout.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {historyTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage <= 1}
                        onClick={() =>
                          setHistoryPage((prev) => Math.max(prev - 1, 1))
                        }
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {historyPage} of {historyTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyPage >= historyTotalPages}
                        onClick={() =>
                          setHistoryPage((prev) =>
                            Math.min(prev + 1, historyTotalPages)
                          )
                        }
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout Settings</CardTitle>
              <CardDescription>
                Provide the PayPal email where you want to receive payouts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsLoading ? (
                <SectionLoading message="Loading payout settings..." size="lg" />
              ) : (
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSaveSettings();
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Payout Method</Label>
                    <Input
                      value="PayPal"
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      PayPal is the only supported payout method.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Payout Email</Label>
                    <Input
                      type="email"
                      value={settingsForm.payoutEmail}
                      onChange={(e) =>
                        setSettingsForm((prev) => ({
                          ...prev,
                          payoutEmail: e.target.value,
                        }))
                      }
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={isSavingSettings || !isSettingsDirty}
                  >
                    {isSavingSettings ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isSavingSettings || !isSettingsDirty}
                    onClick={() => setSettingsForm(initialSettingsForm)}
                  >
                    Reset
                  </Button>
                </div>

                {payoutSettings?.lastPayoutDate && (
                  <div className="text-xs text-muted-foreground">
                    Last payout processed on{" "}
                    {formatDate(payoutSettings.lastPayoutDate)}
                  </div>
                )}
              </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
