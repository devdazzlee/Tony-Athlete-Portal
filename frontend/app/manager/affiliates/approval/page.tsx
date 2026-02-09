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
import { Clock, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime } from "@/lib/date-utils";

interface PendingAffiliate {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: string;
  applicationDate: string;
}

export default function ApprovalQueuePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [pendingAffiliates, setPendingAffiliates] = useState<PendingAffiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchPendingAffiliates();
    }
  }, [user]);

  const fetchPendingAffiliates = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get(
        "/admin/affiliates?status=PENDING&limit=500"
      );
      setPendingAffiliates(response.data?.data || []);
    } catch (error) {
      console.error("Error fetching pending affiliates:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load pending affiliates"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (affiliateId: string) => {
    setProcessingId(affiliateId);
    try {
      await apiClient.patch(`/admin/affiliates/${affiliateId}/status`, {
        status: "ACTIVE",
      });
      toast.success("Affiliate approved successfully");
      fetchPendingAffiliates();
    } catch (error) {
      console.error("Error approving affiliate:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to approve affiliate"
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (affiliateId: string) => {
    setProcessingId(affiliateId);
    try {
      await apiClient.patch(`/admin/affiliates/${affiliateId}/status`, {
        status: "REJECTED",
      });
      toast.success("Affiliate rejected");
      fetchPendingAffiliates();
    } catch (error) {
      console.error("Error rejecting affiliate:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to reject affiliate"
      );
    } finally {
      setProcessingId(null);
    }
  };

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading approval queue..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">Approval Queue</h1>
          <p className="mt-2 text-gray-600">
            Review and approve pending affiliate applications
          </p>
        </div>
        <Button onClick={fetchPendingAffiliates} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Applications ({pendingAffiliates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingAffiliates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No pending applications
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Application Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{affiliate.name}</div>
                        <div className="text-sm text-gray-500">{affiliate.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatRelativeTime(affiliate.applicationDate || affiliate.joinDate)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{affiliate.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(affiliate.id)}
                          disabled={processingId === affiliate.id}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(affiliate.id)}
                          disabled={processingId === affiliate.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
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






