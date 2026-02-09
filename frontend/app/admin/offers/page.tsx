"use client";

import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LinkIcon,
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  MoreVertical,
  TrendingUp,
  MousePointer,
  Target,
  Users,
  Image,
  Eye,
  Download,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import apiClient from "@/lib/api-client";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";
import { AdminLoading } from "@/components/ui/loading";

interface ReferralCode {
  id: string;
  code: string;
  type: string;
  commissionRate: number;
}

interface Affiliate {
  id: string;
  name: string;
  email: string;
  status: string;
  referralCodes: ReferralCode[];
}

interface Creative {
  id: string;
  name: string;
  type: string;
  size: string;
  format: string;
  url: string;
  downloadUrl: string;
  createdAt: string;
}

interface Offer {
  id: string;
  name: string;
  description: string;
  commissionRate: number;
  status: string;
  startDate: string;
  endDate: string | null;
  tags: string[];
  totalClicks: number;
  totalConversions: number;
  totalRevenue: number;
  totalCommissions: number;
  conversionRate: number;
  affiliatesCount: number;
  creativesCount: number;
  applications: Array<{
    id: string;
    affiliateId: string;
    affiliateName: string;
    affiliateEmail: string;
    status: string;
    appliedAt: string;
  }>;
  creatives: Creative[];
  referralCodeIds?: string[]; // Referral code IDs associated with this offer
  createdAt: string;
  updatedAt: string;
}

interface OffersSummary {
  total: number;
  totalRevenue: number;
  totalCommissions: number;
  active: number;
  paused: number;
  ended: number;
}

