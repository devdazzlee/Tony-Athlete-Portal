export interface CDNConfig {
    id: string;
    name: string;
    type: "CLOUDFLARE" | "AWS_CLOUDFRONT" | "GOOGLE_CLOUD_CDN" | "CUSTOM";
    domain: string;
    apiKey?: string;
    apiSecret?: string;
    settings: CDNSettings;
    status: "ACTIVE" | "INACTIVE" | "ERROR";
    createdAt: Date;
    updatedAt: Date;
}
export interface CDNSettings {
    cacheTtl: number;
    compression: boolean;
    minify: boolean;
    imageOptimization: boolean;
    customHeaders: Record<string, string>;
    allowedOrigins: string[];
    blockedCountries: string[];
    rateLimiting: {
        enabled: boolean;
        requestsPerMinute: number;
    };
}
export interface CDNAsset {
    id: string;
    name: string;
    type: "IMAGE" | "VIDEO" | "DOCUMENT" | "SCRIPT" | "STYLESHEET" | "FONT";
    originalUrl: string;
    cdnUrl: string;
    size: number;
    mimeType: string;
    hash: string;
    status: "UPLOADING" | "ACTIVE" | "ERROR" | "DELETED";
    metadata: any;
    createdAt: Date;
    updatedAt: Date;
}
export interface CDNUsage {
    id: string;
    assetId: string;
    requests: number;
    bandwidth: number;
    cacheHits: number;
    cacheMisses: number;
    date: Date;
    country?: string;
    device?: string;
}
export declare class CDNModel {
    static createConfig(data: Partial<CDNConfig>): Promise<CDNConfig>;
    static findConfigById(id: string): Promise<CDNConfig | null>;
    static getActiveConfig(): Promise<CDNConfig | null>;
    static updateConfig(id: string, data: Partial<CDNConfig>): Promise<CDNConfig>;
    static deleteConfig(id: string): Promise<void>;
    static listConfigs(): Promise<CDNConfig[]>;
    static uploadAsset(name: string, type: string, originalUrl: string, size: number, mimeType: string, metadata?: any): Promise<CDNAsset>;
    static findAssetById(id: string): Promise<CDNAsset | null>;
    static findAssetByHash(hash: string): Promise<CDNAsset | null>;
    static updateAsset(id: string, data: Partial<CDNAsset>): Promise<CDNAsset>;
    static updateAssetStatus(id: string, status: string): Promise<CDNAsset>;
    static deleteAsset(id: string): Promise<void>;
    static listAssets(filters?: any, page?: number, limit?: number): Promise<CDNAsset[]>;
    static recordUsage(assetId: string, requests: number, bandwidth: number, cacheHits: number, cacheMisses: number, country?: string, device?: string): Promise<CDNUsage>;
    static getAssetUsage(assetId: string, startDate?: Date, endDate?: Date): Promise<CDNUsage[]>;
    static getCDNStats(startDate?: Date, endDate?: Date): Promise<any>;
    static purgeCache(assetId?: string, pattern?: string): Promise<boolean>;
    static optimizeImage(assetId: string, options?: any): Promise<CDNAsset>;
    static generateCDNUrl(name: string, hash: string): Promise<string>;
    private static generateHash;
    static testCDNConnection(configId: string): Promise<boolean>;
    static getCDNHealth(): Promise<any>;
}
//# sourceMappingURL=CDN.d.ts.map