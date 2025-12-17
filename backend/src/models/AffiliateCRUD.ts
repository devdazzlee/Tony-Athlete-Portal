import { prisma } from '../lib/prisma';
import * as bcrypt from 'bcryptjs';
import { SystemSettingsService } from '../services/SystemSettingsService';

export interface AffiliateProfile {
  id: string;
  userId: string;
  companyName?: string;
  website?: string;
  socialMedia?: any;
  paymentMethod: 'PAYPAL' | 'STRIPE' | 'BANK_TRANSFER' | 'CRYPTO' | 'WISE';
  paymentEmail?: string;
  taxId?: string;
  address?: any;
  tier: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  commissionRate: number;
  totalEarnings: number;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateApplication {
  id: string;
  userId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'UNDER_REVIEW';
  applicationData: any;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
  rejectionReason?: string;
}

export interface AffiliateActivity {
  id: string;
  affiliateId: string;
  type: 'LOGIN' | 'CLICK' | 'CONVERSION' | 'PAYOUT' | 'PROFILE_UPDATE' | 'STATUS_CHANGE';
  description: string;
  data: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface AffiliateDocument {
  id: string;
  affiliateId: string;
  type: 'KYC' | 'TAX' | 'BANK' | 'CONTRACT' | 'OTHER';
  name: string;
  url: string;
  size: number;
  mimeType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  uploadedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
}

export class AffiliateCRUDModel {
  static async create(data: Partial<AffiliateProfile>): Promise<AffiliateProfile> {
    const defaultCommissionRate =
      await SystemSettingsService.getDefaultCommissionRate();
    const commissionRate =
      data.commissionRate ?? defaultCommissionRate;

    return await prisma.affiliateProfile.create({
      data: {
        userId: data.userId!,
        companyName: data.companyName,
        website: data.website,
        socialMedia: data.socialMedia,
        paymentMethod: data.paymentMethod || 'BANK_TRANSFER',
        paymentEmail: data.paymentEmail,
        taxId: data.taxId,
        address: data.address,
        tier: data.tier || 'BRONZE',
        commissionRate,
        totalEarnings: data.totalEarnings || 0,
        totalClicks: data.totalClicks || 0,
        totalConversions: data.totalConversions || 0,
        conversionRate: data.conversionRate || 0,
        lastActivityAt: data.lastActivityAt || new Date()
      }
    }) as AffiliateProfile;
  }

  static async findById(id: string): Promise<AffiliateProfile | null> {
    return await prisma.affiliateProfile.findUnique({
      where: { id },
      include: {
        user: true
      }
    }) as AffiliateProfile | null;
  }

  static async findByUserId(userId: string): Promise<AffiliateProfile | null> {
    return await prisma.affiliateProfile.findUnique({
      where: { userId },
      include: {
        user: true
      }
    }) as AffiliateProfile | null;
  }

  static async update(id: string, data: Partial<AffiliateProfile>): Promise<AffiliateProfile> {
    // Remove fields that shouldn't be updated directly
    const { id: _, userId, createdAt, updatedAt, ...updateData } = data;
    
    return await prisma.affiliateProfile.update({
      where: { id },
      data: updateData
    }) as AffiliateProfile;
  }

  static async delete(id: string): Promise<void> {
    await prisma.affiliateProfile.delete({
      where: { id }
    });
  }

  static async list(filters: any = {}, page: number = 1, limit: number = 20): Promise<AffiliateProfile[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.tier) where.tier = filters.tier;
    if (filters.search) {
      where.OR = [
        { companyName: { contains: filters.search } },
        { website: { contains: filters.search } },
        { user: { firstName: { contains: filters.search } } },
        { user: { lastName: { contains: filters.search } } },
        { user: { email: { contains: filters.search } } }
      ];
    }
    if (filters.minEarnings) where.totalEarnings = { gte: filters.minEarnings };
    if (filters.maxEarnings) where.totalEarnings = { lte: filters.maxEarnings };
    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }

