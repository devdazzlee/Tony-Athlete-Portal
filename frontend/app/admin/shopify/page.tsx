"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ShoppingBag,
  Store,
  DollarSign,
  RefreshCw,
  Settings,
  Tag,
  Webhook,
  TrendingUp,
  Package,
  AlertCircle,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ShopifyStore {
  id: string;
  name: string;
  domain: string;
  connected: boolean;
  currency?: string;
  country?: string;
  shopName?: string;
}

interface ShopifyStats {
  totalOrders: number;
  totalRevenue: number;
  totalCommissions: number;
  averageOrderValue: number;
  storeBreakdown: {
    storeName: string;
    orders: number;
    revenue: number;
  }[];
}

interface SyncStatus {
  lastSync: string | null;
  syncedCoupons: number;
  pendingSync: number;
}

export default function AdminShopifyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [stats, setStats] = useState<ShopifyStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchStores(), fetchStats(), fetchSyncStatus()]);
    } catch (error) {
      console.error("Error fetching Shopify data:", error);
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

  const fetchStats = async () => {
    try {
      const response = await apiClient.get("/manager/shopify/stats");
      setStats(response.data);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await apiClient.get("/admin/shopify/sync-status");
      setSyncStatus(response.data);
    } catch (error) {
      console.error("Error fetching sync status:", error);
    }
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    try {
      await apiClient.post("/shopify/sync");
      toast.success("Shopify data synced successfully");
      await fetchData();
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Failed to sync Shopify data");
    } finally {
      setSyncing(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-900" />
      </div>
    );
  }

  const connectedStores = stores.filter((s) => s.connected).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopify Integration</h1>
          <p className="text-gray-600 mt-1">
            Manage your Shopify stores, sync orders, and configure settings
          </p>
        </div>
        <Button
          onClick={handleSyncAll}
          disabled={syncing}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync All Data"}
        </Button>
      </div>

      {/* Connection Status */}
      <Card className={connectedStores === stores.length && stores.length > 0 ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            {connectedStores === stores.length && stores.length > 0 ? (
              <CheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <AlertCircle className="h-6 w-6 text-yellow-600" />
            )}
            <div>
              <h3 className="font-semibold text-gray-900">
                {connectedStores === stores.length && stores.length > 0
                  ? "All Stores Connected"
                  : `${connectedStores} of ${stores.length} Stores Connected`}
              </h3>
              <p className="text-sm text-gray-600">
                {stores.length === 0
                  ? "No stores configured. Add your Shopify stores to get started."
                  : connectedStores === stores.length
                  ? "Your Shopify integration is fully operational."
                  : "Some stores need attention. Check the store settings."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalOrders?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">From all connected stores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${stats?.totalRevenue?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Affiliate-driven sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Commissions</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${stats?.totalCommissions?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Owed to affiliates</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Order Value</CardTitle>
            <Package className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${stats?.averageOrderValue?.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per affiliate order</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/admin/shopify/stores">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Store className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Manage Stores</h3>
                  <p className="text-sm text-gray-500">Configure store connections</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shopify/orders">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">View Orders</h3>
                  <p className="text-sm text-gray-500">All Shopify orders</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shopify/discounts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <Tag className="h-6 w-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Discount Codes</h3>
                  <p className="text-sm text-gray-500">Sync & manage codes</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/shopify/settings">
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Settings</h3>
                  <p className="text-sm text-gray-500">Webhooks & sync config</p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Connected Stores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Connected Stores
              </CardTitle>
              <CardDescription>Your Shopify store connections</CardDescription>
            </div>
            <Link href="/admin/shopify/stores">
              <Button variant="outline" size="sm">
                Manage Stores
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{store.name}</h3>
                    <p className="text-sm text-gray-500">{store.domain}</p>
                    {store.country && (
                      <p className="text-xs text-gray-400 mt-1">
                        {store.country} • {store.currency}
                      </p>
                    )}
                  </div>
                  <Badge
                    className={
                      store.connected
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }
                  >
                    {store.connected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No stores configured yet.</p>
              <Link href="/admin/shopify/stores">
                <Button className="mt-4" variant="outline">
                  Add Your First Store
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue by Store */}
      {stats?.storeBreakdown && stats.storeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.storeBreakdown.map((store, index) => {
                const percentage = stats.totalRevenue > 0 
                  ? (store.revenue / stats.totalRevenue) * 100 
                  : 0;
                return (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{store.storeName}</p>
                        <p className="text-sm text-gray-500">{store.orders} orders</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900">
                        ${store.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

