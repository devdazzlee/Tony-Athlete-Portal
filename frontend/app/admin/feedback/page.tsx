"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  MessageSquare,
  Search,
  Filter,
  RefreshCw,
  Eye,
  User,
  Calendar,
  Mail,
  Phone,
  Globe,
  Loader2,
  MessageCircle,
  TrendingUp,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { formatRelativeTime } from "@/lib/date-utils";
import { AdminLoading } from "@/components/ui/loading";

interface Feedback {
  id: string;
  feedback: string;
  anonymous: boolean;
  submittedAt: string;
  name: string | null;
  email: string | null;
  photoUrl: string | null;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    fullName: string;
  } | null;
  ipAddress: string | null;
  userAgent: string | null;
}

interface FeedbackStats {
  total: number;
  last7Days: number;
  last30Days: number;
  anonymous: number;
  withDetails: number;
}

function AdminFeedbackPageContent() {
  const searchParams = useSearchParams();
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [urlFiltersApplied, setUrlFiltersApplied] = useState(false);
  const PAGE_SIZE = 20;

  useEffect(() => {
    if (urlFiltersApplied) return;
    const startParam = searchParams?.get("startDate");
    const endParam = searchParams?.get("endDate");
    if (startParam) {
      const parsed = new Date(startParam);
      if (!isNaN(parsed.getTime())) {
        setStartDate(parsed);
      }
    }
    if (endParam) {
      const parsed = new Date(endParam);
      if (!isNaN(parsed.getTime())) {
        setEndDate(parsed);
      }
    }
    setUrlFiltersApplied(true);
  }, [searchParams, urlFiltersApplied]);

  useEffect(() => {
    if (!urlFiltersApplied) return;
    fetchFeedback();
    fetchStats();
  }, [currentPage, startDate, endDate, urlFiltersApplied]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [searchQuery]);

  const fetchFeedback = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      // When searching, fetch more items to allow client-side filtering
      // Otherwise use pagination
      if (searchQuery.trim()) {
        params.append("page", "1");
        params.append("limit", "1000"); // Fetch more for search
      } else {
        params.append("page", currentPage.toString());
        params.append("limit", PAGE_SIZE.toString());
      }
      
      if (startDate) {
        params.append("startDate", startDate.toISOString());
      }
      if (endDate) {
        params.append("endDate", endDate.toISOString());
      }

      const response = await apiClient.get(`/admin/feedback?${params.toString()}`);
      setFeedback(response.data.data || []);
    } catch (error: any) {
      console.error("Error fetching feedback:", error);
      toast.error(
        error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Failed to load feedback submissions"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get("/admin/feedback/stats");
      setStats(response.data.stats || null);
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchFeedback(), fetchStats()]);
    setIsRefreshing(false);
    toast.success("Feedback data refreshed");
  };

  const handleViewFeedback = (item: Feedback) => {
    setSelectedFeedback(item);
    setViewDialogOpen(true);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setStartDate(undefined);
    setEndDate(undefined);
    setCurrentPage(1);
  };

  const filtersActive =
    searchQuery.trim() !== "" ||
    startDate !== undefined ||
    endDate !== undefined;

  // Filter feedback client-side for search
  const filteredFeedback = useMemo(() => {
    let filtered = feedback;

      if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.feedback.toLowerCase().includes(query) ||
          item.email?.toLowerCase().includes(query) ||
          item.name?.toLowerCase().includes(query) ||
          item.user?.email.toLowerCase().includes(query) ||
          item.user?.fullName.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [feedback, searchQuery]);

  // Paginate filtered results
  const paginatedFeedback = useMemo(() => {
    if (searchQuery.trim()) {
      // When searching, paginate the filtered results
      const start = (currentPage - 1) * PAGE_SIZE;
      const end = start + PAGE_SIZE;
      return filteredFeedback.slice(start, end);
    }
    // When not searching, use the already paginated feedback from API
    return filteredFeedback;
  }, [filteredFeedback, currentPage, searchQuery]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && feedback.length === 0) {
    return <AdminLoading message="Loading feedback submissions..." />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">General Feedback</h1>
          <p className="text-gray-600 mt-1">
            View and manage all feedback submissions from users
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          variant="outline"
          className="gap-2"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Feedback
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last 7 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last7Days}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last 30 Days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.last30Days}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                With Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.withDetails}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Anonymous
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.anonymous}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filters
            </CardTitle>
            <CardDescription>
              Filter feedback by search query or date range
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Search Feedback</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search feedback or user..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10 h-11 rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>From Date</Label>
              <DatePicker
                value={startDate}
                onChange={(date) => {
                  setStartDate(date);
                  setCurrentPage(1);
                }}
                placeholder="Start date"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <DatePicker
                value={endDate}
                onChange={(date) => {
                  setEndDate(date);
                  setCurrentPage(1);
                }}
                placeholder="End date"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                className="gap-2 h-11 rounded-lg w-full"
                onClick={handleResetFilters}
                disabled={!filtersActive}
              >
                <RefreshCw className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback Table */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback Submissions</CardTitle>
        <CardDescription>
          {filteredFeedback.length} feedback submission{filteredFeedback.length !== 1 ? "s" : ""} found
          {searchQuery.trim() && ` (filtered from ${feedback.length} total)`}
        </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredFeedback.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No feedback found</p>
              <p className="text-sm mt-2">
                {filtersActive
                  ? "Try adjusting your filters."
                  : "No feedback submissions yet."}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedFeedback.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">
                              {(item.anonymous && !item.name && !item.email) || (!item.user && !item.name && !item.email)
                                ? "Anonymous"
                                : item.name || item.user?.fullName || "Anonymous"}
                            </div>
                            {(item.email || (!item.anonymous && item.user?.email)) && (
                              <div className="text-sm text-muted-foreground">
                                {item.email || item.user?.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-md">
                            <p className="text-sm line-clamp-2">
                              {item.feedback}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatRelativeTime(item.submittedAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={(item.anonymous && !item.name && !item.email) ? "secondary" : "default"}
                          >
                            {(item.anonymous && !item.name && !item.email) ? "Anonymous" : "With Details"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewFeedback(item)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {paginatedFeedback.map((item) => (
                  <Card key={item.id} className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-base">
                              {(item.anonymous && !item.name && !item.email) || (!item.user && !item.name && !item.email)
                                ? "Anonymous"
                                : item.name || item.user?.fullName || "Anonymous"}
                            </div>
                            {(item.email || (!item.anonymous && item.user?.email)) && (
                              <div className="text-sm text-muted-foreground mt-1">
                                {item.email || item.user?.email}
                              </div>
                            )}
                          </div>
                          <Badge
                            variant={(item.anonymous && !item.name && !item.email) ? "secondary" : "default"}
                          >
                            {(item.anonymous && !item.name && !item.email) ? "Anonymous" : "With Details"}
                          </Badge>
                        </div>
                        <div>
                          <p className="text-sm text-gray-700 line-clamp-3">
                            {item.feedback}
                          </p>
                        </div>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatRelativeTime(item.submittedAt)}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewFeedback(item)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {filteredFeedback.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to{" "}
                    {Math.min(currentPage * PAGE_SIZE, filteredFeedback.length)} of{" "}
                    {filteredFeedback.length} submission{filteredFeedback.length !== 1 ? "s" : ""}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => p + 1)}
                      disabled={currentPage * PAGE_SIZE >= filteredFeedback.length}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View Feedback Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Details
            </DialogTitle>
            <DialogDescription>
              Complete information about this feedback submission
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-6">
              {/* Feedback Content */}
              <div className="space-y-2">
                <Label>Feedback Message</Label>
                <div className="p-4 bg-gray-50 rounded-lg border">
                  <p className="text-sm whitespace-pre-wrap">
                    {selectedFeedback.feedback}
                  </p>
                </div>
              </div>

              {/* User Information */}
              <div className="space-y-2">
                <Label>Submitted By</Label>
                {(selectedFeedback.anonymous && !selectedFeedback.name && !selectedFeedback.email) || (!selectedFeedback.user && !selectedFeedback.name && !selectedFeedback.email) ? (
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>Anonymous Submission</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                    {(selectedFeedback.name || selectedFeedback.user?.fullName) && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedFeedback.name || selectedFeedback.user?.fullName || "Anonymous"}
                        </span>
                      </div>
                    )}
                    {(selectedFeedback.email || selectedFeedback.user?.email) && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-4 w-4" />
                        {selectedFeedback.email || selectedFeedback.user?.email}
                      </div>
                    )}
                    {selectedFeedback.user?.phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {selectedFeedback.user.phone}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Submission Details */}
              <div className="space-y-2">
                <Label>Submission Details</Label>
                <div className="p-4 bg-gray-50 rounded-lg border space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Submitted:</span>
                    <span className="font-medium">
                      {formatDate(selectedFeedback.submittedAt)}
                    </span>
                  </div>
                  {selectedFeedback.ipAddress && (
                    <div className="flex items-center gap-2 text-sm">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">IP Address:</span>
                      <span className="font-medium font-mono">
                        {selectedFeedback.ipAddress}
                      </span>
                    </div>
                  )}
                  {selectedFeedback.userAgent && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">User Agent:</span>
                      </div>
                      <p className="text-xs font-mono text-muted-foreground pl-6">
                        {selectedFeedback.userAgent}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {selectedFeedback.photoUrl && (
                <div className="space-y-2">
                  <Label>Attached Photo</Label>
                  <a
                    href={selectedFeedback.photoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border overflow-hidden hover:opacity-90 transition-opacity"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedFeedback.photoUrl}
                      alt="Feedback attachment"
                      className="w-full max-h-[360px] object-contain bg-gray-50"
                    />
                  </a>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminFeedbackPage() {
  return (
    <Suspense fallback={<AdminLoading message="Loading feedback submissions..." />}>
      <AdminFeedbackPageContent />
    </Suspense>
  );
}
