"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Eye,
  RefreshCw,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api-client";
import Image from "next/image";
import { SectionLoading } from "@/components/ui/loading";

interface Submission {
  id: string;
  affiliateId: string;
  affiliateName: string;
  affiliateEmail: string;
  month: string;
  platform: string;
  url: string;
  photoUrl: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment: string | null;
  reviewedAt: string | null;
  submittedAt: string;
}

export default function AdminDeliverablesPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "reject">("approve");
  const [adminComment, setAdminComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [stats, setStats] = useState<{
    totalSubmissions: number;
    pendingSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
  } | null>(null);

  useEffect(() => {
    fetchSubmissions();
    fetchStats();
  }, [filterStatus, filterMonth]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (filterMonth !== "all") params.append("month", filterMonth);

      const response = await api.get(`/admin/deliverables?${params.toString()}`);
      setSubmissions(response.data.submissions);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to fetch submissions");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/deliverables/stats/overview");
      setStats(response.data);
    } catch (error: any) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleReviewClick = (submission: Submission, action: "approve" | "reject") => {
    setSelectedSubmission(submission);
    setReviewAction(action);
    setAdminComment(submission.adminComment || "");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedSubmission) return;

    if (reviewAction === "reject" && !adminComment.trim()) {
      toast.error("Please provide a comment when rejecting a submission");
      return;
    }

    try {
      setSubmitting(true);
      const endpoint = reviewAction === "approve" ? "approve" : "reject";
      await api.patch(`/admin/deliverables/${selectedSubmission.id}/${endpoint}`, {
        comment: adminComment.trim() || undefined,
      });

      toast.success(
        `Deliverable ${reviewAction === "approve" ? "approved" : "rejected"} successfully`
      );
      setShowReviewModal(false);
      setSelectedSubmission(null);
      setAdminComment("");
      fetchSubmissions();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Failed to ${reviewAction} deliverable`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSubmissions = submissions.filter((submission) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      submission.affiliateName.toLowerCase().includes(searchLower) ||
      submission.affiliateEmail.toLowerCase().includes(searchLower) ||
      submission.platform.toLowerCase().includes(searchLower) ||
      submission.month.toLowerCase().includes(searchLower)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            Approved
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Rejected
          </Badge>
        );
      case "PENDING":
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        );
    }
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Deliverables</h1>
          <p className="text-gray-600 mt-1">
            Review and approve affiliate deliverable submissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Submissions
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats === null ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalSubmissions}</div>
                <p className="text-xs text-muted-foreground">
                  All submissions
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats === null ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.pendingSubmissions}</div>
                <p className="text-xs text-muted-foreground">Awaiting review</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats === null ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.approvedSubmissions}</div>
                <p className="text-xs text-muted-foreground">Approved submissions</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rejected
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats === null ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.rejectedSubmissions}</div>
                <p className="text-xs text-muted-foreground">Rejected submissions</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search by affiliate name, email, or platform..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            <select
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
            >
              <option value="all">All Months</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions List */}
      <Card>
        {loading ? (
          <SectionLoading message="Loading submissions..." size="lg" />
        ) : filteredSubmissions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No deliverable submissions found.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {filteredSubmissions.map((submission) => (
                <Card key={submission.id} className="border-gray-200">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-base">{submission.affiliateName}</div>
                          <div className="text-sm text-muted-foreground">{submission.affiliateEmail}</div>
                        </div>
                        <div>{getStatusBadge(submission.status)}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Month</span>
                          <div className="flex items-center gap-1 mt-1">
                            <Calendar size={12} />
                            <span>{submission.month}</span>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Platform</span>
                          <div className="mt-1">
                            <Badge className="bg-gray-200 text-gray-700 border-gray-300 text-xs">
                              {submission.platform}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <div className="pt-1">
                        <a
                          href={submission.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                        >
                          Open post
                          <ExternalLink size={14} />
                        </a>
                      </div>

                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        Submitted: {new Date(submission.submittedAt).toLocaleDateString()}
                      </div>

                      <div className="flex items-center gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setReviewAction("approve");
                            setAdminComment(submission.adminComment || "");
                            setShowReviewModal(true);
                          }}
                          className="flex-1"
                        >
                          <Eye size={14} className="mr-1" />
                          View
                        </Button>
                        {submission.status === "PENDING" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleReviewClick(submission, "approve")}
                              className="flex-1 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle size={14} className="mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleReviewClick(submission, "reject")}
                              variant="destructive"
                              className="flex-1"
                            >
                              <XCircle size={14} className="mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Affiliate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Platform
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Post URL
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSubmissions.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm">
                          <div className="font-medium text-gray-900">
                            {submission.affiliateName}
                          </div>
                          <div className="text-gray-500">{submission.affiliateEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Calendar size={14} />
                          {submission.month}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className="bg-gray-200 text-gray-700 border-gray-300">
                          {submission.platform}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={submission.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                        >
                          Open post
                          <ExternalLink size={14} />
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(submission.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(submission.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedSubmission(submission);
                              setReviewAction("approve");
                              setAdminComment(submission.adminComment || "");
                              setShowReviewModal(true);
                            }}
                            className="text-gray-600 hover:text-gray-900 p-1"
                            title="View details"
                          >
                            <Eye size={18} />
                          </button>
                          {submission.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => handleReviewClick(submission, "approve")}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Approve"
                              >
                                <CheckCircle size={18} />
                              </button>
                              <button
                                onClick={() => handleReviewClick(submission, "reject")}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Reject"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Review Modal */}
      <Dialog
        open={showReviewModal}
        onOpenChange={(open) => {
          setShowReviewModal(open);
          if (!open) {
            setSelectedSubmission(null);
            setAdminComment("");
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve" ? "Review Deliverable" : "Reject Deliverable"}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === "approve"
                ? "Review the submission details and optionally add a comment"
                : "Please provide a reason for rejecting this submission"}
            </DialogDescription>
          </DialogHeader>

          {selectedSubmission && (
            <div className="space-y-6 py-4">
              {/* Affiliate Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Affiliate Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-600">Name</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedSubmission.affiliateName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Email</Label>
                    <p className="text-sm font-medium text-gray-900 mt-1">
                      {selectedSubmission.affiliateEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Submission Details */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Submission Details</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-600">Month</Label>
                    <p className="text-sm font-medium text-gray-900">{selectedSubmission.month}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-600">Platform</Label>
                    <Badge className="bg-gray-200 text-gray-700 border-gray-300">
                      {selectedSubmission.platform}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-gray-600">Submitted On</Label>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedSubmission.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-600">Post URL</Label>
                    <a
                      href={selectedSubmission.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm mt-1 break-all"
                    >
                      {selectedSubmission.url}
                      <ExternalLink size={14} className="flex-shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Photo */}
              {selectedSubmission.photoUrl && (
                <div>
                  <Label className="text-gray-600 mb-2 block">Attached Photo</Label>
                  <div className="relative w-full h-64 rounded-lg overflow-hidden border border-gray-200">
                    <Image
                      src={selectedSubmission.photoUrl}
                      alt="Submission photo"
                      fill
                      className="object-contain bg-gray-50"
                      unoptimized
                    />
                  </div>
                </div>
              )}

              {/* Current Status */}
              {selectedSubmission.status !== "PENDING" && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <svg
                        className="h-5 w-5 text-blue-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-blue-900 mb-1">
                        Current Status: {selectedSubmission.status}
                      </h4>
                      {selectedSubmission.adminComment && (
                        <p className="text-sm text-blue-800">
                          <strong>Admin Comment:</strong> {selectedSubmission.adminComment}
                        </p>
                      )}
                      {selectedSubmission.reviewedAt && (
                        <p className="text-xs text-blue-700 mt-1">
                          Reviewed on: {new Date(selectedSubmission.reviewedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Admin Comment */}
              <div>
                <Label htmlFor="admin-comment">
                  Admin Comment {reviewAction === "reject" && <span className="text-red-600">*</span>}
                </Label>
                <textarea
                  id="admin-comment"
                  value={adminComment}
                  onChange={(e) => setAdminComment(e.target.value)}
                  placeholder={
                    reviewAction === "approve"
                      ? "Add an optional comment (e.g., 'Great work!')"
                      : "Explain why this submission is being rejected..."
                  }
                  rows={4}
                  className="w-full mt-2 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
                {reviewAction === "reject" && (
                  <p className="mt-1 text-xs text-gray-500">
                    A comment is required when rejecting a submission
                  </p>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowReviewModal(false);
                setSelectedSubmission(null);
                setAdminComment("");
              }}
            >
              Cancel
            </Button>
            {selectedSubmission?.status === "PENDING" && (
              <>
                {reviewAction === "approve" ? (
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {submitting ? "Approving..." : "Approve Submission"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmitReview}
                    disabled={submitting || !adminComment.trim()}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    {submitting ? "Rejecting..." : "Reject Submission"}
                  </Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

