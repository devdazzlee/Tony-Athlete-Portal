"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Save,
  Shield,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";


export default function SystemSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<{
    general?: any;
    affiliate?: any;
    security?: any;
    notifications?: any;
  } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await apiClient.get("/system-settings", {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      const data = response.data;
      console.log("Fetched settings data:", data); // Debug log

      setSettings({
        general: data.general || {},
        affiliate: data.affiliate || {},
        security: data.security || {},
        notifications: data.notifications || {},
      });
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load settings"
      );
    } finally {
      setIsLoading(false);
    }
  };


  const handleSaveGeneral = async () => {
    if (!settings || !settings.general) {
      toast.error("Settings not loaded. Please refresh the page.");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await apiClient.put(
        "/system-settings/general",
        settings.general,
        {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      const data = response.data;
      console.log("General settings update response:", data); // Debug log
      toast.success(data.message || "General settings updated successfully!");
      // Force refresh settings after successful update
      await fetchSettings();
    } catch (error) {
      console.error("Error updating general settings:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to update general settings"
      );
    } finally {
      setIsLoading(false);
    }
  };


  const handleSettingChange = (section: string, key: string, value: any) => {
    setSettings((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [section]: {
          ...(prev as any)[section],
          [key]: value,
        },
      };
    });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {isLoading || !settings ? (
        <div className="space-y-4">
          <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
          <div className="h-4 w-64 bg-gray-200 animate-pulse rounded" />
          <div className="h-64 bg-white border border-gray-200 rounded-xl shadow-sm animate-pulse" />
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">
            Configure your affiliate program settings
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2 bg-gray-200 text-gray-900">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      </div>

      {/* General Settings */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center text-gray-900">
                <Settings className="h-5 w-5 mr-2" />
                General Settings
              </CardTitle>
              <CardDescription className="text-gray-600">Basic program configuration</CardDescription>
            </div>
            <Button onClick={handleSaveGeneral} disabled={isLoading} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="programName" className="text-gray-700">Program Name</Label>
              <Input
                id="programName"
                value={settings.general.programName}
                onChange={(e) =>
                  handleSettingChange("general", "programName", e.target.value)
                }
                className="!bg-white border-gray-300 text-gray-900"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-gray-700">Timezone</Label>
              <Select
                value={settings.general.timezone}
                onValueChange={(value) =>
                  handleSettingChange("general", "timezone", value)
                }
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="America/New_York" className="text-gray-900 hover:bg-gray-100">
                    Eastern Time (ET)
                  </SelectItem>
                  <SelectItem value="America/Chicago" className="text-gray-900 hover:bg-gray-100">
                    Central Time (CT)
                  </SelectItem>
                  <SelectItem value="America/Denver" className="text-gray-900 hover:bg-gray-100">
                    Mountain Time (MT)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles" className="text-gray-900 hover:bg-gray-100">
                    Pacific Time (PT)
                  </SelectItem>
                  <SelectItem value="Europe/London" className="text-gray-900 hover:bg-gray-100">London (GMT)</SelectItem>
                  <SelectItem value="Europe/Paris" className="text-gray-900 hover:bg-gray-100">Paris (CET)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-gray-700">Currency</Label>
              <Select
                value={settings.general.currency}
                onValueChange={(value) =>
                  handleSettingChange("general", "currency", value)
                }
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="USD" className="text-gray-900 hover:bg-gray-100">USD - US Dollar ($)</SelectItem>
                  <SelectItem value="GBP" className="text-gray-900 hover:bg-gray-100">GBP - British Pound</SelectItem>
                  <SelectItem value="CAD" className="text-gray-900 hover:bg-gray-100">CAD - Canadian Dollar</SelectItem>
                  <SelectItem value="AUD" className="text-gray-900 hover:bg-gray-100">AUD - Australian Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language" className="text-gray-700">Language</Label>
              <Select
                value={settings.general.language}
                onValueChange={(value) =>
                  handleSettingChange("general", "language", value)
                }
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-200">
                  <SelectItem value="en" className="text-gray-900 hover:bg-gray-100">English</SelectItem>
                  <SelectItem value="es" className="text-gray-900 hover:bg-gray-100">Spanish</SelectItem>
                  <SelectItem value="fr" className="text-gray-900 hover:bg-gray-100">French</SelectItem>
                  <SelectItem value="de" className="text-gray-900 hover:bg-gray-100">German</SelectItem>
                  <SelectItem value="it" className="text-gray-900 hover:bg-gray-100">Italian</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="programDescription" className="text-gray-700">Program Description</Label>
            <textarea
              id="programDescription"
              value={settings.general.programDescription}
              onChange={(e) =>
                handleSettingChange(
                  "general",
                  "programDescription",
                  e.target.value
                )
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900"
            />
          </div>
        </CardContent>
      </Card>
      </>
      )}
    </div>
  );
}
