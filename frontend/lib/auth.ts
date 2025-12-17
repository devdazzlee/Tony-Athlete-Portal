// Re-export types and utilities from appropriate files
export type { User, AuthResponse } from "./auth-client";
export {
  authClient,
  isAdmin,
  isAffiliate,
  getFullName,
  getInitials,
} from "./auth-client";
export {
  getServerUser,
  getServerToken,
  requireAuth,
  requireRole,
} from "./auth-server";
