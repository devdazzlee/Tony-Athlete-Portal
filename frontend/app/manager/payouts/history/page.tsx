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
import { History, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime } from "@/lib/date-utils";

export default function PayoutHistoryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [payouts, setPayouts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchPayouts();
    }
  }, [user]);

  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/admin/payouts");
      setPayouts(response.data.data || []);
    } catch (error) {
      console.error("Error fetching payout history:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load payout history"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading payout history..." />;
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

  const completedPayouts = payouts.filter((p) => p.status === "COMPLETED");
  const totalPaid = completedPayouts.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payout History</h1>
          <p className="mt-2 text-gray-600">
            View complete payout history and records
          </p>
        </div>
        <Button onClick={fetchPayouts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{payouts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedPayouts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Payouts</CardTitle>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payout history available
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Processed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      {payout.affiliateName || "N/A"}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${(payout.amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          payout.status === "COMPLETED"
                            ? "default"
                            : payout.status === "PENDING"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {payout.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatRelativeTime(payout.requestedAt || payout.createdAt)}
                    </TableCell>
                    <TableCell>
                      {payout.processedAt
                        ? formatRelativeTime(payout.processedAt)
                        : "N/A"}
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






