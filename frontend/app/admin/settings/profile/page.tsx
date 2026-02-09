"use client";

import { useState, useEffect, useMemo } from "react";
import { ErrorState, AdminLoading } from "@/components/ui/loading";
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
  Building2,
  Save,
  RefreshCw,
  Upload,
  Camera,
  Trash2,
  Shield,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { config } from "@/config/config";
import { useAuth } from "@/contexts/AuthContext";
import apiClient from "@/lib/api-client";

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
  admin: {
    id: string;
    permissions: string[];
    department: string | null;
  } | null;
}

export default function AdminProfileSettingsPage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    department: "",
  });

  const avatarUrl = useMemo(() => {
    const avatar = profile?.user.avatar;
    if (!avatar) return "";

    if (/^https?:\/\//i.test(avatar)) {
      return avatar;
    }

    const apiBaseUrl = config.apiUrl.replace(/\/api\/?$/, "");
    const normalizedPath = avatar.startsWith("/") ? avatar : `/${avatar}`;

    return `${apiBaseUrl}${normalizedPath}`;
  }, [profile?.user.avatar]);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await apiClient.get("/admin/settings/profile");
      const data = response.data;
      setProfile(data);
      setFormData({
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        phone: data.user.phone || "",
        department: data.admin?.department || "",
      });
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
      await apiClient.put("/admin/settings/profile", formData);
      toast.success("Profile updated successfully");
      fetchProfile(); // Refresh profile data
      refreshUser(); // Refresh auth context
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to update profile"
      );
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
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      await apiClient.post("/admin/settings/profile/avatar", formData);
      toast.success("Avatar updated successfully");
      fetchProfile(); // Refresh profile data
      refreshUser(); // Refresh auth context
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to upload avatar"
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      await apiClient.delete("/admin/settings/profile/avatar");
      toast.success("Avatar removed successfully");
      fetchProfile(); // Refresh profile data
      refreshUser(); // Refresh auth context
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast.error(
        (error as any)?.response?.data?.error ||
          (error as any)?.response?.data?.message ||
          "Failed to remove avatar"
      );
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isLoading) {
    return <AdminLoading message="Loading profile settings..." />;
  }

  if (!profile) {
    return (
      <ErrorState
        title="Profile Not Found"
        message="Unable to load your profile information."
        actionText="Try Again"
        onAction={fetchProfile}
      />
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your admin profile information and preferences
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Shield className="h-3 w-3" />
          Admin
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Overview */}
        <div className="lg:col-span-1">
          <Card className="h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Overview
              </CardTitle>
              <CardDescription>
                Your current profile information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage
                        src={avatarUrl}
                      alt={`${profile.user.firstName} ${profile.user.lastName}`}
                    />
                    <AvatarFallback className="text-lg">
                      {profile.user.firstName?.[0]}
                      {profile.user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-2 -right-2 flex gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 w-8 p-0"
                      onClick={() =>
                        document.getElementById("avatar-upload")?.click()
                      }
                      disabled={isUploadingAvatar}
                    >
                      {isUploadingAvatar ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : (
                        <Camera className="h-3 w-3" />
                      )}
                    </Button>
                    {profile.user.avatar && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                        onClick={handleRemoveAvatar}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
                <div className="text-center">
                  <h3 className="font-semibold">
                    {profile.user.firstName} {profile.user.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {profile.user.email}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {profile.user.role}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{profile.user.email}</span>
                </div>
                {profile.user.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.user.phone}</span>
                  </div>
                )}
                {profile.admin?.department && (
                  <div className="flex items-center gap-3 text-sm">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{profile.admin.department}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Settings Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                Update your personal information and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) =>
                      handleInputChange("firstName", e.target.value)
                    }
                    placeholder="Enter your first name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) =>
                      handleInputChange("lastName", e.target.value)
                    }
                    placeholder="Enter your last name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="Enter your phone number"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) =>
                    handleInputChange("department", e.target.value)
                  }
                  placeholder="Enter your department"
                />
              </div>

              <Separator />

              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
