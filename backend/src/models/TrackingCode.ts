import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface TrackingParameter {
  name: string;
  value: string;
  type: "STATIC" | "DYNAMIC" | "CUSTOM";
  required: boolean;
}

// TrackingEvent is now imported from Prisma

export class TrackingCodeModel {
  static async create(data: any): Promise<any> {
    return await prisma.trackingCode.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        type: data.type!,
        code: data.code!,
        placement: data.placement || "HEAD",
        events: data.events || [],
        parameters: (data.parameters || {}) as any,
        settings: (data.settings || {}) as any,
        status: data.status || "ACTIVE",
      },
    });
  }

  static async findById(id: string): Promise<any | null> {
    return await prisma.trackingCode.findUnique({
      where: { id },
    });
  }

  static async update(id: string, data: any): Promise<any> {
    return await prisma.trackingCode.update({
      where: { id },
      data: {
        ...data,
        parameters: data.parameters as any,
        settings: data.settings as any,
      },
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.trackingCode.delete({
      where: { id },
    });
  }

  static async list(
    filters: any = {},
    page: number = 1,
    limit: number = 10
  ): Promise<any[]> {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;
    if (filters.affiliateId) where.affiliateId = filters.affiliateId;
    if (filters.offerId) where.offerId = filters.offerId;

    return await prisma.trackingCode.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  static async generatePixelCode(
    trackingCodeId: string,
    baseUrl: string
  ): Promise<string> {
    const trackingCode = await this.findById(trackingCodeId);
    if (!trackingCode) {
      throw new Error("Tracking code not found");
    }

    const pixelUrl = `${baseUrl}/track/pixel/${trackingCodeId}`;

    return `
      <!-- Trackdesk Pixel -->
      <img src="${pixelUrl}" width="1" height="1" style="display:none;" alt="" />
      <!-- End Trackdesk Pixel -->
    `;
  }

  static async generateJavaScriptCode(
    trackingCodeId: string,
    baseUrl: string
  ): Promise<string> {
    const trackingCode = await this.findById(trackingCodeId);
    if (!trackingCode) {
      throw new Error("Tracking code not found");
    }

    const scriptUrl = `${baseUrl}/track/js/${trackingCodeId}`;

    return `
      <!-- Trackdesk JavaScript -->
      <script>
        (function() {
          var script = document.createElement('script');
          script.src = '${scriptUrl}';
          script.async = true;
          document.head.appendChild(script);
        })();
      </script>
      <!-- End Trackdesk JavaScript -->
    `;
  }

  static async generateServerToServerCode(
    trackingCodeId: string,
    baseUrl: string
  ): Promise<string> {
    const trackingCode = await this.findById(trackingCodeId);
    if (!trackingCode) {
      throw new Error("Tracking code not found");
    }

    const endpoint = `${baseUrl}/track/s2s/${trackingCodeId}`;

    return `
      <!-- Trackdesk Server-to-Server -->
      POST ${endpoint}
      Content-Type: application/json
      
      {
        "event": "conversion",
        "click_id": "{{click_id}}",
        "affiliate_id": "{{affiliate_id}}",
        "offer_id": "{{offer_id}}",
        "amount": "{{amount}}",
        "currency": "{{currency}}",
        "timestamp": "{{timestamp}}"
      }
      <!-- End Trackdesk Server-to-Server -->
    `;
  }

  static async generateWebhookCode(
    trackingCodeId: string,
    baseUrl: string
  ): Promise<string> {
    const trackingCode = await this.findById(trackingCodeId);
    if (!trackingCode) {
      throw new Error("Tracking code not found");
    }

    const webhookUrl = `${baseUrl}/track/webhook/${trackingCodeId}`;

    return `
      <!-- Trackdesk Webhook -->
      Webhook URL: ${webhookUrl}
      Method: POST
      Content-Type: application/json
      
      {
        "event": "conversion",
        "click_id": "{{click_id}}",
        "affiliate_id": "{{affiliate_id}}",
        "offer_id": "{{offer_id}}",
        "amount": "{{amount}}",
        "currency": "{{currency}}",
        "timestamp": "{{timestamp}}"
      }
      <!-- End Trackdesk Webhook -->
    `;
  }

  static async recordEvent(
    trackingCodeId: string,
    event: string,
    data: any,
    ipAddress: string,
    userAgent: string,
    referrer?: string
  ): Promise<any> {
    return (await prisma.trackingEvent.create({
      data: {
        trackingCodeId,
        eventType: event,
        event: event,
        data: data as any,
        ipAddress,
        userAgent,
        referrer,
        timestamp: new Date(),
      },
    })) as unknown as any;
  }

  static async getEvents(
    trackingCodeId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any[]> {
    const skip = (page - 1) * limit;
    return (await prisma.trackingEvent.findMany({
      where: { trackingCodeId },
      skip,
      take: limit,
      orderBy: { timestamp: "desc" },
    })) as unknown as any[];
  }

  static async getEventStats(
    trackingCodeId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = { trackingCodeId };

    if (startDate && endDate) {
      where.timestamp = {
        gte: startDate,
        lte: endDate,
      };
    }

    const events = await prisma.trackingEvent.findMany({
      where,
      select: {
        event: true,
        timestamp: true,
      },
    });

    const stats: any = {
      total: events.length,
      byEvent: {},
      byDay: {},
      byHour: {},
    };

    events.forEach((event) => {
      // Count by event type
      stats.byEvent[event.event] = (stats.byEvent[event.event] || 0) + 1;

      // Count by day
      const day = event.timestamp.toISOString().split("T")[0];
      stats.byDay[day] = (stats.byDay[day] || 0) + 1;

      // Count by hour
      const hour = event.timestamp.getHours();
      stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
    });

    return stats;
  }

  static async validateTrackingCode(
    trackingCodeId: string,
    event: string
  ): Promise<boolean> {
    const trackingCode = await this.findById(trackingCodeId);
    if (!trackingCode) {
      return false;
    }

    if (trackingCode.status !== "ACTIVE") {
      return false;
    }

    if (!trackingCode.events.includes(event)) {
      return false;
    }

    return true;
  }
}
