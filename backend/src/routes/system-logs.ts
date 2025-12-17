import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const router: Router = Router();
const prisma = new PrismaClient();

// Get system logs with filtering and pagination
router.get('/', async (req: Request, res: Response) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      level, 
      source, 
      search,
      startDate,
      endDate 
    } = req.query;

    const filters: any = {};
    
    if (level && level !== 'all') {
      filters.level = level;
    }
    
    if (source && source !== 'all') {
      filters.source = source;
    }
    
    if (search) {
      filters.OR = [
        { message: { contains: search as string, mode: 'insensitive' } },
        { userId: { contains: search as string, mode: 'insensitive' } },
        { source: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.activity.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    const total = await prisma.activity.count({ where: filters });

    res.json({
      logs,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// Get log statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [
      totalLogs,
      errorCount,
      warningCount,
      infoCount,
      successCount,
      todayLogs
    ] = await Promise.all([
      prisma.activity.count(),
      prisma.activity.count({ where: { action: { contains: 'error' } } }),
      prisma.activity.count({ where: { action: { contains: 'warning' } } }),
      prisma.activity.count({ where: { action: { contains: 'info' } } }),
      prisma.activity.count({ where: { action: { contains: 'success' } } }),
      prisma.activity.count({ where: { createdAt: { gte: today } } })
    ]);

    res.json({
      totalLogs,
      errorCount,
      warningCount,
      infoCount,
      successCount,
      todayLogs
    });
  } catch (error) {
    console.error('Error fetching log stats:', error);
    res.status(500).json({ error: 'Failed to fetch log statistics' });
  }
});

// Create a new log entry
router.post('/', async (req: Request, res: Response) => {
  try {
    const logSchema = z.object({
      level: z.enum(['error', 'warning', 'info', 'success']),
      message: z.string(),
      source: z.string(),
      userId: z.string().optional(),
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
      details: z.any().optional()
    });

    const data = logSchema.parse(req.body);

    const activity = await prisma.activity.create({
      data: {
        userId: data.userId || 'system',
        action: data.level || 'info',
        resource: data.source || 'system',
        details: data.details,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      }
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error('Error creating log:', error);
    res.status(400).json({ error: 'Failed to create log entry' });
  }
});

// Export logs
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { format = 'csv', level, source, startDate, endDate } = req.query;

    const filters: any = {};
    
    if (level && level !== 'all') {
      filters.level = level;
    }
    
    if (source && source !== 'all') {
      filters.source = source;
    }
    
    if (startDate || endDate) {
      filters.timestamp = {};
      if (startDate) filters.timestamp.gte = new Date(startDate as string);
      if (endDate) filters.timestamp.lte = new Date(endDate as string);
    }

    const logs = await prisma.activity.findMany({
      where: filters,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (format === 'csv') {
      const csv = [
        'Timestamp,Level,Message,Source,User,IP Address,User Agent',
        ...logs.map(log => [
          log.createdAt.toISOString(),
          log.action,
          `"${log.resource.replace(/"/g, '""')}"`,
          log.resource,
          log.user ? `${log.user.firstName} ${log.user.lastName} (${log.user.email})` : '',
          log.ipAddress || '',
          `"${(log.userAgent || '').replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="system-logs.csv"');
      res.send(csv);
    } else {
      res.json(logs);
    }
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({ error: 'Failed to export logs' });
  }
});

// Delete old logs
router.delete('/cleanup', async (req: Request, res: Response) => {
  try {
    const { olderThan = 90 } = req.query; // days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - Number(olderThan));

    const deletedCount = await prisma.activity.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    });

    res.json({ 
      message: `Deleted ${deletedCount.count} log entries older than ${olderThan} days`,
      deletedCount: deletedCount.count
    });
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    res.status(500).json({ error: 'Failed to cleanup logs' });
  }
});

export default router;
