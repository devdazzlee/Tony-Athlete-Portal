"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MousePointer, RefreshCw, TrendingUp, Globe, Users, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";

interface TrafficData {
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  uniqueVisitors: number;
  topTrafficSources: {
    id: string;
    name: string;
    email: string;
    clicks: number;
    conversions: number;
    rate: number;
    commissionRate: number;
  }[];
  trafficByStore: {
    storeName: string;
    orders: number;
    revenue: number;
  }[];
}

export default function TrafficAnalysisPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [trafficData, setTrafficData] = useState<TrafficData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrafficData();
    }
  }, [user]);

  const fetchTrafficData = async () => {
    setIsLoading(true);
    try {
      const [affiliatesResponse, statsResponse] = await Promise.all([
        apiClient.get("/admin/affiliates?limit=500"),
        apiClient.get("/manager/shopify/stats"),
      ]);

      const affiliates: any[] = affiliatesResponse.data?.data || [];
      const stats: any = statsResponse.data || {};

      const totalClicks = affiliates.reduce(
        (sum: number, aff: any) => sum + (aff.totalClicks || 0),
        0
      );
      const totalConversions = stats.totalOrders || affiliates.reduce(
        (sum: number, aff: any) => sum + (aff.totalConversions || 0),
        0
      );

      // Build top traffic sources from affiliates
      const topTrafficSources = affiliates
        .map((aff: any) => ({
          id: aff.id,
          name: aff.name || "Unknown",
          email: aff.email || "",
          clicks: aff.totalClicks || 0,
          conversions: aff.totalConversions || 0,
          rate: aff.totalClicks > 0 ? ((aff.totalConversions || 0) / aff.totalClicks) * 100 : 0,
          commissionRate: aff.commissionRate || 0,
        }))
        .sort((a: any, b: any) => b.clicks - a.clicks)
        .slice(0, 15);

      setTrafficData({
        totalClicks,
        totalConversions,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        uniqueVisitors: Math.round(totalClicks * 0.7), // Estimate unique visitors
        topTrafficSources,
        trafficByStore: stats.storeBreakdown || [],
      });
    } catch (error) {
      console.error("Error fetching traffic data:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load traffic data"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading traffic analysis..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">Traffic Analysis</h1>
          <p className="mt-2 text-gray-600">
            Analyze traffic sources and quality metrics
          </p>
        </div>
        <Button onClick={fetchTrafficData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MousePointer className="h-4 w-4" />
              Total Clicks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {trafficData?.totalClicks.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-500 mt-1">All affiliate links</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Est. Unique Visitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {trafficData?.uniqueVisitors.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-500 mt-1">~70% of clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Conversions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {trafficData?.totalConversions.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Completed orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Conversion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {trafficData?.conversionRate.toFixed(2) || "0"}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Click to purchase</p>
          </CardContent>
        </Card>
      </div>

      {/* Traffic by Store */}
      {trafficData?.trafficByStore && trafficData.trafficByStore.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              Traffic by Store
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {trafficData.trafficByStore.map((store, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-gray-900">{store.storeName}</h3>
                      <p className="text-sm text-gray-500">{store.orders} orders</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        ${store.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs text-gray-500">revenue</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Traffic Sources */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Top Traffic Sources (Affiliates)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trafficData?.topTrafficSources && trafficData.topTrafficSources.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Conv. Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trafficData.topTrafficSources.map((source, index) => (
                  <TableRow key={source.id}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "outline"} className={index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : ""}>
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{source.name}</p>
                        <p className="text-sm text-gray-500">{source.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{source.commissionRate}%</TableCell>
                    <TableCell className="font-semibold">{source.clicks.toLocaleString()}</TableCell>
                    <TableCell>{source.conversions}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          source.rate > 5
                            ? "text-green-600 border-green-300"
                            : source.rate > 2
                            ? "text-yellow-600 border-yellow-300"
                            : "text-gray-600"
                        }
                      >
                        {source.rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">No traffic data available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
