import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface MLMStructure {
  id: string;
  accountId: string;
  name: string;
  type: string;
  maxLevels: number;
  settings: any;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MLMCommissionRate {
  tier: number;
  rate: number;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
}

export interface MLMRelationship {
  id: string;
  structureId: string;
  sponsorId: string;
  affiliateId: string;
  position: string;
  level: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MLMCommission {
  id: string;
  conversionId: string;
  affiliateId: string;
  amount: number;
  rate: number;
  status: 'PENDING' | 'APPROVED' | 'PAID';
  createdAt: Date;
  updatedAt: Date;
}

export class MLMModel {
  static async createStructure(data: Partial<MLMStructure>): Promise<MLMStructure> {
    return await prisma.mlmStructure.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        type: data.type || 'BINARY',
        maxLevels: data.maxLevels || 10,
        settings: data.settings || {},
        status: data.status || 'ACTIVE'
      }
    }) as MLMStructure;
  }

  static async findStructureById(id: string): Promise<MLMStructure | null> {
    return await prisma.mlmStructure.findUnique({
      where: { id }
    }) as MLMStructure | null;
  }

  static async updateStructure(id: string, data: Partial<MLMStructure>): Promise<MLMStructure> {
    return await prisma.mlmStructure.update({
      where: { id },
      data
    }) as MLMStructure;
  }

  static async createRelationship(data: Partial<MLMRelationship>): Promise<MLMRelationship> {
    return await prisma.mlmRelationship.create({
      data: {
        structureId: data.structureId!,
        sponsorId: data.sponsorId!,
        affiliateId: data.affiliateId!,
        position: data.position || 'LEFT',
        level: data.level || 1
      }
    }) as MLMRelationship;
  }

  static async findRelationshipByAffiliate(affiliateId: string, structureId: string): Promise<MLMRelationship | null> {
    return await prisma.mlmRelationship.findUnique({
      where: { 
        structureId_affiliateId: {
          structureId,
          affiliateId
        }
      }
    }) as MLMRelationship | null;
  }

  static async getDownline(affiliateId: string, structureId: string, maxLevels: number = 10): Promise<MLMRelationship[]> {
    const relationship = await this.findRelationshipByAffiliate(affiliateId, structureId);
    if (!relationship) {
      return [];
    }

    return await prisma.mlmRelationship.findMany({
      where: {
        structureId,
        sponsorId: affiliateId,
        level: {
          lte: relationship.level + maxLevels
        }
      },
      orderBy: { level: 'asc' }
    }) as MLMRelationship[];
  }

  static async getUpline(affiliateId: string, structureId: string): Promise<MLMRelationship[]> {
    const relationship = await this.findRelationshipByAffiliate(affiliateId, structureId);
    if (!relationship) {
      return [];
    }

    const upline: MLMRelationship[] = [];
    let currentSponsorId = relationship.sponsorId;

    while (currentSponsorId) {
      const sponsor = await this.findRelationshipByAffiliate(currentSponsorId, structureId);
      if (sponsor) {
        upline.push(sponsor);
        currentSponsorId = sponsor.sponsorId;
      } else {
        break;
      }
    }

    return upline;
  }

  static async calculateMLMCommissions(conversionId: string, affiliateId: string, amount: number, structureId: string): Promise<MLMCommission[]> {
    const structure = await this.findStructureById(structureId);
    if (!structure) {
      throw new Error('MLM structure not found');
    }

    const commissions: MLMCommission[] = [];
    const upline = await this.getUpline(affiliateId, structureId);

    for (const member of upline) {
      if (member.level > structure.maxLevels) {
        continue;
      }

      // Simple commission calculation - you can customize this based on your MLM structure
      const commissionRate = 5; // 5% commission rate
      const commissionAmount = (amount * commissionRate) / 100;

      const commission = await prisma.commission.create({
        data: {
          conversionId,
          affiliateId: member.affiliateId,
          amount: commissionAmount,
          rate: commissionRate,
          status: 'PENDING'
        }
      }) as MLMCommission;

      commissions.push(commission);
    }

    return commissions;
  }

  static async getMLMStats(affiliateId: string, structureId: string): Promise<any> {
    const relationship = await this.findRelationshipByAffiliate(affiliateId, structureId);
    if (!relationship) {
      return {
        level: 0,
        downlineCount: 0,
        totalCommissions: 0,
        pendingCommissions: 0,
        paidCommissions: 0
      };
    }

    const downline = await this.getDownline(affiliateId, structureId);
    const commissions = await prisma.commission.findMany({
      where: { affiliateId }
    });

    const totalCommissions = commissions.reduce((sum, comm) => sum + comm.amount, 0);
    const pendingCommissions = commissions
      .filter(comm => comm.status === 'PENDING')
      .reduce((sum, comm) => sum + comm.amount, 0);
    const paidCommissions = commissions
      .filter(comm => comm.status === 'PAID')
      .reduce((sum, comm) => sum + comm.amount, 0);

    return {
      level: relationship.level,
      downlineCount: downline.length,
      totalCommissions,
      pendingCommissions,
      paidCommissions,
      downlineByLevel: downline.reduce((acc, member) => {
        acc[member.level] = (acc[member.level] || 0) + 1;
        return acc;
      }, {} as Record<number, number>)
    };
  }

  static async getMLMReport(structureId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const where: any = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        gte: startDate,
        lte: endDate
      };
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        conversion: true,
        affiliate: {
          include: {
            user: true
          }
        }
      }
    });

    const stats = {
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, comm) => sum + comm.amount, 0),
      byAffiliate: {} as Record<string, any>,
      byStatus: {} as Record<string, any>
    };

    commissions.forEach(commission => {
      // By affiliate
      if (!stats.byAffiliate[commission.affiliateId]) {
        stats.byAffiliate[commission.affiliateId] = {
          count: 0,
          amount: 0,
          name: commission.affiliate.user.firstName + ' ' + commission.affiliate.user.lastName
        };
      }
      stats.byAffiliate[commission.affiliateId].count++;
      stats.byAffiliate[commission.affiliateId].amount += commission.amount;

      // By status
      stats.byStatus[commission.status] = (stats.byStatus[commission.status] || 0) + 1;
    });

    return stats;
  }

  static async approveCommission(commissionId: string): Promise<MLMCommission> {
    return await prisma.commission.update({
      where: { id: commissionId },
      data: { status: 'APPROVED' }
    }) as MLMCommission;
  }

  static async payCommission(commissionId: string): Promise<MLMCommission> {
    return await prisma.commission.update({
      where: { id: commissionId },
      data: { status: 'PAID' }
    }) as MLMCommission;
  }
}


