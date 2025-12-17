import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "ADMIN" | "AFFILIATE" | "MANAGER";
  avatar?: string;
}

// Cookie names
const COOKIE_NAMES = {
  ACCESS_TOKEN: "accessToken",
  USER_DATA: "userData",
} as const;

// Server-side authentication utilities
export async function getServerUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const userData = cookieStore.get(COOKIE_NAMES.USER_DATA);

    if (!userData) {
      return null;
    }

    return JSON.parse(userData.value);
  } catch (error) {
    console.error("Error getting server user:", error);
    return null;
  }
}

export async function getServerToken(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES.ACCESS_TOKEN);

    return token?.value || null;
  } catch (error) {
    console.error("Error getting server token:", error);
    return null;
  }
}

export async function requireAuth(): Promise<User> {
  const user = await getServerUser();

  if (!user) {
    redirect("/auth/login");
  }

  return user;
}

export async function requireRole(roles: string[]): Promise<User> {
  const user = await requireAuth();

  if (!roles.includes(user.role)) {
    redirect("/unauthorized");
  }

  return user;
}
