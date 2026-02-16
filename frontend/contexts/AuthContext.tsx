"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { authClient, User, AuthResponse } from "@/lib/auth-client";
import { AuthLoading } from "@/components/ui/loading";
import { config } from "@/config/config";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasToken: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean
  ) => Promise<AuthResponse>;
  register: (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "ADMIN" | "AFFILIATE" | "MANAGER";
  }) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  // Pre-load user from localStorage synchronously to avoid flash
  const [user, setUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      return authClient.getUser();
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);
  // Track if we're currently refreshing auth to prevent premature logout
  const isRefreshingRef = useRef(false);
  const sessionExpiredHandled = useRef(false);

  // Listen for definitive session expiry from the API interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      // Only handle once to prevent loops
      if (sessionExpiredHandled.current) return;
      // Don't handle if we're in the middle of initialization/refresh
      if (isRefreshingRef.current) return;

      sessionExpiredHandled.current = true;
      console.log("Session expired event received — logging out");
      setUser(null);
      authClient.clearAuth();
      setIsLoading(false);

      // Give React a tick to update state before navigating
      setTimeout(() => {
        if (typeof window !== "undefined") {
          window.location.href = "/auth/login";
        }
      }, 100);
    };

    window.addEventListener("auth:session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("auth:session-expired", handleSessionExpired);
    };
  }, []);

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const currentUser = authClient.getUser();
        const token = authClient.getToken();

        if (currentUser) {
          // Set user from localStorage immediately (already set via useState init,
          // but ensure it's current)
          setUser(currentUser);
        }

        if (token) {
          // Mark that we're refreshing — prevents session-expired handler
          // from triggering during the interceptor's token refresh
          isRefreshingRef.current = true;
          sessionExpiredHandled.current = false;

          try {
            const userData = await authClient.getProfile();

            // Validate required fields
            if (
              userData?.id &&
              userData?.email &&
              userData?.firstName &&
              userData?.lastName
            ) {
              setUser(userData);
            } else if (currentUser) {
              // Profile returned incomplete data — keep localStorage user
              console.warn("Profile returned incomplete data, keeping cached user");
              setUser(currentUser);
            }
          } catch (error) {
            console.error("Profile refresh during init failed:", error);

            const status = (error as any)?.response?.status as number | undefined;

            if (status === 401 || status === 403) {
              // The interceptor already tried to refresh the token and failed.
              // This is a definitive auth failure — clear everything.
              console.log("Session definitively invalid during init, clearing auth");
              setUser(null);
              authClient.clearAuth();
            } else {
              // Network error or server error — keep the cached user so the
              // user isn't kicked out due to a transient issue.
              if (currentUser) {
                console.log("Keeping cached user after non-auth error during init");
                setUser(currentUser);
              }
            }
          } finally {
            isRefreshingRef.current = false;
          }
        } else if (!currentUser) {
          setUser(null);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        // Only clear user if we don't have a cached one
        const cachedUser = authClient.getUser();
        if (!cachedUser) {
          setUser(null);
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Periodic token refresh to keep session alive even when idle
  useEffect(() => {
    if (!user) return; // Only run if user is logged in

    const checkAndRefreshToken = async () => {
      const token = authClient.getToken();
      const refreshToken = localStorage.getItem("refreshToken");
      
      if (!token || !refreshToken) return;

      try {
        // Decode token to check expiration
        const parts = token.split(".");
        if (parts.length !== 3) return;
        
        const payload = JSON.parse(atob(parts[1]));
        const expiration = payload.exp ? payload.exp * 1000 : null;
        
        if (!expiration) return;
        
        const now = Date.now();
        const timeUntilExpiry = expiration - now;
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes
        
        // Refresh if token expires within 5 minutes
        if (timeUntilExpiry <= fiveMinutes && timeUntilExpiry > 0) {
          isRefreshingRef.current = true;
          
          try {
            const response = await fetch(`${config.apiUrl}/auth/refresh`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ refreshToken }),
            });

            if (response.ok) {
              const data = await response.json();
              if (data.token) {
                localStorage.setItem("accessToken", data.token);
                if (data.refreshToken) {
                  localStorage.setItem("refreshToken", data.refreshToken);
                }
                console.log("Token refreshed proactively");
              }
            }
          } catch (error) {
            console.error("Periodic token refresh failed:", error);
          } finally {
            isRefreshingRef.current = false;
          }
        }
      } catch (error) {
        console.error("Error checking token expiration:", error);
      }
    };

    // Check every 2 minutes
    const interval = setInterval(checkAndRefreshToken, 2 * 60 * 1000);
    
    // Also check immediately
    checkAndRefreshToken();

    return () => clearInterval(interval);
  }, [user]);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<AuthResponse> => {
    setIsLoading(true);
    sessionExpiredHandled.current = false;
    try {
      const response = await authClient.login(email, password, rememberMe);
      setUser(response.user);
      return response;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "ADMIN" | "AFFILIATE" | "MANAGER";
  }): Promise<AuthResponse> => {
    setIsLoading(true);
    try {
      const response = await authClient.register(userData);
      setUser(response.user);
      return response;
    } catch (error) {
      setUser(null);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    setIsLoading(true);
    try {
      await authClient.logout();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setUser(null);
      setIsLoading(false);
      // Force a page refresh to ensure all state is cleared
      if (typeof window !== "undefined") {
        window.location.href = "/";
      }
    }
  };

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      isRefreshingRef.current = true;
      const userData = await authClient.getProfile();

      // Validate that we received the required user fields
      if (
        !userData ||
        !userData.id ||
        !userData.email ||
        !userData.firstName ||
        !userData.lastName
      ) {
        console.error("Invalid user data received:", userData);
        throw new Error("Invalid user data structure");
      }

      // Update state - token is already in localStorage from getProfile
      setUser(userData);
    } catch (error) {
      console.error("Refresh user error:", error);

      const status = (error as any)?.response?.status as number | undefined;

      // If request failed due to auth (and interceptor couldn't refresh),
      // clear auth state
      if (status === 401 || status === 403) {
        console.log("Session invalid during refresh, clearing user");
        setUser(null);
        authClient.clearAuth();
        return;
      }

      // For non-auth errors (network, server errors), keep the existing user
      // from localStorage so the user isn't unexpectedly logged out
      const existingUser = authClient.getUser();
      if (existingUser) {
        setUser(existingUser);
      }
    } finally {
      isRefreshingRef.current = false;
    }
  }, []);

  const updateUser = (userData: Partial<User>): void => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      // Update localStorage with new user data
      authClient.setAuth(authClient.getToken() || "", updatedUser);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && !!authClient.getToken(),
    hasToken: !!authClient.getToken(),
    login,
    register,
    logout,
    refreshUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Higher-order component for protecting routes
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[]
) {
  return function AuthenticatedComponent(props: P) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
      return <AuthLoading message="Authenticating..." />;
    }

    if (!user) {
      // Redirect to login - this should be handled by middleware or router
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Authentication Required
            </h2>
            <p className="text-gray-600 mb-6">
              Please log in to access this page.
            </p>
            <a
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Login
            </a>
          </div>
        </div>
      );
    }

    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 mb-6">
              You don't have permission to access this page.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}

// Hook for role-based access control
export function useRole() {
  const { user } = useAuth();

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const hasAnyRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  const isAdmin = (): boolean => {
    return user?.role === "ADMIN" || user?.role === "MANAGER";
  };

  const isAffiliate = (): boolean => {
    return user?.role === "AFFILIATE";
  };

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    isAffiliate,
    role: user?.role || null,
  };
}
