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

async function refreshTokens(): Promise<RefreshResponse> {
  if (typeof window === "undefined") {
    throw new Error("Cannot refresh tokens on server");
  }

  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) {
    throw new Error("No refresh token");
  }

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
    throw new Error("Refresh failed");
  }

  localStorage.setItem("accessToken", data.token);
  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
  }

  return data;
}

// Request interceptor - Add auth token from localStorage
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // When sending FormData (file uploads), remove the Content-Type header
    // so axios/browser can automatically set it to multipart/form-data with
    // the correct boundary. Without this, the hardcoded "application/json"
    // default prevents multer from parsing the file on the backend.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
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
          if (
            typeof window !== "undefined" &&
            (refreshAttemptedAndFailed || !hasRefreshToken)
          ) {
            // Dispatch a custom event for AuthContext to handle
            window.dispatchEvent(new CustomEvent("auth:session-expired"));
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
