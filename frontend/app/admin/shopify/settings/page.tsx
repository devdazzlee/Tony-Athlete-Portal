"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  Settings,
  Webhook,
  RefreshCw,
  Copy,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Shield,
  Trash2,
  Plus,
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
}

interface WebhookInfo {
  id: number;
  topic: string;
  address: string;
  created_at: string;
}

interface WebhookConfig {
  ordersCreate: boolean;
  ordersUpdate: boolean;
  ordersPaid: boolean;
  ordersCancelled: boolean;
  ordersRefunded: boolean;
}

interface SyncSettings {
  autoSync: boolean;
  syncFrequency: string;
  defaultCommissionRate: number;
  holdPeriodDays: number;
  autoApproveOrders: boolean;
  autoApproveThreshold: number;
}

interface WebhookStatus {
  configured: boolean;
  lastReceived: string | null;
  totalReceived: number;
}

export default function AdminShopifySettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<ShopifyStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [webhooks, setWebhooks] = useState<WebhookInfo[]>([]);
  const [loadingWebhooks, setLoadingWebhooks] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [webhookConfig, setWebhookConfig] = useState<WebhookConfig>({
    ordersCreate: true,
    ordersUpdate: true,
    ordersPaid: true,
    ordersCancelled: true,
    ordersRefunded: true,
  });
  const [syncSettings, setSyncSettings] = useState<SyncSettings>({
    autoSync: true,
    syncFrequency: "hourly",
    defaultCommissionRate: 10,
    holdPeriodDays: 30,
    autoApproveOrders: true,
    autoApproveThreshold: 500,
  });
  const [webhookStatus, setWebhookStatus] = useState<WebhookStatus>({
    configured: false,
    lastReceived: null,
    totalReceived: 0,
  });
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");

  const webhookUrl = `${config.apiUrl}/shopify/webhooks/orders`;

  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchStores();
      // Set base URL from current location
      setBaseUrl(typeof window !== "undefined" ? window.location.origin.replace("3000", "5000") : "");
    }
  }, [user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/shopify/settings`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.webhookConfig) setWebhookConfig(data.webhookConfig);
        if (data.syncSettings) setSyncSettings(data.syncSettings);
        if (data.webhookStatus) setWebhookStatus(data.webhookStatus);
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
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
        if (data.stores?.length > 0 && !selectedStore) {
          setSelectedStore(data.stores[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching stores:", error);
    }
  };

  const fetchWebhooks = async (storeId: string) => {
    if (!storeId) return;
    setLoadingWebhooks(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/shopify/webhooks/${storeId}`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      toast.error("Failed to fetch webhooks");
    } finally {
      setLoadingWebhooks(false);
    }
  };

  const registerWebhooks = async () => {
    if (!selectedStore || !baseUrl) {
      toast.error("Please select a store and enter the base URL");
      return;
    }
    setRegistering(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/shopify/webhooks/${selectedStore}/register`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ baseUrl }),
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(`Registered ${data.registered?.length || 0} webhooks`);
        fetchWebhooks(selectedStore);
      } else {
        toast.error(data.error || "Failed to register webhooks");
      }
    } catch (error) {
      console.error("Error registering webhooks:", error);
      toast.error("Failed to register webhooks");
    } finally {
      setRegistering(false);
    }
  };

  const deleteWebhook = async (webhookId: number) => {
    if (!selectedStore) return;
    try {
      const response = await fetch(
        `${config.apiUrl}/admin/shopify/webhooks/${selectedStore}/${webhookId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        toast.success("Webhook deleted");
        fetchWebhooks(selectedStore);
      } else {
        toast.error("Failed to delete webhook");
      }
    } catch (error) {
      console.error("Error deleting webhook:", error);
      toast.error("Failed to delete webhook");
    }
  };

  useEffect(() => {
    if (selectedStore) {
      fetchWebhooks(selectedStore);
    }
  }, [selectedStore]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/shopify/settings`, {
        method: "PUT",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ webhookConfig, syncSettings }),
      });

      if (response.ok) {
        toast.success("Settings saved successfully");
      } else {
        toast.error("Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Scheduler Card Component
  const SchedulerCard = () => {
    const [schedulerStatus, setSchedulerStatus] = useState<{
      running: boolean;
      interval: string;
      stores: { id: string; name: string; lastSync: string | null }[];
    } | null>(null);
    const [loadingScheduler, setLoadingScheduler] = useState(true);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
      fetchSchedulerStatus();
    }, []);

    const fetchSchedulerStatus = async () => {
      try {
        const response = await fetch(`${config.apiUrl}/admin/shopify/scheduler/status`, {
          headers: getAuthHeaders(),
        });
        if (response.ok) {
          const data = await response.json();
          setSchedulerStatus(data);
        }
      } catch (error) {
        console.error("Error fetching scheduler status:", error);
      } finally {
        setLoadingScheduler(false);
      }
    };

    const toggleScheduler = async (start: boolean) => {
      try {
        const response = await fetch(
          `${config.apiUrl}/admin/shopify/scheduler/${start ? "start" : "stop"}`,
          {
            method: "POST",
            headers: getAuthHeaders(),
          }
        );
        if (response.ok) {
          toast.success(`Scheduler ${start ? "started" : "stopped"}`);
          fetchSchedulerStatus();
        }
      } catch (error) {
        toast.error("Failed to toggle scheduler");
      }
    };

    const triggerSync = async () => {
      setSyncing(true);
      try {
        const response = await fetch(`${config.apiUrl}/admin/shopify/scheduler/sync`, {
          method: "POST",
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        if (response.ok) {
          toast.success(`Synced ${data.ordersProcessed} orders from ${data.storesSynced} stores`);
          fetchSchedulerStatus();
        } else {
          toast.error(data.error || "Sync failed");
        }
      } catch (error) {
        toast.error("Failed to trigger sync");
      } finally {
        setSyncing(false);
      }
    };

    if (loadingScheduler) {
      return (
        <Card>
          <CardContent className="py-8 flex items-center justify-center">
            <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Auto-Sync Scheduler
          </CardTitle>
          <CardDescription>
            Automatically sync orders from Shopify every hour
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${schedulerStatus?.running ? "bg-green-100" : "bg-gray-200"}`}>
                {schedulerStatus?.running ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-gray-500" />
                )}
              </div>
              <div>
                <p className="font-medium">
                  {schedulerStatus?.running ? "Scheduler Running" : "Scheduler Stopped"}
                </p>
                <p className="text-sm text-gray-500">
                  Interval: {schedulerStatus?.interval || "1 hour"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => toggleScheduler(!schedulerStatus?.running)}
              >
                {schedulerStatus?.running ? "Stop" : "Start"}
              </Button>
              <Button
                size="sm"
                onClick={triggerSync}
                disabled={syncing}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {syncing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync Now
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Store Sync Status */}
          {schedulerStatus?.stores && schedulerStatus.stores.length > 0 && (
            <div className="space-y-2">
              <Label>Store Sync Status</Label>
              <div className="border rounded-lg divide-y">
                {schedulerStatus.stores.map((store) => (
                  <div key={store.id} className="flex items-center justify-between p-3">
                    <span className="font-medium">{store.name}</span>
                    <span className="text-sm text-gray-500">
                      {store.lastSync
                        ? `Last sync: ${new Date(store.lastSync).toLocaleString()}`
                        : "Never synced"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
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
          <h1 className="text-3xl font-bold text-gray-900">Shopify Settings</h1>
          <p className="text-gray-600 mt-1">
            Configure webhooks, sync settings, and commission rules
          </p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Webhook URL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Webhook className="h-5 w-5" />
            Webhook Configuration
          </CardTitle>
          <CardDescription>
            Configure webhooks in your Shopify admin to receive real-time order updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Webhook URL */}
          <div className="space-y-2">
            <Label>Webhook URL</Label>
            <div className="flex gap-2">
              <Input value={webhookUrl} readOnly className="font-mono text-sm" />
              <Button variant="outline" onClick={copyWebhookUrl}>
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500">
              Add this URL in Shopify Admin → Settings → Notifications → Webhooks
            </p>
          </div>

          {/* Webhook Status */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`p-2 rounded-full ${webhookStatus.configured ? "bg-green-100" : "bg-yellow-100"}`}>
              {webhookStatus.configured ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-yellow-600" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-medium">
                {webhookStatus.configured ? "Webhooks Configured" : "Webhooks Not Configured"}
              </p>
              <p className="text-sm text-gray-500">
                {webhookStatus.lastReceived
                  ? `Last received: ${new Date(webhookStatus.lastReceived).toLocaleString()}`
                  : "No webhooks received yet"}
              </p>
            </div>
            <Badge variant="outline">{webhookStatus.totalReceived} received</Badge>
          </div>

          {/* Webhook Events */}
          <div className="space-y-4">
            <Label>Webhook Events to Process</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: "ordersCreate", label: "Order Created", desc: "When a new order is placed" },
                { key: "ordersUpdate", label: "Order Updated", desc: "When order details change" },
                { key: "ordersPaid", label: "Order Paid", desc: "When payment is confirmed" },
                { key: "ordersCancelled", label: "Order Cancelled", desc: "When order is cancelled" },
                { key: "ordersRefunded", label: "Order Refunded", desc: "When refund is processed" },
              ].map((event) => (
                <div key={event.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{event.label}</p>
                    <p className="text-xs text-gray-500">{event.desc}</p>
                  </div>
                  <Switch
                    checked={webhookConfig[event.key as keyof WebhookConfig]}
                    onCheckedChange={(checked) =>
                      setWebhookConfig({ ...webhookConfig, [event.key]: checked })
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Webhook Registration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Auto-Register Webhooks
          </CardTitle>
          <CardDescription>
            Automatically register webhooks with your Shopify stores for real-time order sync
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Select Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name} {store.connected ? "✓" : "✗"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Portal Base URL</Label>
              <Input
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://your-portal.com"
              />
              <p className="text-xs text-gray-500">
                For production: https://tony-athlete-portal.vercel.app
              </p>
            </div>
          </div>

          <Button
            onClick={registerWebhooks}
            disabled={registering || !selectedStore || !baseUrl}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {registering ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Register Webhooks
              </>
            )}
          </Button>

          {/* Registered Webhooks */}
          {webhooks.length > 0 && (
            <div className="space-y-2">
              <Label>Registered Webhooks</Label>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Topic</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <Badge variant="outline">{webhook.topic}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[200px]">
                          {webhook.address}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(webhook.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteWebhook(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {loadingWebhooks && (
            <div className="flex items-center justify-center py-4">
              <RefreshCw className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          )}

          {!loadingWebhooks && webhooks.length === 0 && selectedStore && (
            <p className="text-sm text-gray-500 text-center py-4">
              No webhooks registered for this store. Click "Register Webhooks" to set them up.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Auto-Sync Scheduler */}
      <SchedulerCard />

      {/* Sync Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sync Settings
          </CardTitle>
          <CardDescription>
            Configure how orders are synced from Shopify
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Auto-Sync Orders</p>
              <p className="text-sm text-gray-500">Automatically sync orders on schedule</p>
            </div>
            <Switch
              checked={syncSettings.autoSync}
              onCheckedChange={(checked) =>
                setSyncSettings({ ...syncSettings, autoSync: checked })
              }
            />
          </div>

          {syncSettings.autoSync && (
            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select
                value={syncSettings.syncFrequency}
                onValueChange={(v) => setSyncSettings({ ...syncSettings, syncFrequency: v })}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time (Webhooks)</SelectItem>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="manual">Manual Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Commission Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Commission Settings
          </CardTitle>
          <CardDescription>
            Configure default commission rates and approval rules
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Default Commission Rate (%)</Label>
              <Input
                type="number"
                value={syncSettings.defaultCommissionRate}
                onChange={(e) =>
                  setSyncSettings({ ...syncSettings, defaultCommissionRate: Number(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">Applied when affiliate doesn't have custom rate</p>
            </div>
            <div className="space-y-2">
              <Label>Commission Hold Period (Days)</Label>
              <Input
                type="number"
                value={syncSettings.holdPeriodDays}
                onChange={(e) =>
                  setSyncSettings({ ...syncSettings, holdPeriodDays: Number(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">Days before commission becomes payable</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Auto-Approve Orders</p>
              <p className="text-sm text-gray-500">Automatically approve orders below threshold</p>
            </div>
            <Switch
              checked={syncSettings.autoApproveOrders}
              onCheckedChange={(checked) =>
                setSyncSettings({ ...syncSettings, autoApproveOrders: checked })
              }
            />
          </div>

          {syncSettings.autoApproveOrders && (
            <div className="space-y-2">
              <Label>Auto-Approve Threshold ($)</Label>
              <Input
                type="number"
                value={syncSettings.autoApproveThreshold}
                onChange={(e) =>
                  setSyncSettings({ ...syncSettings, autoApproveThreshold: Number(e.target.value) })
                }
              />
              <p className="text-xs text-gray-500">Orders below this amount are auto-approved</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Webhook Setup Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-3 text-gray-600">
            <li>Go to your Shopify Admin → Settings → Notifications</li>
            <li>Scroll down to "Webhooks" section</li>
            <li>Click "Create webhook"</li>
            <li>Select event: <code className="bg-gray-100 px-1 rounded">Order creation</code></li>
            <li>Format: <code className="bg-gray-100 px-1 rounded">JSON</code></li>
            <li>URL: Paste the webhook URL shown above</li>
            <li>Repeat for other events: Order payment, Order cancellation, Order update</li>
            <li>Save each webhook</li>
          </ol>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Important</p>
                <p className="text-sm text-yellow-700">
                  Make sure your portal is accessible from the internet for webhooks to work.
                  For local development, use a service like ngrok.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

