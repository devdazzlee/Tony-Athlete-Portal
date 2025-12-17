"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostbackModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PostbackModel {
    static async create(data) {
        return (await prisma.postback.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                url: data.url,
                method: data.method || "POST",
                events: data.events || [],
                parameters: (data.parameters || []),
                headers: (data.headers || {}),
                status: data.status || "ACTIVE",
            },
        }));
    }
    static async findById(id) {
        return (await prisma.postback.findUnique({
            where: { id },
        }));
    }
    static async update(id, data) {
        return (await prisma.postback.update({
            where: { id },
            data: {
                ...data,
                parameters: data.parameters,
                headers: data.headers,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.postback.delete({
            where: { id },
        });
    }
    static async list(filters = {}, page = 1, limit = 10) {
        const skip = (page - 1) * limit;
        const where = {};
        if (filters.status)
            where.status = filters.status;
        if (filters.accountId)
            where.accountId = filters.accountId;
        if (filters.event)
            where.events = { has: filters.event };
        return (await prisma.postback.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async triggerPostback(postbackId, event, data) {
        const postback = await this.findById(postbackId);
        if (!postback) {
            throw new Error("Postback not found");
        }
        if (!postback.events.includes(event)) {
            throw new Error("Event not configured for this postback");
        }
        const startTime = Date.now();
        let success = false;
        let responseData = null;
        let statusCode = 0;
        let error;
        try {
            let url = postback.url;
            const urlParams = new URLSearchParams();
            const parameters = postback.parameters || [];
            for (const param of parameters) {
                if (param.type === "STATIC") {
                    urlParams.append(param.name, param.value);
                }
                else if (param.type === "DYNAMIC") {
                    const value = this.getDynamicValue(param.value, data);
                    if (value) {
                        urlParams.append(param.name, value);
                    }
                }
                else if (param.type === "CUSTOM") {
                    const value = this.getCustomValue(param.value, data);
                    if (value) {
                        urlParams.append(param.name, value);
                    }
                }
            }
            if (postback.method === "GET") {
                url += (url.includes("?") ? "&" : "?") + urlParams.toString();
            }
            const fetchOptions = {
                method: postback.method,
                headers: {
                    "Content-Type": "application/json",
                    ...postback.headers,
                },
                timeout: 30000,
            };
            if (postback.method === "POST") {
                fetchOptions.body = JSON.stringify(data);
            }
            const response = await fetch(url, fetchOptions);
            statusCode = response.status;
            success = response.ok;
            if (success) {
                responseData = await response.json();
            }
            else {
                error = `HTTP ${statusCode}: ${response.statusText}`;
            }
        }
        catch (err) {
            error = err.message;
            success = false;
        }
        const responseTime = Date.now() - startTime;
        const log = (await prisma.postbackLog.create({
            data: {
                postbackId,
                event,
                data: data,
                response: responseData,
                status: success ? "SUCCESS" : "FAILED",
            },
        }));
        await prisma.postback.update({
            where: { id: postbackId },
            data: {
                status: success ? "ACTIVE" : "ERROR",
                updatedAt: new Date(),
            },
        });
        return log;
    }
    static getDynamicValue(param, data) {
        const mappings = {
            click_id: data.clickId || "",
            affiliate_id: data.affiliateId || "",
            offer_id: data.offerId || "",
            conversion_id: data.conversionId || "",
            order_id: data.orderId || "",
            customer_id: data.customerId || "",
            amount: data.amount?.toString() || "",
            currency: data.currency || "",
            timestamp: new Date().toISOString(),
            ip_address: data.ipAddress || "",
            user_agent: data.userAgent || "",
            country: data.country || "",
            device: data.device || "",
            browser: data.browser || "",
            os: data.os || "",
        };
        return mappings[param] || null;
    }
    static getCustomValue(param, data) {
        try {
            const value = eval(`data.${param}`);
            return value ? value.toString() : null;
        }
        catch {
            return null;
        }
    }
    static async getLogs(postbackId, page = 1, limit = 50) {
        const skip = (page - 1) * limit;
        return (await prisma.postbackLog.findMany({
            where: { postbackId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async testPostback(postbackId, testData) {
        return await this.triggerPostback(postbackId, "test", testData);
    }
}
exports.PostbackModel = PostbackModel;
//# sourceMappingURL=Postback.js.map