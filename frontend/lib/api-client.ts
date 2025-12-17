import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { config } from "@/config/config";
import { toast } from "sonner";

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: config.apiUrl,
  withCredentials: false, // Using localStorage now
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 seconds
});

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
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response: any) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response as any;

      // Handle specific error cases
      switch (status) {
        case 401:
          // Unauthorized - redirect to login
          if (typeof window !== "undefined") {
            toast.error("Session expired. Please log in again.");
            setTimeout(() => {
              window.location.href = "/auth/login";
            }, 2000);
          }
          break;
        case 403:
          toast.error("Access denied. You don't have permission.");
          break;
        case 404:
          toast.error(data.error || "Resource not found");
          break;
        case 422:
          toast.error(data.error || "Invalid request data");
          break;
        case 429:
          toast.error("Too many requests. Please try again later.");
          break;
        case 500:
          toast.error("Server error. Please try again later.");
          break;
        default:
          toast.error(data.error || "An error occurred");
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
