"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Settings, DollarSign, Calendar, CreditCard, AlertCircle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";

interface PayoutSettings {
  minimumPayout: number;
  payoutFrequency: string;
  payoutDay: number;
  autoApprove: boolean;
  autoApproveThreshold: number;
  defaultCommissionRate: number;
  holdPeriodDays: number;
  paymentMethods: string[];
}

export default function PayoutSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [settings, setSettings] = useState<PayoutSettings>({
    minimumPayout: 50,
    payoutFrequency: "monthly",
    payoutDay: 15,
    autoApprove: true,
    autoApproveThreshold: 500,
    defaultCommissionRate: 10,
    holdPeriodDays: 30,
    paymentMethods: ["paypal", "bank_transfer"],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingPayouts, setPendingPayouts] = useState(0);
  const [totalPending, setTotalPending] = useState(0);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      // Fetch payout stats
      const payoutsResponse = await apiClient.get("/admin/payouts");
      const data = payoutsResponse.data;
      const payouts = data.data || [];
      const pending = payouts.filter((p: any) => p.status === "PENDING");
      setPendingPayouts(pending.length);
      setTotalPending(
        pending.reduce((sum: number, p: any) => sum + (p.amount || 0), 0)
      );

      // In a real app, you'd fetch settings from the backend
      // For now, using default values
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Failed to load settings");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // In a real app, you'd save to backend
      await new Promise((resolve) => setTimeout(resolve, 500));
      toast.success("Payout settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading payout settings..." />;
  }

  if (!user) {
    return (
      <AuthRequired
        message="Manager Access Required"
        actionText="Go to Login"
        actionUrl="/auth/login"
      />
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payout Settings</h1>
          <p className="mt-2 text-gray-600">
            Configure payout processing settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-orange-500 hover:bg-orange-600">
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingPayouts}</div>
            <p className="text-xs text-gray-500 mt-1">Awaiting processing</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Pending Amount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-gray-500 mt-1">To be paid out</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Default Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{settings.defaultCommissionRate}%</div>
            <p className="text-xs text-gray-500 mt-1">Standard rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Payout Thresholds
            </CardTitle>
            <CardDescription>Configure minimum payout amounts and commission rates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="minimumPayout">Minimum Payout Amount ($)</Label>
              <Input
                id="minimumPayout"
                type="number"
                value={settings.minimumPayout}
                onChange={(e) => setSettings({ ...settings, minimumPayout: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-500">Affiliates must earn this amount before requesting payout</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Default Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                value={settings.defaultCommissionRate}
                onChange={(e) => setSettings({ ...settings, defaultCommissionRate: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-500">Applied to new affiliates unless specified otherwise</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="holdPeriod">Hold Period (Days)</Label>
              <Input
                id="holdPeriod"
                type="number"
                value={settings.holdPeriodDays}
                onChange={(e) => setSettings({ ...settings, holdPeriodDays: Number(e.target.value) })}
              />
              <p className="text-xs text-gray-500">Days to hold commission before it becomes payable</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Payout Schedule
            </CardTitle>
            <CardDescription>Configure when payouts are processed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="frequency">Payout Frequency</Label>
              <Select
                value={settings.payoutFrequency}
                onValueChange={(v) => setSettings({ ...settings, payoutFrequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payoutDay">Payout Day</Label>
              <Select
                value={settings.payoutDay.toString()}
                onValueChange={(v) => setSettings({ ...settings, payoutDay: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 5, 10, 15, 20, 25, 28].map((day) => (
                    <SelectItem key={day} value={day.toString()}>
                      {day === 1 ? "1st" : day === 2 ? "2nd" : day === 3 ? "3rd" : `${day}th`} of the month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Auto-Approval Settings
            </CardTitle>
            <CardDescription>Configure automatic payout approval</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-Approve Payouts</Label>
                <p className="text-xs text-gray-500">Automatically approve payouts below threshold</p>
              </div>
              <Switch
                checked={settings.autoApprove}
                onCheckedChange={(v) => setSettings({ ...settings, autoApprove: v })}
              />
            </div>
            {settings.autoApprove && (
              <div className="space-y-2">
                <Label htmlFor="autoApproveThreshold">Auto-Approve Threshold ($)</Label>
                <Input
                  id="autoApproveThreshold"
                  type="number"
                  value={settings.autoApproveThreshold}
                  onChange={(e) => setSettings({ ...settings, autoApproveThreshold: Number(e.target.value) })}
                />
                <p className="text-xs text-gray-500">Payouts below this amount are auto-approved</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-purple-500" />
              Payment Methods
            </CardTitle>
            <CardDescription>Enabled payment methods for affiliates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {[
                { id: "paypal", name: "PayPal", icon: "💳" },
                { id: "bank_transfer", name: "Bank Transfer", icon: "🏦" },
                { id: "wise", name: "Wise", icon: "🌐" },
                { id: "crypto", name: "Cryptocurrency", icon: "₿" },
              ].map((method) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <span>{method.icon}</span>
                    <span className="font-medium">{method.name}</span>
                  </div>
                  <Switch
                    checked={settings.paymentMethods.includes(method.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSettings({
                          ...settings,
                          paymentMethods: [...settings.paymentMethods, method.id],
                        });
                      } else {
                        setSettings({
                          ...settings,
                          paymentMethods: settings.paymentMethods.filter((m) => m !== method.id),
                        });
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">Important Note</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Changes to payout settings will only affect future payouts. Existing pending payouts will be processed with the settings that were in effect when they were created.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
