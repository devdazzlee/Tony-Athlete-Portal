"use client";

import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Search, 
  Filter, 
  Download,
  Copy,
  Check,
  X,
  Calendar,
  DollarSign,
  Truck,
  Tag,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api-client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";

interface AffiliateCode {
  id: string;
  code: string;
  description: string;
  discount: string;
  affiliateId: string;
  validUntil: string;
  usage: number;
  maxUsage: number;
  status: "ACTIVE" | "INACTIVE";
  freeShipping: boolean;
  isAffiliate: boolean;
  createdAt: string;
  isExpired: boolean;
  isUsed: boolean;
  remainingUses: number;
  syncedToShopify: boolean;
  syncedStores: string[];
  affiliate: {
    id: string;
    companyName: string;
    user: {
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface Affiliate {
  id: string;
  companyName?: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AffiliateCodesPage() {
  const [codes, setCodes] = useState<AffiliateCode[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAffiliates, setLoadingAffiliates] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Form state
  const [selectedAffiliate, setSelectedAffiliate] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [allowanceAmount, setAllowanceAmount] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed_amount">("fixed_amount");
  const [discountValue, setDiscountValue] = useState("");
  const [freeShipping, setFreeShipping] = useState(false);
  const [syncToShopify, setSyncToShopify] = useState(true);
  const [customDescription, setCustomDescription] = useState("");
  const [generating, setGenerating] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCode, setEditingCode] = useState<AffiliateCode | null>(null);
  const [editStatus, setEditStatus] = useState<"ACTIVE" | "INACTIVE">("ACTIVE");
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    codeId: string | null;
    codeName: string | null;
  }>({ isOpen: false, codeId: null, codeName: null });
  const [isDeleting, setIsDeleting] = useState(false);

  const [stats, setStats] = useState<{
    totalCodes: number;
    activeCodes: number;
    usedCodes: number;
    expiredCodes: number;
  } | null>(null);

  useEffect(() => {
    fetchCodes();
    fetchAffiliates();
    fetchStats();
  }, [filterStatus]);

  const fetchCodes = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      
      const response = await api.get(`/admin/affiliate-codes?${params.toString()}`);
      setCodes(response.data.codes);
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to fetch affiliate codes");
    } finally {
      setLoading(false);
    }
  };

