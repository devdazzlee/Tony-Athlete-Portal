"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  RefreshCw,
  Store,
  CheckCircle,
  XCircle,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Package,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardLoading } from "@/components/ui/loading";

interface ShopifyStore {
  id: string;
  name: string;
  domain: string;
  currency: string;
  country: string;
  connected: boolean;
  shopName?: string;
}

interface OrderStats {
  storeId: string;
  storeName: string;
  totalOrders: number;
  totalRevenue: number;
  totalCommission: number;
  formattedRevenue: string;
  formattedCommission: string;
}

interface RecentOrder {
  id: string;
  shopifyOrderNumber?: string;
  date: string;
  orderTotal: string;
  commission: string;
  store: string;
  status: string;
  financialStatus?: string;
}

interface DiscountCode {
  code: string;
  discount: string;
  status: string;
}

export default function ShopPage() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;

  useEffect(() => {
    fetchShopData();
  }, []);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/athlete/shop");
      setStores(response.data.stores || []);
      setOrderStats(response.data.orderStats || []);
      setRecentOrders(response.data.recentOrders || []);
      setDiscountCodes(response.data.discountCodes || []);
    } catch (error) {
      console.error("Error fetching shop data:", error);
      toast.error("Failed to load shop data");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      const response = await apiClient.post("/athlete/sync-orders", { days: 30 });
      toast.success(`Synced ${response.data.synced} new orders from Shopify`);
      fetchShopData();
    } catch (error) {
      console.error("Error syncing orders:", error);
      toast.error("Failed to sync orders from Shopify");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "paid" || statusLower === "approved") {
      return <Badge className="bg-green-500/20 text-green-600 border-green-500">Paid</Badge>;
    }
    if (statusLower === "pending") {
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500">Pending</Badge>;
    }
    if (statusLower === "cancelled") {
      return <Badge className="bg-red-500/20 text-red-600 border-red-500">Cancelled</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500">{status}</Badge>;
  };

  // Pagination calculations
  const totalPages = Math.ceil(recentOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const paginatedOrders = recentOrders.slice(startIndex, endIndex);

  if (loading) {
    return <DashboardLoading message="Loading shop data..." />;
  }

  // Calculate totals
  const totalOrders = orderStats.reduce((sum, s) => sum + s.totalOrders, 0);
  const totalRevenue = orderStats.reduce((sum, s) => sum + s.totalRevenue, 0);
  const totalCommission = orderStats.reduce((sum, s) => sum + s.totalCommission, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shop</h1>
          <p className="text-gray-600">
            Connected Shopify stores and your performance
          </p>
        </div>
        <Button
          onClick={handleSync}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Syncing..." : "Sync Orders"}
        </Button>
      </div>

      {/* Connected Stores */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Connected Stores</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => (
            <Card key={store.id} className="bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Store className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{store.name}</h3>
                      <p className="text-sm text-gray-600">{store.domain}</p>
                    </div>
                  </div>
                  {store.connected ? (
                    <Badge className="bg-green-500/20 text-green-600 border-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500/20 text-red-600 border-red-500">
                      <XCircle className="h-3 w-3 mr-1" />
                      Disconnected
                    </Badge>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Currency:</span>
                    <span className="font-medium text-gray-900">{store.currency}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Country:</span>
                    <span className="font-medium text-gray-900">{store.country}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Overall Stats */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Overall Performance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${totalRevenue.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Commission</p>
                  <p className="text-2xl font-bold text-green-600">
                    ${totalCommission.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Stats by Store */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Performance by Store</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orderStats.map((stat) => (
            <Card key={stat.storeId} className="bg-white border-gray-200">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <Store className="h-5 w-5 text-blue-600" />
                  {stat.storeName}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Orders</p>
                    <p className="text-xl font-bold text-gray-900">{stat.totalOrders}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Revenue</p>
                    <p className="text-xl font-bold text-gray-900">{stat.formattedRevenue}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Commission</p>
                    <p className="text-xl font-bold text-green-600">{stat.formattedCommission}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Your Discount Codes */}
      {discountCodes.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Your Discount Codes</h2>
          <Card className="bg-white border-gray-200">
            <CardContent className="p-6">
              <div className="flex flex-wrap gap-3">
                {discountCodes.map((code, index) => (
                  <div
                    key={index}
                    className="px-4 py-2 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <span className="font-mono font-semibold text-gray-900">{code.code}</span>
                    <span className="ml-2 text-sm text-gray-600">({code.discount}% off)</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-gray-500">
                These codes are synced to both Shopify stores. Customers can use them at checkout.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">Recent Orders</h2>
          <Button
            variant="ghost"
            onClick={() => window.location.href = "/dashboard/orders"}
            className="text-blue-600 hover:text-blue-700"
          >
            View All
            <ExternalLink className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {recentOrders.length === 0 ? (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No orders yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Orders will appear here when customers use your discount codes.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-0">
              {/* Summary */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between text-sm text-gray-600">
                <span>Showing {startIndex + 1}-{Math.min(endIndex, recentOrders.length)} of {recentOrders.length} orders</span>
                {totalPages > 1 && <span>Page {currentPage} of {totalPages}</span>}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Order
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Store
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Commission
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => window.location.href = `/dashboard/orders?id=${order.id}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.shopifyOrderNumber || order.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {order.store}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(order.date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {order.orderTotal}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                          {order.commission}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(order.financialStatus || order.status)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  
                  {/* Page Numbers */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-10 ${currentPage === pageNum ? "bg-blue-600" : ""}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