    return await prisma.affiliateProfile.findMany({
      where,
      include: {
        user: true
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' }
    }) as AffiliateProfile[];
  }

  static async approve(id: string, approvedBy: string, notes?: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no status field, we'll just update lastActivityAt
    const updatedAffiliate = await this.update(id, {
      lastActivityAt: new Date()
    });

    // Log activity (mock implementation)
    await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate approved', {
      approvedBy,
      notes
    }, '127.0.0.1', 'System');

    return updatedAffiliate;
  }

  static async reject(id: string, rejectedBy: string, reason: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no status field, we'll just update lastActivityAt
    const updatedAffiliate = await this.update(id, {
      lastActivityAt: new Date()
    });

    // Log activity (mock implementation)
    await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate rejected', {
      rejectedBy,
      reason
    }, '127.0.0.1', 'System');

    return updatedAffiliate;
  }

  static async suspend(id: string, suspendedBy: string, reason: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no status field, we'll just update lastActivityAt
    const updatedAffiliate = await this.update(id, {
      lastActivityAt: new Date()
    });

    // Log activity (mock implementation)
    await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate suspended', {
      suspendedBy,
      reason
    }, '127.0.0.1', 'System');

    return updatedAffiliate;
  }

  static async activate(id: string, activatedBy: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no status field, we'll just update lastActivityAt
    const updatedAffiliate = await this.update(id, {
      lastActivityAt: new Date()
    });

    // Log activity (mock implementation)
    await this.logActivity(id, 'STATUS_CHANGE', 'Affiliate activated', {
      activatedBy
    }, '127.0.0.1', 'System');

    return updatedAffiliate;
  }

  static async updateTier(id: string, newTier: string, updatedBy: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const updatedAffiliate = await this.update(id, {
      tier: newTier as any
    });

    // Log activity (mock implementation)
    await this.logActivity(id, 'PROFILE_UPDATE', 'Tier updated', {
      previousTier: affiliate.tier,
      newTier,
      updatedBy
    }, '127.0.0.1', 'System');

    return updatedAffiliate;
  }

  static async updateKYCStatus(id: string, verified: boolean, verifiedBy: string, notes?: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no KYC field, we'll just update lastActivityAt
    const updatedAffiliate = await this.update(id, {
      lastActivityAt: new Date()
    });

    // Log activity (mock implementation)
    await this.logActivity(id, 'PROFILE_UPDATE', 'KYC status updated', {
      verifiedBy,
      notes
    }, '127.0.0.1', 'System');

    return updatedAffiliate;
  }

  static async addTag(id: string, tag: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no tags field, we'll just update lastActivityAt
    return await this.update(id, { lastActivityAt: new Date() });
  }

  static async removeTag(id: string, tag: string): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no tags field, we'll just update lastActivityAt
    return await this.update(id, { lastActivityAt: new Date() });
  }

  static async updateCustomField(id: string, field: string, value: any): Promise<AffiliateProfile> {
    const affiliate = await this.findById(id);
    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    // Since there's no customFields field, we'll just update lastActivityAt
    return await this.update(id, { lastActivityAt: new Date() });
  }

  static async logActivity(affiliateId: string, type: string, description: string, data: any, ipAddress: string, userAgent: string): Promise<AffiliateActivity> {
    // Mock implementation since affiliateActivity model doesn't exist
    return {
      id: 'mock-activity-id',
      affiliateId,
      type: type as any,
      description,
      data,
      ipAddress,
      userAgent,
      timestamp: new Date()
    } as AffiliateActivity;
  }

  static async getActivities(affiliateId: string, page: number = 1, limit: number = 50): Promise<AffiliateActivity[]> {
    // Mock implementation
    return [];
  }

  static async uploadDocument(affiliateId: string, type: string, name: string, url: string, size: number, mimeType: string): Promise<AffiliateDocument> {
    // Mock implementation since affiliateDocument model doesn't exist
    return {
      id: 'mock-document-id',
      affiliateId,
      type: type as any,
      name,
      url,
      size,
      mimeType,
      status: 'PENDING',
      uploadedAt: new Date()
    } as AffiliateDocument;
  }

  static async findDocumentById(id: string): Promise<AffiliateDocument | null> {
    // Mock implementation
    return null;
  }

  static async listDocuments(affiliateId: string, filters: any = {}): Promise<AffiliateDocument[]> {
    // Mock implementation
    return [];
  }

  static async updateDocumentStatus(id: string, status: string, reviewedBy: string, notes?: string): Promise<AffiliateDocument> {
    // Mock implementation
    return {
      id,
      affiliateId: 'mock-affiliate',
      type: 'KYC',
      name: 'Mock Document',
      url: 'mock-url',
      size: 0,
      mimeType: 'application/pdf',
      status: status as any,
      uploadedAt: new Date(),
      reviewedAt: new Date(),
      reviewedBy,
      notes
    } as AffiliateDocument;
  }

  static async deleteDocument(id: string): Promise<void> {
    // Mock implementation
  }

  static async getAffiliateStats(affiliateId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Get clicks and conversions from existing models
    const clicks = await prisma.click.findMany({
      where: { affiliateId }
    });

    const conversions = await prisma.conversion.findMany({
      where: { affiliateId }
    });

    const payouts = await prisma.payout.findMany({
      where: { affiliateId }
    });

    const stats = {
      totalClicks: clicks.length,
      totalConversions: conversions.length,
      totalPayouts: payouts.length,
      totalEarnings: conversions.reduce((sum, c) => sum + c.commissionAmount, 0),
      totalPayoutAmount: payouts.reduce((sum, p) => sum + p.amount, 0),
      conversionRate: clicks.length > 0 ? (conversions.length / clicks.length) * 100 : 0,
      averageOrderValue: conversions.length > 0 ? conversions.reduce((sum, c) => sum + c.customerValue, 0) / conversions.length : 0,
      byMonth: {} as Record<string, any>,
      byOffer: {} as Record<string, any>,
      byCountry: {} as Record<string, any>,
      byDevice: {} as Record<string, any>
    };

    // Calculate monthly stats
    conversions.forEach(conversion => {
      const month = conversion.createdAt.toISOString().substr(0, 7);
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { clicks: 0, conversions: 0, earnings: 0 };
      }
      stats.byMonth[month].conversions++;
      stats.byMonth[month].earnings += conversion.commissionAmount;
    });

    clicks.forEach(click => {
      const month = click.createdAt.toISOString().substr(0, 7);
      if (!stats.byMonth[month]) {
        stats.byMonth[month] = { clicks: 0, conversions: 0, earnings: 0 };
      }
      stats.byMonth[month].clicks++;
    });

    // Calculate by offer
    conversions.forEach(conversion => {
      if (!stats.byOffer[conversion.offerId]) {
        stats.byOffer[conversion.offerId] = { conversions: 0, earnings: 0 };
      }
      stats.byOffer[conversion.offerId].conversions++;
      stats.byOffer[conversion.offerId].earnings += conversion.commissionAmount;
    });

    // Calculate by country (from clicks)
    clicks.forEach(click => {
      if (click.country) {
        if (!stats.byCountry[click.country]) {
          stats.byCountry[click.country] = { clicks: 0, conversions: 0 };
        }
        stats.byCountry[click.country].clicks++;
      }
    });

    // Calculate by device (from clicks)
    clicks.forEach(click => {
      if (click.device) {
        if (!stats.byDevice[click.device]) {
          stats.byDevice[click.device] = { clicks: 0, conversions: 0 };
        }
        stats.byDevice[click.device].clicks++;
      }
    });

    return stats;
  }

  static async getAffiliateDashboard(affiliateId: string): Promise<any> {
    const affiliate = await this.findById(affiliateId);
    if (!affiliate) {
      return null;
    }

    const stats = await this.getAffiliateStats(affiliateId);
    const recentActivities = await this.getActivities(affiliateId, 1, 10);
    const documents = await this.listDocuments(affiliateId);

    return {
      affiliate,
      stats,
      recentActivities,
      documents
    };
  }

  static async bulkUpdateStatus(affiliateIds: string[], status: string, updatedBy: string, reason?: string): Promise<AffiliateProfile[]> {
    const updatedAffiliates: AffiliateProfile[] = [];

    for (const id of affiliateIds) {
      const affiliate = await this.findById(id);
      if (affiliate) {
        const updatedAffiliate = await this.update(id, { lastActivityAt: new Date() });
        updatedAffiliates.push(updatedAffiliate);

        // Log activity (mock implementation)
        await this.logActivity(id, 'STATUS_CHANGE', `Bulk status update to ${status}`, {
          updatedBy,
          reason
        }, '127.0.0.1', 'System');
      }
    }

    return updatedAffiliates;
  }

  static async bulkUpdateTier(affiliateIds: string[], tier: string, updatedBy: string): Promise<AffiliateProfile[]> {
    const updatedAffiliates: AffiliateProfile[] = [];

    for (const id of affiliateIds) {
      const affiliate = await this.findById(id);
      if (affiliate) {
        const updatedAffiliate = await this.update(id, { tier: tier as any });
        updatedAffiliates.push(updatedAffiliate);

        // Log activity (mock implementation)
        await this.logActivity(id, 'PROFILE_UPDATE', `Bulk tier update to ${tier}`, {
          previousTier: affiliate.tier,
          newTier: tier,
          updatedBy
        }, '127.0.0.1', 'System');
      }
    }

    return updatedAffiliates;
  }

  static async exportAffiliateData(affiliateId: string): Promise<any> {
    const affiliate = await this.findById(affiliateId);
    if (!affiliate) {
      return null;
    }

    const stats = await this.getAffiliateStats(affiliateId);
    const activities = await this.getActivities(affiliateId, 1, 1000);
    const documents = await this.listDocuments(affiliateId);

    return {
      affiliate,
      stats,
      activities,
      documents,
      exportedAt: new Date().toISOString()
    };
  }

  static async getAffiliateLeaderboard(filters: any = {}, limit: number = 10): Promise<any[]> {
    const where: any = {};
    
    if (filters.tier) where.tier = filters.tier;
    if (filters.startDate && filters.endDate) {
      where.createdAt = {
        gte: filters.startDate,
        lte: filters.endDate
      };
    }

    const affiliates = await prisma.affiliateProfile.findMany({
      where,
      include: {
        user: true
      },
      orderBy: { totalEarnings: 'desc' },
      take: limit
    });

    return affiliates.map(affiliate => ({
      id: affiliate.id,
      name: `${affiliate.user.firstName} ${affiliate.user.lastName}`,
      companyName: affiliate.companyName,
      tier: affiliate.tier,
      totalEarnings: affiliate.totalEarnings,
      totalClicks: affiliate.totalClicks,
      totalConversions: affiliate.totalConversions,
      conversionRate: affiliate.conversionRate
    }));
  }

  static async getAffiliateSummary(): Promise<any> {
    const totalAffiliates = await prisma.affiliateProfile.count();

    const totalEarnings = await prisma.affiliateProfile.aggregate({
      _sum: { totalEarnings: true }
    });

    const totalClicks = await prisma.affiliateProfile.aggregate({
      _sum: { totalClicks: true }
    });

    const totalConversions = await prisma.affiliateProfile.aggregate({
      _sum: { totalConversions: true }
    });

    return {
      totalAffiliates,
      activeAffiliates: totalAffiliates, // Since there's no status field, all are considered active
      pendingAffiliates: 0,
      suspendedAffiliates: 0,
      totalEarnings: totalEarnings._sum.totalEarnings || 0,
      totalClicks: totalClicks._sum.totalClicks || 0,
      totalConversions: totalConversions._sum.totalConversions || 0,
      averageEarnings: totalAffiliates > 0 ? (totalEarnings._sum.totalEarnings || 0) / totalAffiliates : 0
    };
  }
}