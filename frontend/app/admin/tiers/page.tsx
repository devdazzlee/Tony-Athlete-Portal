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
import {
  Edit,
  Trash2,
  Loader2,
  Plus,
  RefreshCw,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { AdminLoading } from "@/components/ui/loading";
import { Switch } from "@/components/ui/switch";

interface Tier {
  id: string;
  name: string;
  description: string;
  level: number;
  commissionRate: number;
  requirements: {
    minimumClicks: number;
    minimumConversions: number;
    minimumEarnings: number;
    minimumReferrals: number;
    timePeriod: number;
    otherRequirements: string[];
  };
  benefits: {
    commissionRate: number;
    bonusRate: number;
    prioritySupport: boolean;
    customFeatures: string[];
    exclusiveOffers: boolean;
    higherPayouts: boolean;
    marketingMaterials: boolean;
    dedicatedManager: boolean;
  };
  status: string;
}

export default function TiersManagementPage() {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    level: 1,
    commissionRate: 0,
    requirements: {
      minimumClicks: 0,
      minimumConversions: 0,
      minimumEarnings: 0,
      minimumReferrals: 0,
      timePeriod: 30,
      otherRequirements: [] as string[],
    },
    benefits: {
      commissionRate: 0,
      bonusRate: 0,
      prioritySupport: false,
      customFeatures: [] as string[],
      exclusiveOffers: false,
      higherPayouts: false,
      marketingMaterials: false,
      dedicatedManager: false,
    },
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
  });

  useEffect(() => {
    fetchTiers();
  }, []);

  const fetchTiers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${config.apiUrl}/admin/tiers`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setTiers(data.tiers || []);
      } else {
        toast.error("Failed to load tiers");
      }
    } catch (error) {
      console.error("Error fetching tiers:", error);
      toast.error("Failed to load tiers");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditTier = (tier: Tier) => {
    setSelectedTier(tier);
    setFormData({
      name: tier.name,
      description: tier.description,
      level: tier.level,
      commissionRate: tier.commissionRate,
      requirements: tier.requirements,
      benefits: tier.benefits,
      status: tier.status as "ACTIVE" | "INACTIVE",
    });
    setEditDialogOpen(true);
  };

  const handleCreateTier = () => {
    setSelectedTier(null);
    setFormData({
      name: "",
      description: "",
      level: tiers.length > 0 ? Math.max(...tiers.map(t => t.level)) + 1 : 1,
      commissionRate: 0,
      requirements: {
        minimumClicks: 0,
        minimumConversions: 0,
        minimumEarnings: 0,
        minimumReferrals: 0,
        timePeriod: 30,
        otherRequirements: [],
      },
      benefits: {
        commissionRate: 0,
        bonusRate: 0,
        prioritySupport: false,
        customFeatures: [],
        exclusiveOffers: false,
        higherPayouts: false,
        marketingMaterials: false,
        dedicatedManager: false,
      },
      status: "ACTIVE",
    });
    setCreateDialogOpen(true);
  };

  const handleSaveTier = async () => {
    if (!formData.name.trim()) {
      toast.error("Please enter a tier name");
      return;
    }

    // Prepare data with defaults for empty/zero values
    const dataToSave = {
      ...formData,
      level: formData.level || 1, // Default to 1 if 0 or empty
      requirements: {
        ...formData.requirements,
        timePeriod: formData.requirements.timePeriod || 30, // Default to 30 if 0 or empty
      },
    };

    if (selectedTier) {
      // Update existing tier
      setIsSaving(true);
      try {
        const response = await fetch(
          `${config.apiUrl}/admin/tiers/${selectedTier.id}`,
          {
            method: "PATCH",
            headers: {
              ...getAuthHeaders(),
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dataToSave),
          }
        );

        if (response.ok) {
          toast.success("Tier updated successfully");
          setEditDialogOpen(false);
          fetchTiers();
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to update tier");
        }
      } catch (error) {
        console.error("Error updating tier:", error);
        toast.error("Failed to update tier");
      } finally {
        setIsSaving(false);
      }
    } else {
      // Create new tier
      setIsCreating(true);
      try {
        const response = await fetch(`${config.apiUrl}/admin/tiers`, {
          method: "POST",
          headers: {
            ...getAuthHeaders(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify(dataToSave),
        });

        if (response.ok) {
          toast.success("Tier created successfully");
          setCreateDialogOpen(false);
          fetchTiers();
        } else {
          const error = await response.json();
          toast.error(error.error || "Failed to create tier");
        }
      } catch (error) {
        console.error("Error creating tier:", error);
        toast.error("Failed to create tier");
      } finally {
        setIsCreating(false);
      }
    }
  };

  const handleDeleteTier = async (tierId: string) => {
    if (!confirm("Are you sure you want to delete this tier? This action cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${config.apiUrl}/admin/tiers/${tierId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success("Tier deleted successfully");
        fetchTiers();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete tier");
      }
    } catch (error) {
      console.error("Error deleting tier:", error);
      toast.error("Failed to delete tier");
    }
  };

  if (isLoading) {
    return <AdminLoading message="Loading tiers..." />;
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Manage Tiers</h1>
          <p className="text-muted-foreground">
            Configure tier names, requirements, and benefits
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleCreateTier}
            className="bg-orange-600 hover:bg-orange-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Tier
          </Button>
          <Button variant="outline" onClick={fetchTiers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tiers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tiers List</CardTitle>
          <CardDescription>
            {tiers.length} tier{tiers.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tiers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No tiers found. Create your first tier to get started.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Commission Rate</TableHead>
                    <TableHead>Requirements</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tiers
                    .sort((a, b) => a.level - b.level)
                    .map((tier) => (
                      <TableRow key={tier.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-orange-600" />
                            {tier.name}
                          </div>
                        </TableCell>
                        <TableCell>{tier.level}</TableCell>
                        <TableCell>{tier.commissionRate}%</TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {tier.requirements.minimumClicks > 0 && (
                              <div>Clicks: {tier.requirements.minimumClicks.toLocaleString()}</div>
                            )}
                            {tier.requirements.minimumConversions > 0 && (
                              <div>Conversions: {tier.requirements.minimumConversions}</div>
                            )}
                            {tier.requirements.minimumEarnings > 0 && (
                              <div>Earnings: ${tier.requirements.minimumEarnings.toLocaleString()}</div>
                            )}
                            {tier.requirements.minimumClicks === 0 &&
                              tier.requirements.minimumConversions === 0 &&
                              tier.requirements.minimumEarnings === 0 && (
                                <div className="text-muted-foreground">No requirements</div>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={tier.status === "ACTIVE" ? "default" : "secondary"}
                          >
                            {tier.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTier(tier)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTier(tier.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Tier Dialog */}
      <Dialog
        open={editDialogOpen || createDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          setCreateDialogOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTier ? "Edit Tier" : "Create New Tier"}
            </DialogTitle>
            <DialogDescription>
              {selectedTier
                ? "Update tier name, requirements, and benefits"
                : "Configure a new tier with custom requirements and benefits"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tier Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g., Tier XYZ, Gold, Silver"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="level">Level</Label>
                  <Input
                    id="level"
                    type="number"
                    min="1"
                    value={formData.level || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        level: val === "" ? 0 : parseInt(val) || 0,
                      });
                    }}
                    onBlur={(e) => {
                      // Set default to 1 if empty when user leaves the field
                      if (e.target.value === "" || formData.level === 0) {
                        setFormData({
                          ...formData,
                          level: 1,
                        });
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher level = higher tier
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Describe this tier..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                <Input
                  id="commissionRate"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.commissionRate || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({
                      ...formData,
                      commissionRate: val === "" ? 0 : parseFloat(val) || 0,
                    });
                  }}
                />
              </div>
            </div>

            {/* Requirements */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Requirements</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minClicks">Minimum Clicks</Label>
                  <Input
                    id="minClicks"
                    type="number"
                    min="0"
                    value={formData.requirements.minimumClicks || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        requirements: {
                          ...formData.requirements,
                          minimumClicks: val === "" ? 0 : parseInt(val) || 0,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minConversions">Minimum Conversions</Label>
                  <Input
                    id="minConversions"
                    type="number"
                    min="0"
                    value={formData.requirements.minimumConversions || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        requirements: {
                          ...formData.requirements,
                          minimumConversions: val === "" ? 0 : parseInt(val) || 0,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minEarnings">Minimum Earnings ($)</Label>
                  <Input
                    id="minEarnings"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.requirements.minimumEarnings || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        requirements: {
                          ...formData.requirements,
                          minimumEarnings: val === "" ? 0 : parseFloat(val) || 0,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="minReferrals">Minimum Referrals</Label>
                  <Input
                    id="minReferrals"
                    type="number"
                    min="0"
                    value={formData.requirements.minimumReferrals || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        requirements: {
                          ...formData.requirements,
                          minimumReferrals: val === "" ? 0 : parseInt(val) || 0,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timePeriod">Time Period (days)</Label>
                  <Input
                    id="timePeriod"
                    type="number"
                    min="1"
                    value={formData.requirements.timePeriod || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        requirements: {
                          ...formData.requirements,
                          timePeriod: val === "" ? 0 : parseInt(val) || 0,
                        },
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold">Benefits</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="benefitCommissionRate">Commission Rate (%)</Label>
                  <Input
                    id="benefitCommissionRate"
                    type="number"
                    min="0"
                    max="100"
                    value={formData.benefits.commissionRate || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          commissionRate: val === "" ? 0 : parseFloat(val) || 0,
                        },
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonusRate">Bonus Rate (%)</Label>
                  <Input
                    id="bonusRate"
                    type="number"
                    min="0"
                    value={formData.benefits.bonusRate || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          bonusRate: val === "" ? 0 : parseFloat(val) || 0,
                        },
                      });
                    }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="prioritySupport">Priority Support</Label>
                  <Switch
                    id="prioritySupport"
                    checked={formData.benefits.prioritySupport}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          prioritySupport: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="exclusiveOffers">Exclusive Offers</Label>
                  <Switch
                    id="exclusiveOffers"
                    checked={formData.benefits.exclusiveOffers}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          exclusiveOffers: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="higherPayouts">Higher Payouts</Label>
                  <Switch
                    id="higherPayouts"
                    checked={formData.benefits.higherPayouts}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          higherPayouts: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="marketingMaterials">Marketing Materials</Label>
                  <Switch
                    id="marketingMaterials"
                    checked={formData.benefits.marketingMaterials}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          marketingMaterials: checked,
                        },
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="dedicatedManager">Dedicated Manager</Label>
                  <Switch
                    id="dedicatedManager"
                    checked={formData.benefits.dedicatedManager}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        benefits: {
                          ...formData.benefits,
                          dedicatedManager: checked,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="status">Status</Label>
                <Switch
                  id="status"
                  checked={formData.status === "ACTIVE"}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      status: checked ? "ACTIVE" : "INACTIVE",
                    })
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {formData.status === "ACTIVE"
                  ? "Tier is active and can be assigned"
                  : "Tier is inactive and cannot be assigned"}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditDialogOpen(false);
                setCreateDialogOpen(false);
              }}
              disabled={isSaving || isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveTier}
              disabled={isSaving || isCreating}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {(isSaving || isCreating) && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              {isSaving || isCreating
                ? selectedTier
                  ? "Saving..."
                  : "Creating..."
                : selectedTier
                ? "Save Changes"
                : "Create Tier"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
