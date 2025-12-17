"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ManagerLoading } from "@/components/ui/loading";
import {
  ShoppingBag,
  DollarSign,
  TrendingUp,
  Store,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Package,
  Users,
} from "lucide-react";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ShopifyStore {
  id: string;
  name: string;
  domain: string;
  connected: boolean;
  shopName?: string;
  currency?: string;
  country?: string;
}

interface ShopifyOrder {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerEmail: string;
  totalAmount: number;
  currency: string;
  status: string;
  discountCode: string;
  affiliateName: string;
  commissionAmount: number;
  storeName: string;
  createdAt: string;
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

export default function ManagerShopifyPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [stats, setStats] = useState<ShopifyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedStore, setSelectedStore] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const ordersPerPage = 20;

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedStore, currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchStores(), fetchOrders(), fetchStats()]);
    } catch (error) {
      console.error("Error fetching Shopify data:", error);
      toast.error("Failed to load Shopify data");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/shopify/stores`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setStores(data.stores || []);
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      const storeParam = selectedStore !== "all" ? `&storeId=${selectedStore}` : "";
      const response = await fetch(
        `${config.apiUrl}/manager/shopify/orders?page=${currentPage}&limit=${ordersPerPage}${storeParam}`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const fetchStats = async () => {
    try {
      const storeParam = selectedStore !== "all" ? `?storeId=${selectedStore}` : "";
      const response = await fetch(
        `${config.apiUrl}/manager/shopify/stats${storeParam}`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const response = await fetch(`${config.apiUrl}/manager/shopify/sync`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        toast.success("Shopify data synced successfully");
        await fetchData();
      } else {
        toast.error("Failed to sync Shopify data");
      }
    } catch (error) {
      console.error("Error syncing:", error);
      toast.error("Failed to sync Shopify data");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      fulfilled: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800",
    };
    return (
      <Badge className={statusColors[status.toLowerCase()] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  const filteredOrders = orders.filter(
    (order) =>
      order.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.orderNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.affiliateName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.discountCode?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading Shopify data..." />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shopify Integration</h1>
          <p className="text-gray-600 mt-1">
            View orders and commissions from connected Shopify stores
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Now"}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats?.totalOrders?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">From all stores</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Commissions
            </CardTitle>
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
            <CardTitle className="text-sm font-medium text-gray-600">
              Avg Order Value
            </CardTitle>
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

      {/* Connected Stores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Connected Stores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stores.length > 0 ? (
              stores.map((store) => (
                <div
                  key={store.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <h3 className="font-medium text-gray-900">{store.name}</h3>
                    <p className="text-sm text-gray-500">{store.domain}</p>
                  </div>
                  <div className="text-right">
                    <Badge
                      className={
                        store.connected
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {store.connected ? "Connected" : "Disconnected"}
                    </Badge>
                    {store.country && (
                      <p className="text-xs text-gray-500 mt-1">
                        {store.country} • {store.currency}
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 col-span-2 text-center py-4">
                No stores connected. Contact admin to set up Shopify integration.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Store Breakdown */}
      {stats?.storeBreakdown && stats.storeBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Store</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.storeBreakdown.map((store, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{store.storeName}</p>
                    <p className="text-sm text-gray-500">{store.orders} orders</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">
                    ${store.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle>Shopify Orders</CardTitle>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full sm:w-[250px]"
                />
              </div>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="All Stores" />
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Discount Code</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.orderNumber}
                      </TableCell>
                      <TableCell>
                        {new Date(order.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{order.customerEmail || "N/A"}</TableCell>
                      <TableCell>{order.affiliateName || "N/A"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{order.discountCode || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>{order.storeName}</TableCell>
                      <TableCell>
                        ${order.totalAmount?.toFixed(2)} {order.currency}
                      </TableCell>
                      <TableCell className="text-green-600 font-medium">
                        ${order.commissionAmount?.toFixed(2)}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

