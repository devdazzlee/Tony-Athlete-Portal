import { getServerUser, getServerToken } from "@/lib/auth-server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mark this route as dynamic since it uses cookies
export const dynamic = "force-dynamic";

export default async function TestServerAuthPage() {
  const user = await getServerUser();
  const token = await getServerToken();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">
          Server Authentication Test Page
        </h1>

        <Card>
          <CardHeader>
            <CardTitle>Server-Side Authentication Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p>
                <strong>Has Token:</strong> {token ? "Yes" : "No"}
              </p>
              <p>
                <strong>Token (first 20 chars):</strong>{" "}
                {token ? token.substring(0, 20) + "..." : "None"}
              </p>
            </div>

            <div>
              <p>
                <strong>User:</strong>{" "}
                {user ? user.firstName + " " + user.lastName : "None"}
              </p>
              <p>
                <strong>Email:</strong> {user?.email || "None"}
              </p>
              <p>
                <strong>Role:</strong> {user?.role || "None"}
              </p>
            </div>

            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">Raw User Data:</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
