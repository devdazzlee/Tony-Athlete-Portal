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
import { BarChart3, RefreshCw, TrendingUp, Users, DollarSign, Target, Award } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { useTiers } from "@/hooks/useTiers";

interface TeamPerformance {
  totalAffiliates: number;
  activeAffiliates: number;
  totalRevenue: number;
  totalCommissions: number;
  avgConversionRate: number;
  topPerformers: {
    id: string;
    name: string;
    email: string;
    tier: string;
    revenue: number;
    conversions: number;
    commissionRate: number;
    status: string;
  }[];
  tierBreakdown: {
    tier: string;
    count: number;
    revenue: number;
  }[];
}

export default function TeamPerformancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const { tiers, getTierBadgeColor, getTierByName } = useTiers();
  const [performance, setPerformance] = useState<TeamPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPerformance();
    }
  }, [user]);

  const fetchPerformance = async () => {
    setIsLoading(true);
    try {
      // Fetch affiliates data
      let affiliates: any[] = [];
      let stats: any = {};

      const [affiliatesResponse, statsResponse] = await Promise.all([
        apiClient.get("/admin/affiliates?limit=500"),
        apiClient.get("/manager/shopify/stats"),
      ]);

      affiliates = affiliatesResponse.data?.data || [];
      stats = statsResponse.data || {};

      const activeAffiliates = affiliates.filter((a: any) => a.status === "ACTIVE").length;
      const totalRevenue = stats.totalRevenue || affiliates.reduce(
        (sum: number, aff: any) => sum + (aff.totalEarnings || 0),
        0
      );
      const totalCommissions = stats.totalCommissions || 0;

      // Calculate tier breakdown
      const tierCounts: Record<string, { count: number; revenue: number }> = {};
      affiliates.forEach((aff: any) => {
        const tier = aff.tier || "BRONZE";
        if (!tierCounts[tier]) {
          tierCounts[tier] = { count: 0, revenue: 0 };
        }
        tierCounts[tier].count++;
        tierCounts[tier].revenue += aff.totalEarnings || 0;
      });

      const tierBreakdown = Object.entries(tierCounts).map(([tier, data]) => ({
        tier,
        count: data.count,
        revenue: data.revenue,
      }));

      // Build top performers
      const topPerformers = affiliates
        .map((aff: any) => ({
          id: aff.id,
          name: aff.name || "Unknown",
          email: aff.email || "",
          tier: aff.tier || "BRONZE",
          revenue: aff.totalEarnings || 0,
          conversions: aff.totalConversions || 0,
          commissionRate: aff.commissionRate || 10,
          status: aff.status || "ACTIVE",
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 15);

      // Calculate average conversion rate
      const totalClicks = affiliates.reduce((sum: number, aff: any) => sum + (aff.totalClicks || 0), 0);
      const totalConversions = affiliates.reduce((sum: number, aff: any) => sum + (aff.totalConversions || 0), 0);
      const avgConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

      setPerformance({
        totalAffiliates: affiliates.length,
        activeAffiliates,
        totalRevenue,
        totalCommissions,
        avgConversionRate,
        topPerformers,
        tierBreakdown,
      });
    } catch (error) {
      console.error("Error fetching performance:", error);
      toast.error("Failed to load performance data");
    } finally {
      setIsLoading(false);
    }
  };

  const getTierBadge = (tierEnum: string) => {
    const tier = getTierByName(tierEnum);
    const tierName = tier ? tier.name : tierEnum;
    const badgeColor = getTierBadgeColor(tierName);
    return <Badge className={badgeColor}>{tierName}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      SUSPENDED: "bg-red-100 text-red-800",
      INACTIVE: "bg-gray-100 text-gray-800",
    };
    return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading team performance..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">Team Performance</h1>
          <p className="mt-2 text-gray-600">
            Track affiliate team performance metrics
          </p>
        </div>
        <Button onClick={fetchPerformance} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {performance?.totalAffiliates || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">All registered</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Active Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {performance?.activeAffiliates || 0}
            </div>
            <p className="text-xs text-gray-500 mt-1">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${performance?.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Generated by team</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Award className="h-4 w-4" />
              Total Commissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${performance?.totalCommissions.toLocaleString(undefined, { minimumFractionDigits: 2 }) || "0.00"}
            </div>
            <p className="text-xs text-gray-500 mt-1">Earned by affiliates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Avg Conv. Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {performance?.avgConversionRate.toFixed(2) || "0"}%
            </div>
            <p className="text-xs text-gray-500 mt-1">Team average</p>
          </CardContent>
        </Card>
      </div>

      {/* Tier Breakdown */}
      {performance?.tierBreakdown && performance.tierBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              Affiliates by Tier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {tiers
                .filter(tier => tier.status === "ACTIVE")
                .sort((a, b) => b.level - a.level)
                .map((tier) => {
                  const data = performance.tierBreakdown.find((t) => 
                    t.tier === tier.name || t.tier.toUpperCase() === tier.name.toUpperCase()
                  );
                  return (
                    <div key={tier.id} className="p-4 border rounded-lg text-center">
                      {getTierBadge(tier.name)}
                      <p className="text-2xl font-bold mt-2">{data?.count || 0}</p>
                      <p className="text-xs text-gray-500">affiliates</p>
                      <p className="text-sm font-medium text-green-600 mt-1">
                        ${(data?.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
                      </p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Top Performers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {performance?.topPerformers && performance.topPerformers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Commission Rate</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.topPerformers.map((affiliate, index) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <Badge
                        variant={index < 3 ? "default" : "outline"}
                        className={
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                            ? "bg-gray-400"
                            : index === 2
                            ? "bg-orange-400"
                            : ""
                        }
                      >
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{affiliate.name}</p>
                        <p className="text-sm text-gray-500">{affiliate.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTierBadge(affiliate.tier)}</TableCell>
                    <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                    <TableCell className="font-medium">{affiliate.conversions}</TableCell>
                    <TableCell>{affiliate.commissionRate}%</TableCell>
                    <TableCell className="font-bold text-green-600">
                      ${affiliate.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">No performance data available yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
