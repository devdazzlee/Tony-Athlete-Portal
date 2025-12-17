"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TrendingUp, DollarSign, RefreshCw, Calendar } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RevenueReportsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [revenueData, setRevenueData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRevenueData();
    }
  }, [user]);

  const fetchRevenueData = async () => {
    setIsLoading(true);
    try {
      const affiliatesResponse = await fetch(
        `${config.apiUrl}/admin/affiliates?limit=500`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (affiliatesResponse.ok) {
        const data = await affiliatesResponse.json();
        const affiliates = data.data || [];
        
        const totalRevenue = affiliates.reduce(
          (sum: number, aff: any) => sum + (aff.totalEarnings || 0),
          0
        );
        const totalCommissions = affiliates.reduce(
          (sum: number, aff: any) => sum + (aff.totalCommissions || 0),
          0
        );

        setRevenueData({
          totalRevenue,
          totalCommissions,
          affiliateCount: affiliates.length,
          topAffiliates: affiliates
            .sort((a: any, b: any) => (b.totalEarnings || 0) - (a.totalEarnings || 0))
            .slice(0, 10),
        });
      } else {
        toast.error("Failed to load revenue data");
      }
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast.error("Failed to load revenue data");
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading revenue reports..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">Revenue Reports</h1>
          <p className="mt-2 text-gray-600">
            View detailed revenue analytics and trends
          </p>
        </div>
        <Button onClick={fetchRevenueData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${revenueData?.totalRevenue.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-500">All-time revenue</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${revenueData?.totalCommissions.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-gray-500">Paid to affiliates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Affiliates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {revenueData?.affiliateCount || 0}
            </div>
            <p className="text-xs text-gray-500">Generating revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Generators</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueData?.topAffiliates?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No revenue data available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData?.topAffiliates?.map((aff: any, index: number) => (
                  <TableRow key={aff.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{aff.name}</div>
                        <div className="text-sm text-gray-500">{aff.email}</div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(aff.totalEarnings || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={aff.status === "ACTIVE" ? "default" : "secondary"}>
                        {aff.status}
                      </Badge>
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






