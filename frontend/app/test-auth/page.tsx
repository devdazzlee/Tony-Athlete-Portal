"use client";

import { useAuth } from "@/contexts/AuthContext";
import { authClient } from "@/lib/auth-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestAuthPage() {
  const { user, isAuthenticated, isLoading } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test Page</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Auth Context Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Loading:</strong> {isLoading ? "Yes" : "No"}
              </p>
              <p>
                <strong>Authenticated:</strong> {isAuthenticated ? "Yes" : "No"}
              </p>
              <p>
                <strong>User:</strong>{" "}
                {user ? user.firstName + " " + user.lastName : "None"}
              </p>
              <p>
                <strong>Role:</strong> {user?.role || "None"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Auth Client Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p>
                <strong>Authenticated:</strong>{" "}
                {authClient.isAuthenticated() ? "Yes" : "No"}
              </p>
              <p>
                <strong>Has Token:</strong>{" "}
                {authClient.getToken() ? "Yes" : "No"}
              </p>
              <p>
                <strong>User:</strong>{" "}
                {authClient.getUser()?.firstName || "None"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Cookie Information</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
              {typeof document !== "undefined"
                ? document.cookie
                : "Server-side rendering"}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
