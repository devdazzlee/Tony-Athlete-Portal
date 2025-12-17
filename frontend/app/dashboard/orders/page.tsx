"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
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
import { RefreshCw, ExternalLink, Package, Store, DollarSign, ChevronLeft, ChevronRight } from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardLoading } from "@/components/ui/loading";

interface Order {
  id: string;
  shopifyOrderNumber?: string;
  placedOn: string;
  orderTotal: string;
  orderValue: number;
  currency: string;
  items: number;
  date: string;
  storeId: string;
  store: string;
  status: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  commission: string;
  commissionAmount: number;
  discountCode: string;
  customerEmail?: string;
  customerName?: string;
  subtotal?: string;
  tax?: string;
  commissionRate?: string;
  shipping: {
    address: string | null;
    firstName?: string;
    lastName?: string;
    city?: string;
    province?: string;
    country?: string;
    zip?: string;
    method: string;
    timeframe: string;
  };
  orderItems: Array<{
    name: string;
    variant?: string;
    quantity: number;
    price: string;
    sku?: string;
  }>;
}

interface ShopifyStore {
  id: string;
  name: string;
  domain: string;
  currency: string;
  country: string;
  connected: boolean;
}

function OrdersContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const ordersPerPage = 10;

  useEffect(() => {
    fetchStores();
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrder(orderId);
    } else {
      fetchOrders();
    }
  }, [orderId, selectedStore]);

  const fetchStores = async () => {
    try {
      const response = await apiClient.get("/athlete/stores");
      setStores(response.data.stores || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const params = new URLSearchParams();
      if (selectedStore !== "all") params.append("storeId", selectedStore);
      params.append("limit", "500"); // Fetch all, paginate client-side
      const response = await apiClient.get(`/athlete/orders?${params.toString()}`);
      const allOrders = response.data || [];
      setOrders(allOrders);
      setTotalOrders(allOrders.length);
    } catch (error: any) {
      console.error("Error fetching orders:", error);
      toast.error("Failed to load orders");
      setOrders([]);
      setTotalOrders(0);
    } finally {
      setLoadingOrders(false);
      setLoading(false);
    }
  };

  const fetchOrder = async (id: string) => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/athlete/orders/${id}`);
      setOrder(response.data);
    } catch (error: any) {
      console.error("Error fetching order:", error);
      toast.error("Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (testMode = false) => {
    try {
      setSyncing(true);
      const response = await apiClient.post("/athlete/sync-orders", { days: 30, testMode }, { timeout: 120000 }); // 2 min timeout
      toast.success(`Synced ${response.data.synced} new orders from Shopify${testMode ? ' (TEST MODE)' : ''}`);
      fetchOrders();
    } catch (error) {
      console.error("Error syncing orders:", error);
      toast.error("Failed to sync orders from Shopify");
    } finally {
      setSyncing(false);
    }
  };

  const getStatusBadge = (status: string, financialStatus?: string) => {
    const statusLower = (financialStatus || status).toLowerCase();
    
    if (statusLower === "paid" || statusLower === "approved") {
      return <Badge className="bg-green-500/20 text-green-600 border-green-500">Paid</Badge>;
    }
    if (statusLower === "pending") {
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500">Pending</Badge>;
    }
    if (statusLower === "cancelled" || statusLower === "canceled") {
      return <Badge className="bg-red-500/20 text-red-600 border-red-500">Cancelled</Badge>;
    }
    if (statusLower === "refunded") {
      return <Badge className="bg-purple-500/20 text-purple-600 border-purple-500">Refunded</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500">{status}</Badge>;
  };

  const getFulfillmentBadge = (status?: string | null) => {
    if (!status) {
      return <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500">Unfulfilled</Badge>;
    }
    if (status === "fulfilled") {
      return <Badge className="bg-green-500/20 text-green-600 border-green-500">Fulfilled</Badge>;
    }
    if (status === "partial") {
      return <Badge className="bg-blue-500/20 text-blue-600 border-blue-500">Partial</Badge>;
    }
    return <Badge className="bg-gray-500/20 text-gray-600 border-gray-500">{status}</Badge>;
  };

  // Pagination calculations
  const totalPages = Math.ceil(orders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const paginatedOrders = orders.slice(startIndex, endIndex);

  if (loading || loadingOrders) {
    return <DashboardLoading message="Loading orders..." />;
  }

  // If orderId is provided, show single order view
  if (orderId && order) {
    return (
      <div className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
        <div className="mb-4 sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/orders")}
            className="mb-4 text-gray-700 hover:bg-gray-100"
          >
            ← Back to Orders
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Order {order.shopifyOrderNumber || order.id}
            </h1>
            {getStatusBadge(order.status, order.financialStatus)}
            {getFulfillmentBadge(order.fulfillmentStatus)}
          </div>
          <p className="text-gray-600">Placed on {order.placedOn}</p>
          <Badge className="mt-2 bg-blue-500/20 text-blue-600 border-blue-500">
            <Store className="h-3 w-3 mr-1" />
            {order.store}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Order Details */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Total:</span>
                <span className="text-gray-900 font-semibold">{order.orderTotal}</span>
              </div>
              {order.subtotal && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900">{order.subtotal}</span>
                </div>
              )}
              {order.tax && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span className="text-gray-900">{order.tax}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Items:</span>
                <span className="text-gray-900">{order.items}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Discount Code:</span>
                <span className="text-gray-900 font-mono">{order.discountCode}</span>
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Your Commission:</span>
                  <span className="text-green-600 font-semibold">{order.commission}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Rate:</span>
                  <span className="text-gray-500">{order.commissionRate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer & Shipping Details */}
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Shipping Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.customerName && (
                <div>
                  <span className="text-gray-600">Customer: </span>
                  <span className="text-gray-900">{order.customerName}</span>
                </div>
              )}
              {order.customerEmail && (
                <div>
                  <span className="text-gray-600">Email: </span>
                  <span className="text-gray-900">{order.customerEmail}</span>
                </div>
              )}
              <div>
                <span className="text-gray-600">Address: </span>
                <span className="text-gray-900">{order.shipping?.address || "N/A"}</span>
              </div>
              <div>
                <span className="text-gray-600">Method: </span>
                <span className="text-gray-900">{order.shipping?.method || "Standard"}</span>
              </div>
              <div>
                <span className="text-gray-600">Timeframe: </span>
                <span className="text-gray-900">{order.shipping?.timeframe || "3-5 Working Days"}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Items */}
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(order.orderItems || []).map((item: any, index: number) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-gray-900 font-medium mb-1">
                        {item.name}
                      </div>
                      {item.variant && (
                        <div className="text-sm text-gray-600">
                          Variant: {item.variant}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        Qty: {item.quantity}
                      </div>
                      {item.sku && (
                        <div className="text-sm text-gray-500">
                          SKU: {item.sku}
                        </div>
                      )}
                    </div>
                    <div className="text-gray-900 font-semibold">
                      {item.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Order ID: {order.id}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Orders list view
  return (
    <div className="p-4 sm:p-6 w-full max-w-full overflow-x-hidden">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Orders</h1>
            <p className="text-gray-600">
              View all your orders from Shopify stores
            </p>
          </div>
<div className="flex gap-2">
          <Button
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from Shopify"}
          </Button>
          <Button
            onClick={() => handleSync(true)}
            disabled={syncing}
            variant="outline"
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            TEST: All Orders
          </Button>
        </div>
        </div>

        {/* Store Filter */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Store className="h-4 w-4 text-gray-500" />
            <span className="text-sm text-gray-600">Filter by Store:</span>
          </div>
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[200px] bg-white border-gray-300">
              <SelectValue placeholder="All Stores" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">All Stores</SelectItem>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name} ({store.currency})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="bg-white border-gray-200">
          <CardContent className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No orders found</p>
            <p className="text-sm text-gray-500">
              Orders will appear here when customers use your discount codes on Shopify.
            </p>
            <Button
              onClick={() => handleSync(false)}
              disabled={syncing}
              variant="outline"
              className="mt-4"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              Sync Orders
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Orders Summary */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>
              Showing {startIndex + 1}-{Math.min(endIndex, orders.length)} of {orders.length} orders
            </span>
            <span>Page {currentPage} of {totalPages}</span>
          </div>

          {/* Orders List */}
          {paginatedOrders.map((orderItem) => (
            <Card
              key={orderItem.id}
              className="bg-white border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/orders?id=${orderItem.id}`)}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {orderItem.shopifyOrderNumber || `Order ${orderItem.id}`}
                      </h3>
                      <Badge className="bg-blue-500/20 text-blue-600 border-blue-500">
                        {orderItem.store}
                      </Badge>
                      {getStatusBadge(orderItem.status, orderItem.financialStatus)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Date: </span>
                        <span className="text-gray-900">
                          {new Date(orderItem.placedOn || orderItem.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Total: </span>
                        <span className="text-gray-900 font-semibold">
                          {orderItem.orderTotal}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Items: </span>
                        <span className="text-gray-900">
                          {orderItem.items || 0}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Commission: </span>
                        <span className="text-green-600 font-semibold">
                          {orderItem.commission}
                        </span>
                      </div>
                      <div className="flex items-center justify-end">
                        <ExternalLink className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Code: <span className="font-mono">{orderItem.discountCode}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="hidden sm:flex"
              >
                First
              </Button>
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="hidden sm:flex"
              >
                Last
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={<DashboardLoading message="Loading orders..." />}>
      <OrdersContent />
    </Suspense>
  );
}
