"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Globe,
  Plus,
  Copy,
  Check,
  Trash2,
  Shield,
  Edit,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";

interface Website {
  id: string;
  name: string;
  domain: string;
  websiteId: string; // This is the unique identifier for tracking
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  status: "ACTIVE" | "PAUSED" | "INACTIVE";
  createdBy?: string | null;
}

export default function AdminWebsitesSettingsPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    websiteId: string | null;
    websiteName: string | null;
  }>({ isOpen: false, websiteId: null, websiteName: null });
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    website: Website | null;
  }>({ isOpen: false, website: null });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    domain: "",
    description: "",
  });
  const [editFormData, setEditFormData] = useState({
    name: "",
    domain: "",
    description: "",
  });

  // Admin has full access - can create, edit, delete
  const isAdmin = true;

  useEffect(() => {
    loadWebsites();
  }, []);

  const loadWebsites = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${config.apiUrl}/websites`, {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to load websites: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.websites) {
        setWebsites(data.websites);
      } else {
        setWebsites([]);
      }
    } catch (error) {
      console.error("Error loading websites:", error);
      toast.error("Failed to load websites. Please try again.");
      setWebsites([]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateWebsiteId = (domain?: string): string => {
    if (domain) {
      // Convert domain to websiteId format
      return domain
        .replace(/\./g, "-")
        .replace(/https?:\/\//, "")
        .replace(/^www\./, "")
        .toLowerCase();
    }
    // Generate UUID-like ID
    return (
      "website-" +
      Math.random().toString(36).substr(2, 9) +
      "-" +
      Date.now().toString(36)
    );
  };

  const handleCreateWebsite = async () => {
    if (!formData.name || !formData.domain) {
      toast.error("Please fill in name and domain");
      return;
    }

    try {
      const websiteId = generateWebsiteId(formData.domain);
      const response = await fetch(`${config.apiUrl}/websites`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: formData.name,
          domain: formData.domain,
          websiteId: websiteId,
          description: formData.description || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create website");
      }
      if (data.success && data.website) {
        // Reload websites from API
        await loadWebsites();
        setFormData({ name: "", domain: "", description: "" });
        setShowCreateForm(false);
        toast.success("Website created successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Error creating website:", error);
      toast.error(
        error.message || "Failed to create website. Please try again."
      );
    }
  };

  const handleDeleteClick = (id: string, name: string) => {
    setDeleteModal({ isOpen: true, websiteId: id, websiteName: name });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.websiteId) return;

    setIsDeleting(true);
    try {
      const response = await fetch(
        `${config.apiUrl}/websites/${deleteModal.websiteId}`,
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete website");
      }

      // Reload websites from API
      await loadWebsites();
      setDeleteModal({ isOpen: false, websiteId: null, websiteName: null });
      toast.success("Website deleted successfully");
    } catch (error: any) {
      console.error("Error deleting website:", error);
      toast.error(
        error.message || "Failed to delete website. Please try again."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (website: Website) => {
    setEditFormData({
      name: website.name,
      domain: website.domain,
      description: website.description || "",
    });
    setEditModal({ isOpen: true, website });
  };

  const handleUpdateWebsite = async () => {
    if (!editModal.website || !editFormData.name || !editFormData.domain) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsEditing(true);
    try {
      const response = await fetch(
        `${config.apiUrl}/websites/${editModal.website.id}`,
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            name: editFormData.name,
            domain: editFormData.domain,
            description: editFormData.description || undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update website");
      }

      if (data.success && data.website) {
        await loadWebsites();
        setEditModal({ isOpen: false, website: null });
        setEditFormData({ name: "", domain: "", description: "" });
        toast.success("Website updated successfully!");
      } else {
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      console.error("Error updating website:", error);
      toast.error(
        error.message || "Failed to update website. Please try again."
      );
    } finally {
      setIsEditing(false);
    }
  };

  const handleCopyWebsiteId = (websiteId: string) => {
    navigator.clipboard.writeText(websiteId);
    setCopiedId(websiteId);
    toast.success("Website ID copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const copyEnvVariable = (websiteId: string) => {
    const envVar = `NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=${websiteId}`;
    navigator.clipboard.writeText(envVar);
    toast.success("Environment variable copied!");
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold">Manage Websites</h1>
            <p className="text-muted-foreground mt-2 text-sm sm:text-base">
              Create and manage all websites. Full admin access to create, edit,
              and delete websites.
            </p>
          </div>
          <Badge
            variant="default"
            className="flex items-center gap-2 bg-green-600 w-fit"
          >
            <Shield className="h-3 w-3" />
            Admin - Full Access
          </Badge>
        </div>

        {/* Create New Website */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle>Your Websites</CardTitle>
                <CardDescription>
                  Manage your websites and get their IDs for integration
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Website
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {showCreateForm && (
              <div className="mb-6 p-4 border rounded-lg space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Website Name *</Label>
                  <Input
                    id="name"
                    placeholder="My E-commerce Store"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain *</Label>
                  <Input
                    id="domain"
                    placeholder="https://licorice4good.com or licorice4good.com"
                    value={formData.domain}
                    onChange={(e) =>
                      setFormData({ ...formData, domain: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter full URL (e.g., https://licorice4good.com) or domain
                    name. Full URL will be preserved.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Main production store"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateWebsite}>Create Website</Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ name: "", domain: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {/* Websites List */}
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading websites...
              </div>
            ) : websites.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No websites yet. Click "Add Website" to create one.
              </div>
            ) : (
              <div className="space-y-4">
                {websites.map((website) => (
                  <Card key={website.id} className="border">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 space-y-3 min-w-0">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <Globe className="h-5 w-5 text-muted-foreground shrink-0" />
                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-base sm:text-lg truncate">
                                  {website.name}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {website.domain}
                                </p>
                              </div>
                            </div>
                            <Badge
                              variant={
                                website.status === "ACTIVE"
                                  ? "default"
                                  : "secondary"
                              }
                              className="w-fit shrink-0"
                            >
                              {website.status}
                            </Badge>
                          </div>

                          {website.description && (
                            <p className="text-sm text-muted-foreground">
                              {website.description}
                            </p>
                          )}

                          <Separator />

                          {/* Website ID Display */}
                          <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <Label className="text-sm font-semibold">
                                Website ID:
                              </Label>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopyWebsiteId(website.websiteId)
                                }
                                className="w-fit"
                              >
                                {copiedId === website.websiteId ? (
                                  <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Copied!
                                  </>
                                ) : (
                                  <>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Copy ID
                                  </>
                                )}
                              </Button>
                            </div>
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono break-all">
                                {website.websiteId}
                              </code>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyEnvVariable(website.websiteId)}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy ENV Variable
                            </Button>
                          </div>

                          {/* Integration Instructions */}
                          <div className="mt-4 p-4 bg-muted rounded-lg">
                            <p className="text-sm font-semibold mb-2">
                              Integration Steps:
                            </p>
                            <ol className="text-xs space-y-1 text-muted-foreground list-decimal list-inside">
                              <li>
                                Create <code>.env.local</code> in your Next.js
                                project
                              </li>
                              <li>
                                Add:{" "}
                                <code>
                                  NEXT_PUBLIC_TRACKDESK_WEBSITE_ID=
                                  {website.websiteId}
                                </code>
                              </li>
                              <li>
                                Add:{" "}
                                <code>
                                  NEXT_PUBLIC_TRACKDESK_API_URL=http://localhost:3003/api
                                </code>
                              </li>
                              <li>Restart your Next.js dev server</li>
                            </ol>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-end sm:items-start gap-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(website)}
                            className="hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleDeleteClick(website.id, website.name)
                            }
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Delete</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Website Modal */}
        <Dialog
          open={editModal.isOpen}
          onOpenChange={(open) =>
            setEditModal({
              isOpen: open,
              website: open ? editModal.website : null,
            })
          }
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Website</DialogTitle>
              <DialogDescription>
                Update website information. Changes will be saved immediately.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editName">Website Name *</Label>
                <Input
                  id="editName"
                  placeholder="My E-commerce Store"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDomain">Domain *</Label>
                <Input
                  id="editDomain"
                  placeholder="https://licorice4good.com or licorice4good.com"
                  value={editFormData.domain}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, domain: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Enter full URL (e.g., https://licorice4good.com) or domain
                  name. Full URL will be preserved.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editDescription">Description (Optional)</Label>
                <Textarea
                  id="editDescription"
                  placeholder="Main production store"
                  value={editFormData.description}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      description: e.target.value,
                    })
                  }
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setEditModal({ isOpen: false, website: null });
                  setEditFormData({ name: "", domain: "", description: "" });
                }}
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button onClick={handleUpdateWebsite} disabled={isEditing}>
                {isEditing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Update Website
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
              websiteId: null,
              websiteName: null,
            })
          }
          onConfirm={handleDeleteConfirm}
          title="Delete Website?"
          message="Are you sure you want to delete this website?"
          itemName={deleteModal.websiteName || undefined}
          description="This action cannot be undone. All associated tracking data will be permanently removed."
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
}
