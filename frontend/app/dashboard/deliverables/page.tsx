"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Trash2,
  Plus,
  RefreshCw,
  Upload,
  X,
  Image as ImageIcon,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { DashboardLoading, SectionLoading } from "@/components/ui/loading";
import { toast } from "sonner";
import Image from "next/image";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";

interface LinkEntry {
  id: string;
  url: string;
  platform: string;
  customPlatformName?: string; // For "Other" platform option
  photoUrl?: string | null;
}

interface Submission {
  id: string;
  date: string;
  platform: string;
  url: string;
  photoUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminComment?: string | null;
  reviewedAt?: string | null;
}

interface AllowanceCode {
  id: string;
  code: string;
  amountLabel?: string;
  commissionRate?: number;
  description?: string;
  expiresAt?: string | null;
  validUntil?: string | null;
}

export default function DeliverablesPage() {
  const [month, setMonth] = useState(() => {
    const now = new Date();
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[now.getMonth()];
  });
  const [links, setLinks] = useState<LinkEntry[]>([
    { id: "1", url: "", platform: "", photoUrl: null },
  ]);
  const [uploadingPhotos, setUploadingPhotos] = useState<
    Record<string, boolean>
  >({});
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deliverablesNote, setDeliverablesNote] = useState<string | null>(null);
  const [allowanceCodes, setAllowanceCodes] = useState<AllowanceCode[]>([]);

  useEffect(() => {
    fetchSubmissions();
    fetchDeliverablesNote();
    fetchAllowanceCodes();
  }, [month]);

  const fetchDeliverablesNote = async () => {
    try {
      const response = await apiClient.get("/athlete/profile");
      setDeliverablesNote(response.data.deliverablesNote || null);
    } catch (error: any) {
      console.error("Error fetching deliverables note:", error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(
        `/athlete/deliverables?month=${month}`,
      );
      setSubmissions(response.data);
    } catch (error: any) {
      console.error("Error fetching submissions:", error);
      toast.error("Failed to load submissions");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllowanceCodes = async () => {
    try {
      const response = await apiClient.get("/referral/codes");
      const codes = (response.data || []).filter(
        (item: any) => item.type === "COUPON" && isAllowanceCodeActive(item),
      );
      setAllowanceCodes(codes);
    } catch (error: any) {
      console.error("Error fetching allowance codes:", error);
      setAllowanceCodes([]);
    }
  };

  const addLink = () => {
    setLinks([
      ...links,
      {
        id: Date.now().toString(),
        url: "",
        platform: "",
        customPlatformName: "",
        photoUrl: null,
      },
    ]);
  };

  const handlePhotoUpload = async (linkId: string, file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setUploadingPhotos((prev) => ({ ...prev, [linkId]: true }));

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const response = await fetch(`${config.apiUrl}/upload/deliverable`, {
        method: "POST",
        headers: getAuthHeaders({ contentType: null }), // Don't set Content-Type for FormData
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload photo");
      }

      const data = await response.json();

      setLinks((prevLinks) =>
        prevLinks.map((link) =>
          link.id === linkId ? { ...link, photoUrl: data.url } : link,
        ),
      );

      toast.success("Photo uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingPhotos((prev) => ({ ...prev, [linkId]: false }));
    }
  };

  const removePhoto = (linkId: string) => {
    setLinks((prevLinks) =>
      prevLinks.map((link) =>
        link.id === linkId ? { ...link, photoUrl: null } : link,
      ),
    );
  };

  const removeLink = (id: string) => {
    setLinks(links.filter((link) => link.id !== id));
  };

  const updateLink = (id: string, field: "url" | "platform", value: string) => {
    setLinks(
      links.map((link) => {
        if (link.id === id) {
          const updated = { ...link, [field]: value };
          // Clear customPlatformName if platform is changed from "Other" to something else
          if (field === "platform" && value !== "Other") {
            updated.customPlatformName = undefined;
          }
          return updated;
        }
        return link;
      }),
    );
  };

  const handleSubmit = async () => {
    // Validate all links have URL and platform
    const invalidLinks = links.filter((link) => !link.url || !link.platform);
    if (invalidLinks.length > 0) {
      toast.error("Please fill in all URL and platform fields");
      return;
    }

    // Validate that customPlatformName is provided when platform is "Other"
    const invalidOtherPlatforms = links.filter(
      (link) =>
        link.platform === "Other" &&
        (!link.customPlatformName || link.customPlatformName.trim() === ""),
    );
    if (invalidOtherPlatforms.length > 0) {
      toast.error("Please specify the platform name when selecting 'Other'");
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.post("/athlete/deliverables", {
        month,
        links: links.map((link) => ({
          url: link.url,
          platform: link.platform,
          customPlatformName:
            link.platform === "Other" ? link.customPlatformName : undefined,
          photoUrl: link.photoUrl || undefined,
        })),
      });
      toast.success("Deliverables submitted successfully!");
      setLinks([
        {
          id: "1",
          url: "",
          platform: "",
          customPlatformName: "",
          photoUrl: null,
        },
      ]);
      fetchSubmissions();
    } catch (error: any) {
      console.error("Error submitting deliverables:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to submit deliverables";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const getAllowanceExpiryDate = (code: AllowanceCode) => {
    const expiryValue = code.expiresAt || code.validUntil;
    if (!expiryValue) {
      return null;
    }

    const expiryDate = new Date(expiryValue);
    return Number.isNaN(expiryDate.getTime()) ? null : expiryDate;
  };

  const isAllowanceCodeActive = (code: AllowanceCode) => {
    const expiryDate = getAllowanceExpiryDate(code);
    return !expiryDate || expiryDate > new Date();
  };

  const getCodeDiscountLabel = (code: AllowanceCode) => {
    if (code.amountLabel) return code.amountLabel;
    if (code.code.toUpperCase().endsWith("-SHIP")) return "Free Shipping";
    return `${code.commissionRate || 0}% off`;
  };

  const formatAllowanceExpiry = (code: AllowanceCode) => {
    const expiryDate = getAllowanceExpiryDate(code);
    if (!expiryDate) {
      return "No expiry date";
    }

    return expiryDate.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          Deliverables
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Submit your social media post URLs for this month (Instagram, TikTok,
          YouTube, or other platforms) and review your submissions.
        </p>
      </div>

      {/* Custom Deliverables Note */}
      {deliverablesNote && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-start space-x-3">
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
                <h3 className="text-sm font-semibold text-blue-900 mb-1">
                  Your Deliverables Requirements
                </h3>
                <p className="text-sm text-blue-800 whitespace-pre-line">
                  {deliverablesNote}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">
            Monthly Allowance Code
          </CardTitle>
          <CardDescription className="text-gray-600">
            This is your unique allowance code, do not share it with others.
            Code only valid for current month and expires mid-month.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allowanceCodes.length === 0 ? (
            <p className="text-sm text-gray-500">
              No active monthly allowance code right now.
            </p>
          ) : (
            <div className="space-y-2">
              {allowanceCodes.map((code) => (
                <div
                  key={code.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="font-mono text-sm font-semibold text-gray-900 break-all">
                      {code.code}
                    </span>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                      Expires {formatAllowanceExpiry(code)}
                    </p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                    {getCodeDiscountLabel(code)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Submit Deliverable */}
        <Card className="bg-white border-gray-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-gray-900">Submit Deliverable</CardTitle>
            <CardDescription className="text-gray-600">
              Submit your social media post URLs for {month} 2025 (Instagram,
              TikTok, YouTube, or other platforms).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Month</Label>
              <Select value={month} onValueChange={setMonth}>
                <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  className="bg-white border-gray-200 max-h-[300px]"
                  position="item-aligned"
                >
                  {[
                    "January",
                    "February",
                    "March",
                    "April",
                    "May",
                    "June",
                    "July",
                    "August",
                    "September",
                    "October",
                    "November",
                    "December",
                  ].map((m) => (
                    <SelectItem
                      key={m}
                      value={m}
                      className="text-gray-900 hover:bg-gray-100 cursor-pointer"
                    >
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-gray-700">Links</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addLink}
                  className="bg-transparent border-gray-300 text-gray-700 hover:bg-gray-100"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add link
                </Button>
              </div>

              {links.map((link, index) => (
                <div
                  key={link.id}
                  className="p-3 sm:p-4 bg-gray-50 rounded-lg space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-2">
                    {/* Mobile: Stacked layout, Desktop: Inline layout */}
                    <div className="flex items-center justify-between sm:contents">
                      <span className="text-sm text-gray-600 font-medium sm:whitespace-nowrap">
                        Post URL #{index + 1}
                      </span>
                      {links.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLink(link.id)}
                          className="text-red-600 hover:text-red-700 sm:hidden"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <Input
                      placeholder="https://www.instagram.com/..."
                      value={link.url}
                      onChange={(e) =>
                        updateLink(link.id, "url", e.target.value)
                      }
                      className="bg-white border-gray-300 text-gray-900 sm:flex-1"
                    />

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 whitespace-nowrap">
                        Platform
                      </span>
                      <Select
                        value={link.platform}
                        onValueChange={(value) =>
                          updateLink(link.id, "platform", value)
                        }
                      >
                        <SelectTrigger className="bg-white border-gray-300 text-gray-900 w-full sm:w-[140px]">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-gray-200">
                          <SelectItem
                            value="Instagram"
                            className="text-gray-900"
                          >
                            Instagram
                          </SelectItem>
                          <SelectItem value="TikTok" className="text-gray-900">
                            TikTok
                          </SelectItem>
                          <SelectItem value="YouTube" className="text-gray-900">
                            YouTube
                          </SelectItem>
                          <SelectItem value="Other" className="text-gray-900">
                            Other
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {links.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLink(link.id)}
                        className="text-red-600 hover:text-red-700 flex-shrink-0 hidden sm:flex"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {/* Custom Platform Name Input - Show when "Other" is selected - Always on new line */}
                  {link.platform === "Other" && (
                    <div className="w-full">
                      <Label className="text-sm text-gray-700">
                        Platform Name & Handle
                      </Label>
                      <Input
                        placeholder="e.g., Twitter: @username or Facebook: username"
                        value={link.customPlatformName || ""}
                        onChange={(e) => {
                          setLinks(
                            links.map((l) =>
                              l.id === link.id
                                ? { ...l, customPlatformName: e.target.value }
                                : l,
                            ),
                          );
                        }}
                        className="bg-white border-gray-300 text-gray-900 mt-1 w-full"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Enter the platform/app name and your handle (e.g.,
                        "Twitter: @username")
                      </p>
                    </div>
                  )}

                  {/* Photo Upload Section */}
                  <div className="mt-3 space-y-2">
                    <Label className="text-gray-700 text-sm">
                      Photo (Optional)
                    </Label>
                    {link.photoUrl ? (
                      <div className="relative">
                        <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                          <Image
                            src={link.photoUrl}
                            alt="Uploaded photo"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePhoto(link.id)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handlePhotoUpload(link.id, file);
                            }
                          }}
                          className="hidden"
                          id={`photo-upload-${link.id}`}
                          disabled={uploadingPhotos[link.id]}
                        />
                        <label
                          htmlFor={`photo-upload-${link.id}`}
                          className="flex flex-col items-center justify-center cursor-pointer"
                        >
                          {uploadingPhotos[link.id] ? (
                            <>
                              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-2" />
                              <span className="text-sm text-gray-600">
                                Uploading...
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload className="h-8 w-8 text-gray-400 mb-2" />
                              <span className="text-sm text-gray-600">
                                Click to upload photo
                              </span>
                              <span className="text-xs text-gray-500 mt-1">
                                Max 5MB
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button
              className="w-full bg-gray-900 text-white hover:bg-gray-800"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Your Submissions */}
        <Card className="bg-white border-gray-200 lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-gray-900">Your Submissions</CardTitle>
            <CardDescription className="text-gray-600">
              Showing deliverables for {month} 2025
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <SectionLoading message="Loading submissions..." size="lg" />
            ) : submissions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No submissions for {month} 2025
              </div>
            ) : (
              <div className="space-y-2">
                {/* Desktop Table Header - Hidden on mobile */}
                <div className="hidden md:grid md:grid-cols-5 gap-4 text-sm font-medium text-gray-600 pb-2 border-b border-gray-200">
                  <div>Date</div>
                  <div>Platform</div>
                  <div>URL</div>
                  <div>Photo</div>
                  <div>Status & Comments</div>
                </div>

                {/* Submissions - Card layout on mobile, grid on desktop */}
                {submissions.map((submission, index) => (
                  <div
                    key={submission.id || index}
                    className="md:grid md:grid-cols-5 gap-4 text-sm py-3 md:py-2 border-b border-gray-200 last:border-0 md:items-start"
                  >
                    {/* Mobile: Card Layout */}
                    <div className="md:hidden space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Date
                        </span>
                        <span className="text-sm text-gray-900 font-medium">
                          {submission.date}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Platform
                        </span>
                        <Badge className="bg-gray-200 text-gray-700 border-gray-300">
                          {submission.platform}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-medium text-gray-500 block">
                          URL
                        </span>
                        <a
                          href={submission.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-700 text-sm break-all block"
                        >
                          {submission.url}
                        </a>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-500">
                          Status
                        </span>
                        {submission.status === "APPROVED" ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Approved
                          </Badge>
                        ) : submission.status === "REJECTED" ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Pending Review
                          </Badge>
                        )}
                      </div>

                      {submission.adminComment && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1">
                          <span className="text-xs font-semibold text-blue-900 block">
                            Admin Comment:
                          </span>
                          <p className="text-sm text-blue-800">
                            {submission.adminComment}
                          </p>
                          {submission.reviewedAt && (
                            <p className="text-xs text-blue-700 mt-1">
                              Reviewed:{" "}
                              {new Date(
                                submission.reviewedAt,
                              ).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}

                      {submission.photoUrl && (
                        <div className="space-y-1">
                          <span className="text-xs font-medium text-gray-500 block">
                            Photo
                          </span>
                          <a
                            href={submission.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity block"
                          >
                            <Image
                              src={submission.photoUrl}
                              alt="Submission photo"
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Desktop: Grid Layout - Hidden on mobile */}
                    <div className="hidden md:block text-gray-900">
                      {submission.date}
                    </div>
                    <div className="hidden md:block">
                      <Badge className="bg-gray-200 text-gray-700 border-gray-300">
                        {submission.platform}
                      </Badge>
                    </div>
                    <div className="hidden md:block">
                      <a
                        href={submission.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 truncate block"
                      >
                        {submission.url}
                      </a>
                    </div>
                    <div className="hidden md:block">
                      {submission.photoUrl ? (
                        <a
                          href={submission.photoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity block"
                        >
                          <Image
                            src={submission.photoUrl}
                            alt="Submission photo"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">No photo</span>
                      )}
                    </div>
                    <div className="hidden md:block space-y-2">
                      <div>
                        {submission.status === "APPROVED" ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Approved
                          </Badge>
                        ) : submission.status === "REJECTED" ? (
                          <Badge className="bg-red-100 text-red-800 border-red-200">
                            Rejected
                          </Badge>
                        ) : (
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                            Pending
                          </Badge>
                        )}
                      </div>
                      {submission.adminComment && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 space-y-1 mt-2">
                          <span className="text-xs font-semibold text-blue-900 block">
                            Admin Comment:
                          </span>
                          <p className="text-xs text-blue-800">
                            {submission.adminComment}
                          </p>
                        </div>
                      )}
                      {submission.reviewedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Reviewed:{" "}
                          {new Date(submission.reviewedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
