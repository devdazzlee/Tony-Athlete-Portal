"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { config } from "@/config/config";

// Helper function to get full avatar URL (same as in dashboard layout)
const getAvatarUrl = (avatar: string | null | undefined): string => {
  console.log("getAvatarUrl called with:", avatar, "type:", typeof avatar);
  
  if (!avatar) {
    console.log("No avatar provided, using placeholder");
    return "/placeholder-avatar.jpg";
  }

  // If avatar is already a full URL (starts with http:// or https://), return as is
  if (avatar.startsWith("http://") || avatar.startsWith("https://")) {
    console.log("Avatar is full URL:", avatar);
    return avatar;
  }

  // If avatar is a relative path, construct full URL
  // Remove leading slash if present to avoid double slashes
  const cleanPath = avatar.startsWith("/") ? avatar.slice(1) : avatar;
  const baseUrl = config.apiUrl.replace("/api", "");
  const fullUrl = `${baseUrl}/${cleanPath}`;

  console.log("Constructed avatar URL:", fullUrl, "from avatar:", avatar);
  return fullUrl;
};

export default function AvatarDebugPage() {
  const { user, isLoading, refreshUser } = useAuth();

  const handleRefreshUser = async () => {
    console.log("Refreshing user data...");
    await refreshUser();
    console.log("User data refreshed");
  };

  const testAvatarUpload = async () => {
    // Create a test file
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#4F46E5';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = 'white';
      ctx.font = '20px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TEST', 50, 50);
    }
    
    canvas.toBlob(async (blob) => {
      if (blob) {
        const formData = new FormData();
        formData.append('avatar', blob, 'test-avatar.png');
        
        try {
          const response = await fetch(`${config.apiUrl}/upload/avatar`, {
            method: 'POST',
            credentials: 'include',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            console.log('Avatar upload response:', data);
            await refreshUser();
          } else {
            console.error('Avatar upload failed:', response.status);
          }
        } catch (error) {
          console.error('Avatar upload error:', error);
        }
      }
    });
  };

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
      <h1 className="text-3xl font-bold">Avatar Debug Page</h1>
      
      <div className="flex gap-4">
        <Button onClick={handleRefreshUser}>
          Refresh User Data
        </Button>
        <Button onClick={testAvatarUpload}>
          Upload Test Avatar
        </Button>
      </div>
      
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
            <strong>Raw Avatar:</strong> {user.avatar || "null/undefined"}
          </div>
          <div>
            <strong>Avatar Type:</strong> {typeof user.avatar}
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

      <Card>
        <CardHeader>
          <CardTitle>Raw User Data</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}




