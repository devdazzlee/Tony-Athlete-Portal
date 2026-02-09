"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import {
  Tag,
  RefreshCw,
  Search,
  Upload,
  CheckCircle,
  XCircle,
  AlertCircle,
  Store,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ShopifyStore {
  id: string;
  name: string;
}

interface DiscountCode {
  id: string;
  code: string;
  description: string;
  discount: string;
  affiliateName: string;
  affiliateId: string;
  status: string;
  syncedToShopify: boolean;
  shopifyPriceRuleId: string | null;
  shopifyDiscountCodeId: string | null;
  storeId: string | null;
  storeName: string | null;
  usage: number;
  maxUsage: number | null;
  validUntil: string;
  createdAt: string;
}

interface SyncStats {
  total: number;
  synced: number;
  pending: number;
  failed: number;
}

export default function AdminShopifyDiscountsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [stats, setStats] = useState<SyncStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncingCode, setSyncingCode] = useState<string | null>(null);
  const [selectedStore, setSelectedStore] = useState("all");
  const [syncFilter, setSyncFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchStores(), fetchDiscounts()]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await apiClient.get("/shopify/stores");
      setStores(response.data?.stores || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchDiscounts = async () => {
    try {
      const response = await apiClient.get("/admin/shopify/discounts");
      const data = response.data;
      setDiscounts(data?.discounts || []);
      setStats(data?.stats || null);
    } catch (error) {
      console.error("Error fetching discounts:", error);
    }
  };

  const handleSyncAll = async () => {
    if (!selectedStore || selectedStore === "all") {
      toast.error("Please select a store to sync to");
      return;
    }

    setSyncing(true);
    try {
      const response = await apiClient.post(
        "/admin/shopify/discounts/sync-all",
        { storeId: selectedStore }
      );
      toast.success(
        `Synced ${response.data?.syncedCount || 0} discount codes to Shopify`
      );
      await fetchDiscounts();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to sync discount codes"
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleSyncSingle = async (discountId: string, storeId: string) => {
    if (!storeId) {
      toast.error("Please select a store first");
      return;
    }

    setSyncingCode(discountId);
    try {
      await apiClient.post(`/admin/shopify/discounts/${discountId}/sync`, {
        storeId,
      });

      toast.success("Discount code synced to Shopify");
      await fetchDiscounts();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to sync discount code"
      );
    } finally {
      setSyncingCode(null);
    }
  };

  const getSyncBadge = (synced: boolean, storeId: string | null) => {
    if (synced && storeId) {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Synced</Badge>;
    }
    return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Not Synced</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      INACTIVE: "bg-gray-100 text-gray-800",
      EXPIRED: "bg-red-100 text-red-800",
    };
    return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };

  // Filter discounts
  const filteredDiscounts = discounts.filter((discount) => {
    const matchesSearch =
      discount.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      discount.affiliateName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStore = selectedStore === "all" || discount.storeId === selectedStore;
    const matchesSync =
      syncFilter === "all" ||
      (syncFilter === "synced" && discount.syncedToShopify) ||
      (syncFilter === "pending" && !discount.syncedToShopify);
    return matchesSearch && matchesStore && matchesSync;
  });

  if (authLoading || isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Discount Code Sync</h1>
          <p className="text-gray-600 mt-1">
            Sync affiliate discount codes to your Shopify stores
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Store" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSyncAll}
            disabled={syncing || selectedStore === "all"}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Upload className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync All to Shopify"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Codes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Synced</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.synced}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending Sync</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by code or affiliate..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={syncFilter} onValueChange={setSyncFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Sync Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="synced">Synced</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Discount Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Discount Codes ({filteredDiscounts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Shopify Sync</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscounts.length > 0 ? (
                  filteredDiscounts.map((discount) => (
                    <TableRow key={discount.id}>
                      <TableCell className="font-mono font-medium">{discount.code}</TableCell>
                      <TableCell>{discount.affiliateName || "N/A"}</TableCell>
                      <TableCell>{discount.discount}</TableCell>
                      <TableCell>{getStatusBadge(discount.status)}</TableCell>
                      <TableCell>{getSyncBadge(discount.syncedToShopify, discount.storeId)}</TableCell>
                      <TableCell>
                        {discount.storeName || (
                          <span className="text-gray-400">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {discount.usage}
                        {discount.maxUsage && ` / ${discount.maxUsage}`}
                      </TableCell>
                      <TableCell>
                        {new Date(discount.validUntil).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!discount.syncedToShopify && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSyncSingle(discount.id, selectedStore === "all" ? stores[0]?.id : selectedStore)}
                            disabled={syncingCode === discount.id || stores.length === 0}
                          >
                            {syncingCode === discount.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            <span className="ml-2">Sync</span>
                          </Button>
                        )}
                        {discount.syncedToShopify && (
                          <Badge variant="outline" className="text-green-600">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Synced
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No discount codes found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Store className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">How Discount Sync Works</h3>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Discount codes created in the portal can be synced to your Shopify stores</li>
                <li>When synced, a Price Rule and Discount Code are created in Shopify</li>
                <li>Orders using these codes are automatically tracked for affiliate commissions</li>
                <li>You can sync individual codes or all pending codes at once</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

