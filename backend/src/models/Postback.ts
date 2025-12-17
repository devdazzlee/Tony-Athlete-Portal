import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface Postback {
  id: string;
  name: string;
  url: string;
  method: "GET" | "POST";
  events: string[];
  parameters: PostbackParameter[];
  headers: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  status: "ACTIVE" | "INACTIVE" | "ERROR";
  lastTriggered?: Date;
  successCount: number;
  failureCount: number;
  affiliateId?: string;
  offerId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PostbackParameter {
  name: string;
  value: string;
  type: "STATIC" | "DYNAMIC" | "CUSTOM";
  required: boolean;
}

export interface PostbackLog {
  id: string;
  postbackId: string;
  event: string;
  url: string;
  method: string;
  payload: any;
  response?: any;
  statusCode?: number;
  success: boolean;
  error?: string;
  triggeredAt: Date;
  responseTime: number;
}

export class PostbackModel {
  static async create(data: any): Promise<any> {
    return (await prisma.postback.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        url: data.url!,
        method: data.method || "POST",
        events: data.events || [],
        parameters: (data.parameters || []) as any,
        headers: (data.headers || {}) as any,
        status: data.status || "ACTIVE",
      },
    })) as unknown as any;
  }

  static async findById(id: string): Promise<any | null> {
    return (await prisma.postback.findUnique({
      where: { id },
    })) as unknown as any | null;
  }

  static async update(id: string, data: any): Promise<any> {
    return (await prisma.postback.update({
      where: { id },
      data: {
        ...data,
        parameters: data.parameters as any,
        headers: data.headers as any,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async delete(id: string): Promise<void> {
    await prisma.postback.delete({
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
    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.event) where.events = { has: filters.event };

    return (await prisma.postback.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async triggerPostback(
    postbackId: string,
    event: string,
    data: any
  ): Promise<any> {
    const postback = await this.findById(postbackId);
    if (!postback) {
      throw new Error("Postback not found");
    }

    if (!postback.events.includes(event)) {
      throw new Error("Event not configured for this postback");
    }

    const startTime = Date.now();
    let success = false;
    let responseData: any = null;
    let statusCode: number = 0;
    let error: string | undefined;

    try {
      // Build URL with parameters
      let url = postback.url;
      const urlParams = new URLSearchParams();

      // Add dynamic parameters
      const parameters = (postback.parameters as any) || [];
      for (const param of parameters) {
        if (param.type === "STATIC") {
          urlParams.append(param.name, param.value);
        } else if (param.type === "DYNAMIC") {
          const value = this.getDynamicValue(param.value, data);
          if (value) {
            urlParams.append(param.name, value);
          }
        } else if (param.type === "CUSTOM") {
          const value = this.getCustomValue(param.value, data);
          if (value) {
            urlParams.append(param.name, value);
          }
        }
      }

      if (postback.method === "GET") {
        url += (url.includes("?") ? "&" : "?") + urlParams.toString();
      }

      // Make HTTP request
      const fetchOptions: any = {
        method: postback.method,
        headers: {
          "Content-Type": "application/json",
          ...(postback.headers as any),
        },
        timeout: 30000, // 30 seconds default timeout
      };

      if (postback.method === "POST") {
        fetchOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, fetchOptions);
      statusCode = response.status;
      success = response.ok;

      if (success) {
        responseData = await response.json();
      } else {
        error = `HTTP ${statusCode}: ${response.statusText}`;
      }
    } catch (err: any) {
      error = err.message;
      success = false;
    }

    const responseTime = Date.now() - startTime;

    // Log the postback attempt
    const log = (await prisma.postbackLog.create({
      data: {
        postbackId,
        event,
        data: data as any,
        response: responseData as any,
        status: success ? "SUCCESS" : "FAILED",
      },
    })) as unknown as any;

    // Update postback status
    await prisma.postback.update({
      where: { id: postbackId },
      data: {
        status: success ? "ACTIVE" : "ERROR",
        updatedAt: new Date(),
      },
    });

    return log;
  }

  private static getDynamicValue(param: string, data: any): string | null {
    const mappings: Record<string, string> = {
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

  private static getCustomValue(param: string, data: any): string | null {
    // Custom parameter logic
    try {
      const value = eval(`data.${param}`);
      return value ? value.toString() : null;
    } catch {
      return null;
    }
  }

  static async getLogs(
    postbackId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any[]> {
    const skip = (page - 1) * limit;
    return (await prisma.postbackLog.findMany({
      where: { postbackId },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async testPostback(postbackId: string, testData: any): Promise<any> {
    return await this.triggerPostback(postbackId, "test", testData);
  }
}
