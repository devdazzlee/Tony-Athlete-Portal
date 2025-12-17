import { TrafficControlModel } from '../models/TrafficControl';

export class TrafficControlService {
  // CRUD Operations
  static async createRule(ruleData: any) {
    return await TrafficControlModel.createRule(ruleData);
  }

  static async getRule(id: string) {
    return await TrafficControlModel.findRuleById(id);
  }

  static async updateRule(id: string, updateData: any) {
    return await TrafficControlModel.updateRule(id, updateData);
  }

  static async deleteRule(id: string) {
    return await TrafficControlModel.deleteRule(id);
  }

  static async listRules(filters: any = {}) {
    return await TrafficControlModel.listRules(filters);
  }

  // Traffic Processing
  static async processTraffic(data: any, ipAddress: string, userAgent: string, affiliateId?: string, clickId?: string) {
    return await TrafficControlModel.processTraffic(data, ipAddress, userAgent, affiliateId, clickId);
  }

  // Traffic Events
  static async getTrafficEvents(filters: any = {}, page: number = 1, limit: number = 50) {
    return await TrafficControlModel.getTrafficEvents(filters, page, limit);
  }

  // Statistics
  static async getTrafficStats(startDate?: Date, endDate?: Date) {
    return await TrafficControlModel.getTrafficStats(startDate, endDate);
  }

  // Rule Testing
  static async testRule(id: string, testData: any) {
    return { success: true }; // Simplified
  }

  // Default Rules
  static async createDefaultRules() {
    return await TrafficControlModel.createDefaultRules();
  }

  // IP Management
  static async blockIP(ipAddress: string, reason: string, duration?: number) {
    return { success: true }; // Simplified
  }

  static async unblockIP(ipAddress: string) {
    return { success: true }; // Simplified
  }

  static async getBlockedIPs(page: number = 1, limit: number = 50) {
    return []; // Simplified
  }

  // Country Management
  static async blockCountry(countryCode: string, reason: string) {
    return { success: true }; // Simplified
  }

  static async unblockCountry(countryCode: string) {
    return { success: true }; // Simplified
  }

  static async getBlockedCountries() {
    return []; // Simplified
  }

  // Rate Limiting
  static async updateRateLimit(ruleId: string, requestsPerMinute: number, requestsPerHour: number, requestsPerDay: number) {
    return { success: true }; // Simplified
  }

  // Device Management
  static async blockDevice(deviceType: string, reason: string) {
    return { success: true }; // Simplified
  }

  static async unblockDevice(deviceType: string) {
    return { success: true }; // Simplified
  }

  // Dashboard
  static async getTrafficControlDashboard() {
    return { stats: {} }; // Simplified
  }

  // Export/Import
  static async exportRules(format: string) {
    return []; // Simplified
  }

  static async importRules(rules: any[], overwrite: boolean = false) {
    return []; // Simplified
  }

  // Business Logic Methods
  static async evaluateTrafficRules(data: any, ipAddress: string, userAgent: string, affiliateId?: string) {
    const rules = await this.listRules({ isActive: true });
    const results = [];

    for (const rule of rules) {
      const result = this.evaluateRule(rule, data, ipAddress, userAgent, affiliateId);
      results.push({
        ruleId: rule.id,
        ruleName: rule.name,
        result,
        action: result.action
      });
    }

    return results;
  }

