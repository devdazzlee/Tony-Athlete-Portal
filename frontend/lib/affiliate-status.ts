import type { User } from "@/lib/auth-client";

export function getAffiliateProfileStatus(user: User | null): string | null {
  return user?.affiliateProfile?.status?.toUpperCase() ?? null;
}

export function isAffiliateApproved(user: User | null): boolean {
  if (!user || user.role !== "AFFILIATE") return true;
  const status = getAffiliateProfileStatus(user);
  return status === "ACTIVE";
}

export function getPostAuthRedirectPath(user: User): string {
  if (user.role === "ADMIN") return "/admin";
  if (user.role === "MANAGER") return "/manager";
  if (user.role === "AFFILIATE") {
    const status = getAffiliateProfileStatus(user);
    if (status === "PENDING") return "/auth/pending-approval";
    if (status === "REJECTED") return "/auth/pending-approval?status=rejected";
    if (status && status !== "ACTIVE") return "/auth/pending-approval";
  }
  return "/dashboard";
}
