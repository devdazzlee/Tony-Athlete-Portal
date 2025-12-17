import { prisma } from '../lib/prisma';

export interface Alert {
  id: string;
  accountId: string;
  name: string;
  description: string;
  type: 'SYSTEM' | 'PERFORMANCE' | 'SECURITY' | 'BUSINESS' | 'COMPLIANCE' | 'CUSTOM';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'INACTIVE' | 'TRIGGERED' | 'RESOLVED';
  conditions: AlertCondition[];
  actions: AlertAction[];
  recipients: string[];
  cooldownPeriod: number; // minutes
  lastTriggered?: Date;
  triggerCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCondition {
  field: string;
  operator: 'EQUALS' | 'NOT_EQUALS' | 'GREATER_THAN' | 'LESS_THAN' | 'CONTAINS' | 'NOT_CONTAINS' | 'IN' | 'NOT_IN' | 'BETWEEN';
  value: any;
  threshold?: number;
  timeWindow?: number; // minutes
}

export interface AlertAction {
  type: 'EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK' | 'SLACK' | 'DISCORD' | 'CUSTOM';
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface AlertEvent {
  id: string;
  alertId: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  data: any;
  status: 'TRIGGERED' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
  triggeredAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  resolvedBy?: string;
  notes?: string;
}

export interface AlertSubscription {
  id: string;
  userId: string;
  alertId: string;
  notificationMethods: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class AlertsModel {
  static async create(data: Partial<Alert>): Promise<Alert> {
    // Mock implementation since alert table doesn't exist in schema
    return {
      id: 'mock-alert-id',
      accountId: data.accountId!,
      name: data.name!,
      description: data.description || '',
      type: data.type!,
      severity: data.severity || 'MEDIUM',
      status: data.status || 'ACTIVE',
      conditions: data.conditions || [],
      actions: data.actions || [],
      recipients: data.recipients || [],
      cooldownPeriod: data.cooldownPeriod || 60,
      triggerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Alert;
  }

  static async findById(id: string): Promise<Alert | null> {
    // Mock implementation
    return null;
  }

  static async update(id: string, data: Partial<Alert>): Promise<Alert> {
    // Mock implementation
    return {
      id,
      accountId: 'mock-account',
      name: 'Mock Alert',
      description: '',
      type: 'SYSTEM',
      severity: 'MEDIUM',
      status: 'ACTIVE',
      conditions: [],
      actions: [],
      recipients: [],
      cooldownPeriod: 60,
      triggerCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    } as Alert;
  }

  static async delete(id: string): Promise<void> {
    // Mock implementation
  }

  static async list(accountId: string, filters: any = {}): Promise<Alert[]> {
    // Mock implementation
    return [];
  }

  static async triggerAlert(alertId: string, data: any): Promise<AlertEvent> {
    // Mock implementation
    return {
      id: 'mock-event-id',
      alertId,
      type: 'SYSTEM',
      severity: 'MEDIUM',
      title: 'Mock Alert',
      message: 'This is a mock alert event',
      data,
      status: 'TRIGGERED',
      triggeredAt: new Date()
    } as AlertEvent;
  }

  static async testAlert(alertId: string): Promise<AlertEvent> {
    const testData = {
      test: true,
      timestamp: new Date().toISOString(),
      message: 'This is a test alert'
    };

    return await this.triggerAlert(alertId, testData);
  }

  static async getAlertStats(accountId: string, startDate?: Date, endDate?: Date): Promise<any> {
    // Mock implementation
    return {
      totalAlerts: 0,
      activeAlerts: 0,
      triggeredAlerts: 0,
      resolvedAlerts: 0,
      totalEvents: 0,
      eventsByType: {},
      eventsBySeverity: {},
      eventsByStatus: {},
      topAlerts: []
    };
  }

  static async createDefaultAlerts(accountId: string): Promise<Alert[]> {
    // Mock implementation
    return [];
  }

  static async getAlertDashboard(accountId: string): Promise<any> {
    // Mock implementation
    return {
      alerts: [],
      recentEvents: [],
      stats: {
        totalAlerts: 0,
        activeAlerts: 0,
        triggeredAlerts: 0,
        resolvedAlerts: 0,
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        eventsByStatus: {},
        topAlerts: []
      }
    };
  }
}


