"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { LinkIcon, RefreshCw, TrendingUp, MousePointer, Target } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";

interface Offer {
  id: string;
  name: string;
  description: string;
  commissionRate: number;
  status: string;
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  conversionRate: number;
}

export default function ActiveOffersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchOffers();
    }
  }, [user]);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/admin/offers");
      const data = response.data;
      const activeOffers = (data.data || []).filter(
        (o: Offer) => o.status === "active"
      );
      setOffers(activeOffers);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load offers"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading active offers..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">Active Offers</h1>
          <p className="mt-2 text-gray-600">
            View and manage all active promotional offers
          </p>
        </div>
        <Button onClick={fetchOffers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{offers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers.reduce((sum, o) => sum + o.totalClicks, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Conversions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers.reduce((sum, o) => sum + o.totalConversions, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${offers.reduce((sum, o) => sum + o.totalRevenue, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Offers</CardTitle>
          <CardDescription>{offers.length} active offer(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {offers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active offers found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer Name</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Conversion Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{offer.name}</div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {offer.description}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{offer.commissionRate}%</Badge>
                    </TableCell>
                    <TableCell>{offer.totalClicks.toLocaleString()}</TableCell>
                    <TableCell>{offer.totalConversions}</TableCell>
                    <TableCell className="font-medium">
                      ${offer.totalRevenue.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {offer.conversionRate.toFixed(2)}%
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






