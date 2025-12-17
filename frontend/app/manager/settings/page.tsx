"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { Settings } from "lucide-react";

export default function ManagerSettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ManagerLoading message="Loading settings..." />;
  }

  if (!user) {
    return <AuthRequired message="Manager Access Required" actionText="Go to Login" actionUrl="/auth/login" />;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">
          Manage your account settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Account Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Settings page coming soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}






