"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { authClient, User, AuthResponse } from "@/lib/auth-client";
import { AuthLoading } from "@/components/ui/loading";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state from cookies
    const initializeAuth = async () => {
      try {
        const currentUser = authClient.getUser();
        if (currentUser) {
          setUser(currentUser);
        } else {
          // Try to refresh user data from server
          await refreshUser();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<AuthResponse> => {
    setIsLoading(true);
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

  const refreshUser = async (): Promise<void> => {
    try {
      const userData = await authClient.getProfile();
      console.log("✅ AuthContext.refreshUser - Received user data:", {
        id: userData.id,
        email: userData.email,
        avatar: userData.avatar,
      });

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
      console.log(
        "🔄 AuthContext.refreshUser - State updated with avatar:",
        userData.avatar
      );
    } catch (error) {
      console.error("Refresh user error:", error);

      // Try to load from localStorage as fallback
      const existingUser = authClient.getUser();
      if (existingUser && !user) {
        console.log("Loading user from localStorage after refresh error");
        setUser(existingUser);
      }

      // Only clear if we're certain the session is invalid (401/403 error)
      if (
        error instanceof Error &&
        (error.message.includes("authentication") ||
          error.message.includes("401") ||
          error.message.includes("403"))
      ) {
        console.log("Session invalid, clearing user");
        setUser(null);
        authClient.clearAuth();
      }
    }
  };

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
    isAuthenticated: !!user,
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
