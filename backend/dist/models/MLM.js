"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MLMModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class MLMModel {
    static async createStructure(data) {
        return await prisma.mlmStructure.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                type: data.type || 'BINARY',
                maxLevels: data.maxLevels || 10,
                settings: data.settings || {},
                status: data.status || 'ACTIVE'
            }
        });
    }
    static async findStructureById(id) {
        return await prisma.mlmStructure.findUnique({
            where: { id }
        });
    }
    static async updateStructure(id, data) {
        return await prisma.mlmStructure.update({
            where: { id },
            data
        });
    }
    static async createRelationship(data) {
        return await prisma.mlmRelationship.create({
            data: {
                structureId: data.structureId,
                sponsorId: data.sponsorId,
                affiliateId: data.affiliateId,
                position: data.position || 'LEFT',
                level: data.level || 1
            }
        });
    }
    static async findRelationshipByAffiliate(affiliateId, structureId) {
        return await prisma.mlmRelationship.findUnique({
            where: {
                structureId_affiliateId: {
                    structureId,
                    affiliateId
                }
            }
        });
    }
    static async getDownline(affiliateId, structureId, maxLevels = 10) {
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
        });
    }
    static async getUpline(affiliateId, structureId) {
        const relationship = await this.findRelationshipByAffiliate(affiliateId, structureId);
        if (!relationship) {
            return [];
        }
        const upline = [];
        let currentSponsorId = relationship.sponsorId;
        while (currentSponsorId) {
            const sponsor = await this.findRelationshipByAffiliate(currentSponsorId, structureId);
            if (sponsor) {
                upline.push(sponsor);
                currentSponsorId = sponsor.sponsorId;
            }
            else {
                break;
            }
        }
        return upline;
    }
    static async calculateMLMCommissions(conversionId, affiliateId, amount, structureId) {
        const structure = await this.findStructureById(structureId);
        if (!structure) {
            throw new Error('MLM structure not found');
        }
        const commissions = [];
        const upline = await this.getUpline(affiliateId, structureId);
        for (const member of upline) {
            if (member.level > structure.maxLevels) {
                continue;
            }
            const commissionRate = 5;
            const commissionAmount = (amount * commissionRate) / 100;
            const commission = await prisma.commission.create({
                data: {
                    conversionId,
                    affiliateId: member.affiliateId,
                    amount: commissionAmount,
                    rate: commissionRate,
                    status: 'PENDING'
                }
            });
            commissions.push(commission);
        }
        return commissions;
    }
    static async getMLMStats(affiliateId, structureId) {
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
            }, {})
        };
    }
    static async getMLMReport(structureId, startDate, endDate) {
        const where = {};
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
            byAffiliate: {},
            byStatus: {}
        };
        commissions.forEach(commission => {
            if (!stats.byAffiliate[commission.affiliateId]) {
                stats.byAffiliate[commission.affiliateId] = {
                    count: 0,
                    amount: 0,
                    name: commission.affiliate.user.firstName + ' ' + commission.affiliate.user.lastName
                };
            }
            stats.byAffiliate[commission.affiliateId].count++;
            stats.byAffiliate[commission.affiliateId].amount += commission.amount;
            stats.byStatus[commission.status] = (stats.byStatus[commission.status] || 0) + 1;
        });
        return stats;
    }
    static async approveCommission(commissionId) {
        return await prisma.commission.update({
            where: { id: commissionId },
            data: { status: 'APPROVED' }
        });
    }
    static async payCommission(commissionId) {
        return await prisma.commission.update({
            where: { id: commissionId },
            data: { status: 'PAID' }
        });
    }
}
exports.MLMModel = MLMModel;
//# sourceMappingURL=MLM.js.map