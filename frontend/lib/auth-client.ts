// Client-side authentication utilities
// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "AFFILIATE" | "MANAGER";
  avatar: string | null;
}

export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

// API Configuration - Use Next.js API routes to avoid CORS issues
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

// localStorage keys
const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  USER_DATA: "userData",
} as const;

// Client-side authentication utilities
export class AuthClient {
  private static instance: AuthClient;
  private user: User | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      this.loadUserFromStorage();
    }
  }

  public static getInstance(): AuthClient {
    if (!AuthClient.instance) {
      AuthClient.instance = new AuthClient();
    }
    return AuthClient.instance;
  }

  private loadUserFromStorage(): void {
    try {
      const userData = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      if (userData) {
        this.user = JSON.parse(userData);
      }
    } catch (error) {
      console.error("Error loading user from localStorage:", error);
      this.user = null;
    }
  }

  public getUser(): User | null {
    // Always try to reload from localStorage if user is null
    if (!this.user && typeof window !== "undefined") {
      this.loadUserFromStorage();
    }
    return this.user;
  }

  public reloadUserFromStorage(): void {
    this.loadUserFromStorage();
  }

  public isAuthenticated(): boolean {
    // Check if we have user data and a token
    return !!this.user && !!this.getToken();
  }

  public getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  public setAuth(token: string, user: User): void {
    this.user = user;

    // Store in localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    }
  }

  public clearAuth(): void {
    console.log("Clearing authentication from localStorage...");
    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
    this.user = null;
    console.log("Authentication cleared");
  }

  private getHeaders(): Record<string, string> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  public async login(
    email: string,
    password: string,
    rememberMe: boolean = false
  ): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store token and user in localStorage
      this.setAuth(data.token, data.user);

      return data;
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  }

  public async register(userData: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role?: "ADMIN" | "AFFILIATE" | "MANAGER";
  }): Promise<AuthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Store in localStorage if token is returned
      if (data.token && data.user) {
        this.setAuth(data.token, data.user);
      }

      return data;
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  }

  public async logout(): Promise<void> {
    try {
      const token = this.getToken();

      // Call the logout API with the token in the header
      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Logout API error:", response.statusText, errorText);
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      this.clearAuth();
    }
  }

  public async getProfile(): Promise<User> {
    try {
      const token = this.getToken();

      if (!token) {
        throw new Error("No authentication token found");
      }

      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "Failed to fetch profile" }));
        console.error("Get profile failed:", response.status, errorData);
        throw new Error(errorData.error || "Failed to fetch profile");
      }

      const data = await response.json();

      // Update user in localStorage
      this.setAuth(token, {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        avatar: data.avatar,
      });

      return {
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        avatar: data.avatar,
      };
    } catch (error) {
      console.error("Get profile error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const authClient = AuthClient.getInstance();

// Utility functions
export function isAdmin(user: User | null): boolean {
  return user?.role === "ADMIN" || user?.role === "MANAGER";
}

export function isAffiliate(user: User | null): boolean {
  return user?.role === "AFFILIATE";
}

export function getFullName(user: User | null): string {
  if (!user) return "";
  return `${user.firstName} ${user.lastName}`.trim();
}

export function getInitials(user: User | null): string {
  if (!user) return "";
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
}