export default function OffersManagementPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [summary, setSummary] = useState<OffersSummary>({
    total: 0,
    totalRevenue: 0,
    totalCommissions: 0,
    active: 0,
    paused: 0,
    ended: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [creativesDialogOpen, setCreativesDialogOpen] = useState(false);
  const [offerCreatives, setOfferCreatives] = useState<Creative[]>([]);
  const [isLoadingCreatives, setIsLoadingCreatives] = useState(false);
  const [editCreativeDialogOpen, setEditCreativeDialogOpen] = useState(false);
  const [isEditingCreative, setIsEditingCreative] = useState(false);
  const [editingCreative, setEditingCreative] = useState<Creative | null>(null);

  // Delete modals state
  const [deleteOfferModal, setDeleteOfferModal] = useState<{
    isOpen: boolean;
    offerId: string | null;
    offerName: string | null;
  }>({ isOpen: false, offerId: null, offerName: null });
  const [deleteCreativeModal, setDeleteCreativeModal] = useState<{
    isOpen: boolean;
    creativeId: string | null;
    creativeName: string | null;
  }>({ isOpen: false, creativeId: null, creativeName: null });
  const [isDeletingOffer, setIsDeletingOffer] = useState(false);
  const [isDeletingCreative, setIsDeletingCreative] = useState(false);

  const [newOffer, setNewOffer] = useState({
    name: "",
    description: "",
    commissionRate: 10,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    tags: [] as string[],
    affiliateId: "",
    referralCodeIds: [] as string[],
  });

  const [newCreative, setNewCreative] = useState({
    name: "",
    type: "banner",
    size: "",
    format: "",
    url: "",
    downloadUrl: "",
  });

  const [editOffer, setEditOffer] = useState({
    name: "",
    description: "",
    commissionRate: 10,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    tags: [] as string[],
    status: "active",
    affiliateId: "",
    referralCodeIds: [] as string[],
  });

  const [editCreative, setEditCreative] = useState({
    name: "",
    type: "banner",
    size: "",
    format: "",
    url: "",
    downloadUrl: "",
  });

  useEffect(() => {
    fetchOffers();
    fetchAffiliates();
  }, []);

  const fetchOffers = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/admin/offers");
      const data = response.data;
      setOffers(data?.data || []);
      setSummary(data?.summary || summary);
    } catch (error) {
      console.error("Error fetching offers:", error);
      toast.error("Failed to load offers");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAffiliates = async () => {
    try {
      const response = await apiClient.get("/admin/offers/affiliates");
      setAffiliates(response.data?.affiliates || []);
    } catch (error) {
      console.error("Error fetching affiliates:", error);
    }
  };

  const fetchOfferCreatives = async (offerId: string) => {
    setIsLoadingCreatives(true);
    try {
      const response = await apiClient.get(`/admin/offers/${offerId}/creatives`);
      setOfferCreatives(response.data?.creatives || []);
    } catch (error) {
      console.error("Error fetching creatives:", error);
      toast.error("Failed to load creatives");
    } finally {
      setIsLoadingCreatives(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchOffers();
    setIsRefreshing(false);
    toast.success("Offers data refreshed");
  };

  const handleCreateOffer = async () => {
    if (!newOffer.name || !newOffer.description || !newOffer.affiliateId) {
      toast.error(
        "Please fill in all required fields including affiliate selection"
      );
      return;
    }

    setIsCreating(true);

    try {
      const response = await apiClient.post("/admin/offers", newOffer);
      toast.success(
        response.data?.message ||
          "Offer created successfully and assigned to affiliate"
      );
      setCreateDialogOpen(false);
      setNewOffer({
        name: "",
        description: "",
        commissionRate: 10,
        startDate: new Date().toISOString().split("T")[0],
        endDate: "",
        tags: [],
        affiliateId: "",
        referralCodeIds: [],
      });
      fetchOffers();
    } catch (error: any) {
      console.error("Error creating offer:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to create offer. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteOfferClick = (offerId: string, offerName: string) => {
    setDeleteOfferModal({ isOpen: true, offerId, offerName });
  };

  const handleDeleteOfferConfirm = async () => {
    if (!deleteOfferModal.offerId) return;

    setIsDeletingOffer(true);
    try {
      await apiClient.delete(`/admin/offers/${deleteOfferModal.offerId}`);
      toast.success("Offer deleted successfully");
      setDeleteOfferModal({ isOpen: false, offerId: null, offerName: null });
      fetchOffers();
    } catch (error) {
      console.error("Error deleting offer:", error);
      toast.error("Failed to delete offer");
    } finally {
      setIsDeletingOffer(false);
    }
  };

  const handleAddCreative = async () => {
    if (!selectedOfferId || !newCreative.name || !newCreative.url) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsCreating(true);
    try {
      const response = await apiClient.post(
        `/admin/offers/${selectedOfferId}/creatives`,
        newCreative
      );
      toast.success(response.data?.message || "Creative created successfully");
      setCreativesDialogOpen(false);
      setNewCreative({
        name: "",
        type: "banner",
        size: "",
        format: "",
        url: "",
        downloadUrl: "",
      });
      if (selectedOfferId) {
        fetchOfferCreatives(selectedOfferId);
      }
    } catch (error) {
      console.error("Error creating creative:", error);
      toast.error("Failed to create creative");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCreativeClick = (
    creativeId: string,
    creativeName: string
  ) => {
    if (!selectedOfferId) {
      toast.error("No offer selected");
      return;
    }
    setDeleteCreativeModal({ isOpen: true, creativeId, creativeName });
  };

  const handleDeleteCreativeConfirm = async () => {
    if (!deleteCreativeModal.creativeId || !selectedOfferId) return;

    setIsDeletingCreative(true);
    try {
      await apiClient.delete(
        `/admin/offers/${selectedOfferId}/creatives/${deleteCreativeModal.creativeId}`
      );
      toast.success("Creative deleted successfully");
      setDeleteCreativeModal({
        isOpen: false,
        creativeId: null,
        creativeName: null,
      });
      fetchOfferCreatives(selectedOfferId);
    } catch (error) {
      console.error("Error deleting creative:", error);
      toast.error("Failed to delete creative");
    } finally {
      setIsDeletingCreative(false);
    }
  };

  const openCreativesDialog = (offerId: string) => {
    setSelectedOfferId(offerId);
    setCreativesDialogOpen(true);
    fetchOfferCreatives(offerId);
  };

  const handleAffiliateSelection = (affiliateId: string) => {
    setNewOffer({
      ...newOffer,
      affiliateId: affiliateId,
      referralCodeIds: [], // Reset referral codes when affiliate changes
    });
  };

  const handleReferralCodeSelection = (
    referralCodeId: string,
    checked: boolean
  ) => {
    if (checked) {
      setNewOffer({
        ...newOffer,
        referralCodeIds: [...newOffer.referralCodeIds, referralCodeId],
      });
    } else {
      setNewOffer({
        ...newOffer,
        referralCodeIds: newOffer.referralCodeIds.filter(
          (id) => id !== referralCodeId
        ),
      });
    }
  };

  const handleEditAffiliateSelection = (affiliateId: string) => {
    setEditOffer({
      ...editOffer,
      affiliateId: affiliateId,
      referralCodeIds: [], // Reset referral codes when affiliate changes
    });
  };

  const handleEditReferralCodeSelection = (
    referralCodeId: string,
    checked: boolean
  ) => {
    if (checked) {
      setEditOffer({
        ...editOffer,
        referralCodeIds: [...editOffer.referralCodeIds, referralCodeId],
      });
    } else {
      setEditOffer({
        ...editOffer,
        referralCodeIds: editOffer.referralCodeIds.filter(
          (id) => id !== referralCodeId
        ),
      });
    }
  };

  const openEditDialog = (offer: Offer) => {
    setEditingOffer(offer);
    setEditOffer({
      name: offer.name,
      description: offer.description,
      commissionRate: offer.commissionRate,
      startDate: offer.startDate,
      endDate: offer.endDate || "",
      tags: offer.tags || [],
      status: offer.status,
      affiliateId: offer.applications?.[0]?.affiliateId || "",
      referralCodeIds: offer.referralCodeIds || [], // Load previously selected referral codes
    });
    setEditDialogOpen(true);
  };

  const handleUpdateOffer = async () => {
    if (
      !editingOffer ||
      !editOffer.name ||
      !editOffer.description ||
      !editOffer.affiliateId
    ) {
      toast.error(
        "Please fill in all required fields including affiliate selection"
      );
      return;
    }

    setIsEditing(true);
    try {
      const response = await apiClient.put(`/admin/offers/${editingOffer.id}`, {
        ...editOffer,
        status: editOffer.status.toUpperCase(),
      });
      toast.success(response.data?.message || "Offer updated successfully");
      setEditDialogOpen(false);
      setEditingOffer(null);
      fetchOffers();
    } catch (error) {
      console.error("Error updating offer:", error);
      toast.error("Failed to update offer");
    } finally {
      setIsEditing(false);
    }
  };

  const openEditCreativeDialog = (creative: Creative) => {
    setEditingCreative(creative);
    setEditCreative({
      name: creative.name,
      type: creative.type,
      size: creative.size,
      format: creative.format,
      url: creative.url,
      downloadUrl: creative.downloadUrl,
    });
    setEditCreativeDialogOpen(true);
  };

  const handleUpdateCreative = async () => {
    if (
      !selectedOfferId ||
      !editingCreative ||
      !editCreative.name ||
      !editCreative.url
    ) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsEditingCreative(true);
    try {
      const response = await apiClient.put(
        `/admin/offers/${selectedOfferId}/creatives/${editingCreative.id}`,
        editCreative
      );
      toast.success(response.data?.message || "Creative updated successfully");
      setEditCreativeDialogOpen(false);
      setEditingCreative(null);
      if (selectedOfferId) {
        fetchOfferCreatives(selectedOfferId);
      }
    } catch (error) {
      console.error("Error updating creative:", error);
      toast.error("Failed to update creative");
    } finally {
      setIsEditingCreative(false);
    }
  };

  if (isLoading) {
    return <AdminLoading message="Loading offers..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Offers & Creatives</h1>
          <p className="text-muted-foreground">
            Manage promotional offers and creative assets for affiliates
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Offer
          </Button>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="w-full sm:w-auto"
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
            <CardTitle className="text-sm font-medium">Total Offers</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.total}</div>
            <p className="text-xs text-muted-foreground">
              {summary.active} active, {summary.paused} paused
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers
                .reduce((sum, o) => sum + o.totalClicks, 0)
                .toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Across all offers</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {offers.reduce((sum, o) => sum + o.totalConversions, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total conversions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${summary.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Generated revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Offers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Offers List</CardTitle>
          <CardDescription>{summary.total} offers configured</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Offer Name</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Affiliates</TableHead>
                  <TableHead>Clicks</TableHead>
                  <TableHead>Conversions</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {offers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No offers found. Create your first offer to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{offer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {offer.description.slice(0, 50)}...
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{offer.commissionRate}%</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            offer.status === "active" ? "default" : "secondary"
                          }
                        >
                          {offer.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {offer.applications && offer.applications.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap">
                            {offer.applications.map((app, index) => (
                              <span
                                key={app.id}
                                className="text-sm font-medium"
                              >
                                {app.affiliateName}
                                {index < offer.applications.length - 1 && (
                                  <span className="text-muted-foreground mx-1">
                                    ,
                                  </span>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No affiliates
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {offer.totalClicks.toLocaleString()}
                      </TableCell>
                      <TableCell>{offer.totalConversions}</TableCell>
                      <TableCell className="font-medium">
                        ${offer.totalRevenue.toFixed(2)}
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
                              onClick={() => openEditDialog(offer)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteOfferClick(offer.id, offer.name)
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
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create Offer Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Offer</DialogTitle>
            <DialogDescription>
              Create a new promotional offer and assign it to a specific
              affiliate with their referral codes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="name">Offer Name *</Label>
                <Input
                  id="name"
                  placeholder="Premium Plan Promotion"
                  value={newOffer.name}
                  onChange={(e) =>
                    setNewOffer({ ...newOffer, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="30% commission on all premium plan sales..."
                  value={newOffer.description}
                  onChange={(e) =>
                    setNewOffer({ ...newOffer, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            {/* Affiliate Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Affiliate Selection</h3>
              <div className="space-y-2">
                <Label htmlFor="affiliate">Select Affiliate *</Label>
                <Select
                  value={newOffer.affiliateId}
                  onValueChange={handleAffiliateSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an affiliate" />
                  </SelectTrigger>
                  <SelectContent>
                    {affiliates.map((affiliate) => (
                      <SelectItem key={affiliate.id} value={affiliate.id}>
                        {affiliate.name} ({affiliate.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Commission Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Commission Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate (%) *</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    min="0"
                    max="100"
                    value={newOffer.commissionRate}
                    onChange={(e) =>
                      setNewOffer({
                        ...newOffer,
                        commissionRate: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date (Optional)</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={newOffer.endDate}
                    onChange={(e) =>
                      setNewOffer({ ...newOffer, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Selected Affiliate Info */}
            {newOffer.affiliateId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selected Affiliate</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {(() => {
                    const selectedAffiliate = affiliates.find(
                      (aff) => aff.id === newOffer.affiliateId
                    );
                    return selectedAffiliate ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-blue-900">
                              {selectedAffiliate.name}
                            </p>
                            <p className="text-sm text-blue-700">
                              {selectedAffiliate.email}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            {selectedAffiliate.status}
                          </Badge>
                        </div>

                        {/* Referral Codes Selection */}
                        {selectedAffiliate.referralCodes.length > 0 ? (
                          <div className="bg-white border border-blue-300 rounded-md p-3">
                            <p className="text-sm font-medium text-blue-900 mb-3">
                              Select Referral Codes:
                            </p>
                            <div className="space-y-2">
                              {selectedAffiliate.referralCodes.map((code) => (
                                <div
                                  key={code.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={code.id}
                                    checked={newOffer.referralCodeIds.includes(
                                      code.id
                                    )}
                                    onCheckedChange={(checked) =>
                                      handleReferralCodeSelection(
                                        code.id,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={code.id}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    <code className="text-sm font-mono font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded mr-2">
                                      {code.code}
                                    </code>
                                    <span className="text-blue-700">
                                      ({code.type} - {code.commissionRate}%)
                                    </span>
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              Selected: {newOffer.referralCodeIds.length}{" "}
                              referral code(s)
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white border border-blue-300 rounded-md p-3">
                            <p className="text-sm text-blue-700">
                              No referral codes available for this affiliate
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreateOffer} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Offer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Offer</DialogTitle>
            <DialogDescription>
              Update the offer details, affiliate assignment, and referral codes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              <div className="space-y-2">
                <Label htmlFor="editName">Offer Name *</Label>
                <Input
                  id="editName"
                  placeholder="Premium Plan Promotion"
                  value={editOffer.name}
                  onChange={(e) =>
                    setEditOffer({ ...editOffer, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description *</Label>
                <Textarea
                  id="editDescription"
                  placeholder="30% commission on all premium plan sales..."
                  value={editOffer.description}
                  onChange={(e) =>
                    setEditOffer({ ...editOffer, description: e.target.value })
                  }
                  rows={3}
                />
              </div>
            </div>

            {/* Affiliate Selection */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Affiliate Selection</h3>
              <div className="space-y-2">
                <Label htmlFor="editAffiliate">Select Affiliate *</Label>
                <Select
                  value={editOffer.affiliateId}
                  onValueChange={handleEditAffiliateSelection}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an affiliate" />
                  </SelectTrigger>
                  <SelectContent>
                    {affiliates.map((affiliate) => (
                      <SelectItem key={affiliate.id} value={affiliate.id}>
                        {affiliate.name} ({affiliate.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Selected Affiliate Info */}
            {editOffer.affiliateId && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Selected Affiliate</h3>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  {(() => {
                    const selectedAffiliate = affiliates.find(
                      (aff) => aff.id === editOffer.affiliateId
                    );
                    return selectedAffiliate ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-blue-900">
                              {selectedAffiliate.name}
                            </p>
                            <p className="text-sm text-blue-700">
                              {selectedAffiliate.email}
                            </p>
                          </div>
                          <Badge
                            variant="secondary"
                            className="bg-blue-100 text-blue-800"
                          >
                            {selectedAffiliate.status}
                          </Badge>
                        </div>

                        {/* Referral Codes Selection */}
                        {selectedAffiliate.referralCodes.length > 0 ? (
                          <div className="bg-white border border-blue-300 rounded-md p-3">
                            <p className="text-sm font-medium text-blue-900 mb-3">
                              Select Referral Codes:
                            </p>
                            <div className="space-y-2">
                              {selectedAffiliate.referralCodes.map((code) => (
                                <div
                                  key={code.id}
                                  className="flex items-center space-x-2"
                                >
                                  <Checkbox
                                    id={`edit-${code.id}`}
                                    checked={editOffer.referralCodeIds.includes(
                                      code.id
                                    )}
                                    onCheckedChange={(checked) =>
                                      handleEditReferralCodeSelection(
                                        code.id,
                                        checked as boolean
                                      )
                                    }
                                  />
                                  <Label
                                    htmlFor={`edit-${code.id}`}
                                    className="text-sm font-normal cursor-pointer flex-1"
                                  >
                                    <code className="text-sm font-mono font-bold text-blue-800 bg-blue-100 px-2 py-1 rounded mr-2">
                                      {code.code}
                                    </code>
                                    <span className="text-blue-700">
                                      ({code.type} - {code.commissionRate}%)
                                    </span>
                                  </Label>
                                </div>
                              ))}
                            </div>
                            <p className="text-xs text-blue-600 mt-2">
                              Selected: {editOffer.referralCodeIds.length}{" "}
                              referral code(s)
                            </p>
                          </div>
                        ) : (
                          <div className="bg-white border border-blue-300 rounded-md p-3">
                            <p className="text-sm text-blue-700">
                              No referral codes available for this affiliate
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* Commission Settings */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Commission Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editCommissionRate">
                    Commission Rate (%) *
                  </Label>
                  <Input
                    id="editCommissionRate"
                    type="number"
                    min="0"
                    max="100"
                    value={editOffer.commissionRate}
                    onChange={(e) =>
                      setEditOffer({
                        ...editOffer,
                        commissionRate: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status</Label>
                  <Select
                    value={editOffer.status}
                    onValueChange={(value) =>
                      setEditOffer({ ...editOffer, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="ended">Ended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editStartDate">Start Date *</Label>
                  <Input
                    id="editStartDate"
                    type="date"
                    value={editOffer.startDate}
                    onChange={(e) =>
                      setEditOffer({ ...editOffer, startDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEndDate">End Date (Optional)</Label>
                  <Input
                    id="editEndDate"
                    type="date"
                    value={editOffer.endDate}
                    onChange={(e) =>
                      setEditOffer({ ...editOffer, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateOffer} disabled={isEditing}>
              {isEditing ? "Updating..." : "Update Offer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Creatives Management Dialog */}
      <Dialog open={creativesDialogOpen} onOpenChange={setCreativesDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Creatives</DialogTitle>
            <DialogDescription>
              Add and manage creative assets for this offer
            </DialogDescription>
          </DialogHeader>

          {/* Add New Creative */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="text-lg font-semibold">Add New Creative</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="creativeName">Creative Name *</Label>
                <Input
                  id="creativeName"
                  placeholder="Banner Ad 728x90"
                  value={newCreative.name}
                  onChange={(e) =>
                    setNewCreative({ ...newCreative, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creativeType">Type *</Label>
                <Select
                  value={newCreative.type}
                  onValueChange={(value) =>
                    setNewCreative({ ...newCreative, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="landing">Landing Page</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="creativeSize">Size</Label>
                <Input
                  id="creativeSize"
                  placeholder="728x90"
                  value={newCreative.size}
                  onChange={(e) =>
                    setNewCreative({ ...newCreative, size: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creativeFormat">Format</Label>
                <Input
                  id="creativeFormat"
                  placeholder="PNG, JPG, HTML"
                  value={newCreative.format}
                  onChange={(e) =>
                    setNewCreative({ ...newCreative, format: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creativeUrl">Preview URL *</Label>
                <Input
                  id="creativeUrl"
                  placeholder="https://example.com/preview"
                  value={newCreative.url}
                  onChange={(e) =>
                    setNewCreative({ ...newCreative, url: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="creativeDownloadUrl">Download URL *</Label>
                <Input
                  id="creativeDownloadUrl"
                  placeholder="https://example.com/download"
                  value={newCreative.downloadUrl}
                  onChange={(e) =>
                    setNewCreative({
                      ...newCreative,
                      downloadUrl: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <Button onClick={handleAddCreative} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Creative
            </Button>
          </div>

          {/* Existing Creatives */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Existing Creatives</h3>
            {isLoadingCreatives ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : offerCreatives.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No creatives found. Add your first creative above.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {offerCreatives.map((creative) => (
                  <Card key={creative.id}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">
                          {creative.name}
                        </CardTitle>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(creative.url, "_blank")
                              }
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Preview
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                window.open(creative.downloadUrl, "_blank")
                              }
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditCreativeDialog(creative)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteCreativeClick(
                                  creative.id,
                                  creative.name
                                )
                              }
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{creative.type}</Badge>
                        {creative.size && (
                          <Badge variant="secondary">{creative.size}</Badge>
                        )}
                      </div>
                      {creative.format && (
                        <p className="text-sm text-muted-foreground">
                          Format: {creative.format}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Added: {creative.createdAt}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Creative Dialog */}
      <Dialog
        open={editCreativeDialogOpen}
        onOpenChange={setEditCreativeDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Creative</DialogTitle>
            <DialogDescription>
              Update the creative asset details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editCreativeName">Creative Name *</Label>
                <Input
                  id="editCreativeName"
                  placeholder="Banner Ad 728x90"
                  value={editCreative.name}
                  onChange={(e) =>
                    setEditCreative({ ...editCreative, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCreativeType">Type *</Label>
                <Select
                  value={editCreative.type}
                  onValueChange={(value) =>
                    setEditCreative({ ...editCreative, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="banner">Banner</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="landing">Landing Page</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCreativeSize">Size</Label>
                <Input
                  id="editCreativeSize"
                  placeholder="728x90"
                  value={editCreative.size}
                  onChange={(e) =>
                    setEditCreative({ ...editCreative, size: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCreativeFormat">Format</Label>
                <Input
                  id="editCreativeFormat"
                  placeholder="PNG, JPG, HTML"
                  value={editCreative.format}
                  onChange={(e) =>
                    setEditCreative({ ...editCreative, format: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCreativeUrl">Preview URL *</Label>
                <Input
                  id="editCreativeUrl"
                  placeholder="https://example.com/preview"
                  value={editCreative.url}
                  onChange={(e) =>
                    setEditCreative({ ...editCreative, url: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editCreativeDownloadUrl">Download URL *</Label>
                <Input
                  id="editCreativeDownloadUrl"
                  placeholder="https://example.com/download"
                  value={editCreative.downloadUrl}
                  onChange={(e) =>
                    setEditCreative({
                      ...editCreative,
                      downloadUrl: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditCreativeDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateCreative} disabled={isEditingCreative}>
              {isEditingCreative ? "Updating..." : "Update Creative"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Offer Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteOfferModal.isOpen}
        onClose={() =>
          setDeleteOfferModal({ isOpen: false, offerId: null, offerName: null })
        }
        onConfirm={handleDeleteOfferConfirm}
        title="Delete Offer?"
        message="Are you sure you want to delete this offer?"
        itemName={deleteOfferModal.offerName || undefined}
        description="This will also delete all associated creatives and applications. This action cannot be undone."
        isLoading={isDeletingOffer}
      />

      {/* Delete Creative Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteCreativeModal.isOpen}
        onClose={() =>
          setDeleteCreativeModal({
            isOpen: false,
            creativeId: null,
            creativeName: null,
          })
        }
        onConfirm={handleDeleteCreativeConfirm}
        title="Delete Creative?"
        message="Are you sure you want to delete this creative?"
        itemName={deleteCreativeModal.creativeName || undefined}
        description="This action cannot be undone. The creative will be permanently removed from the offer."
        isLoading={isDeletingCreative}
      />
    </div>
  );
}
