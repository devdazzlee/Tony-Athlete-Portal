"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { DashboardLoading } from "@/components/ui/loading";
import { useCart } from "@/contexts/CartContext";

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
  totalCommission: number;
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

interface Product {
  id: number;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  status: string;
  tags: string;
  variants: {
    id: number;
    title: string;
    price: string;
    compare_at_price: string | null;
    sku: string;
    inventory_quantity: number;
  }[];
  images: {
    id: number;
    src: string;
    alt: string | null;
  }[];
  image?: {
    id: number;
    src: string;
    alt: string | null;
  };
}

export default function ShopPage() {
  const { addItem } = useCart();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [orderStats, setOrderStats] = useState<OrderStats[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;
  
  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedStoreForProducts, setSelectedStoreForProducts] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchShopData();
  }, []);

  useEffect(() => {
    if (selectedStoreForProducts) {
      fetchProducts();
    }
  }, [selectedStoreForProducts]);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get("/athlete/shop");
      const storesData = response.data.stores || [];
      setStores(storesData);
      setOrderStats(response.data.orderStats || []);
      setRecentOrders(response.data.recentOrders || []);
      setDiscountCodes(response.data.discountCodes || []);
      
      // Auto-select TC Nutrition Canada as default, fallback to first connected store
      if (!selectedStoreForProducts) {
        const canadaStore = storesData.find((s: ShopifyStore) => s.connected && s.name.toLowerCase().includes('canada'));
        const connectedStore = canadaStore || storesData.find((s: ShopifyStore) => s.connected);
        if (connectedStore) {
          setSelectedStoreForProducts(connectedStore.id);
        }
      }
    } catch (error) {
      console.error("Error fetching shop data:", error);
      toast.error("Failed to load shop data");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!selectedStoreForProducts) return;
    setProductsLoading(true);
    try {
      const response = await apiClient.get(`/athlete/shop/products/${selectedStoreForProducts}?limit=50`);
      setProducts(response.data.products || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast.error("Failed to load products");
    } finally {
      setProductsLoading(false);
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

  // Filter products by search query
  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get store domain for product links
  const getStoreDomain = (storeId: string) => {
    const store = stores.find((s) => s.id === storeId);
    return store?.domain?.replace(".myshopify.com", "") || "";
  };

  // Get product link with discount code
  const getProductLink = (productHandle: string, storeId: string) => {
    const domain = getStoreDomain(storeId);
    const baseUrl = `https://${domain}.myshopify.com/products/${productHandle}`;
    
    // Add first available discount code as query parameter
    if (discountCodes.length > 0) {
      return `${baseUrl}?discount=${discountCodes[0].code}`;
    }
    return baseUrl;
  };

  if (loading) {
    return <DashboardLoading message="Loading shop data..." />;
  }

  // Calculate totals
  const totalOrders = orderStats.reduce((sum, s) => sum + s.totalOrders, 0);
  const totalCommission = orderStats.reduce((sum, s) => sum + s.totalCommission, 0);

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Shop</h1>
          <p className="text-gray-600">
            Browse and order products with your discount
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

      {/* Products Section */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-xl font-bold text-gray-900">Browse & Order Products</h2>
          <div className="flex items-center gap-3">
            <Select 
              value={selectedStoreForProducts} 
              onValueChange={setSelectedStoreForProducts}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select store" />
              </SelectTrigger>
              <SelectContent>
                {stores.filter(s => s.connected).map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={fetchProducts}
              disabled={productsLoading || !selectedStoreForProducts}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${productsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {selectedStoreForProducts && (
          <>
            {/* Search */}
            <div className="relative max-w-md mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto animate-spin text-orange-500 mb-4" />
                  <p className="text-gray-600">Loading products...</p>
                </CardContent>
              </Card>
            ) : filteredProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
                  <p className="text-gray-500">
                    {searchQuery
                      ? "Try a different search term"
                      : "No products available in this store"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow bg-white border-gray-200">
                    <div className="aspect-square relative bg-gray-100 overflow-hidden">
                      <img
                        src={product.images?.[0]?.src || product.image?.src}
                        alt={product.images?.[0]?.alt || product.image?.alt || product.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                        fetchPriority="low"
                      />
                      {product.status === "active" && (
                        <Badge className="absolute top-2 right-2 bg-green-500">Active</Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2">
                        {product.title}
                      </h3>
                      {product.product_type && (
                        <p className="text-sm text-gray-500 mb-2">{product.product_type}</p>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-lg font-bold text-orange-600">
                            ${parseFloat(product.variants?.[0]?.price || "0").toFixed(2)}
                          </p>
                          {product.variants?.[0]?.compare_at_price && (
                            <p className="text-sm text-gray-400 line-through">
                              ${parseFloat(product.variants[0].compare_at_price).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        className="w-full bg-orange-600 hover:bg-orange-700"
                        onClick={() => {
                          const store = stores.find((s) => s.id === selectedStoreForProducts);
                          if (!store) return;
                          
                          addItem({
                            productId: product.id,
                            variantId: product.variants[0].id,
                            title: product.title,
                            variantTitle: product.variants[0].title,
                            price: parseFloat(product.variants[0].price),
                            image: product.images?.[0]?.src || product.image?.src,
                            storeId: selectedStoreForProducts,
                            storeName: store.name,
                            currency: store.currency,
                            handle: product.handle,
                            sku: product.variants[0].sku,
                            inventoryQuantity: product.variants[0].inventory_quantity,
                          });
                        }}
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Add to Cart
                      </Button>
                      {discountCodes.length > 0 && (
                        <p className="mt-2 text-xs text-center text-gray-500">
                          Your discount code will be applied at checkout
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {!selectedStoreForProducts && (
          <Card>
            <CardContent className="py-12 text-center">
              <Store className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Store</h3>
              <p className="text-gray-500">
                Please select a store above to browse and order products
              </p>
            </CardContent>
          </Card>
        )}
      </div>

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
