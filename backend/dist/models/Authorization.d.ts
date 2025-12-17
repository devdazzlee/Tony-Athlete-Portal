export interface Role {
    id: string;
    accountId: string;
    name: string;
    description: string;
    permissions: Permission[];
    isSystem: boolean;
    isDefault: boolean;
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface Permission {
    id: string;
    resource: string;
    action: string;
    conditions?: PermissionCondition[];
    granted: boolean;
}
export interface PermissionCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "IN" | "NOT_IN" | "OWNER" | "SAME_ACCOUNT";
    value: any;
}
export interface UserRole {
    id: string;
    userId: string;
    roleId: string;
    accountId: string;
    grantedBy: string;
    grantedAt: Date;
    expiresAt?: Date;
    isActive: boolean;
}
export interface AccessControl {
    id: string;
    accountId: string;
    resource: string;
    resourceId: string;
    userId?: string;
    roleId?: string;
    permissions: string[];
    conditions: AccessCondition[];
    status: "ACTIVE" | "INACTIVE";
    createdAt: Date;
    updatedAt: Date;
}
export interface AccessCondition {
    field: string;
    operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "IN" | "NOT_IN" | "OWNER" | "SAME_ACCOUNT";
    value: any;
    logic: "AND" | "OR";
}
export interface AuditLog {
    id: string;
    accountId: string;
    userId: string;
    action: string;
    resource: string;
    resourceId: string;
    details: any;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
}
export interface Session {
    id: string;
    userId: string;
    accountId: string;
    token: string;
    refreshToken: string;
    expiresAt: Date;
    ipAddress: string;
    userAgent: string;
    isActive: boolean;
    createdAt: Date;
    lastActivity: Date;
}
export interface TwoFactorAuth {
    id: string;
    userId: string;
    accountId: string;
    method: "TOTP" | "SMS" | "EMAIL" | "HARDWARE";
    secret?: string;
    backupCodes: string[];
    isEnabled: boolean;
    lastUsed?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare class AuthorizationModel {
    static createRole(data: Partial<Role>): Promise<Role>;
    static findRoleById(id: string): Promise<Role | null>;
    static findRoleByName(accountId: string, name: string): Promise<Role | null>;
    static updateRole(id: string, data: Partial<Role>): Promise<Role>;
    static deleteRole(id: string): Promise<void>;
    static listRoles(accountId: string, filters?: any): Promise<Role[]>;
    static assignRole(userId: string, roleId: string, accountId: string, grantedBy: string, expiresAt?: Date): Promise<UserRole>;
    static revokeRole(userRoleId: string): Promise<void>;
    static getUserRoles(userId: string, accountId: string): Promise<UserRole[]>;
    static checkPermission(userId: string, accountId: string, resource: string, action: string, resourceId?: string, context?: any): Promise<boolean>;
    private static evaluatePermissionConditions;
    private static evaluateAccessConditions;
    private static evaluateCondition;
    private static getFieldValue;
    static createAccessControl(data: Partial<AccessControl>): Promise<AccessControl>;
    static getAccessControls(userId: string, accountId: string, resource: string, resourceId?: string): Promise<AccessControl[]>;
    private static getUserRoleIds;
    static createAuditLog(data: Partial<AuditLog>): Promise<AuditLog>;
    static getAuditLogs(accountId: string, filters?: any, page?: number, limit?: number): Promise<AuditLog[]>;
    static createSession(data: Partial<Session>): Promise<Session>;
    static findSessionByToken(token: string): Promise<Session | null>;
    static updateSessionActivity(sessionId: string): Promise<Session>;
    static revokeSession(sessionId: string): Promise<void>;
    static revokeAllUserSessions(userId: string, accountId: string): Promise<void>;
    static createTwoFactorAuth(data: Partial<TwoFactorAuth>): Promise<TwoFactorAuth>;
    static findTwoFactorAuthByUser(userId: string, accountId: string): Promise<TwoFactorAuth | null>;
    static updateTwoFactorAuth(id: string, data: Partial<TwoFactorAuth>): Promise<TwoFactorAuth>;
    static deleteTwoFactorAuth(id: string): Promise<void>;
    static generateBackupCodes(): Promise<string[]>;
    static verifyTwoFactorCode(userId: string, accountId: string, code: string): Promise<boolean>;
    private static verifyTOTPCode;
    static getAuthorizationStats(accountId: string): Promise<any>;
    static createDefaultRoles(accountId: string): Promise<Role[]>;
    static getAuthorizationDashboard(accountId: string): Promise<any>;
}
//# sourceMappingURL=Authorization.d.ts.map