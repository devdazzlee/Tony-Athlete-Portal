import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

export class CDNModel {
  static async createConfig(data: Partial<CDNConfig>): Promise<CDNConfig> {
    return (await (prisma as any).cdnConfig.create({
      data: {
        name: data.name!,
        type: data.type!,
        domain: data.domain!,
        apiKey: data.apiKey,
        apiSecret: data.apiSecret,
        settings: data.settings || {
          cacheTtl: 3600,
          compression: true,
          minify: true,
          imageOptimization: true,
          customHeaders: {},
          allowedOrigins: [],
          blockedCountries: [],
          rateLimiting: {
            enabled: false,
            requestsPerMinute: 1000,
          },
        },
        status: "ACTIVE",
      },
    })) as CDNConfig;
  }

  static async findConfigById(id: string): Promise<CDNConfig | null> {
    return (await (prisma as any).cdnConfig.findUnique({
      where: { id },
    })) as CDNConfig | null;
  }

  static async getActiveConfig(): Promise<CDNConfig | null> {
    return (await (prisma as any).cdnConfig.findFirst({
      where: { status: "ACTIVE" },
    })) as CDNConfig | null;
  }

  static async updateConfig(
    id: string,
    data: Partial<CDNConfig>
  ): Promise<CDNConfig> {
    return (await (prisma as any).cdnConfig.update({
      where: { id },
      data,
    })) as CDNConfig;
  }

  static async deleteConfig(id: string): Promise<void> {
    await (prisma as any).cdnConfig.delete({
      where: { id },
    });
  }

  static async listConfigs(): Promise<CDNConfig[]> {
    return (await (prisma as any).cdnConfig.findMany({
      orderBy: { createdAt: "desc" },
    })) as CDNConfig[];
  }

  static async uploadAsset(
    name: string,
    type: string,
    originalUrl: string,
    size: number,
    mimeType: string,
    metadata: any = {}
  ): Promise<CDNAsset> {
    const hash = this.generateHash(originalUrl);
    const cdnUrl = await this.generateCDNUrl(name, hash);

    const asset = (await (prisma as any).cdnAsset.create({
      data: {
        name,
        type: type as any,
        originalUrl,
        cdnUrl,
        size,
        mimeType,
        hash,
        status: "UPLOADING",
        metadata,
      },
    })) as CDNAsset;

    // Here you would integrate with the actual CDN service
    // For now, we'll simulate the upload process
    setTimeout(async () => {
      await this.updateAssetStatus(asset.id, "ACTIVE");
    }, 1000);

    return asset;
  }

  static async findAssetById(id: string): Promise<CDNAsset | null> {
    return (await (prisma as any).cdnAsset.findUnique({
      where: { id },
    })) as CDNAsset | null;
  }

  static async findAssetByHash(hash: string): Promise<CDNAsset | null> {
    return (await (prisma as any).cdnAsset.findFirst({
      where: { hash },
    })) as CDNAsset | null;
  }

  static async updateAsset(
    id: string,
    data: Partial<CDNAsset>
  ): Promise<CDNAsset> {
    return (await (prisma as any).cdnAsset.update({
      where: { id },
      data,
    })) as CDNAsset;
  }

  static async updateAssetStatus(
    id: string,
    status: string
  ): Promise<CDNAsset> {
    return await this.updateAsset(id, { status: status as any });
  }

  static async deleteAsset(id: string): Promise<void> {
    await (prisma as any).cdnAsset.update({
      where: { id },
      data: { status: "DELETED" },
    });
  }

  static async listAssets(
    filters: any = {},
    page: number = 1,
    limit: number = 50
  ): Promise<CDNAsset[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.name) where.name = { contains: filters.name };

    return (await (prisma as any).cdnAsset.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as CDNAsset[];
  }

  static async recordUsage(
    assetId: string,
    requests: number,
    bandwidth: number,
    cacheHits: number,
    cacheMisses: number,
    country?: string,
    device?: string
  ): Promise<CDNUsage> {
    return (await (prisma as any).cdnUsage.create({
      data: {
        assetId,
        requests,
        bandwidth,
        cacheHits,
        cacheMisses,
        date: new Date(),
        country,
        device,
      },
    })) as CDNUsage;
  }

