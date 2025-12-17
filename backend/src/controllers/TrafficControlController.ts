import { Request, Response } from 'express';
import { TrafficControlModel } from '../models/TrafficControl';

export class TrafficControlController {
  // CRUD Operations
  static async createRule(req: Request, res: Response) {
    try {
      const ruleData = req.body;
      
      const rule = await TrafficControlModel.createRule(ruleData);
      
      res.status(201).json({
        success: true,
        data: rule,
        message: 'Traffic rule created successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getRule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const rule = await TrafficControlModel.findRuleById(id);
      if (!rule) {
        return res.status(404).json({
          success: false,
          error: 'Traffic rule not found'
        });
      }
      
      res.json({
        success: true,
        data: rule
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateRule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const rule = await TrafficControlModel.updateRule(id, updateData);
      
      res.json({
        success: true,
        data: rule,
        message: 'Traffic rule updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deleteRule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await TrafficControlModel.deleteRule(id);
      
      res.json({
        success: true,
        message: 'Traffic rule deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async listRules(req: Request, res: Response) {
    try {
      const filters = req.query;
      
      const rules = await TrafficControlModel.listRules(filters);
      
      res.json({
        success: true,
        data: rules,
        count: rules.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Traffic Processing
  static async processTraffic(req: Request, res: Response) {
    try {
      const { data, ipAddress, userAgent, affiliateId, clickId } = req.body;
      
      const result = await TrafficControlModel.processTraffic(data, ipAddress, userAgent, affiliateId, clickId);
      
      res.json({
        success: true,
        data: result,
        message: 'Traffic processed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Traffic Events
  static async getTrafficEvents(req: Request, res: Response) {
    try {
      const filters = req.query;
      const { page = 1, limit = 50 } = req.query;
      
      const events = await TrafficControlModel.getTrafficEvents(filters, Number(page), Number(limit));
      
      res.json({
        success: true,
        data: events,
        count: events.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Statistics
  static async getTrafficStats(req: Request, res: Response) {
    try {
      const { startDate, endDate } = req.query;
      
      const stats = await TrafficControlModel.getTrafficStats(
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Rule Testing
  static async testRule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const testData = req.body;
      
      const result = await TrafficControlModel.testRule(id, testData);
      
      res.json({
        success: true,
        data: result,
        message: 'Rule test completed'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Default Rules
  static async createDefaultRules(req: Request, res: Response) {
    try {
      const rules = await TrafficControlModel.createDefaultRules();
      
      res.status(201).json({
        success: true,
        data: rules,
        message: 'Default traffic rules created successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // IP Management
  static async blockIP(req: Request, res: Response) {
    try {
      const { ipAddress, reason, duration } = req.body;
      
      const result = await TrafficControlModel.blockIP(ipAddress, reason, duration);
      
      res.json({
        success: true,
        data: result,
        message: 'IP blocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async unblockIP(req: Request, res: Response) {
    try {
      const { ipAddress } = req.params;
      
      const result = await TrafficControlModel.unblockIP(ipAddress);
      
      res.json({
        success: true,
        data: result,
        message: 'IP unblocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getBlockedIPs(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50 } = req.query;
      
      const blockedIPs = await TrafficControlModel.getBlockedIPs(Number(page), Number(limit));
      
      res.json({
        success: true,
        data: blockedIPs,
        count: blockedIPs.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Country Management
  static async blockCountry(req: Request, res: Response) {
    try {
      const { countryCode, reason } = req.body;
      
      const result = await TrafficControlModel.blockCountry(countryCode, reason);
      
      res.json({
        success: true,
        data: result,
        message: 'Country blocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async unblockCountry(req: Request, res: Response) {
    try {
      const { countryCode } = req.params;
      
      const result = await TrafficControlModel.unblockCountry(countryCode);
      
      res.json({
        success: true,
        data: result,
        message: 'Country unblocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getBlockedCountries(req: Request, res: Response) {
    try {
      const blockedCountries = await TrafficControlModel.getBlockedCountries();
      
      res.json({
        success: true,
        data: blockedCountries,
        count: blockedCountries.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Rate Limiting
  static async updateRateLimit(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const { requestsPerMinute, requestsPerHour, requestsPerDay } = req.body;
      
      const result = await TrafficControlModel.updateRateLimit(ruleId, requestsPerMinute, requestsPerHour, requestsPerDay);
      
      res.json({
        success: true,
        data: result,
        message: 'Rate limit updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Device Management
  static async blockDevice(req: Request, res: Response) {
    try {
      const { deviceType, reason } = req.body;
      
      const result = await TrafficControlModel.blockDevice(deviceType, reason);
      
      res.json({
        success: true,
        data: result,
        message: 'Device blocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async unblockDevice(req: Request, res: Response) {
    try {
      const { deviceType } = req.params;
      
      const result = await TrafficControlModel.unblockDevice(deviceType);
      
      res.json({
        success: true,
        data: result,
        message: 'Device unblocked successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Dashboard
  static async getTrafficControlDashboard(req: Request, res: Response) {
    try {
      const dashboard = await TrafficControlModel.getTrafficControlDashboard();
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Export/Import
  static async exportRules(req: Request, res: Response) {
    try {
      const { format = 'json' } = req.query;
      
      const exportData = await TrafficControlModel.exportRules(format as string);
      
      res.json({
        success: true,
        data: exportData,
        message: 'Rules exported successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async importRules(req: Request, res: Response) {
    try {
      const { rules, overwrite = false } = req.body;
      
      const result = await TrafficControlModel.importRules(rules, overwrite);
      
      res.json({
        success: true,
        data: result,
        message: 'Rules imported successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}


