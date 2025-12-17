import { prisma } from "../lib/prisma";

const DEFAULT_ACCOUNT_ID = process.env.SYSTEM_ACCOUNT_ID || "default";
const DEFAULT_COMMISSION_RATE = 15;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedDefaultCommissionRate: number | null = null;
let cachedDefaultCommissionFetchedAt: number | null = null;

export class SystemSettingsService {
  /**
   * Retrieve the default commission rate configured in system settings.
   * Falls back to DEFAULT_COMMISSION_RATE when not configured.
   */
  static async getDefaultCommissionRate(
    forceRefresh = false
  ): Promise<number> {
    if (!forceRefresh && cachedDefaultCommissionRate !== null) {
      if (
        cachedDefaultCommissionFetchedAt &&
        Date.now() - cachedDefaultCommissionFetchedAt < CACHE_TTL_MS
      ) {
        return cachedDefaultCommissionRate;
      }
    }

    const settings = await prisma.systemSettings.findUnique({
      where: { accountId: DEFAULT_ACCOUNT_ID },
    });

    let rate = DEFAULT_COMMISSION_RATE;

    if (settings?.general && typeof settings.general === "object") {
      const general = settings.general as Record<string, any>;
      const configuredRate = general?.commissionSettings?.defaultRate;

      if (typeof configuredRate === "number" && !isNaN(configuredRate)) {
        rate = configuredRate;
      }
    }

    cachedDefaultCommissionRate = rate;
    cachedDefaultCommissionFetchedAt = Date.now();

    return rate;
  }

  /**
   * Clear cached commission settings so subsequent calls fetch fresh data.
   */
  static clearCache() {
    cachedDefaultCommissionRate = null;
    cachedDefaultCommissionFetchedAt = null;
  }
}