  static async getAssetUsage(
    assetId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CDNUsage[]> {
    const where: any = { assetId };

    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    return (await (prisma as any).cdnUsage.findMany({
      where,
      orderBy: { date: "desc" },
    })) as CDNUsage[];
  }

  static async getCDNStats(startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};

    if (startDate && endDate) {
      where.date = {
        gte: startDate,
        lte: endDate,
      };
    }

    const usage = await (prisma as any).cdnUsage.findMany({
      where,
      include: {
        asset: true,
      },
    });

    const stats = {
      totalRequests: 0,
      totalBandwidth: 0,
      totalCacheHits: 0,
      totalCacheMisses: 0,
      cacheHitRate: 0,
      byAsset: {} as Record<string, any>,
      byType: {} as Record<string, any>,
      byCountry: {} as Record<string, any>,
      byDevice: {} as Record<string, any>,
      byDay: {} as Record<string, any>,
    };

    usage.forEach((record) => {
      stats.totalRequests += record.requests;
      stats.totalBandwidth += record.bandwidth;
      stats.totalCacheHits += record.cacheHits;
      stats.totalCacheMisses += record.cacheMisses;

      // By asset
      if (!stats.byAsset[record.assetId]) {
        stats.byAsset[record.assetId] = {
          requests: 0,
          bandwidth: 0,
          cacheHits: 0,
          cacheMisses: 0,
          name: record.asset?.name || "Unknown",
        };
      }
      stats.byAsset[record.assetId].requests += record.requests;
      stats.byAsset[record.assetId].bandwidth += record.bandwidth;
      stats.byAsset[record.assetId].cacheHits += record.cacheHits;
      stats.byAsset[record.assetId].cacheMisses += record.cacheMisses;

      // By type
      if (record.asset) {
        if (!stats.byType[record.asset.type]) {
          stats.byType[record.asset.type] = { requests: 0, bandwidth: 0 };
        }
        stats.byType[record.asset.type].requests += record.requests;
        stats.byType[record.asset.type].bandwidth += record.bandwidth;
      }

      // By country
      if (record.country) {
        if (!stats.byCountry[record.country]) {
          stats.byCountry[record.country] = { requests: 0, bandwidth: 0 };
        }
        stats.byCountry[record.country].requests += record.requests;
        stats.byCountry[record.country].bandwidth += record.bandwidth;
      }

      // By device
      if (record.device) {
        if (!stats.byDevice[record.device]) {
          stats.byDevice[record.device] = { requests: 0, bandwidth: 0 };
        }
        stats.byDevice[record.device].requests += record.requests;
        stats.byDevice[record.device].bandwidth += record.bandwidth;
      }

      // By day
      const day = record.date.toISOString().split("T")[0];
      if (!stats.byDay[day]) {
        stats.byDay[day] = { requests: 0, bandwidth: 0 };
      }
      stats.byDay[day].requests += record.requests;
      stats.byDay[day].bandwidth += record.bandwidth;
    });

    // Calculate cache hit rate
    const totalCacheRequests = stats.totalCacheHits + stats.totalCacheMisses;
    stats.cacheHitRate =
      totalCacheRequests > 0
        ? (stats.totalCacheHits / totalCacheRequests) * 100
        : 0;

    return stats;
  }

  static async purgeCache(
    assetId?: string,
    pattern?: string
  ): Promise<boolean> {
    try {
      const config = await this.getActiveConfig();
      if (!config) {
        throw new Error("No active CDN configuration found");
      }

      // Here you would integrate with the actual CDN service to purge cache
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error("Cache purge failed:", error);
      return false;
    }
  }

  static async optimizeImage(
    assetId: string,
    options: any = {}
  ): Promise<CDNAsset> {
    const asset = await this.findAssetById(assetId);
    if (!asset) {
      throw new Error("Asset not found");
    }

    if (asset.type !== "IMAGE") {
      throw new Error("Asset is not an image");
    }

    // Here you would integrate with image optimization service
    // For now, we'll just return the asset
    return asset;
  }

  static async generateCDNUrl(name: string, hash: string): Promise<string> {
    const config = await this.getActiveConfig();
    if (!config) {
      throw new Error("No active CDN configuration found");
    }

    const extension = name.split(".").pop();
    return `https://${config.domain}/${hash}.${extension}`;
  }

  private static generateHash(input: string): string {
    const crypto = require("crypto");
    return crypto.createHash("md5").update(input).digest("hex");
  }

  static async testCDNConnection(configId: string): Promise<boolean> {
    const config = await this.findConfigById(configId);
    if (!config) {
      return false;
    }

    try {
      // Here you would test the connection to the CDN service
      // For now, we'll just return true
      return true;
    } catch (error) {
      console.error("CDN connection test failed:", error);
      return false;
    }
  }

  static async getCDNHealth(): Promise<any> {
    const configs = await this.listConfigs();
    const assets = await (prisma as any).cdnAsset.count();
    const activeAssets = await (prisma as any).cdnAsset.count({
      where: { status: "ACTIVE" },
    });

    const health = {
      totalConfigs: configs.length,
      activeConfigs: configs.filter((c) => c.status === "ACTIVE").length,
      totalAssets: assets,
      activeAssets,
      healthPercentage:
        configs.length > 0
          ? (configs.filter((c) => c.status === "ACTIVE").length /
              configs.length) *
            100
          : 0,
    };

    return health;
  }
}
