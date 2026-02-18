import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { config } from "@/config/config";
import { toast } from "sonner";

interface RefreshResponse {
  token: string;
  refreshToken?: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
  code?: string;
}

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: config.apiUrl,
  withCredentials: false, // Using localStorage now
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

let refreshPromise: Promise<RefreshResponse> | null = null;

// Utility function to decode JWT token and get expiration time
function getTokenExpiration(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(atob(parts[1]));
    return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
  } catch (error) {
    console.error("Error decoding token:", error);
    return null;
  }
}

// Check if token is expired or will expire soon (within 2 minutes)
function isTokenExpiringSoon(token: string | null): boolean {
  if (!token) return true;
  
  const expiration = getTokenExpiration(token);
  if (!expiration) return true; // If we can't decode, assume expired
  
  const now = Date.now();
  const timeUntilExpiry = expiration - now;
  const twoMinutes = 2 * 60 * 1000; // 2 minutes in milliseconds
  
  // Return true if token expires within 2 minutes or is already expired
  return timeUntilExpiry <= twoMinutes;
}

async function refreshTokens(): Promise<RefreshResponse> {
  if (typeof window === "undefined") {
    throw new Error("Cannot refresh tokens on server");
  }

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    console.error("No refresh token found in localStorage");
    throw new Error("No refresh token");
  }

  console.log("Attempting to refresh token...");

  try {
    // Use a bare axios call to avoid interceptor loops
    const response = await axios.post<RefreshResponse>(
      `${config.apiUrl}/auth/refresh`,
      { refreshToken },
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const data = response.data;
    if (!data?.token) {
      console.error("Refresh response missing token", data);
      throw new Error("Refresh failed - no token in response");
    }

    console.log("Token refreshed successfully");
    localStorage.setItem("accessToken", data.token);
    
    // Always update refreshToken if provided, otherwise keep the existing one
    if (data.refreshToken) {
      localStorage.setItem("refreshToken", data.refreshToken);
      console.log("Refresh token updated");
    } else {
      console.warn("No new refresh token in response, keeping existing one");
    }

    return data;
  } catch (error: any) {
    console.error("Token refresh error:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    });
    
    // If refresh token is invalid/expired, clear auth to force re-login
    if (error.response?.status === 401 || error.response?.data?.code === "TOKEN_EXPIRED") {
      console.log("Refresh token expired, clearing auth");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userData");
    }
    
    throw error;
  }
}

// Request interceptor - Add auth token from localStorage and proactively refresh if needed
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    if (typeof window !== "undefined") {
      let token = localStorage.getItem("accessToken");
      const refreshToken = localStorage.getItem("refreshToken");
      
      // Proactively refresh token if it's expiring soon (within 2 minutes)
      if (token && refreshToken && isTokenExpiringSoon(token)) {
        const isRefreshCall =
          typeof config.url === "string" && config.url.includes("/auth/refresh");
        const isLoginCall =
          typeof config.url === "string" && config.url.includes("/auth/login");
        
        // Don't refresh if this is already a refresh or login call
        if (!isRefreshCall && !isLoginCall) {
          try {
            if (!refreshPromise) {
              refreshPromise = refreshTokens().finally(() => {
                refreshPromise = null;
              });
            }
            const refreshed = await refreshPromise;
            token = refreshed.token;
          } catch (error) {
            console.error("Proactive token refresh failed:", error);
            // Continue with existing token - will fail and trigger reactive refresh
          }
        }
      }
      
      // Set Authorization header - ensure headers object exists
      if (token) {
        if (!config.headers) {
          config.headers = {} as any;
        }
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // When sending FormData (file uploads), remove the Content-Type header
    // so axios/browser can automatically set it to multipart/form-data with
    // the correct boundary. Without this, the hardcoded "application/json"
    // default prevents multer from parsing the file on the backend.
    // IMPORTANT: Only delete Content-Type, keep Authorization header!
    if (config.data instanceof FormData) {
      // Ensure headers object exists
      if (!config.headers) {
        config.headers = {} as any;
      }
      
      // Preserve Authorization header before deleting Content-Type
      const authHeader = config.headers.Authorization;
      
      // Delete Content-Type to let browser set multipart/form-data with boundary
      delete (config.headers as any)["Content-Type"];
      
      // Restore Authorization header if it was set
      if (authHeader) {
        config.headers.Authorization = authHeader;
      }
      
      // Log for debugging
      console.log("FormData request - Authorization header:", config.headers.Authorization ? "Present" : "Missing");
    }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  async (error: AxiosError<ApiErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    let refreshAttemptedAndFailed = false;
    
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      const hasRefreshToken =
        typeof window !== "undefined" && !!localStorage.getItem("refreshToken");

      // Attempt token refresh once on ANY 401 when we have a refresh token
      // (don't restrict to TOKEN_EXPIRED — server may return different codes)
      if (
        status === 401 &&
        typeof window !== "undefined" &&
        hasRefreshToken
      ) {
        const isRefreshCall =
          typeof originalRequest?.url === "string" &&
          originalRequest.url.includes("/auth/refresh");
        const isLoginCall =
          typeof originalRequest?.url === "string" &&
          originalRequest.url.includes("/auth/login");
        const alreadyRetried = !!originalRequest?._retry;

        if (!isRefreshCall && !isLoginCall && !alreadyRetried) {
          originalRequest._retry = true;

          try {
            if (!refreshPromise) {
              refreshPromise = refreshTokens().finally(() => {
                refreshPromise = null;
              });
            }
            const refreshed = await refreshPromise;

            originalRequest.headers.Authorization = `Bearer ${refreshed.token}`;
            return apiClient(originalRequest);
          } catch (e) {
            // Refresh failed - fall through to error handling
            refreshAttemptedAndFailed = true;
          }
        }
      }

      // Handle specific error cases
      switch (status) {
        case 401:
          // Don't redirect from here — let AuthContext handle navigation.
          // Only dispatch an event so AuthContext can react appropriately.
          // Only show session expired if refresh was attempted and failed, or no refresh token exists
          if (
            typeof window !== "undefined" &&
            (refreshAttemptedAndFailed || !hasRefreshToken)
          ) {
            // Check if this is a "Session expired" error specifically
            const errorMessage = data?.error || "";
            const isSessionExpired = errorMessage.toLowerCase().includes("session expired") || 
                                     errorMessage.toLowerCase().includes("token expired") ||
                                     data?.code === "TOKEN_EXPIRED";
            
            if (isSessionExpired) {
              // Only dispatch session expired event if it's actually expired
              // Don't show toast here - let AuthContext handle it
              window.dispatchEvent(new CustomEvent("auth:session-expired"));
            } else {
              // For other 401 errors, show a toast
              toast.error(errorMessage || "Authentication failed");
            }
          }
          break;
        case 403:
          toast.error("Access denied. You don't have permission.");
          break;
        case 404:
          toast.error(data?.error || "Resource not found");
          break;
        case 422:
          toast.error(data?.error || "Invalid request data");
          break;
        case 429:
          toast.error("Too many requests. Please try again later.");
          break;
        case 500:
          toast.error("Server error. Please try again later.");
          break;
        default:
          toast.error(data?.error || data?.message || "An error occurred");
      }
    } else if (error.request) {
      // Request was made but no response received
      toast.error("Network error. Please check your connection.");
    } else {
      // Something else happened
      toast.error("An unexpected error occurred");
    }

    return Promise.reject(error);
  }
);

export default apiClient;
