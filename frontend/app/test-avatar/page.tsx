"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { config } from "@/config/config";

// Helper function to get full avatar URL (same as in dashboard layout)
const getAvatarUrl = (avatar: string | null | undefined): string => {
  if (!avatar) {
    return "/placeholder-avatar.jpg";
  }

  // If avatar is already a full URL (starts with http:// or https://), return as is
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    return avatar;
  }

  // If avatar is a relative path, construct full URL
  // Remove leading slash if present to avoid double slashes
  const cleanPath = avatar.startsWith("/") ? avatar.slice(1) : avatar;
  const baseUrl = config.apiUrl.replace("/api", "");
  const fullUrl = `${baseUrl}/${cleanPath}`;

  return fullUrl;
};

export default function TestAvatarPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Not Authenticated</h2>
          <p>Please log in to test avatar display.</p>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl(user.avatar);

  return (
    <div className="container mx-auto p-8 space-y-6">
      <h1 className="text-3xl font-bold">Avatar Test Page</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>Name:</strong> {user.firstName} {user.lastName}
          </div>
          <div>
            <strong>Email:</strong> {user.email}
          </div>
          <div>
            <strong>Role:</strong> {user.role}
          </div>
          <div>
            <strong>Raw Avatar:</strong> {user.avatar || "null"}
          </div>
          <div>
            <strong>Processed Avatar URL:</strong> {avatarUrl}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Avatar Display Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="font-semibold mb-2">Small Avatar (Header/Sidebar Size)</h3>
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Medium Avatar</h3>
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-lg">{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Large Avatar (Profile Size)</h3>
              <Avatar className="h-24 w-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-2xl">{user.firstName?.charAt(0)}{user.lastName?.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Direct Image Test</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Direct Image URL:</strong></p>
            <img 
              src={avatarUrl} 
              alt="Avatar" 
              className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              onError={(e) => {
                console.log("Image failed to load:", e);
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => console.log("Image loaded successfully")}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}




