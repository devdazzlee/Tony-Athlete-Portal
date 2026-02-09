"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  CheckCircle,
  Clock,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { ManagerLoading, AuthRequired } from "@/components/ui/loading";
import { useAuth } from "@/contexts/AuthContext";
import { formatRelativeTime } from "@/lib/date-utils";
import { Label } from "@/components/ui/label";
import { useTiers } from "@/hooks/useTiers";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: string;
  tier: string;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  lastActivity: string;
}

export default function AllAffiliatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { tiers } = useTiers();
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");

  useEffect(() => {
    if (user) {
      fetchAffiliates();
    }
  }, [user, statusFilter, tierFilter]);

  const fetchAffiliates = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all")
        params.append("status", statusFilter.toUpperCase());
      if (tierFilter !== "all") params.append("tier", tierFilter.toUpperCase());
      params.append("limit", "500");

      const response = await apiClient.get(`/admin/affiliates?${params.toString()}`);
      setAffiliates(response.data.data || []);
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

  const filteredAffiliates = useMemo(() => {
    let result = [...affiliates];

    if (searchQuery.trim() !== "") {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (aff) =>
          aff.name.toLowerCase().includes(query) ||
          aff.email.toLowerCase().includes(query)
      );
    }

    return result;
  }, [affiliates, searchQuery]);

  if (authLoading || isLoading) {
    return <ManagerLoading message="Loading affiliates..." />;
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
          <h1 className="text-3xl font-bold text-gray-900">All Affiliates</h1>
          <p className="mt-2 text-gray-600">
            View and manage all affiliate accounts
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
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredAffiliates.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAffiliates.filter((a) => a.status.toLowerCase() === "active").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAffiliates.filter((a) => a.status.toLowerCase() === "pending").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${filteredAffiliates.reduce((sum, a) => sum + a.totalEarnings, 0).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select value={tierFilter} onValueChange={setTierFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {tiers
                    .filter(tier => tier.status === "ACTIVE")
                    .sort((a, b) => a.level - b.level)
                    .map((tier) => (
                      <SelectItem key={tier.id} value={tier.name.toLowerCase()}>
                        {tier.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliates List</CardTitle>
          <CardDescription>
            {filteredAffiliates.length} affiliate(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAffiliates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No affiliates found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Affiliate</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Earnings</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{affiliate.name}</div>
                        <div className="text-sm text-gray-500">{affiliate.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          affiliate.status.toLowerCase() === "active"
                            ? "default"
                            : affiliate.status.toLowerCase() === "pending"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {affiliate.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{affiliate.tier}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      ${affiliate.totalEarnings.toFixed(2)}
                    </TableCell>
                    <TableCell>{affiliate.totalClicks}</TableCell>
                    <TableCell>{affiliate.totalConversions}</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatRelativeTime(affiliate.lastActivity)}
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






