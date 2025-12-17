export interface PersonalToken {
    id: string;
    userId: string;
    name: string;
    description?: string;
    token: string;
    permissions: string[];
    lastUsedAt?: Date;
    expiresAt?: Date;
    status: "ACTIVE" | "INACTIVE" | "EXPIRED";
    createdAt: Date;
    updatedAt: Date;
}
export interface TokenUsage {
    id: string;
    tokenId: string;
    endpoint: string;
    method: string;
    ipAddress: string;
    userAgent: string;
    responseStatus: number;
    responseTime: number;
    timestamp: Date;
}
export declare class PersonalTokenModel {
    static create(data: any): Promise<any>;
    static findById(id: string): Promise<any | null>;
    static findByToken(token: string): Promise<any | null>;
    static findByUserId(userId: string): Promise<any[]>;
    static update(id: string, data: any): Promise<any>;
    static delete(id: string): Promise<void>;
    static revoke(id: string): Promise<any>;
    static regenerate(id: string): Promise<any>;
    static validateToken(token: string): Promise<{
        valid: boolean;
        token?: any;
        error?: string;
    }>;
    static checkPermission(token: string, permission: string): Promise<boolean>;
    static recordUsage(tokenId: string, endpoint: string, method: string, ipAddress: string, userAgent: string, responseStatus: number, responseTime: number): Promise<any>;
    static getTokenUsage(tokenId: string, page?: number, limit?: number): Promise<any[]>;
    static getTokenStats(tokenId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static getAvailablePermissions(): Promise<string[]>;
    static createDefaultTokens(userId: string): Promise<any[]>;
    private static generateToken;
    static cleanupExpiredTokens(): Promise<number>;
    static getTokenHealth(): Promise<any>;
}
//# sourceMappingURL=PersonalToken.d.ts.map