"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import {
  Shield,
  BarChart3,
  Users,
  DollarSign,
  TrendingUp,
  RefreshCw,
  ShoppingBag,
} from "lucide-react";
import Link from "next/link";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { toast } from "sonner";

interface DashboardStats {
  totalAffiliates: number;
  totalRevenue: number;
  activeOffers: number;
  conversionRate: number;
  totalClicks: number;
  totalConversions: number;
  pendingPayouts: number;
  totalCommissions: number;
  shopifyOrders: number;
  shopifyRevenue: number;
}

export default function ManagerDashboardPage() {
  const { user, isLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    setIsLoadingStats(true);
    try {
      // Fetch affiliates
      const affiliatesResponse = await fetch(
        `${config.apiUrl}/admin/affiliates?limit=1000`,
        {
          headers: getAuthHeaders(),
        }
      );

      // Fetch offers
      const offersResponse = await fetch(`${config.apiUrl}/admin/offers`, {
        headers: getAuthHeaders(),
      });

      // Fetch payouts
      const payoutsResponse = await fetch(`${config.apiUrl}/admin/payouts`, {
        headers: getAuthHeaders(),
      });

      let totalAffiliates = 0;
      let totalRevenue = 0;
      let totalClicks = 0;
      let totalConversions = 0;
      let activeOffers = 0;
      let pendingPayouts = 0;
      let totalCommissions = 0;

      if (affiliatesResponse.ok) {
        const affiliatesData = await affiliatesResponse.json();
        totalAffiliates = affiliatesData.data?.length || 0;
        if (affiliatesData.data) {
          totalRevenue = affiliatesData.data.reduce(
            (sum: number, aff: any) => sum + (aff.totalEarnings || 0),
            0
          );
          totalClicks = affiliatesData.data.reduce(
            (sum: number, aff: any) => sum + (aff.totalClicks || 0),
            0
          );
          totalConversions = affiliatesData.data.reduce(
            (sum: number, aff: any) => sum + (aff.totalConversions || 0),
            0
          );
        }
      }

      if (offersResponse.ok) {
        const offersData = await offersResponse.json();
        activeOffers =
          offersData.data?.filter((o: any) => o.status === "active").length ||
          0;
      }

      if (payoutsResponse.ok) {
        const payoutsData = await payoutsResponse.json();
        pendingPayouts =
          payoutsData.data?.filter((p: any) => p.status === "PENDING")
            .length || 0;
        totalCommissions = payoutsData.data?.reduce(
          (sum: number, p: any) => sum + (p.amount || 0),
          0
        ) || 0;
      }

      // Fetch Shopify stats
      let shopifyOrders = 0;
      let shopifyRevenue = 0;
      try {
        const shopifyResponse = await fetch(`${config.apiUrl}/manager/shopify/stats`, {
          headers: getAuthHeaders(),
        });
        if (shopifyResponse.ok) {
          const shopifyData = await shopifyResponse.json();
          shopifyOrders = shopifyData.totalOrders || 0;
          shopifyRevenue = shopifyData.totalRevenue || 0;
        }
      } catch (e) {
        console.log("Shopify stats not available");
      }

      const conversionRate =
        totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      setStats({
        totalAffiliates,
        totalRevenue,
        activeOffers,
        conversionRate: parseFloat(conversionRate.toFixed(2)),
        totalClicks,
        totalConversions,
        pendingPayouts,
        totalCommissions,
        shopifyOrders,
        shopifyRevenue,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard statistics");
    } finally {
      setIsLoadingStats(false);
    }
  };

  if (isLoading || isLoadingStats) {
    return <ManagerLoading message="Loading manager dashboard..." />;
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
          {/* Welcome Section */}
          <div>
        <h1 className="text-3xl font-bold text-gray-900">Manager Dashboard</h1>
            <p className="mt-2 text-gray-600">
              Welcome back, {user.firstName}! Manage your affiliate program and
              team.
            </p>
          </div>

          {/* Manager Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Affiliates
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalAffiliates || 0}
            </div>
                <p className="text-xs text-muted-foreground">
              Active affiliate partners
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.totalRevenue.toLocaleString() || "0"}
            </div>
                <p className="text-xs text-muted-foreground">
              All-time revenue generated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Offers</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">{stats?.activeOffers || 0}</div>
                <p className="text-xs text-muted-foreground">
              Currently active offers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Conversion Rate
                </CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
            <div className="text-2xl font-bold">
              {stats?.conversionRate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalConversions || 0} conversions from{" "}
              {stats?.totalClicks || 0} clicks
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Shopify Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shopify Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.shopifyOrders?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Affiliate orders from Shopify</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shopify Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.shopifyRevenue?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">Revenue from affiliate orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalClicks?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">All-time clicks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Payouts
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingPayouts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting processing
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Affiliate Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/manager/affiliates/all">
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <h3 className="font-medium text-gray-900">View Affiliates</h3>
                      <p className="text-sm text-gray-500">
                        Manage and monitor affiliate performance
                      </p>
                    </div>
                  </Link>
                  <Link href="/manager/affiliates/approval">
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <h3 className="font-medium text-gray-900">Approval Queue</h3>
                      <p className="text-sm text-gray-500">
                        Review pending affiliate applications
                      </p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingBag className="h-5 w-5 text-orange-500" />
                  Shopify Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/manager/shopify">
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <h3 className="font-medium text-gray-900">Shopify Overview</h3>
                      <p className="text-sm text-gray-500">
                        View connected stores and stats
                      </p>
                    </div>
                  </Link>
                  <Link href="/manager/shopify/orders">
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <h3 className="font-medium text-gray-900">Shopify Orders</h3>
                      <p className="text-sm text-gray-500">
                        View all affiliate orders from Shopify
                      </p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Program Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/manager/offers">
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <h3 className="font-medium text-gray-900">Offer Management</h3>
                      <p className="text-sm text-gray-500">
                        Create and manage affiliate offers
                      </p>
                    </div>
                  </Link>
                  <Link href="/manager/payouts">
                    <div className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                      <h3 className="font-medium text-gray-900">Payout Management</h3>
                      <p className="text-sm text-gray-500">
                        Process and manage affiliate payouts
                      </p>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
    </div>
  );
}
