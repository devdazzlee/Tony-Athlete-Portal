"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, TrendingUp, RefreshCw, Target } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";

interface AffiliatePerformance {
  id: string;
  name: string;
  email: string;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  conversionRate: number;
  lastActivity: string;
}

export default function AffiliatePerformancePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [affiliates, setAffiliates] = useState<AffiliatePerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAffiliates();
    }
  }, [user]);

  const fetchAffiliates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${config.apiUrl}/admin/affiliates?limit=500`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const performanceData = (data.data || []).map((aff: any) => ({
          id: aff.id,
          name: aff.name,
          email: aff.email,
          totalClicks: aff.totalClicks || 0,
          totalConversions: aff.totalConversions || 0,
          totalEarnings: aff.totalEarnings || 0,
          conversionRate:
            aff.totalClicks > 0
              ? ((aff.totalConversions || 0) / aff.totalClicks) * 100
              : 0,
          lastActivity: aff.lastActivity || aff.joinDate,
        }));
        setAffiliates(performanceData.sort((a: any, b: any) => b.totalEarnings - a.totalEarnings));
      } else {
        toast.error("Failed to load affiliate performance");
      }
    } catch (error) {
      console.error("Error fetching affiliate performance:", error);
      toast.error("Failed to load affiliate performance");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading performance data..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">
            Affiliate Performance Review
          </h1>
          <p className="mt-2 text-gray-600">
            Analyze affiliate performance metrics and rankings
          </p>
        </div>
        <Button onClick={fetchAffiliates} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates.filter((a) => a.totalEarnings > 1000).length}
            </div>
            <p className="text-xs text-gray-500">Earnings &gt; $1,000</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates.reduce((sum, a) => sum + a.totalClicks, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates.reduce((sum, a) => sum + a.totalConversions, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {affiliates.length > 0
                ? (
                    affiliates.reduce((sum, a) => sum + a.conversionRate, 0) /
                    affiliates.length
                  ).toFixed(2)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          {affiliates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No performance data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                  <TableHead>Total Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {affiliates.map((affiliate, index) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <Badge variant={index < 3 ? "default" : "secondary"}>
                        #{index + 1}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{affiliate.name}</div>
                        <div className="text-sm text-gray-500">{affiliate.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>{affiliate.totalClicks.toLocaleString()}</TableCell>
                    <TableCell>{affiliate.totalConversions}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {affiliate.conversionRate.toFixed(2)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${affiliate.totalEarnings.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}






