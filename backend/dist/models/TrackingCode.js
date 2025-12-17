"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingCodeModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TrackingCodeModel {
    static async create(data) {
        return await prisma.trackingCode.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                type: data.type,
                code: data.code,
                placement: data.placement || "HEAD",
                events: data.events || [],
                parameters: (data.parameters || {}),
                settings: (data.settings || {}),
                status: data.status || "ACTIVE",
            },
        });
    }
    static async findById(id) {
        return await prisma.trackingCode.findUnique({
            where: { id },
        });
    }
    static async update(id, data) {
        return await prisma.trackingCode.update({
            where: { id },
            data: {
                ...data,
                parameters: data.parameters,
                settings: data.settings,
            },
        });
    }
    static async delete(id) {
        await prisma.trackingCode.delete({
            where: { id },
        });
    }
    static async list(filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.type)
            where.type = filters.type;
        if (filters.affiliateId)
            where.affiliateId = filters.affiliateId;
        if (filters.offerId)
            where.offerId = filters.offerId;
        return await prisma.trackingCode.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        });
    }
    static async generatePixelCode(trackingCodeId, baseUrl) {
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
    static async generateJavaScriptCode(trackingCodeId, baseUrl) {
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
    static async generateServerToServerCode(trackingCodeId, baseUrl) {
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
    static async generateWebhookCode(trackingCodeId, baseUrl) {
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
    static async recordEvent(trackingCodeId, event, data, ipAddress, userAgent, referrer) {
        return (await prisma.trackingEvent.create({
            data: {
                trackingCodeId,
                eventType: event,
                event: event,
                data: data,
                ipAddress,
                userAgent,
                referrer,
                timestamp: new Date(),
            },
        }));
    }
    static async getEvents(trackingCodeId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return (await prisma.trackingEvent.findMany({
            where: { trackingCodeId },
            skip,
            take: limit,
            orderBy: { timestamp: "desc" },
        }));
    }
    static async getEventStats(trackingCodeId, startDate, endDate) {
        const where = { trackingCodeId };
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
        const stats = {
            total: events.length,
            byEvent: {},
            byDay: {},
            byHour: {},
        };
        events.forEach((event) => {
            stats.byEvent[event.event] = (stats.byEvent[event.event] || 0) + 1;
            const day = event.timestamp.toISOString().split("T")[0];
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
            const hour = event.timestamp.getHours();
            stats.byHour[hour] = (stats.byHour[hour] || 0) + 1;
        });
        return stats;
    }
    static async validateTrackingCode(trackingCodeId, event) {
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
exports.TrackingCodeModel = TrackingCodeModel;
//# sourceMappingURL=TrackingCode.js.map