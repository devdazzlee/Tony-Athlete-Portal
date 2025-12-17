import { Request, Response } from 'express';
import { PayoutAutomationModel } from '../models/PayoutAutomation';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        accountId: string;
        affiliateId?: string;
        userId?: string;
      };
    }
  }
}

export class PayoutBuilderController {
  // CRUD Operations
  static async createPayoutRule(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      const ruleData = req.body;
      
      const rule = await PayoutAutomationModel.createRule({
        accountId,
        ...ruleData
      });
      
      res.status(201).json({
        success: true,
        data: rule,
        message: 'Payout rule created successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getPayoutRule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const rule = await PayoutAutomationModel.findById(id);
      if (!rule) {
        return res.status(404).json({
          success: false,
          error: 'Payout rule not found'
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

  static async updatePayoutRule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const rule = await PayoutAutomationModel.update(id, updateData);
      
      res.json({
        success: true,
        data: rule,
        message: 'Payout rule updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async deletePayoutRule(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      await PayoutAutomationModel.delete(id);
      
      res.json({
        success: true,
        message: 'Payout rule deleted successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async listPayoutRules(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      const filters = req.query;
      
      const rules = await PayoutAutomationModel.list(accountId, filters);
      
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

  // Payout Conditions Management
  static async addCondition(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const conditionData = req.body;
      
      const rule = await PayoutAutomationModel.addCondition(ruleId, conditionData);
      
      res.json({
        success: true,
        data: rule,
        message: 'Condition added successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateCondition(req: Request, res: Response) {
    try {
      const { ruleId, conditionId } = req.params;
      const updateData = req.body;
      
      const rule = await PayoutAutomationModel.updateCondition(ruleId, conditionId, updateData);
      
      res.json({
        success: true,
        data: rule,
        message: 'Condition updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async removeCondition(req: Request, res: Response) {
    try {
      const { ruleId, conditionId } = req.params;
      
      const rule = await PayoutAutomationModel.removeCondition(ruleId, conditionId);
      
      res.json({
        success: true,
        data: rule,
        message: 'Condition removed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Payout Actions Management
  static async addAction(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const actionData = req.body;
      
      const rule = await PayoutAutomationModel.addAction(ruleId, actionData);
      
      res.json({
        success: true,
        data: rule,
        message: 'Action added successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async updateAction(req: Request, res: Response) {
    try {
      const { ruleId, actionId } = req.params;
      const updateData = req.body;
      
      const rule = await PayoutAutomationModel.updateAction(ruleId, actionId, updateData);
      
      res.json({
        success: true,
        data: rule,
        message: 'Action updated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async removeAction(req: Request, res: Response) {
    try {
      const { ruleId, actionId } = req.params;
      
      const rule = await PayoutAutomationModel.removeAction(ruleId, actionId);
      
      res.json({
        success: true,
        data: rule,
        message: 'Action removed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Payout Processing
  static async processPayouts(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const { dryRun = false } = req.body;
      
      const result = await PayoutAutomationModel.processPayouts(ruleId, dryRun);
      
      res.json({
        success: true,
        data: result,
        message: dryRun ? 'Payout preview generated' : 'Payouts processed successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async previewPayouts(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const filters = req.query;
      
      const preview = await PayoutAutomationModel.previewPayouts(ruleId, filters);
      
      res.json({
        success: true,
        data: preview,
        message: 'Payout preview generated'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Payout History
  static async getPayoutHistory(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const filters = req.query;
      
      const history = await PayoutAutomationModel.getPayoutHistory(ruleId, filters);
      
      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Payout Reports
  static async generatePayoutReport(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const { format = 'json', startDate, endDate } = req.body;
      
      const report = await PayoutAutomationModel.generatePayoutReport(ruleId, format, startDate ? new Date(startDate) : undefined, endDate ? new Date(endDate) : undefined);
      
      res.json({
        success: true,
        data: report,
        message: 'Payout report generated successfully'
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // Statistics
  static async getPayoutStats(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      const { startDate, endDate } = req.query;
      
      const stats = await PayoutAutomationModel.getPayoutStats(accountId, startDate ? new Date(startDate as string) : undefined, endDate ? new Date(endDate as string) : undefined);
      
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

  // Dashboard
  static async getPayoutBuilderDashboard(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      
      const dashboard = await PayoutAutomationModel.getPayoutAutomationDashboard(accountId);
      
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

  // Default Rules
  static async createDefaultRules(req: Request, res: Response) {
    try {
      const { accountId } = req.user!;
      
      const rules = await PayoutAutomationModel.createDefaultRules(accountId);
      
      res.status(201).json({
        success: true,
        data: rules,
        message: 'Default payout rules created successfully'
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
      const { ruleId } = req.params;
      const testData = req.body;
      
      const result = await PayoutAutomationModel.testRule(ruleId, testData);
      
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

  // Schedule Management
  static async updateSchedule(req: Request, res: Response) {
    try {
      const { ruleId } = req.params;
      const scheduleData = req.body;
      
      const rule = await PayoutAutomationModel.updateSchedule(ruleId, scheduleData);
      
      res.json({
        success: true,
        data: rule,
        message: 'Schedule updated successfully'
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
      const { accountId } = req.user!;
      const { format = 'json' } = req.query;
      
      const exportData = await PayoutAutomationModel.exportRules(accountId, format as string);
      
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
      const { accountId } = req.user!;
      const { rules, overwrite = false } = req.body;
      
      const result = await PayoutAutomationModel.importRules(accountId, rules, overwrite);
      
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


