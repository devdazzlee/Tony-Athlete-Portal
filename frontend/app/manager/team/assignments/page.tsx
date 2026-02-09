"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardList, RefreshCw, Users, Search, UserPlus, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { useTiers } from "@/hooks/useTiers";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  tier: string;
  status: string;
  joinDate: string;
  totalEarnings: number;
  lastActivity: string;
}

interface AssignmentStats {
  totalAffiliates: number;
  pendingApproval: number;
  activeAffiliates: number;
  needsAttention: number;
}

export default function TeamAssignmentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { tiers, getTierBadgeColor, getTierByName } = useTiers();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [stats, setStats] = useState<AssignmentStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  useEffect(() => {
    if (user) {
      fetchAffiliates();
    }
  }, [user]);

  const fetchAffiliates = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/admin/affiliates?limit=500");
      const data = response.data;
      const affiliateList = (data.data || []).map((aff: any) => ({
        id: aff.id,
        name: aff.name || "Unknown",
        email: aff.email || "",
        tier: aff.tier || "BRONZE",
        status: aff.status || "PENDING",
        joinDate: aff.joinDate || new Date().toISOString(),
        totalEarnings: aff.totalEarnings || 0,
        lastActivity: aff.lastLogin || "Never",
      }));

      setAffiliates(affiliateList);

      // Calculate stats
      const pending = affiliateList.filter((a: Affiliate) => a.status === "PENDING").length;
      const active = affiliateList.filter((a: Affiliate) => a.status === "ACTIVE").length;
      const needsAttention = affiliateList.filter(
        (a: Affiliate) => a.status === "PENDING" || a.lastActivity === "Never"
      ).length;

      setStats({
        totalAffiliates: affiliateList.length,
        pendingApproval: pending,
        activeAffiliates: active,
        needsAttention,
      });
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to load affiliates"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (affiliateId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/admin/affiliates/${affiliateId}/status`, {
        status: newStatus,
      });
      toast.success(`Affiliate status updated to ${newStatus}`);
      fetchAffiliates();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to update status"
      );
    }
  };

  const getTierBadge = (tierEnum: string) => {
    // Try to find tier by enum value or name
    const tier = tiers.find(t => 
      t.name.toUpperCase() === tierEnum.toUpperCase() ||
      getTierByName(tierEnum)
    ) || getTierByName(tierEnum);
    
    const tierName = tier ? tier.name : tierEnum;
    const badgeColor = getTierBadgeColor(tierName);
    
    return <Badge className={badgeColor}>{tierName}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      SUSPENDED: "bg-red-100 text-red-800",
      REJECTED: "bg-red-100 text-red-800",
      INACTIVE: "bg-gray-100 text-gray-800",
    };
    return <Badge className={colors[status] || "bg-gray-100 text-gray-800"}>{status}</Badge>;
  };

  // Filter affiliates
  const filteredAffiliates = affiliates.filter((aff) => {
    const matchesSearch =
      aff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      aff.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || aff.status === statusFilter;
    const matchesTier = tierFilter === "all" || 
      aff.tier === tierFilter || 
      tiers.find(t => t.name === tierFilter && (t.name.toUpperCase() === aff.tier.toUpperCase() || aff.tier === t.name));
    return matchesSearch && matchesStatus && matchesTier;
  });

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading assignments..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">Team Assignments</h1>
          <p className="mt-2 text-gray-600">
            Manage affiliate assignments and status
          </p>
        </div>
        <Button onClick={fetchAffiliates} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Affiliates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats?.totalAffiliates || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingApproval || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeAffiliates || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.needsAttention || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {tiers
                  .filter(tier => tier.status === "ACTIVE")
                  .sort((a, b) => b.level - a.level)
                  .map((tier) => (
                    <SelectItem key={tier.id} value={tier.name}>
                      {tier.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Affiliate Assignments ({filteredAffiliates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAffiliates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Last Activity</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{affiliate.name}</p>
                        <p className="text-sm text-gray-500">{affiliate.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getTierBadge(affiliate.tier)}</TableCell>
                    <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                    <TableCell>{new Date(affiliate.joinDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      {affiliate.lastActivity === "Never" ? (
                        <span className="text-gray-400">Never</span>
                      ) : (
                        new Date(affiliate.lastActivity).toLocaleDateString()
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      ${affiliate.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={affiliate.status}
                        onValueChange={(v) => handleStatusChange(affiliate.id, v)}
                      >
                        <SelectTrigger className="w-[120px] h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Activate</SelectItem>
                          <SelectItem value="PENDING">Pending</SelectItem>
                          <SelectItem value="SUSPENDED">Suspend</SelectItem>
                          <SelectItem value="REJECTED">Reject</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-gray-500 text-center py-8">No affiliates found matching your filters.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