  private static evaluateRule(rule: any, data: any, ipAddress: string, userAgent: string, affiliateId?: string) {
    const conditions = rule.conditions;
    let allConditionsMet = true;
    const conditionResults = [];

    for (const condition of conditions) {
      if (!condition.isActive) continue;
      
      const fieldValue = this.getFieldValue(data, condition.field, ipAddress, userAgent, affiliateId);
      let conditionMet = false;

      switch (condition.operator) {
        case 'EQUALS':
          conditionMet = fieldValue === condition.value;
          break;
        case 'NOT_EQUALS':
          conditionMet = fieldValue !== condition.value;
          break;
        case 'GREATER_THAN':
          conditionMet = Number(fieldValue) > Number(condition.value);
          break;
        case 'LESS_THAN':
          conditionMet = Number(fieldValue) < Number(condition.value);
          break;
        case 'CONTAINS':
          conditionMet = String(fieldValue).includes(String(condition.value));
          break;
        case 'NOT_CONTAINS':
          conditionMet = !String(fieldValue).includes(String(condition.value));
          break;
        case 'IN':
          conditionMet = Array.isArray(condition.value) && condition.value.includes(fieldValue);
          break;
        case 'NOT_IN':
          conditionMet = Array.isArray(condition.value) && !condition.value.includes(fieldValue);
          break;
        case 'REGEX':
          try {
            const regex = new RegExp(condition.value);
            conditionMet = regex.test(String(fieldValue));
          } catch {
            conditionMet = false;
          }
          break;
        case 'IS_EMPTY':
          conditionMet = !fieldValue || fieldValue === '';
          break;
        case 'IS_NOT_EMPTY':
          conditionMet = fieldValue && fieldValue !== '';
          break;
      }

      conditionResults.push({
        field: condition.field,
        operator: condition.operator,
        value: condition.value,
        actualValue: fieldValue,
        met: conditionMet
      });

      if (!conditionMet) {
        allConditionsMet = false;
      }
    }

    return {
      action: allConditionsMet ? rule.action : 'ALLOW',
      conditionResults,
      rule: rule
    };
  }

  private static getFieldValue(data: any, field: string, ipAddress: string, userAgent: string, affiliateId?: string): any {
    // Handle special fields
    switch (field) {
      case 'ip_address':
        return ipAddress;
      case 'user_agent':
        return userAgent;
      case 'affiliate_id':
        return affiliateId;
      case 'country':
        return this.getCountryFromIP(ipAddress);
      case 'device_type':
        return this.getDeviceTypeFromUserAgent(userAgent);
      case 'browser':
        return this.getBrowserFromUserAgent(userAgent);
      case 'os':
        return this.getOSFromUserAgent(userAgent);
      case 'referrer':
        return data.referrer;
      case 'timestamp':
        return new Date().toISOString();
      default:
        // Handle nested fields
        const fields = field.split('.');
        let value = data;
        
        for (const f of fields) {
          value = value?.[f];
        }
        
        return value;
    }
  }

  private static getCountryFromIP(ipAddress: string): string {
    // Implement IP geolocation logic
    // This is a simplified version - in production, use a proper geolocation service
    return 'US'; // Placeholder
  }

  private static getDeviceTypeFromUserAgent(userAgent: string): string {
    if (/Mobile|Android|iPhone|iPad/.test(userAgent)) {
      return 'MOBILE';
    } else if (/Tablet|iPad/.test(userAgent)) {
      return 'TABLET';
    } else {
      return 'DESKTOP';
    }
  }

  private static getBrowserFromUserAgent(userAgent: string): string {
    if (/Chrome/.test(userAgent)) return 'Chrome';
    if (/Firefox/.test(userAgent)) return 'Firefox';
    if (/Safari/.test(userAgent)) return 'Safari';
    if (/Edge/.test(userAgent)) return 'Edge';
    if (/Opera/.test(userAgent)) return 'Opera';
    return 'Unknown';
  }

  private static getOSFromUserAgent(userAgent: string): string {
    if (/Windows/.test(userAgent)) return 'Windows';
    if (/Mac/.test(userAgent)) return 'macOS';
    if (/Linux/.test(userAgent)) return 'Linux';
    if (/Android/.test(userAgent)) return 'Android';
    if (/iOS/.test(userAgent)) return 'iOS';
    return 'Unknown';
  }

  static async executeTrafficAction(action: string, data: any, ipAddress: string, userAgent: string, affiliateId?: string) {
    switch (action) {
      case 'ALLOW':
        return { action: 'ALLOW', message: 'Traffic allowed' };
      case 'BLOCK':
        return { action: 'BLOCK', message: 'Traffic blocked' };
      case 'REDIRECT':
        return { action: 'REDIRECT', message: 'Traffic redirected', url: data.redirectUrl };
      case 'RATE_LIMIT':
        return { action: 'RATE_LIMIT', message: 'Rate limit exceeded' };
      case 'GEO_BLOCK':
        return { action: 'GEO_BLOCK', message: 'Geographic location blocked' };
      case 'DEVICE_BLOCK':
        return { action: 'DEVICE_BLOCK', message: 'Device type blocked' };
      case 'BROWSER_BLOCK':
        return { action: 'BROWSER_BLOCK', message: 'Browser blocked' };
      case 'OS_BLOCK':
        return { action: 'OS_BLOCK', message: 'Operating system blocked' };
      case 'AFFILIATE_BLOCK':
        return { action: 'AFFILIATE_BLOCK', message: 'Affiliate blocked' };
      case 'IP_BLOCK':
        return { action: 'IP_BLOCK', message: 'IP address blocked' };
      default:
        return { action: 'ALLOW', message: 'Unknown action, defaulting to allow' };
    }
  }