  const fetchAffiliates = async () => {
    try {
      setLoadingAffiliates(true);
      const response = await api.get("/admin/affiliates?limit=1000");
      
      // Handle different response formats
      const rawList = response.data.affiliates || response.data.data || response.data || [];
      
      // Map flat API response to expected Affiliate interface
      // API returns: { id, name, email, ... } (flat)
      // We need:    { id, user: { firstName, lastName, email } }
      const affiliatesList = rawList.map((item: any) => {
        // If item already has nested user object, use it directly
        if (item.user?.firstName || item.user?.email) {
          return item;
        }
        // Otherwise map flat fields (name, email) to nested structure
        const nameParts = (item.name || "").split(" ");
        const firstName = nameParts[0] || "";
        const lastName = nameParts.slice(1).join(" ") || "";
        return {
          ...item,
          user: {
            firstName,
            lastName,
            email: item.email || "",
          },
        };
      });
      
      setAffiliates(affiliatesList);
      
      if (affiliatesList.length === 0) {
        toast.error("No affiliates found. Please create affiliates first in 'Manage Affiliates' page.");
      }
    } catch (error: any) {
      console.error("Error fetching affiliates:", error);
      toast.error("Failed to fetch affiliates: " + (error.response?.data?.error || error.message));
      setAffiliates([]);
    } finally {
      setLoadingAffiliates(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get("/admin/affiliate-codes/stats/overview");
      setStats(response.data);
    } catch (error: any) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleGenerateCode = async () => {
    if (!selectedAffiliate || !allowanceAmount) {
      toast.error("Please select an affiliate and enter an allowance amount");
      return;
    }

    try {
      setGenerating(true);
      const response = await api.post("/admin/affiliate-codes/generate", {
        affiliateId: selectedAffiliate,
        customCode: customCode.trim() || undefined,
        allowanceAmount: parseFloat(allowanceAmount),
        discountType,
        discountValue: parseFloat(discountValue || "0"),
        freeShipping,
        syncToShopify,
        description: customDescription || undefined,
      });

      const { shopifySync, message } = response.data;

      if (shopifySync?.errors?.length > 0) {
        toast.warning(message);
      } else {
        toast.success(message || "Affiliate code generated successfully!");
      }

      setShowGenerateModal(false);
      resetForm();
      fetchCodes();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to generate affiliate code");
    } finally {
      setGenerating(false);
    }
  };

  const handleEditCode = (code: AffiliateCode) => {
    setEditingCode(code);
    setEditStatus(code.status);
    setShowEditModal(true);
  };

  const handleUpdateCode = async () => {
    if (!editingCode) return;

    try {
      setIsUpdating(true);
      await api.patch(`/admin/affiliate-codes/${editingCode.id}/status`, {
        status: editStatus,
      });
      toast.success("Affiliate code updated successfully");
      setShowEditModal(false);
      setEditingCode(null);
      fetchCodes();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to update affiliate code");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteClick = (codeId: string, codeName: string) => {
    setDeleteModal({ isOpen: true, codeId, codeName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.codeId) return;

    setIsDeleting(true);
    try {
      await api.delete(`/admin/affiliate-codes/${deleteModal.codeId}`);
      toast.success("Affiliate code deleted successfully");
      setDeleteModal({ isOpen: false, codeId: null, codeName: null });
      fetchCodes();
      fetchStats();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to delete affiliate code");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code copied to clipboard!");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const resetForm = () => {
    setSelectedAffiliate("");
    setCustomCode("");
    setAllowanceAmount("");
    setDiscountType("fixed_amount");
    setDiscountValue("");
    setFreeShipping(false);
    setSyncToShopify(true);
    setCustomDescription("");
  };

  const filteredCodes = codes.filter((code) =>
    code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.affiliate.user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    code.affiliate.user.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (code: AffiliateCode) => {
    if (code.isExpired) {
      return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Expired</span>;
    }
    if (code.isUsed) {
      return <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Used</span>;
    }
    if (code.status === "ACTIVE") {
      return <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">Active</span>;
    }
    return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Inactive</span>;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Manage Affiliate Codes</h1>
          <p className="text-gray-600 mt-1">
            Generate one-time use codes for affiliate monthly product allowances
          </p>
        </div>
        <button
          onClick={() => setShowGenerateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <Plus size={20} />
          Generate New Code
        </button>
      </div>

      {/* Info Banner */}
      <Card className="bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <svg
                className="h-5 w-5 text-indigo-600"
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
              <h3 className="text-sm font-semibold text-indigo-900 mb-1">
                About Affiliate Allowance Codes
              </h3>
              <p className="text-sm text-indigo-800">
                Generate unique one-time use discount codes for affiliates. Each code automatically expires at the end of the month it's created. 
                You can customize each code with a discount percentage or fixed amount, and optionally add free shipping. 
                Perfect for monthly product allowances and affiliate perks.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Codes
            </CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {stats === null ? (
              <>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-24" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalCodes}</div>
                <p className="text-xs text-muted-foreground">
                  All affiliate codes
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Codes</CardTitle>
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
                <div className="text-2xl font-bold">{stats.activeCodes}</div>
                <p className="text-xs text-muted-foreground">Currently active</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Used Codes</CardTitle>
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
                <div className="text-2xl font-bold">{stats.usedCodes}</div>
                <p className="text-xs text-muted-foreground">Redeemed codes</p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Expired Codes
            </CardTitle>
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
                <div className="text-2xl font-bold">{stats.expiredCodes}</div>
                <p className="text-xs text-muted-foreground">Past expiry date</p>
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
              placeholder="Search by code, affiliate, or description..."
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
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        </CardContent>
      </Card>

      {/* Codes List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading affiliate codes...</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No affiliate codes found. Generate your first code to get started.
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="md:hidden p-4 space-y-4">
              {filteredCodes.map((code) => (
                <Card key={code.id} className="border-gray-200">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                            {code.code}
                          </code>
                          <button
                            onClick={() => handleCopyCode(code.code)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {copiedCode === code.code ? (
                              <Check size={16} className="text-green-600" />
                            ) : (
                              <Copy size={16} />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditCode(code)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                          >
                            <Edit size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(code.id, code.code)}
                            className="text-red-600 hover:text-red-900 p-1"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground">Affiliate</span>
                        <div className="font-medium text-sm mt-1">
                          {code.affiliate.user.firstName} {code.affiliate.user.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">{code.affiliate.user.email}</div>
                      </div>

                      <div>
                        <span className="text-xs text-muted-foreground block mb-2">Benefits</span>
                        <div className="flex flex-wrap gap-1.5">
                          {parseFloat(code.discount) > 0 && (
                            <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md">
                              <DollarSign size={12} />
                              <span className="font-medium">{code.discount}% off</span>
                            </span>
                          )}
                          {code.freeShipping && (
                            <span className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-md">
                              <Truck size={12} />
                              <span className="font-medium">Free Shipping</span>
                            </span>
                          )}
                          {!code.freeShipping && parseFloat(code.discount) === 0 && (
                            <span className="text-xs text-gray-400 italic">No benefits</span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Expires</span>
                          <div className="flex items-center gap-1 mt-1 text-xs">
                            <Calendar size={12} />
                            {new Date(code.validUntil).toLocaleDateString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Usage</span>
                          <div className="mt-1 text-xs">{code.usage} / {code.maxUsage || "∞"}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {getStatusBadge(code)}
                        {code.syncedToShopify ? (
                          <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full">
                            <CheckCircle size={12} />
                            Shopify {(code.syncedStores || []).map((s: string) => 
                              s === "store-usa" ? "🇺🇸" : s === "store-canada" ? "🇨🇦" : ""
                            ).join("")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">
                            <XCircle size={12} />
                            Not in Shopify
                          </span>
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
                    Code
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Affiliate
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Discount & Shipping
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Expires
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Usage
                  </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Shopify
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
                {filteredCodes.map((code) => (
                  <tr key={code.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {code.code}
                        </code>
                        <button
                          onClick={() => handleCopyCode(code.code)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {copiedCode === code.code ? (
                            <Check size={16} className="text-green-600" />
                          ) : (
                            <Copy size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">
                        <div className="font-medium text-gray-900">
                          {code.affiliate.user.firstName} {code.affiliate.user.lastName}
                        </div>
                        <div className="text-gray-500">{code.affiliate.user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          {parseFloat(code.discount) > 0 ? (
                            <span className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit">
                            <DollarSign size={14} />
                              <span className="font-medium">{code.discount}% off</span>
                          </span>
                          ) : null}
                          {code.freeShipping ? (
                            <span className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-md w-fit">
                            <Truck size={14} />
                              <span className="font-medium">Free Shipping</span>
                          </span>
                          ) : null}
                          {!code.freeShipping && parseFloat(code.discount) === 0 && (
                            <span className="text-xs text-gray-400 italic">No benefits</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar size={14} />
                        {new Date(code.validUntil).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {code.usage} / {code.maxUsage || "∞"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {code.syncedToShopify ? (
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit">
                            <CheckCircle size={12} />
                            Synced
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {(code.syncedStores || []).map((s: string) => 
                              s === "store-usa" ? "🇺🇸 USA" : s === "store-canada" ? "🇨🇦 CA" : s
                            ).join(", ")}
                          </span>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-md w-fit">
                          <XCircle size={12} />
                          Not synced
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(code)}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditCode(code)}
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title="Edit code status"
                          >
                            <Edit size={18} />
                          </button>
                      <button
                            onClick={() => handleDeleteClick(code.id, code.code)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete code"
                      >
                        <Trash2 size={18} />
                      </button>
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

      {/* Generate Code Modal */}
      <Dialog 
        open={showGenerateModal} 
        onOpenChange={(open) => {
          setShowGenerateModal(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Affiliate Code</DialogTitle>
            <DialogDescription>
              Create a unique one-time use code that expires at the end of this month
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
              {/* Select Affiliate */}
              <div>
              <Label htmlFor="affiliate-select">Select Affiliate *</Label>
                <select
                id="affiliate-select"
                  value={selectedAffiliate}
                  onChange={(e) => setSelectedAffiliate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 mt-2"
                  required
                  disabled={loadingAffiliates}
                >
                  <option value="">
                    {loadingAffiliates 
                      ? "Loading affiliates..." 
                      : affiliates.length === 0 
                        ? "No affiliates available - Create one first" 
                        : "-- Select an affiliate --"
                    }
                  </option>
                  {affiliates.map((affiliate) => (
                    <option key={affiliate.id} value={affiliate.id}>
                      {affiliate.user?.firstName || "Unknown"} {affiliate.user?.lastName || ""} ({affiliate.user?.email || "No email"})
                    </option>
                  ))}
                </select>
                {affiliates.length === 0 && !loadingAffiliates && (
                  <p className="mt-2 text-sm text-orange-600">
                    ⚠️ No affiliates found. Please create affiliates in the "Manage Affiliates" page first.
                  </p>
                )}
              </div>

              {/* Custom Code */}
              <div>
                <Label htmlFor="custom-code">Discount Code</Label>
                <input
                  id="custom-code"
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. TONY20, SUMMER2026 (leave blank to auto-generate)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 mt-2 font-mono uppercase"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Set your own code or leave blank to auto-generate one. This is the code customers will enter at checkout.
                </p>
              </div>

              {/* Allowance Amount */}
              <div>
              <Label htmlFor="allowance-amount">Monthly Allowance Amount ($) *</Label>
              <div className="relative mt-2">
                <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                  $
                </span>
                <input
                  id="allowance-amount"
                  type="number"
                  value={allowanceAmount}
                  onChange={(e) => setAllowanceAmount(e.target.value)}
                  placeholder="150.00"
                  min="0"
                  step="0.01"
                  className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                  required
                />
              </div>
                <p className="mt-1 text-sm text-gray-500">
                  The total product value this code can be used for (e.g., $150)
                </p>
              </div>

              {/* Discount Options */}
              <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Discount & Shipping Options</h3>
                
                {/* Discount Type */}
                <div className="mb-4">
                <Label htmlFor="discount-type">Discount Type</Label>
                  <select
                  id="discount-type"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percentage" | "fixed_amount")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 mt-2"
                  >
                    <option value="fixed_amount">Fixed Amount ($)</option>
                    <option value="percentage">Percentage (%)</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div className="mb-4">
                <Label htmlFor="discount-value">
                  Discount Value {discountType === "percentage" ? "(%)" : "($)"} (Optional)
                </Label>
                <div className="relative mt-2">
                  {discountType === "fixed_amount" && (
                    <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      $
                    </span>
                  )}
                  <input
                    id="discount-value"
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder={discountType === "percentage" ? "10" : "10.00"}
                    min="0"
                    step={discountType === "percentage" ? "1" : "0.01"}
                    max={discountType === "percentage" ? "100" : undefined}
                    className={`w-full ${discountType === "fixed_amount" ? "pl-8" : "pl-4"} ${discountType === "percentage" ? "pr-8" : "pr-4"} py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900`}
                  />
                  {discountType === "percentage" && (
                    <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                      %
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {discountType === "percentage" 
                    ? "Example: Enter 10 for 10% off their purchase" 
                    : "Example: Enter 10 for $10 off their purchase"}
                </p>
                </div>

              {/* Free Shipping Toggle - Enhanced */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="freeShipping"
                    checked={freeShipping}
                    onChange={(e) => setFreeShipping(e.target.checked)}
                    className="w-5 h-5 text-gray-900 border-gray-300 rounded focus:ring-gray-900 mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="freeShipping" className="cursor-pointer">
                      Add Free Shipping
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Check this box to include free shipping with the discount code
                    </p>
                  </div>
                </div>
              </div>

              {/* Shopify Sync Toggle */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="syncToShopify"
                    checked={syncToShopify}
                    onChange={(e) => setSyncToShopify(e.target.checked)}
                    className="w-5 h-5 text-green-700 border-gray-300 rounded focus:ring-green-600 mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor="syncToShopify" className="cursor-pointer">
                      Sync to Shopify (USA &amp; Canada)
                    </Label>
                    <p className="text-xs text-gray-600 mt-1">
                      Automatically create this discount code in both Shopify stores so it works at checkout
                    </p>
                  </div>
                </div>
              </div>
              </div>

              {/* Custom Description (Optional) */}
              <div>
              <Label htmlFor="custom-description">Custom Description (Optional)</Label>
                <textarea
                id="custom-description"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Enter a custom description for this code..."
                  rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 mt-2"
                />
              </div>

              {/* Preview */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
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
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Code Settings Summary</h4>
                  <ul className="text-sm text-blue-800 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">→</span>
                      <span><strong>Usage:</strong> One-time use only (expires after 1 use)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">→</span>
                      <span><strong>Expiration:</strong> End of current month (automatically set)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">→</span>
                      <span><strong>Allowance:</strong> ${allowanceAmount || "0"} product value</span>
                    </li>
                  {discountValue && parseFloat(discountValue) > 0 && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span><strong>Discount:</strong> {discountValue}{discountType === "percentage" ? "%" : "$"} off</span>
                      </li>
                    )}
                    {freeShipping && (
                      <li className="flex items-start gap-2">
                        <span className="text-green-600 font-bold">✓</span>
                        <span><strong>Free Shipping:</strong> Enabled</span>
                      </li>
                    )}
                    {(!discountValue || parseFloat(discountValue) === 0) && !freeShipping && (
                      <li className="flex items-start gap-2">
                        <span className="text-gray-400 font-bold">○</span>
                        <span className="text-gray-600"><em>No discount or shipping benefits added</em></span>
                    </li>
                  )}
                    {customCode.trim() && (
                      <li className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">→</span>
                        <span><strong>Code:</strong> <code className="bg-white/60 px-1 py-0.5 rounded font-mono">{customCode.trim().toUpperCase()}</code></span>
                      </li>
                    )}
                    <li className="flex items-start gap-2">
                      <span className={syncToShopify ? "text-green-600 font-bold" : "text-gray-400 font-bold"}>
                        {syncToShopify ? "✓" : "○"}
                      </span>
                      <span>
                        <strong>Shopify Sync:</strong>{" "}
                        {syncToShopify ? "Will create in USA & Canada stores" : "Not syncing to Shopify"}
                      </span>
                    </li>
                </ul>
                </div>
              </div>
              </div>
            </div>

          <DialogFooter>
            <Button
              variant="outline"
                onClick={() => {
                  setShowGenerateModal(false);
                  resetForm();
                }}
              >
                Cancel
            </Button>
            <Button
                onClick={handleGenerateCode}
                disabled={generating || !selectedAffiliate || !allowanceAmount}
              className="bg-gray-900 hover:bg-gray-800"
              >
                {generating ? "Generating..." : "Generate Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Code Modal */}
      <Dialog 
        open={showEditModal} 
        onOpenChange={(open) => {
          setShowEditModal(open);
          if (!open) {
            setEditingCode(null);
            setEditStatus("ACTIVE");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Affiliate Code</DialogTitle>
            <DialogDescription>
              Update the status of this affiliate code
            </DialogDescription>
          </DialogHeader>

          {editingCode && (
            <div className="space-y-4 py-4">
              {/* Code Display */}
              <div>
                <Label>Code</Label>
                <code className="block mt-2 px-3 py-2 bg-gray-100 rounded text-sm font-mono">
                  {editingCode.code}
                </code>
              </div>

              {/* Affiliate */}
              <div>
                <Label>Affiliate</Label>
                <p className="mt-2 text-sm text-gray-900">
                  {editingCode.affiliate.user.firstName} {editingCode.affiliate.user.lastName}
                </p>
                <p className="text-xs text-gray-500">{editingCode.affiliate.user.email}</p>
              </div>

              {/* Discount & Benefits */}
              <div>
                <Label>Benefits</Label>
                <div className="mt-2 space-y-1">
                  {parseFloat(editingCode.discount) > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-green-700 bg-green-50 px-2 py-1 rounded-md w-fit">
                      <DollarSign size={14} />
                      <span className="font-medium">{editingCode.discount}% off</span>
                    </div>
                  )}
                  {editingCode.freeShipping && (
                    <div className="flex items-center gap-1.5 text-sm text-blue-700 bg-blue-50 px-2 py-1 rounded-md w-fit">
                      <Truck size={14} />
                      <span className="font-medium">Free Shipping</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Expiry Date */}
              <div>
                <Label>Expires</Label>
                <div className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                  <Calendar size={14} />
                  {new Date(editingCode.validUntil).toLocaleDateString()}
            </div>
          </div>

              {/* Usage */}
              <div>
                <Label>Usage</Label>
                <p className="mt-2 text-sm text-gray-600">
                  {editingCode.usage} / {editingCode.maxUsage || "∞"}
                </p>
              </div>

              {/* Status */}
              <div>
                <Label htmlFor="edit-status">Status *</Label>
                <Select value={editStatus} onValueChange={(value) => setEditStatus(value as "ACTIVE" | "INACTIVE")}>
                  <SelectTrigger className="w-full mt-2 bg-white border-gray-300 text-gray-900">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200" side="bottom" align="start">
                    <SelectItem value="ACTIVE" className="text-gray-900">
                      Active
                    </SelectItem>
                    <SelectItem value="INACTIVE" className="text-gray-900">
                      Inactive
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="mt-1 text-xs text-gray-500">
                  {editStatus === "ACTIVE" 
                    ? "Code can be used by the affiliate" 
                    : "Code is disabled and cannot be used"}
                </p>
          </div>
        </div>
      )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEditModal(false);
                setEditingCode(null);
              }}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateCode}
              disabled={isUpdating}
              className="bg-gray-900 hover:bg-gray-800"
            >
              {isUpdating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Code"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({ isOpen: false, codeId: null, codeName: null })
        }
        onConfirm={handleDeleteConfirm}
        title="Delete Affiliate Code?"
        message="Are you sure you want to delete this affiliate code?"
        itemName={deleteModal.codeName || undefined}
        description="This action cannot be undone. The affiliate will no longer be able to use this code."
        isLoading={isDeleting}
        confirmText="Delete"
      />
    </div>
  );
}

