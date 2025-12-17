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
import { Target, RefreshCw, TrendingUp, TrendingDown, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";

interface ConversionData {
  totalConversions: number;
  totalClicks: number;
  conversionRate: number;
  totalRevenue: number;
  avgOrderValue: number;
  topConverters: {
    id: string;
    name: string;
    email: string;
    conversions: number;
    clicks: number;
    rate: number;
    revenue: number;
  }[];
  recentConversions: {
    id: string;
    affiliateName: string;
    orderValue: number;
    commission: number;
    date: string;
    status: string;
  }[];
}

export default function ConversionReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [conversionData, setConversionData] = useState<ConversionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConversionData();
    }
  }, [user]);

  const fetchConversionData = async () => {
    setIsLoading(true);
    try {
      // Fetch affiliates data
      const affiliatesResponse = await fetch(
        `${config.apiUrl}/admin/affiliates?limit=500`,
        { headers: getAuthHeaders() }
      );

      // Fetch orders data
      const ordersResponse = await fetch(
        `${config.apiUrl}/manager/shopify/orders?limit=100`,
        { headers: getAuthHeaders() }
      );

      // Fetch stats
      const statsResponse = await fetch(
        `${config.apiUrl}/manager/shopify/stats`,
        { headers: getAuthHeaders() }
      );

      let affiliates: any[] = [];
      let orders: any[] = [];
      let stats: any = {};

      if (affiliatesResponse.ok) {
        const data = await affiliatesResponse.json();
        affiliates = data.data || [];
      }

      if (ordersResponse.ok) {
        const data = await ordersResponse.json();
        orders = data.orders || [];
      }

      if (statsResponse.ok) {
        stats = await statsResponse.json();
      }

      const totalConversions = stats.totalOrders || affiliates.reduce(
        (sum: number, aff: any) => sum + (aff.totalConversions || 0),
        0
      );
      const totalClicks = affiliates.reduce(
        (sum: number, aff: any) => sum + (aff.totalClicks || 0),
        0
      );
      const totalRevenue = stats.totalRevenue || 0;

      // Build top converters from affiliates
      const topConverters = affiliates
        .map((aff: any) => ({
          id: aff.id,
          name: aff.name || "Unknown",
          email: aff.email || "",
          conversions: aff.totalConversions || 0,
          clicks: aff.totalClicks || 0,
          rate: aff.totalClicks > 0 ? ((aff.totalConversions || 0) / aff.totalClicks) * 100 : 0,
          revenue: aff.totalEarnings || 0,
        }))
        .filter((a) => a.conversions > 0)
        .sort((a, b) => b.conversions - a.conversions)
        .slice(0, 10);

      // Build recent conversions from orders
      const recentConversions = orders.slice(0, 10).map((order: any) => ({
        id: order.id,
        affiliateName: order.affiliateName || "Unknown",
        orderValue: order.totalAmount || 0,
        commission: order.commissionAmount || 0,
        date: order.createdAt,
        status: order.status,
      }));

      setConversionData({
        totalConversions,
        totalClicks,
        conversionRate: totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0,
        totalRevenue,
        avgOrderValue: stats.averageOrderValue || 0,
        topConverters,
        recentConversions,
      });
    } catch (error) {
      console.error("Error fetching conversion data:", error);
      toast.error("Failed to load conversion data");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading conversion reports..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">Conversion Reports</h1>
          <p className="mt-2 text-gray-600">
            Track conversion rates and performance metrics
          </p>
        </div>
        <Button onClick={fetchConversionData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {conversionData?.totalConversions.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              From Shopify orders
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {conversionData?.totalClicks.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Affiliate link clicks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {conversionData?.conversionRate.toFixed(2) || "0"}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Clicks to orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${conversionData?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">From affiliate orders</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Order Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${conversionData?.avgOrderValue.toFixed(2) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Per conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Converters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-500" />
            Top Converting Affiliates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversionData?.topConverters && conversionData.topConverters.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conv. Rate</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversionData.topConverters.map((affiliate, index) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "outline"} className={index === 0 ? "bg-yellow-500" : index === 1 ? "bg-gray-400" : index === 2 ? "bg-orange-400" : ""}>
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{affiliate.name}</p>
                        <p className="text-sm text-gray-500">{affiliate.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      {affiliate.conversions}
                    </TableCell>
                    <TableCell>{affiliate.clicks}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={affiliate.rate > 5 ? "text-green-600" : "text-gray-600"}>
                        {affiliate.rate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${affiliate.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">No conversion data available yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Conversions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Recent Conversions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {conversionData?.recentConversions && conversionData.recentConversions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Order Value</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversionData.recentConversions.map((conversion) => (
                  <TableRow key={conversion.id}>
                    <TableCell>{new Date(conversion.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{conversion.affiliateName}</TableCell>
                    <TableCell>${conversion.orderValue.toFixed(2)}</TableCell>
                    <TableCell className="text-green-600 font-medium">
                      ${conversion.commission.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          conversion.status === "APPROVED" || conversion.status === "PAID"
                            ? "bg-green-100 text-green-800"
                            : conversion.status === "PENDING"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {conversion.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">No recent conversions.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
