"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Store,
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Settings,
  Trash2,
  TestTube,
  Eye,
  EyeOff,
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
  error?: string;
}

interface StoreFormData {
  name: string;
  shopifyDomain: string;
  apiKey: string;
  apiSecret: string;
  accessToken: string;
}

export default function AdminShopifyStoresPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedStore, setSelectedStore] = useState<ShopifyStore | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<StoreFormData>({
    name: "",
    shopifyDomain: "",
    apiKey: "",
    apiSecret: "",
    accessToken: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchStores();
    }
  }, [user]);

  const fetchStores = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/shopify/stores");
      setStores(response.data?.stores || []);
    } catch (error) {
      console.error("Error fetching stores:", error);
      toast.error("Failed to load stores");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (storeId: string) => {
    setTesting(storeId);
    try {
      const response = await apiClient.get(`/shopify/stores/${storeId}/test`);
      const data = response.data;
      if (data.success) {
        toast.success(
          `Connection successful! Shop: ${data.shop?.name || "Connected"}`
        );
      } else {
        toast.error(`Connection failed: ${data.error || "Unknown error"}`);
      }
      await fetchStores();
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("Failed to test connection");
    } finally {
      setTesting(null);
    }
  };

  const handleAddStore = async () => {
    if (!formData.name || !formData.shopifyDomain || !formData.accessToken) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      await apiClient.post("/admin/shopify/stores", formData);
      toast.success("Store added successfully");
      setShowAddDialog(false);
      setFormData({
        name: "",
        shopifyDomain: "",
        apiKey: "",
        apiSecret: "",
        accessToken: "",
      });
      await fetchStores();
    } catch (error) {
      console.error("Error adding store:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to add store"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStore = async () => {
    if (!selectedStore) return;

    setSaving(true);
    try {
      await apiClient.put(`/admin/shopify/stores/${selectedStore.id}`, formData);
      toast.success("Store updated successfully");
      setShowEditDialog(false);
      setSelectedStore(null);
      await fetchStores();
    } catch (error) {
      console.error("Error updating store:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to update store"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStore = async (storeId: string) => {
    if (!confirm("Are you sure you want to delete this store? This action cannot be undone.")) {
      return;
    }

    try {
      await apiClient.delete(`/admin/shopify/stores/${storeId}`);
      toast.success("Store deleted successfully");
      await fetchStores();
    } catch (error) {
      console.error("Error deleting store:", error);
      toast.error("Failed to delete store");
    }
  };

  const openEditDialog = (store: ShopifyStore) => {
    setSelectedStore(store);
    setFormData({
      name: store.name,
      shopifyDomain: store.domain,
      apiKey: "",
      apiSecret: "",
      accessToken: "",
    });
    setShowEditDialog(true);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Shopify Stores</h1>
          <p className="text-gray-600 mt-1">
            Manage your connected Shopify store credentials
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="bg-orange-500 hover:bg-orange-600">
          <Plus className="h-4 w-4 mr-2" />
          Add Store
        </Button>
      </div>

      {/* Stores List */}
      <div className="grid grid-cols-1 gap-4">
        {stores.length > 0 ? (
          stores.map((store) => (
            <Card key={store.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${store.connected ? "bg-green-100" : "bg-red-100"}`}>
                      <Store className={`h-6 w-6 ${store.connected ? "text-green-600" : "text-red-600"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{store.name}</h3>
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
                      <p className="text-sm text-gray-500">{store.domain}</p>
                      {store.shopName && (
                        <p className="text-sm text-gray-400">Shop: {store.shopName}</p>
                      )}
                      {store.country && store.currency && (
                        <p className="text-xs text-gray-400 mt-1">
                          {store.country} • {store.currency}
                        </p>
                      )}
                      {store.error && (
                        <p className="text-sm text-red-500 mt-1">{store.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConnection(store.id)}
                      disabled={testing === store.id}
                    >
                      {testing === store.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      <span className="ml-2">Test</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(store)}
                    >
                      <Settings className="h-4 w-4" />
                      <span className="ml-2">Edit</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDeleteStore(store.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Store className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <h3 className="font-medium text-gray-900 mb-1">No Stores Configured</h3>
                <p className="text-gray-500 mb-4">
                  Add your Shopify store credentials to start syncing orders.
                </p>
                <Button onClick={() => setShowAddDialog(true)} className="bg-orange-500 hover:bg-orange-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Store
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Get Shopify API Credentials</CardTitle>
          <CardDescription>Follow these steps to connect your Shopify store</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-gray-600">
            <li>Go to your Shopify Admin → Settings → Apps and sales channels</li>
            <li>Click "Develop apps" → "Create an app"</li>
            <li>Name your app (e.g., "TC Nutrition Portal")</li>
            <li>Configure Admin API scopes:
              <ul className="list-disc list-inside ml-6 mt-2 text-sm">
                <li><code className="bg-gray-100 px-1 rounded">read_orders</code> - View orders</li>
                <li><code className="bg-gray-100 px-1 rounded">read_products</code> - View products</li>
                <li><code className="bg-gray-100 px-1 rounded">write_discounts</code> - Create discount codes</li>
                <li><code className="bg-gray-100 px-1 rounded">read_discounts</code> - View discount codes</li>
                <li><code className="bg-gray-100 px-1 rounded">write_price_rules</code> - Create price rules</li>
                <li><code className="bg-gray-100 px-1 rounded">read_price_rules</code> - View price rules</li>
              </ul>
            </li>
            <li>Install the app and copy the Admin API access token</li>
            <li>Enter your store domain (e.g., your-store.myshopify.com) and access token above</li>
          </ol>
        </CardContent>
      </Card>

      {/* Add Store Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Shopify Store</DialogTitle>
            <DialogDescription>
              Enter your Shopify store credentials to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name *</Label>
              <Input
                id="name"
                placeholder="e.g., TC Nutrition USA"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="domain">Shopify Domain *</Label>
              <Input
                id="domain"
                placeholder="your-store.myshopify.com"
                value={formData.shopifyDomain}
                onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
              />
              <p className="text-xs text-gray-500">Use your .myshopify.com domain, not custom domain</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="accessToken">Admin API Access Token *</Label>
              <div className="relative">
                <Input
                  id="accessToken"
                  type={showTokens["add"] ? "text" : "password"}
                  placeholder="shpat_xxxxx"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowTokens({ ...showTokens, add: !showTokens["add"] })}
                >
                  {showTokens["add"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key (Optional)</Label>
              <Input
                id="apiKey"
                placeholder="API Key"
                value={formData.apiKey}
                onChange={(e) => setFormData({ ...formData, apiKey: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiSecret">API Secret (Optional)</Label>
              <Input
                id="apiSecret"
                type="password"
                placeholder="API Secret"
                value={formData.apiSecret}
                onChange={(e) => setFormData({ ...formData, apiSecret: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddStore} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? "Adding..." : "Add Store"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Store Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Store: {selectedStore?.name}</DialogTitle>
            <DialogDescription>
              Update your store credentials. Leave token fields empty to keep existing values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Store Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-domain">Shopify Domain *</Label>
              <Input
                id="edit-domain"
                value={formData.shopifyDomain}
                onChange={(e) => setFormData({ ...formData, shopifyDomain: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-accessToken">New Access Token (leave empty to keep current)</Label>
              <div className="relative">
                <Input
                  id="edit-accessToken"
                  type={showTokens["edit"] ? "text" : "password"}
                  placeholder="shpat_xxxxx"
                  value={formData.accessToken}
                  onChange={(e) => setFormData({ ...formData, accessToken: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setShowTokens({ ...showTokens, edit: !showTokens["edit"] })}
                >
                  {showTokens["edit"] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStore} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

