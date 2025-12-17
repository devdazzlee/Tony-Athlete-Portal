"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSettingsService = void 0;
const prisma_1 = require("../lib/prisma");
const DEFAULT_ACCOUNT_ID = process.env.SYSTEM_ACCOUNT_ID || "default";
const DEFAULT_COMMISSION_RATE = 15;
const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedDefaultCommissionRate = null;
let cachedDefaultCommissionFetchedAt = null;
class SystemSettingsService {
    static async getDefaultCommissionRate(forceRefresh = false) {
        if (!forceRefresh && cachedDefaultCommissionRate !== null) {
            if (cachedDefaultCommissionFetchedAt &&
                Date.now() - cachedDefaultCommissionFetchedAt < CACHE_TTL_MS) {
                return cachedDefaultCommissionRate;
            }
        }
        const settings = await prisma_1.prisma.systemSettings.findUnique({
            where: { accountId: DEFAULT_ACCOUNT_ID },
        });
        let rate = DEFAULT_COMMISSION_RATE;
        if (settings?.general && typeof settings.general === "object") {
            const general = settings.general;
            const configuredRate = general?.commissionSettings?.defaultRate;
            if (typeof configuredRate === "number" && !isNaN(configuredRate)) {
                rate = configuredRate;
            }
        }
        cachedDefaultCommissionRate = rate;
        cachedDefaultCommissionFetchedAt = Date.now();
        return rate;
    }
    static clearCache() {
        cachedDefaultCommissionRate = null;
        cachedDefaultCommissionFetchedAt = null;
    }
}
exports.SystemSettingsService = SystemSettingsService;
//# sourceMappingURL=SystemSettingsService.js.map