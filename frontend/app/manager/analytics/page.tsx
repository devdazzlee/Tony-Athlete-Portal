"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart3, TrendingUp, MousePointer, Target } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ManagerAnalyticsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <ManagerLoading message="Loading analytics..." />;
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
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics & Reports</h1>
        <p className="mt-2 text-gray-600">
          View detailed analytics and performance reports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Revenue Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              View detailed revenue analytics and trends
            </p>
            <Button asChild>
              <Link href="/manager/analytics/revenue">View Reports</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MousePointer className="h-5 w-5" />
              Traffic Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Analyze traffic sources and quality
            </p>
            <Button asChild>
              <Link href="/manager/analytics/traffic">View Analysis</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Conversion Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Track conversion rates and performance
            </p>
            <Button asChild>
              <Link href="/manager/analytics/conversions">View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}






