import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface GetAllOffersParams {
  page: number;
  limit: number;
  search?: string;
  status?: string;
}

export interface CreateOfferData {
  name: string;
  description: string;
  commissionRate: number;
  startDate: string;
  endDate?: string;
}

export interface UpdateOfferData {
  name?: string;
  description?: string;
  commissionRate?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}

export interface ApplyForOfferData {
  message?: string;
}

export interface UpdateApplicationData {
  status: string;
  message?: string;
}

export interface CreateCreativeData {
  name: string;
  type: string;
  size: string;
  format: string;
  url: string;
  downloadUrl: string;
}

export interface UpdateCreativeData {
  name?: string;
  type?: string;
  size?: string;
  format?: string;
  url?: string;
  downloadUrl?: string;
}

export interface GetOfferApplicationsParams {
  page: number;
  limit: number;
  status?: string;
}

export interface GetOfferCreativesParams {
  page: number;
  limit: number;
  type?: string;
}

export interface GetOfferAnalyticsParams {
  timeRange?: string;
  startDate?: string;
  endDate?: string;
}

export interface GetOfferClicksParams {
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: string;
}

export class OfferService {
  async getAllOffers(params: GetAllOffersParams) {
    const { page, limit, search, status } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) {
      where.status = status;
    }

    const [offers, total] = await Promise.all([
      prisma.offer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.offer.count({ where }),
    ]);

    return {
      offers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getOfferById(id: string) {
    const offer = await prisma.offer.findUnique({
      where: { id },
      include: {
        creatives: true,
        applications: {
          include: {
            affiliate: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!offer) {
      throw new Error("Offer not found");
    }

    return offer;
  }

  async createOffer(data: CreateOfferData, accountId: string) {
    const offer = await prisma.offer.create({
      data: {
        accountId,
        name: data.name,
        description: data.description,
        commissionRate: data.commissionRate,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : null,
      },
    });

    return offer;
  }

  async updateOffer(id: string, data: UpdateOfferData) {
    const offer = await prisma.offer.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        commissionRate: data.commissionRate,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        status: data.status as any,
      },
    });

    return offer;
  }

  async deleteOffer(id: string) {
    await prisma.offer.delete({
      where: { id },
    });
  }

  async getOfferApplications(
    offerId: string,
    params: GetOfferApplicationsParams
  ) {
    const { page, limit, status } = params;
    const skip = (page - 1) * limit;

    const where: any = { offerId };
    if (status) {
      where.status = status;
    }

    const [applications, total] = await Promise.all([
      prisma.offerApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          affiliate: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.offerApplication.count({ where }),
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async applyForOffer(
    offerId: string,
    userId: string,
    data: ApplyForOfferData
  ) {
    // Get affiliate profile
    const affiliate = await prisma.affiliateProfile.findUnique({
      where: { userId },
    });

    if (!affiliate) {
      throw new Error("Affiliate profile not found");
    }

    const application = await prisma.offerApplication.create({
      data: {
        offerId,
        affiliateId: affiliate.id,
        message: data.message,
      },
    });

    return application;
  }

  async updateApplication(applicationId: string, data: UpdateApplicationData) {
    const application = await prisma.offerApplication.update({
      where: { id: applicationId },
      data: {
        status: data.status as any,
        message: data.message,
      },
    });

    return application;
  }

  async deleteApplication(applicationId: string) {
    await prisma.offerApplication.delete({
      where: { id: applicationId },
    });
  }

  async getOfferCreatives(offerId: string, params: GetOfferCreativesParams) {
    const { page, limit, type } = params;
    const skip = (page - 1) * limit;

    const where: any = { offerId };
    if (type) {
      where.type = type;
    }

    const [creatives, total] = await Promise.all([
      prisma.creative.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.creative.count({ where }),
    ]);

    return {
      creatives,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async createCreative(offerId: string, data: CreateCreativeData) {
    const creative = await prisma.creative.create({
      data: {
        offerId,
        name: data.name,
        type: data.type as any,
        size: data.size,
        format: data.format,
        url: data.url,
        downloadUrl: data.downloadUrl,
      },
    });

    return creative;
  }

  async updateCreative(creativeId: string, data: UpdateCreativeData) {
    const creative = await prisma.creative.update({
      where: { id: creativeId },
      data: {
        name: data.name,
        type: data.type as any,
        size: data.size,
        format: data.format,
        url: data.url,
        downloadUrl: data.downloadUrl,
      },
    });

    return creative;
  }

  async deleteCreative(creativeId: string) {
    await prisma.creative.delete({
      where: { id: creativeId },
    });
  }

  async getOfferAnalytics(offerId: string, params: GetOfferAnalyticsParams) {
    // Mock analytics data
    return {
      totalClicks: 2500,
      totalConversions: 85,
      totalRevenue: 4250.0,
      conversionRate: 3.4,
      topAffiliates: [
        { name: "John Doe", conversions: 25, earnings: 750.0 },
        { name: "Jane Smith", conversions: 20, earnings: 600.0 },
        { name: "Mike Johnson", conversions: 15, earnings: 450.0 },
      ],
    };
  }

  async getOfferClicks(offerId: string, params: GetOfferClicksParams) {
    // Mock clicks analytics
    return {
      totalClicks: 2500,
      clicksByDay: [
        { date: "2024-01-01", clicks: 120 },
        { date: "2024-01-02", clicks: 135 },
        { date: "2024-01-03", clicks: 110 },
      ],
      clicksByCountry: [
        { country: "USA", clicks: 1000 },
        { country: "Canada", clicks: 500 },
        { country: "UK", clicks: 300 },
      ],
    };
  }

  async getOfferConversions(offerId: string, params: GetOfferClicksParams) {
    // Mock conversions analytics
    return {
      totalConversions: 85,
      conversionsByDay: [
        { date: "2024-01-01", conversions: 4 },
        { date: "2024-01-02", conversions: 5 },
        { date: "2024-01-03", conversions: 3 },
      ],
      conversionsByAffiliate: [
        { affiliate: "John Doe", conversions: 25 },
        { affiliate: "Jane Smith", conversions: 20 },
        { affiliate: "Mike Johnson", conversions: 15 },
      ],
    };
  }
}
