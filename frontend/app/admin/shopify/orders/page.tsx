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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ShoppingBag,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  MoreVertical,
  CheckCircle,
  XCircle,
  DollarSign,
} from "lucide-react";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import axios from "axios";

interface ShopifyStore {
  id: string;
  name: string;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface ShopifyOrder {
  id: string;
  shopifyOrderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName?: string;
  totalAmount: number;
  currency: string;
  status: string;
  financialStatus?: string;
  fulfillmentStatus?: string;
  discountCode: string;
  affiliateName: string;
  affiliateId: string;
  commissionAmount: number;
  commissionRate: number;
  storeName: string;
  storeId: string;
  items: OrderItem[];
  createdAt: string;
}

export default function AdminShopifyOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [orders, setOrders] = useState<ShopifyOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<ShopifyOrder | null>(null);
  const ordersPerPage = 25;

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedStore, selectedStatus, currentPage]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([fetchStores(), fetchOrders()]);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load orders");
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
      let url = `${config.apiUrl}/manager/shopify/orders?page=${currentPage}&limit=${ordersPerPage}`;
      if (selectedStore !== "all") url += `&storeId=${selectedStore}`;
      if (selectedStatus !== "all") url += `&status=${selectedStatus}`;

      const response = await fetch(url, { headers: getAuthHeaders() });
      if (response.ok) {
        const data = await response.json();
        setOrders(data.orders || []);
        setTotalPages(data.totalPages || 1);
        setTotalOrders(data.total || 0);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  };

  const handleSync = async (testMode: boolean = false) => {
    setSyncing(true);
    try {
      const response = await axios.post(
        `${config.apiUrl}/shopify/sync`,
        { testMode, limit: 100 },
        { headers: getAuthHeaders(), timeout: 120000 }
      );
      toast.success(`Synced ${response.data.syncedCount || 0} orders from Shopify`);
      await fetchOrders();
    } catch (error: any) {
      console.error("Error syncing:", error);
      toast.error(error.response?.data?.error || "Failed to sync orders");
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = async () => {
    try {
      let url = `${config.apiUrl}/manager/shopify/orders/export?`;
      if (selectedStore !== "all") url += `storeId=${selectedStore}&`;
      if (selectedStatus !== "all") url += `status=${selectedStatus}&`;

      const response = await fetch(url, { headers: getAuthHeaders() });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `shopify-orders-${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Orders exported successfully");
      } else {
        toast.error("Failed to export orders");
      }
    } catch (error) {
      console.error("Error exporting:", error);
      toast.error("Failed to export orders");
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch(`${config.apiUrl}/admin/shopify/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Order status updated to ${newStatus}`);
        await fetchOrders();
      } else {
        toast.error("Failed to update order status");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast.error("Failed to update order status");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors: Record<string, string> = {
      paid: "bg-green-100 text-green-800",
      pending: "bg-yellow-100 text-yellow-800",
      fulfilled: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
      refunded: "bg-gray-100 text-gray-800",
      approved: "bg-green-100 text-green-800",
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
          <h1 className="text-3xl font-bold text-gray-900">Shopify Orders</h1>
          <p className="text-gray-600 mt-1">
            View and manage all affiliate orders from Shopify ({totalOrders} total)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => handleSync(false)}
            disabled={syncing}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Orders"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by order #, customer, affiliate, or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStore} onValueChange={(v) => { setSelectedStore(v); setCurrentPage(1); }}>
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
            <Select value={selectedStatus} onValueChange={(v) => { setSelectedStatus(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" />
            Orders
          </CardTitle>
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
                  <TableHead>Actions</TableHead>
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
                      <TableCell className="max-w-[150px] truncate">
                        {order.customerEmail || "N/A"}
                      </TableCell>
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
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order.id, "APPROVED")}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateOrderStatus(order.id, "PAID")}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleUpdateOrderStatus(order.id, "CANCELLED")}
                              className="text-red-600"
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-gray-500">
                      No orders found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {(currentPage - 1) * ordersPerPage + 1} to{" "}
                {Math.min(currentPage * ordersPerPage, totalOrders)} of {totalOrders} orders
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

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Order #{selectedOrder?.orderNumber}</DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Date</p>
                  <p className="font-medium">
                    {new Date(selectedOrder.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <p className="text-sm text-gray-500">Customer</p>
                  <p className="font-medium">{selectedOrder.customerEmail || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Store</p>
                  <p className="font-medium">{selectedOrder.storeName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Affiliate</p>
                  <p className="font-medium">{selectedOrder.affiliateName || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Discount Code</p>
                  <Badge variant="outline">{selectedOrder.discountCode || "N/A"}</Badge>
                </div>
              </div>
              <div className="border-t pt-4">
                <p className="text-sm text-gray-500 mb-2">Order Items</p>
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  <div className="space-y-2">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span>
                          {item.name} x {item.quantity}
                        </span>
                        <span>${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">No items available</p>
                )}
              </div>
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Order Total</span>
                  <span className="font-bold">
                    ${selectedOrder.totalAmount?.toFixed(2)} {selectedOrder.currency}
                  </span>
                </div>
                <div className="flex justify-between text-green-600">
                  <span>Commission ({selectedOrder.commissionRate}%)</span>
                  <span className="font-bold">
                    ${selectedOrder.commissionAmount?.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="border-t pt-4 flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrder.id, "APPROVED");
                    setSelectedOrder(null);
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    handleUpdateOrderStatus(selectedOrder.id, "PAID");
                    setSelectedOrder(null);
                  }}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  Mark Paid
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

