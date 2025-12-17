"use client";

import { useState, useEffect } from "react";
import { DataLoading, ErrorState } from "@/components/ui/loading";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  Save,
  RefreshCw,
  Upload,
  Camera,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { useAuth } from "@/contexts/AuthContext";
import { getAuthHeaders } from "@/lib/getAuthHeaders";
import { DeleteConfirmationModal } from "@/components/modals/delete-confirmation-modal";

interface UserProfile {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    avatar: string | null;
    createdAt: Date;
    role: string;
  };
  affiliate: {
    id: string;
    companyName: string;
    website: string;
    tier: string;
    status: string;
  } | null;
}

export default function ProfileSettingsPage() {
  const { refreshUser, updateUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [deleteAvatarModal, setDeleteAvatarModal] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    companyName: "",
    website: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch(`${config.apiUrl}/settings/profile`, {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("🚀 ~ fetchProfile ~ data:", data);
        setProfile(data);
        setFormData({
          firstName: data.user.firstName || "",
          lastName: data.user.lastName || "",
          phone: data.user.phone || "",
          companyName: data.affiliate?.companyName || "",
          website: data.affiliate?.website || "",
        });
      } else {
        console.error("Failed to fetch profile:", response.status);
        toast.error("Failed to load profile");
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast.error("Failed to load profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`${config.apiUrl}/settings/profile`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success("Profile updated successfully");
        await fetchProfile(); // Refresh profile data

        // Optimistically update auth context so sidebar/header reflects changes immediately
        updateUser({
          firstName: formData.firstName,
          lastName: formData.lastName,
        });

        await refreshUser(); // Ensure context and storage stay in sync
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    toast.loading("Uploading avatar...", { id: "avatar-upload" });

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;

      const response = await fetch(`${config.apiUrl}/upload/avatar`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Avatar uploaded successfully!", { id: "avatar-upload" });

        // Refresh profile to show new avatar in this page
        await fetchProfile();

        // Update auth context immediately
        updateUser({ avatar: data.url });

        // Ensure global state/localStorage stay synchronized
        await refreshUser();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to upload avatar", {
          id: "avatar-upload",
        });
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error("Failed to upload avatar", { id: "avatar-upload" });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleDeleteAvatarClick = () => {
    if (!profile?.user.avatar) return;
    setDeleteAvatarModal(true);
  };

  const handleDeleteAvatarConfirm = async () => {
    if (!profile?.user.avatar) return;

    setIsDeletingAvatar(true);
    toast.loading("Deleting avatar...", { id: "avatar-delete" });

    try {
      const response = await fetch(`${config.apiUrl}/upload/avatar`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        toast.success("Avatar deleted successfully!", { id: "avatar-delete" });
        setDeleteAvatarModal(false);
        fetchProfile(); // Refresh profile
        await refreshUser(); // Refresh auth context to update navbar/sidebar
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete avatar", {
          id: "avatar-delete",
        });
      }
    } catch (error) {
      console.error("Error deleting avatar:", error);
      toast.error("Failed to delete avatar", { id: "avatar-delete" });
    } finally {
      setIsDeletingAvatar(false);
    }
  };

  if (isLoading) {
    return <DataLoading message="Loading profile..." />;
  }

  if (!profile) {
    return (
      <ErrorState
        title="Unable to Load Profile"
        message="Failed to load your profile information."
        actionText="Try Again"
        onAction={fetchProfile}
      />
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Profile Settings</h1>
        <p className="text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      {/* Profile Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
          <CardDescription>Your account information and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 ring-4 ring-white shadow-lg">
                <AvatarImage
                  src={profile.user.avatar || undefined}
                  alt={`${profile.user.firstName} ${profile.user.lastName}`}
                />
                <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                  {profile.user.firstName?.charAt(0)}
                  {profile.user.lastName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Camera className="h-8 w-8 text-white" />
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                  />
                </label>
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold mb-2">
                {profile.user.firstName} {profile.user.lastName}
              </h2>
              <p className="text-muted-foreground mb-3">{profile.user.email}</p>
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start mb-3">
                <Badge>{profile.user.role}</Badge>
                {profile.affiliate && (
                  <>
                    <Badge variant="outline">
                      {profile.affiliate.tier} Tier
                    </Badge>
                    <Badge
                      className={
                        profile.affiliate.status === "ACTIVE"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }
                    >
                      {profile.affiliate.status}
                    </Badge>
                  </>
                )}
              </div>
              <div className="flex gap-2 justify-center sm:justify-start">
                <label htmlFor="avatar-upload-btn">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploadingAvatar}
                    onClick={() =>
                      document.getElementById("avatar-upload")?.click()
                    }
                    type="button"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploadingAvatar ? "Uploading..." : "Upload Photo"}
                  </Button>
                </label>
                {profile.user.avatar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDeleteAvatarClick}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData({ ...formData, firstName: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData({ ...formData, lastName: e.target.value })
                  }
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                value={profile.user.email}
                disabled
                className="pl-10 bg-muted"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Email cannot be changed. Contact support if needed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="pl-10"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="w-4 h-4 mr-2" />
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Delete Avatar Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteAvatarModal}
        onClose={() => setDeleteAvatarModal(false)}
        onConfirm={handleDeleteAvatarConfirm}
        title="Delete Profile Picture?"
        message="Are you sure you want to delete your profile picture?"
        description="This action cannot be undone. Your profile picture will be removed and the default placeholder will be shown."
        isLoading={isDeletingAvatar}
      />
    </div>
  );
}
