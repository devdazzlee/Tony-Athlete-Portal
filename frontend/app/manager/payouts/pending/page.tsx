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
import { Clock, CheckCircle, RefreshCw, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime } from "@/lib/date-utils";

interface Payout {
  id: string;
  affiliateId: string;
  affiliateName: string;
  amount: number;
  status: string;
  requestedAt: string;
  processedAt?: string;
}

export default function PendingPayoutsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPayouts();
    }
  }, [user]);

  const fetchPayouts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/payouts`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        const pendingPayouts = (data.data || []).filter(
          (p: Payout) => p.status === "PENDING"
        );
        setPayouts(pendingPayouts);
      } else {
        toast.error("Failed to load payouts");
      }
    } catch (error) {
      console.error("Error fetching payouts:", error);
      toast.error("Failed to load payouts");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProcessPayout = async (payoutId: string) => {
    setProcessingId(payoutId);
    try {
      const response = await fetch(
        `${config.apiUrl}/admin/payouts/${payoutId}/status`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: "PROCESSING" }),
        }
      );

      if (response.ok) {
        toast.success("Payout processing started");
        fetchPayouts();
      } else {
        toast.error("Failed to process payout");
      }
    } catch (error) {
      console.error("Error processing payout:", error);
      toast.error("Failed to process payout");
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading pending payouts..." />;
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

  const totalPending = payouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Pending Payouts</h1>
          <p className="mt-2 text-gray-600">
            Review and process pending payout requests
          </p>
        </div>
        <Button onClick={fetchPayouts} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Payouts ({payouts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-900">
                Total Pending Amount:
              </span>
              <span className="text-2xl font-bold text-blue-900">
                ${totalPending.toFixed(2)}
              </span>
            </div>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending payouts
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((payout) => (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
                      {payout.affiliateName}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${payout.amount.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {formatRelativeTime(payout.requestedAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{payout.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleProcessPayout(payout.id)}
                        disabled={processingId === payout.id}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Process
                      </Button>
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






