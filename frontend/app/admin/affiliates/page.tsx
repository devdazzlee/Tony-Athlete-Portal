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
  Users,
  UserPlus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  TrendingUp,
  RefreshCw,
  MoreVertical,
  Edit,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { config } from "@/config/config";
import { formatLastActivity, formatRelativeTime } from "@/lib/date-utils";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { AdminLoading } from "@/components/ui/loading";
import { useTiers } from "@/hooks/useTiers";

interface Affiliate {
  id: string;
  name: string;
  email: string;
  joinDate: string;
  status: string;
  tier: string;
  commissionRate?: number;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  lastActivity: string;
  paymentMethod: string;
  country: string;
}

export default function AffiliatesManagementPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [fromDate, setFromDate] = useState<Date | undefined>(undefined);
  const [toDate, setToDate] = useState<Date | undefined>(undefined);
  const [sortBy, setSortBy] = useState<"createdAt" | "name">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const PAGE_SIZE = 10;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(
    null
  );
  const [selectedAffiliateDetails, setSelectedAffiliateDetails] = useState<any>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    affiliateId: string | null;
    affiliateName: string | null;
  }>({ isOpen: false, affiliateId: null, affiliateName: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "",
    tier: "", // Store enum value for backend compatibility
    tierId: "", // Store tier ID for UI selection
    commissionRate: 5,
    deliverablesNote: "",
    discountCode: "",
    discountValue: "",
    discountExpiresAt: "",
    instagram: "",
    tiktok: "",
    spendingLimit: "",
  });
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    commissionRate: 10,
    tier: "",
    discountCode: "",
    discountValue: "10",
    instagram: "",
    tiktok: "",
    spendingLimit: "",
  });
  const [existingDiscountCodes, setExistingDiscountCodes] = useState<any[]>([]);
  const [existingReferralCodes, setExistingReferralCodes] = useState<any[]>([]);
  
  // Fetch tiers from API
  const { tiers, isLoading: tiersLoading, getTierBadgeColor } = useTiers();

  // Helper function to map tier name to enum value (for backend compatibility)
  const getTierEnumValue = (tierNameOrEnum: string): string => {
    if (!tierNameOrEnum) return "BRONZE"; // Default fallback
    
    // If it's already a valid enum value, return it
    const upperValue = tierNameOrEnum.toUpperCase();
    if (["BRONZE", "SILVER", "GOLD", "PLATINUM"].includes(upperValue)) {
      return upperValue;
    }
    
    // Try to find matching tier by name
    const tier = tiers.find(t => 
      t.name.toLowerCase() === tierNameOrEnum.toLowerCase() ||
      t.name.toUpperCase() === upperValue
    );
    
    if (tier) {
      // First try direct name mapping
      const nameToEnum: Record<string, string> = {
        "bronze": "BRONZE",
        "silver": "SILVER",
        "gold": "GOLD",
        "platinum": "PLATINUM",
      };
      const lowerName = tier.name.toLowerCase();
      if (nameToEnum[lowerName]) {
        return nameToEnum[lowerName];
      }
      
      // If name doesn't match, map by level
      // Level 1 -> BRONZE, Level 2 -> SILVER, Level 3 -> GOLD, Level 4+ -> PLATINUM
      const levelToEnum: Record<number, string> = {
        1: "BRONZE",
        2: "SILVER",
        3: "GOLD",
        4: "PLATINUM",
      };
      return levelToEnum[tier.level] || (tier.level >= 4 ? "PLATINUM" : "BRONZE");
    }
    
    // Fallback: try direct mapping
    const nameToEnum: Record<string, string> = {
      "bronze": "BRONZE",
      "silver": "SILVER",
      "gold": "GOLD",
      "platinum": "PLATINUM",
    };
    const lowerName = tierNameOrEnum.toLowerCase();
    return nameToEnum[lowerName] || "BRONZE"; // Safe default
  };

  // Helper function to get tier name from enum value
  const getTierNameFromEnum = (enumValue: string): string => {
    if (!enumValue) return "Select tier";
    
    // First, try to find by exact enum match
    const tierByEnum = tiers.find(t => 
      getTierEnumValue(t.name) === enumValue.toUpperCase()
    );
    if (tierByEnum) return tierByEnum.name;
    
    // Then try to find by name match
    const tierByName = tiers.find(t => 
      t.name.toUpperCase() === enumValue.toUpperCase()
    );
    if (tierByName) return tierByName.name;
    
    // Fallback: return the enum value itself
    return enumValue;
  };

  // Helper to get tier ID from enum value (for Select component)
  const getTierIdFromEnum = (enumValue: string): string => {
    if (!enumValue) return "";
    const tier = tiers.find(t => 
      getTierEnumValue(t.name) === enumValue.toUpperCase() ||
      t.name.toUpperCase() === enumValue.toUpperCase()
    );
    return tier ? tier.id : "";
  };

  // Helper to get enum value from tier ID
  const getEnumValueFromTierId = (tierId: string): string => {
    if (!tierId) return "";
    const tier = tiers.find(t => t.id === tierId);
    return tier ? getTierEnumValue(tier.name) : "";
  };

  // Set default tier when tiers are loaded
  useEffect(() => {
    if (tiers.length > 0 && !createForm.tier) {
      const lowestTier = tiers.sort((a, b) => a.level - b.level)[0];
      if (lowestTier) {
        setCreateForm(prev => ({ ...prev, tier: getTierEnumValue(lowestTier.name) }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiers]);

  useEffect(() => {
    fetchAffiliates();
  }, [statusFilter, tierFilter, currentPage]);

  const filtersActive =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    tierFilter !== "all" ||
    fromDate !== undefined ||
    toDate !== undefined ||
    sortBy !== "createdAt" ||
    sortOrder !== "desc";

  const handleResetFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setTierFilter("all");
    setFromDate(undefined);
    setToDate(undefined);
    setSortBy("createdAt");
    setSortOrder("desc");
    setCurrentPage(1);
  };

  const fetchAffiliates = async (overrideStatus?: string, overrideTier?: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      const status = overrideStatus !== undefined ? overrideStatus : statusFilter;
      const tier = overrideTier !== undefined ? overrideTier : tierFilter;
      
      if (status !== "all")
        params.append("status", status.toUpperCase());
      if (tier !== "all") {
        // Convert tier name to enum value for backend
        const tierEnumValue = getTierEnumValue(tier);
        params.append("tier", tierEnumValue);
      }
      params.append("limit", "500");

      const response = await fetch(
        `${config.apiUrl}/admin/affiliates?${params.toString()}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const affiliatesList = data.data || [];
        setAffiliates(affiliatesList);
      } else {
        console.error("Failed to fetch affiliates:", response.status);
        toast.error("Failed to load affiliates");
      }
    } catch (error) {
      console.error("Error fetching affiliates:", error);
      toast.error("Failed to load affiliates");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchAffiliates();
    setIsRefreshing(false);
    toast.success("Affiliates data refreshed");
  };

  const handleCreateAffiliate = async () => {
    if (!createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/affiliates/create`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: createForm.email,
          password: createForm.password,
          firstName: createForm.firstName,
          lastName: createForm.lastName,
          commissionRate: createForm.commissionRate,
          tier: createForm.tier,
          discountCode: createForm.discountCode || undefined,
          discountValue: createForm.discountValue ? parseFloat(createForm.discountValue) : undefined,
          instagram: createForm.instagram || undefined,
          tiktok: createForm.tiktok || undefined,
          spendingLimit: createForm.spendingLimit ? parseFloat(createForm.spendingLimit) : undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Affiliate created successfully");
        
        // Reset form first
        const lowestTier = tiers.length > 0 
          ? tiers.sort((a, b) => a.level - b.level)[0]
          : null;
        setCreateForm({
          email: "",
          password: "",
          firstName: "",
          lastName: "",
          commissionRate: 10,
          tier: lowestTier ? getTierEnumValue(lowestTier.name) : "",
          discountCode: "",
          discountValue: "10",
          instagram: "",
          tiktok: "",
          spendingLimit: "",
        });
        
        // Reset password visibility
        setShowPassword(false);
        
        // Close dialog
        setCreateDialogOpen(false);
        
        // Reset filters and pagination to show the new affiliate
        setSearchQuery("");
        setFromDate(undefined);
        setToDate(undefined);
        setCurrentPage(1);
        setStatusFilter("all");
        setTierFilter("all");
        
        // Fetch with explicit "all" filters to ensure we get the new affiliate
        // Small delay to ensure dialog closes and state updates
        setTimeout(() => {
          fetchAffiliates("all", "all");
        }, 150);
      } else {
        const error = await response.json();
        
        // Handle validation errors with better messages
        if (error.details && Array.isArray(error.details) && error.details.length > 0) {
          // Extract the first error message from details
          const firstError = error.details[0];
          let errorMessage = firstError.message || "Invalid input data";
          
          // Make error messages more user-friendly
          if (firstError.path && firstError.path.length > 0) {
            const fieldName = firstError.path[0];
            const fieldLabel = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/([A-Z])/g, " $1");
            
            if (firstError.code === "too_small" && fieldName === "password") {
              errorMessage = `Password must be at least ${firstError.minimum} characters long`;
            } else if (firstError.code === "invalid_string" && fieldName === "email") {
              errorMessage = "Please enter a valid email address";
            } else if (!firstError.message) {
              errorMessage = `${fieldLabel}: ${errorMessage}`;
            }
          }
          
          toast.error(errorMessage);
        } else {
          toast.error(error.error || "Failed to create affiliate");
        }
      }
    } catch (error) {
      console.error("Error creating affiliate:", error);
      toast.error("Failed to create affiliate");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditAffiliate = async (affiliate: Affiliate) => {
    setSelectedAffiliate(affiliate);
    // Convert tier to enum value - handle both tier names and enum values
    const tierEnumValue = getTierEnumValue(affiliate.tier);
    // Find the tier ID that matches this enum value (prefer exact match)
    const matchingTier = tiers.find(t => 
      getTierEnumValue(t.name) === tierEnumValue &&
      (t.name.toUpperCase() === affiliate.tier.toUpperCase() || 
       affiliate.tier.toUpperCase() === tierEnumValue)
    ) || tiers.find(t => getTierEnumValue(t.name) === tierEnumValue);
    
    setEditForm({
      status: affiliate.status.toUpperCase(),
      tier: tierEnumValue,
      tierId: matchingTier?.id || "",
      commissionRate: affiliate.commissionRate || 5,
      deliverablesNote: "",
      discountCode: "",
      discountValue: "",
      discountExpiresAt: "",
      instagram: "",
      tiktok: "",
      spendingLimit: "",
    });
    
    // Fetch affiliate details to get deliverables note
    try {
      const response = await fetch(
        `${config.apiUrl}/admin/affiliates/${affiliate.id}`,
        {
          headers: getAuthHeaders(),
        }
      );
      if (response.ok) {
        const data = await response.json();
        const socialMedia = data.affiliate?.socialMedia || {};
        setSelectedAffiliateDetails(data.affiliate);
        setEditForm((prev) => ({
          ...prev,
          deliverablesNote: data.affiliate?.deliverablesNote || "",
          instagram: socialMedia.instagram || "",
          tiktok: socialMedia.tiktok || "",
          spendingLimit: data.affiliate?.spendingLimit ? data.affiliate.spendingLimit.toString() : "",
        }));
        setExistingDiscountCodes(data.affiliate?.discountCodes || []);
        setExistingReferralCodes(data.affiliate?.referralCodes || []);
      }
    } catch (error) {
      console.error("Error fetching affiliate details:", error);
    }
    
    setEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedAffiliate) return;

    setIsSaving(true);
    try {
      // Update status
      if (editForm.status !== selectedAffiliate.status.toUpperCase()) {
        const statusResponse = await fetch(
          `${config.apiUrl}/admin/affiliates/${selectedAffiliate.id}/status`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: editForm.status }),
          }
        );

        if (!statusResponse.ok) {
          throw new Error("Failed to update status");
        }
      }

      // Update tier and commission rate
      if (
        editForm.tier !== selectedAffiliate.tier.toUpperCase() ||
        editForm.commissionRate !== (selectedAffiliate.commissionRate || 5)
      ) {
        // Ensure tier is a valid enum value
        const tierEnumValue = getTierEnumValue(editForm.tier);
        
        const tierResponse = await fetch(
          `${config.apiUrl}/admin/affiliates/${selectedAffiliate.id}/tier`,
          {
            method: "PATCH",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              tier: tierEnumValue,
              commissionRate: editForm.commissionRate,
            }),
          }
        );

        if (!tierResponse.ok) {
          const errorData = await tierResponse.json();

          // Handle validation errors with better messages
          if (errorData.details && Array.isArray(errorData.details)) {
            const commissionError = errorData.details.find((detail: any) =>
              detail.path?.includes("commissionRate")
            );

            if (commissionError) {
              let errorMessage = commissionError.message;

              // If no message from backend, create a user-friendly one
              if (!errorMessage) {
                if (commissionError.code === "too_big") {
                  errorMessage = `Commission rate is too large. Please enter a value less than or equal to 100%.`;
                } else if (commissionError.code === "too_small") {
                  errorMessage = `Commission rate is too small. Please enter a value greater than or equal to 0%.`;
                } else {
                  errorMessage = `Invalid commission rate. Please enter a value between 0 and 100%.`;
                }
              }

              toast.error(errorMessage);
              setIsSaving(false);
              return;
            }
          }

          throw new Error(errorData.error || "Failed to update tier");
        }
      }

      // Update deliverables note
      const noteResponse = await fetch(
        `${config.apiUrl}/admin/affiliates/${selectedAffiliate.id}/deliverables-note`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            deliverablesNote: editForm.deliverablesNote || null,
          }),
        }
      );

      if (!noteResponse.ok) {
        throw new Error("Failed to update deliverables note");
      }

      // Create discount code if provided
      if (editForm.discountCode && editForm.discountValue) {
        const discountResponse = await fetch(
          `${config.apiUrl}/admin/affiliates/${selectedAffiliate.id}/discount-code`,
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              code: editForm.discountCode,
              discount: editForm.discountValue,
              description: `Discount code for ${selectedAffiliate.name}`,
              expiresAt: editForm.discountExpiresAt || undefined,
            }),
          }
        );

        if (!discountResponse.ok) {
          const errorData = await discountResponse.json();
          throw new Error(errorData.error || "Failed to create discount code");
        }

        // Refresh discount codes list after successful creation
        const refreshResponse = await fetch(
          `${config.apiUrl}/admin/affiliates/${selectedAffiliate.id}`,
          {
            headers: getAuthHeaders(),
          }
        );
        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          setExistingDiscountCodes(refreshData.affiliate?.discountCodes || []);
        }

        // Reset discount code fields after successful creation
        setEditForm((prev) => ({
          ...prev,
          discountCode: "",
          discountValue: "",
          discountExpiresAt: "",
        }));
      }

      // Update social media links
      const socialMediaResponse = await fetch(
        `${config.apiUrl}/admin/affiliates/${selectedAffiliate.id}/social-media`,
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            instagram: editForm.instagram || null,
            tiktok: editForm.tiktok || null,
          }),
        }
      );

      if (!socialMediaResponse.ok) {
        throw new Error("Failed to update social media links");
      }

      // Update spending limit (monthly allowance)
      const spendingLimitValue = editForm.spendingLimit ? parseFloat(editForm.spendingLimit) : null;
      const currentSpendingLimit = selectedAffiliateDetails?.spendingLimit || null;
      
      if (spendingLimitValue !== currentSpendingLimit) {
        const spendingLimitResponse = await fetch(
          `${config.apiUrl}/admin/affiliates/${selectedAffiliate.id}/spending-limit`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              spendingLimit: spendingLimitValue,
            }),
          }
        );

        if (!spendingLimitResponse.ok) {
          throw new Error("Failed to update spending limit");
        }
      }

      toast.success("Affiliate updated successfully");
      setEditDialogOpen(false);
      fetchAffiliates();
    } catch (error) {
      console.error("Error updating affiliate:", error);
      toast.error("Failed to update affiliate");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (affiliateId: string, affiliateName: string) => {
    setDeleteModal({ isOpen: true, affiliateId, affiliateName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.affiliateId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${config.apiUrl}/admin/affiliates/${deleteModal.affiliateId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      if (response.ok) {
        toast.success("Affiliate deleted successfully");
        setDeleteModal({
          isOpen: false,
          affiliateId: null,
          affiliateName: null,
        });
        fetchAffiliates();
      } else {
        toast.error("Failed to delete affiliate");
      }
    } catch (error) {
      console.error("Error deleting affiliate:", error);
      toast.error("Failed to delete affiliate");
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    const variants = {
      active: "default",
      pending: "secondary",
      suspended: "destructive",
      inactive: "outline",
    } as const;

    const icons = {
      active: CheckCircle,
      pending: Clock,
      suspended: XCircle,
      inactive: Clock,
    };

    const Icon = icons[statusLower as keyof typeof icons];

    return (
      <Badge variant={variants[statusLower as keyof typeof variants]}>
        {Icon && <Icon className="w-3 h-3 mr-1" />}
        {status}
      </Badge>
    );
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

    // Filter by tier - compare tier names (handle both enum values and tier names)
    if (tierFilter !== "all") {
      result = result.filter((aff) => {
        const affiliateTierName = getTierNameFromEnum(aff.tier);
        // Compare with tier filter (which is a tier name from dropdown)
        return affiliateTierName.toLowerCase() === tierFilter.toLowerCase() ||
               getTierEnumValue(affiliateTierName) === getTierEnumValue(tierFilter);
      });
    }

    if (fromDate) {
      const start = new Date(fromDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter((aff) => {
        const joined = new Date(aff.joinDate);
        return joined >= start;
      });
    }

    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter((aff) => {
        const joined = new Date(aff.joinDate);
        return joined <= end;
      });
    }

    if (sortBy === "createdAt") {
      result.sort((a, b) => {
        const aDate = new Date(a.joinDate).getTime();
        const bDate = new Date(b.joinDate).getTime();
        return sortOrder === "asc" ? aDate - bDate : bDate - aDate;
      });
    } else if (sortBy === "name") {
      result.sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        if (aName < bName) return sortOrder === "asc" ? -1 : 1;
        if (aName > bName) return sortOrder === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [affiliates, searchQuery, tierFilter, fromDate, toDate, sortBy, sortOrder, tiers]);

  const totalPages = Math.max(1, Math.ceil(filteredAffiliates.length / PAGE_SIZE));

  const paginatedAffiliates = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredAffiliates.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredAffiliates, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  if (isLoading) {
    return <AdminLoading message="Loading affiliates..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Manage Affiliates</h1>
          <p className="text-muted-foreground">
            View and manage all affiliate accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Create Affiliate
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw
              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Affiliates
              </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAffiliates.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Registered affiliates
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                filteredAffiliates.filter(
                  (a) => a.status.toLowerCase() === "active"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Active accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                filteredAffiliates.filter(
                  (a) => a.status.toLowerCase() === "pending"
                ).length
              }
            </div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              $
              {filteredAffiliates
                .reduce((sum, a) => sum + a.totalEarnings, 0)
                .toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              All-time commissions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4 text-muted-foreground" />
              Filters
            </CardTitle>
            <CardDescription>
              Refine the affiliate list by name, status, or tier.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Tier</Label>
              <Select
                value={tierFilter}
                onValueChange={(value) => {
                  setTierFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="All Tiers" />
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
            <div className="space-y-1">
              <Label>Search Affiliate</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name or email..."
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
                value={fromDate}
                onChange={(date) => {
                  setFromDate(date);
                  setCurrentPage(1);
                }}
                placeholder="dd/mm/yyyy"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label>To Date</Label>
              <DatePicker
                value={toDate}
                onChange={(date) => {
                  setToDate(date);
                  setCurrentPage(1);
                }}
                placeholder="dd/mm/yyyy"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1">
              <Label>Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={(value: "createdAt" | "name") => {
                  setSortBy(value);
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Sort By" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt">Date Created</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Order</Label>
              <Select
                value={sortOrder}
                onValueChange={(value: "asc" | "desc") => {
                  setSortOrder(value);
                }}
              >
                <SelectTrigger className="h-11 rounded-lg">
                  <SelectValue placeholder="Order" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Affiliates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Affiliates List</CardTitle>
          <CardDescription>
            {filteredAffiliates.length} affiliates found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredAffiliates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No affiliates found.{" "}
              {statusFilter !== "all" || tierFilter !== "all"
                ? "Try adjusting your filters."
                : ""}
            </div>
          ) : (
            <>
              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {paginatedAffiliates.map((affiliate) => (
                  <Card key={affiliate.id} className="border-gray-200">
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-base">{affiliate.name}</div>
                            <div className="text-sm text-muted-foreground">{affiliate.email}</div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditAffiliate(affiliate)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(affiliate.id, affiliate.name)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Status:</span>
                            <div className="mt-1">{getStatusBadge(affiliate.status)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tier:</span>
                            <div className="mt-1">
                              <Badge variant="outline" className={getTierBadgeColor(getTierNameFromEnum(affiliate.tier))}>
                                {getTierNameFromEnum(affiliate.tier)}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Earnings:</span>
                            <div className="mt-1 font-medium">${affiliate.totalEarnings.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Conversions:</span>
                            <div className="mt-1 font-medium">{affiliate.totalConversions}</div>
                          </div>
                        </div>
                        
                        <div className="pt-2 border-t text-xs text-muted-foreground">
                          Last Activity: {formatLastActivity(affiliate.lastActivity)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Affiliate</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Earnings</TableHead>
                      <TableHead>Conversions</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedAffiliates.map((affiliate) => (
                      <TableRow key={affiliate.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{affiliate.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {affiliate.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(affiliate.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getTierBadgeColor(getTierNameFromEnum(affiliate.tier))}>
                            {getTierNameFromEnum(affiliate.tier)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          ${affiliate.totalEarnings.toFixed(2)}
                        </TableCell>
                        <TableCell>{affiliate.totalConversions}</TableCell>
                        <TableCell className="text-sm">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {formatLastActivity(affiliate.lastActivity)}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {formatRelativeTime(affiliate.lastActivity)}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleEditAffiliate(affiliate)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleDeleteClick(affiliate.id, affiliate.name)
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() =>
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                }
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Affiliate Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] flex flex-col max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle>Edit Affiliate</DialogTitle>
            <DialogDescription>
              Update affiliate status, tier, and commission rate
            </DialogDescription>
          </DialogHeader>
          {selectedAffiliate && (
            <div className="space-y-4 overflow-y-auto max-h-[calc(90vh-180px)] pr-2">
              <div>
                <Label>Affiliate</Label>
                <p className="text-sm font-medium">{selectedAffiliate.name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedAffiliate.email}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(value) =>
                    setEditForm({ ...editForm, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tier">Tier</Label>
                <Select
                  value={editForm.tierId}
                  onValueChange={(tierId) => {
                    const tier = tiers.find(t => t.id === tierId);
                    if (tier) {
                      setEditForm({ 
                        ...editForm, 
                        tier: getTierEnumValue(tier.name),
                        tierId: tier.id
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue>
                      {editForm.tierId 
                        ? tiers.find(t => t.id === editForm.tierId)?.name || "Select tier"
                        : "Select tier"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {tiersLoading ? (
                      <SelectItem value="" disabled>Loading tiers...</SelectItem>
                    ) : (
                      tiers
                        .filter(tier => tier.status === "ACTIVE")
                        .sort((a, b) => a.level - b.level)
                        .map((tier) => (
                          <SelectItem key={tier.id} value={tier.id}>
                            {tier.name}
                          </SelectItem>
                        ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">
                  Custom Commission Rate (%)
                </Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={editForm.commissionRate}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      commissionRate: parseFloat(e.target.value),
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave at tier default or set custom rate
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spendingLimit">
                  Monthly Allowance ($)
                </Label>
                <Input
                  id="spendingLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 150.00"
                  value={editForm.spendingLimit}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      spendingLimit: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Monthly product allowance amount for this affiliate. Leave empty to remove allowance.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliverablesNote">
                  Deliverables Note
                </Label>
                <Textarea
                  id="deliverablesNote"
                  placeholder="Enter custom deliverables requirements for this affiliate (e.g., 'Post once on TikTok per month' or 'Post 3 times on TikTok per month')"
                  value={editForm.deliverablesNote}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      deliverablesNote: e.target.value,
                    })
                  }
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This note will appear at the top of the deliverables tab for this affiliate
                </p>
              </div>

              {/* Existing Referral Codes (Tracking Codes) - View Only */}
              {existingReferralCodes.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Tracking Codes</Label>
                    <p className="text-xs text-muted-foreground">
                      Created by affiliate
                    </p>
                  </div>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto border rounded-md p-2 bg-muted/30">
                    {existingReferralCodes.map((code) => (
                      <div key={code.id} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-semibold">{code.code}</span>
                          <span className="text-muted-foreground ml-1.5">
                            - {code.commissionRate}% commission
                          </span>
                          {code.currentUses > 0 && (
                            <span className="text-muted-foreground ml-1.5">
                              • {code.currentUses} uses
                            </span>
                          )}
                        </div>
                        <Badge variant={code.isActive ? "default" : "secondary"} className="text-xs px-1.5 py-0">
                          {code.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic">
                    Note: Affiliates create tracking codes themselves in the Tracking tab. Admins can view and manage them here.
                  </p>
                </div>
              )}

              {/* Existing Discount Codes */}
              {existingDiscountCodes.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Existing Discount Codes</Label>
                  <div className="space-y-1.5 max-h-24 overflow-y-auto border rounded-md p-2 bg-muted/30">
                    {existingDiscountCodes.map((code) => (
                      <div key={code.id} className="flex items-center justify-between text-xs">
                        <div className="flex-1 min-w-0">
                          <span className="font-mono font-semibold">{code.code}</span>
                          <span className="text-muted-foreground ml-1.5">
                            - {code.discount}
                          </span>
                        </div>
                        <Badge variant={code.status === "ACTIVE" ? "default" : "secondary"} className="text-xs px-1.5 py-0">
                          {code.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create New Discount Code */}
              <div className="space-y-2 border-t pt-3">
                <Label className="text-sm font-semibold">Assign Discount Code</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="discountCode">Code</Label>
                    <Input
                      id="discountCode"
                      placeholder="e.g., SAVE10"
                      value={editForm.discountCode}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          discountCode: e.target.value.toUpperCase(),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="discountValue">Discount Value</Label>
                    <Input
                      id="discountValue"
                      type="text"
                      placeholder="e.g., 10% or $10"
                      value={editForm.discountValue}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          discountValue: e.target.value,
                        })
                      }
                      className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discountExpiresAt">Expires At (Optional)</Label>
                  <DatePicker
                    value={editForm.discountExpiresAt ? new Date(editForm.discountExpiresAt) : undefined}
                    onChange={(date) => {
                      if (date) {
                        setEditForm({
                          ...editForm,
                          discountExpiresAt: date.toISOString().split("T")[0],
                        });
                      } else {
                        setEditForm({
                          ...editForm,
                          discountExpiresAt: "",
                        });
                      }
                    }}
                    placeholder="Select expiration date"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty to create a new discount code. Format: "10%" for percentage or "$10" for fixed amount.
                </p>
              </div>

              {/* Social Media Links */}
              <div className="space-y-2 border-t pt-3">
                <Label className="text-sm font-semibold">Social Media Profiles</Label>
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram Username</Label>
                  <Input
                    id="instagram"
                    placeholder="e.g., @username or username"
                    value={editForm.instagram}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        instagram: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tiktok">TikTok Username</Label>
                  <Input
                    id="tiktok"
                    placeholder="e.g., @username or username"
                    value={editForm.tiktok}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        tiktok: e.target.value,
                      })
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  These will be displayed on the affiliate's dashboard
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 border-t pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setEditDialogOpen(false);
                // Reset fields when closing
                setEditForm((prev) => ({
                  ...prev,
                  discountCode: "",
                  discountValue: "",
                  discountExpiresAt: "",
                }));
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Affiliate Dialog */}
      <Dialog 
        open={createDialogOpen} 
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            // Reset form when dialog closes
            const lowestTier = tiers.length > 0 
              ? tiers.sort((a, b) => a.level - b.level)[0]
              : null;
            setCreateForm({
              email: "",
              password: "",
              firstName: "",
              lastName: "",
              commissionRate: 10,
              tier: lowestTier ? getTierEnumValue(lowestTier.name) : "",
              discountCode: "",
              discountValue: "10",
              instagram: "",
              tiktok: "",
              spendingLimit: "",
            });
            setShowPassword(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Affiliate</DialogTitle>
            <DialogDescription>
              Create a new affiliate account. They will receive login credentials via email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Account Details */}
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Account Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-firstName">First Name *</Label>
                  <Input
                    id="create-firstName"
                    placeholder="John"
                    value={createForm.firstName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, firstName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-lastName">Last Name *</Label>
                  <Input
                    id="create-lastName"
                    placeholder="Doe"
                    value={createForm.lastName}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, lastName: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="john@example.com"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="create-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Min 8 characters"
                    value={createForm.password}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, password: e.target.value })
                    }
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Affiliate Settings */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-sm">Affiliate Settings</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-tier">Tier</Label>
                  <Select
                    value={(() => {
                      if (!createForm.tier) return "";
                      const tier = tiers.find(t => getTierEnumValue(t.name) === createForm.tier);
                      return tier ? tier.id : "";
                    })()}
                    onValueChange={(tierId) => {
                      const tier = tiers.find(t => t.id === tierId);
                      if (tier) {
                        setCreateForm({ ...createForm, tier: getTierEnumValue(tier.name) });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiersLoading ? (
                        <SelectItem value="" disabled>Loading tiers...</SelectItem>
                      ) : (
                        tiers
                          .filter(tier => tier.status === "ACTIVE")
                          .sort((a, b) => a.level - b.level)
                          .map((tier) => (
                            <SelectItem key={tier.id} value={tier.id}>
                              {tier.name}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-commissionRate">Commission Rate (%)</Label>
                  <Input
                    id="create-commissionRate"
                    type="number"
                    min="0"
                    max="100"
                    value={createForm.commissionRate}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        commissionRate: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-spendingLimit">Monthly Allowance ($)</Label>
                <Input
                  id="create-spendingLimit"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="e.g., 150.00"
                  value={createForm.spendingLimit}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      spendingLimit: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Monthly product allowance amount for this affiliate. Leave empty to set no allowance.
                </p>
              </div>
            </div>

            {/* Discount Code */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-sm">Discount Code (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-discountCode">Code</Label>
                  <Input
                    id="create-discountCode"
                    placeholder="e.g., JOHN10"
                    value={createForm.discountCode}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        discountCode: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-discountValue">Discount (%)</Label>
                  <Input
                    id="create-discountValue"
                    type="number"
                    placeholder="10"
                    value={createForm.discountValue}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        discountValue: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-semibold text-sm">Social Media (Optional)</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-instagram">Instagram</Label>
                  <Input
                    id="create-instagram"
                    placeholder="@username"
                    value={createForm.instagram}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, instagram: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-tiktok">TikTok</Label>
                  <Input
                    id="create-tiktok"
                    placeholder="@username"
                    value={createForm.tiktok}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, tiktok: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAffiliate}
              disabled={isCreating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Affiliate
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() =>
          setDeleteModal({
            isOpen: false,
            affiliateId: null,
            affiliateName: null,
          })
        }
        onConfirm={handleDeleteConfirm}
        title="Delete Affiliate?"
        message="Are you sure you want to delete this affiliate?"
        itemName={deleteModal.affiliateName || undefined}
        description="This action cannot be undone. All associated data, commissions, and links will be permanently removed."
        isLoading={isDeleting}
      />
    </div>
  );
}
