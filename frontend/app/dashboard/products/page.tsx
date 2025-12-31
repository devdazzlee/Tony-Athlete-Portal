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
  Package,
  Search,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Tag,
} from "lucide-react";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { useAuth } from "@/contexts/AuthContext";

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

interface Store {
  id: string;
  name: string;
  domain: string;
  connected: boolean;
}

export default function AffiliateProductsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user]);

  useEffect(() => {
    if (selectedStore) {
      fetchProducts();
    }
  }, [selectedStore]);

  const fetchStores = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/shopify/stores`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        const connectedStores = (data.stores || []).filter((s: Store) => s.connected);
        setStores(connectedStores);
        if (connectedStores.length > 0 && !selectedStore) {
          setSelectedStore(connectedStores[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchProducts = async () => {
    if (!selectedStore) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${config.apiUrl}/admin/shopify/products/${selectedStore}?limit=50`,
        { headers: getAuthHeaders() }
      );
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProducts = products.filter((product) =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.product_type?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.vendor?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStoreDomain = () => {
    const store = stores.find((s) => s.id === selectedStore);
    return store?.domain?.replace(".myshopify.com", "") || "";
  };

  if (authLoading || (isLoading && products.length === 0)) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600 mt-1">
            Browse products you can promote with your affiliate links
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedStore} onValueChange={setSelectedStore}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select store" />
            </SelectTrigger>
            <SelectContent>
              {stores.map((store) => (
                <SelectItem key={store.id} value={store.id}>
                  {store.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={fetchProducts}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-gray-500">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">
                  {new Set(products.map((p) => p.product_type).filter(Boolean)).size}
                </p>
                <p className="text-sm text-gray-500">Categories</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">10%</p>
                <p className="text-sm text-gray-500">Commission</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <ExternalLink className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{stores.length}</p>
                <p className="text-sm text-gray-500">Active Stores</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Grid */}
      {filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">
              {searchQuery
                ? "Try a different search term"
                : "Select a store to view products"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow">
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
                <div className="flex items-center justify-between">
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
                  <a
                    href={`https://${getStoreDomain()}.myshopify.com/products/${product.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-orange-500 hover:text-orange-600"
                  >
                    <ExternalLink className="h-5 w-5" />
                  </a>
                </div>
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500">
                    Your commission: <span className="font-semibold text-green-600">
                      ${(parseFloat(product.variants?.[0]?.price || "0") * 0.1).toFixed(2)}
                    </span>
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