  static async checkRateLimit(ipAddress: string, affiliateId?: string, ruleId?: string) {
    // Implement rate limiting logic
    const key = affiliateId ? `affiliate:${affiliateId}` : `ip:${ipAddress}`;
    
    // Check against rate limits
    const limits = {
      perMinute: 60,
      perHour: 1000,
      perDay: 10000
    };

    // This is a simplified version - in production, use Redis or similar
    return {
      allowed: true,
      remaining: limits.perMinute,
      resetTime: new Date(Date.now() + 60000)
    };
  }

  static async getTrafficControlPerformance(startDate?: Date, endDate?: Date) {
    const stats = await this.getTrafficStats(startDate, endDate);
    
    const performance = {
      totalRequests: stats.totalRequests,
      allowedRequests: stats.allowedRequests,
      blockedRequests: stats.blockedRequests,
      redirectedRequests: stats.redirectedRequests,
      rateLimitedRequests: 0, // Simplified
      allowRate: stats.totalRequests > 0 ? (stats.allowedRequests / stats.totalRequests) * 100 : 0,
      blockRate: stats.totalRequests > 0 ? (stats.blockedRequests / stats.totalRequests) * 100 : 0,
      byAction: {},
      byCountry: {},
      byDevice: {},
      byBrowser: {},
      byOS: {},
      byHour: {},
      byDay: {}
    };

    return performance;
  }

  static async getTrafficControlRecommendations() {
    const recommendations: string[] = [];
    const performance = await this.getTrafficControlPerformance();

    // Performance recommendations
    if (performance.blockRate > 50) {
      recommendations.push('High block rate detected - review blocking rules');
    }

    if (performance.rateLimitedRequests > 1000) {
      recommendations.push('High rate limiting - consider adjusting limits');
    }

    // Security recommendations
    if (performance.byCountry['CN'] > performance.totalRequests * 0.3) {
      recommendations.push('High traffic from China - consider geo-blocking');
    }

    if (performance.byDevice['MOBILE'] > performance.totalRequests * 0.8) {
      recommendations.push('High mobile traffic - optimize for mobile');
    }

    // Rule recommendations
    const rules = await this.listRules();
    if (rules.length === 0) {
      recommendations.push('No traffic control rules configured - add basic rules');
    }

    return recommendations;
  }

  static async analyzeTrafficPatterns(startDate?: Date, endDate?: Date) {
    const events = await this.getTrafficEvents({}, 1, 1000);
    
    const patterns = {
      peakHours: {} as Record<number, number>,
      peakDays: {} as Record<string, number>,
      topCountries: {} as Record<string, number>,
      topDevices: {} as Record<string, number>,
      topBrowsers: {} as Record<string, number>,
      topOS: {} as Record<string, number>,
      suspiciousPatterns: [] as string[]
    };

    // Analyze patterns
    events.forEach(event => {
      const hour = new Date(event.timestamp).getHours();
      const day = new Date(event.timestamp).toISOString().split('T')[0];
      
      patterns.peakHours[hour] = (patterns.peakHours[hour] || 0) + 1;
      patterns.peakDays[day] = (patterns.peakDays[day] || 0) + 1;
      patterns.topCountries[event.country] = (patterns.topCountries[event.country] || 0) + 1;
      patterns.topDevices['device'] = (patterns.topDevices['device'] || 0) + 1; // Simplified
      patterns.topBrowsers[event.browser] = (patterns.topBrowsers[event.browser] || 0) + 1;
      patterns.topOS[event.os] = (patterns.topOS[event.os] || 0) + 1;
    });

    // Detect suspicious patterns
    if (patterns.topCountries['CN'] > events.length * 0.5) {
      patterns.suspiciousPatterns.push('High traffic from China');
    }

    if (patterns.topDevices['MOBILE'] > events.length * 0.9) {
      patterns.suspiciousPatterns.push('Unusually high mobile traffic');
    }

    return patterns;
  }
}
