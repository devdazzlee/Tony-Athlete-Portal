"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDNModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class CDNModel {
    static async createConfig(data) {
        return (await prisma.cdnConfig.create({
            data: {
                name: data.name,
                type: data.type,
                domain: data.domain,
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
        }));
    }
    static async findConfigById(id) {
        return (await prisma.cdnConfig.findUnique({
            where: { id },
        }));
    }
    static async getActiveConfig() {
        return (await prisma.cdnConfig.findFirst({
            where: { status: "ACTIVE" },
        }));
    }
    static async updateConfig(id, data) {
        return (await prisma.cdnConfig.update({
            where: { id },
            data,
        }));
    }
    static async deleteConfig(id) {
        await prisma.cdnConfig.delete({
            where: { id },
        });
    }
    static async listConfigs() {
        return (await prisma.cdnConfig.findMany({
            orderBy: { createdAt: "desc" },
        }));
    }
    static async uploadAsset(name, type, originalUrl, size, mimeType, metadata = {}) {
        const hash = this.generateHash(originalUrl);
        const cdnUrl = await this.generateCDNUrl(name, hash);
        const asset = (await prisma.cdnAsset.create({
            data: {
                name,
                type: type,
                originalUrl,
                cdnUrl,
                size,
                mimeType,
                hash,
                status: "UPLOADING",
                metadata,
            },
        }));
        setTimeout(async () => {
            await this.updateAssetStatus(asset.id, "ACTIVE");
        }, 1000);
        return asset;
    }
    static async findAssetById(id) {
        return (await prisma.cdnAsset.findUnique({
            where: { id },
        }));
    }
    static async findAssetByHash(hash) {
        return (await prisma.cdnAsset.findFirst({
            where: { hash },
        }));
    }
    static async updateAsset(id, data) {
        return (await prisma.cdnAsset.update({
            where: { id },
            data,
        }));
    }
    static async updateAssetStatus(id, status) {
        return await this.updateAsset(id, { status: status });
    }
    static async deleteAsset(id) {
        await prisma.cdnAsset.update({
            where: { id },
            data: { status: "DELETED" },
        });
    }
    static async listAssets(filters = {}, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.type)
            where.type = filters.type;
        if (filters.status)
            where.status = filters.status;
        if (filters.name)
            where.name = { contains: filters.name };
        return (await prisma.cdnAsset.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async recordUsage(assetId, requests, bandwidth, cacheHits, cacheMisses, country, device) {
        return (await prisma.cdnUsage.create({
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
        }));
    }
    static async getAssetUsage(assetId, startDate, endDate) {
        const where = { assetId };
        if (startDate && endDate) {
            where.date = {
                gte: startDate,
                lte: endDate,
            };
        }
        return (await prisma.cdnUsage.findMany({
            where,
            orderBy: { date: "desc" },
        }));
    }
    static async getCDNStats(startDate, endDate) {
        const where = {};
        if (startDate && endDate) {
            where.date = {
                gte: startDate,
                lte: endDate,
            };
        }
        const usage = await prisma.cdnUsage.findMany({
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
            byAsset: {},
            byType: {},
            byCountry: {},
            byDevice: {},
            byDay: {},
        };
        usage.forEach((record) => {
            stats.totalRequests += record.requests;
            stats.totalBandwidth += record.bandwidth;
            stats.totalCacheHits += record.cacheHits;
            stats.totalCacheMisses += record.cacheMisses;
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
            if (record.asset) {
                if (!stats.byType[record.asset.type]) {
                    stats.byType[record.asset.type] = { requests: 0, bandwidth: 0 };
                }
                stats.byType[record.asset.type].requests += record.requests;
                stats.byType[record.asset.type].bandwidth += record.bandwidth;
            }
            if (record.country) {
                if (!stats.byCountry[record.country]) {
                    stats.byCountry[record.country] = { requests: 0, bandwidth: 0 };
                }
                stats.byCountry[record.country].requests += record.requests;
                stats.byCountry[record.country].bandwidth += record.bandwidth;
            }
            if (record.device) {
                if (!stats.byDevice[record.device]) {
                    stats.byDevice[record.device] = { requests: 0, bandwidth: 0 };
                }
                stats.byDevice[record.device].requests += record.requests;
                stats.byDevice[record.device].bandwidth += record.bandwidth;
            }
            const day = record.date.toISOString().split("T")[0];
            if (!stats.byDay[day]) {
                stats.byDay[day] = { requests: 0, bandwidth: 0 };
            }
            stats.byDay[day].requests += record.requests;
            stats.byDay[day].bandwidth += record.bandwidth;
        });
        const totalCacheRequests = stats.totalCacheHits + stats.totalCacheMisses;
        stats.cacheHitRate =
            totalCacheRequests > 0
                ? (stats.totalCacheHits / totalCacheRequests) * 100
                : 0;
        return stats;
    }
    static async purgeCache(assetId, pattern) {
        try {
            const config = await this.getActiveConfig();
            if (!config) {
                throw new Error("No active CDN configuration found");
            }
            return true;
        }
        catch (error) {
            console.error("Cache purge failed:", error);
            return false;
        }
    }
    static async optimizeImage(assetId, options = {}) {
        const asset = await this.findAssetById(assetId);
        if (!asset) {
            throw new Error("Asset not found");
        }
        if (asset.type !== "IMAGE") {
            throw new Error("Asset is not an image");
        }
        return asset;
    }
    static async generateCDNUrl(name, hash) {
        const config = await this.getActiveConfig();
        if (!config) {
            throw new Error("No active CDN configuration found");
        }
        const extension = name.split(".").pop();
        return `https://${config.domain}/${hash}.${extension}`;
    }
    static generateHash(input) {
        const crypto = require("crypto");
        return crypto.createHash("md5").update(input).digest("hex");
    }
    static async testCDNConnection(configId) {
        const config = await this.findConfigById(configId);
        if (!config) {
            return false;
        }
        try {
            return true;
        }
        catch (error) {
            console.error("CDN connection test failed:", error);
            return false;
        }
    }
    static async getCDNHealth() {
        const configs = await this.listConfigs();
        const assets = await prisma.cdnAsset.count();
        const activeAssets = await prisma.cdnAsset.count({
            where: { status: "ACTIVE" },
        });
        const health = {
            totalConfigs: configs.length,
            activeConfigs: configs.filter((c) => c.status === "ACTIVE").length,
            totalAssets: assets,
            activeAssets,
            healthPercentage: configs.length > 0
                ? (configs.filter((c) => c.status === "ACTIVE").length /
                    configs.length) *
                    100
                : 0,
        };
        return health;
    }
}
exports.CDNModel = CDNModel;
//# sourceMappingURL=CDN.js.map