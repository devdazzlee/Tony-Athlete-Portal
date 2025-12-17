/**
 * Utility function to make fetch requests with Authorization header
 * Gets the token from localStorage and adds it to the request headers
 */

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get token from localStorage
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  // Merge headers
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Add Authorization header if token exists
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }

  // Make the request without credentials (using Authorization header instead)
  return fetch(url, {
    ...options,
    headers,
    credentials: "omit", // Don't send cookies
  });
}

/**
 * Helper to create fetch options with auth headers
 */
export function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return headers;
}
