"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 50, level, source, search, startDate, endDate } = req.query;
        const filters = {};
        if (level && level !== 'all') {
            filters.level = level;
        }
        if (source && source !== 'all') {
            filters.source = source;
        }
        if (search) {
            filters.OR = [
                { message: { contains: search, mode: 'insensitive' } },
                { userId: { contains: search, mode: 'insensitive' } },
                { source: { contains: search, mode: 'insensitive' } }
            ];
        }
        if (startDate || endDate) {
            filters.timestamp = {};
            if (startDate)
                filters.timestamp.gte = new Date(startDate);
            if (endDate)
                filters.timestamp.lte = new Date(endDate);
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
    }
    catch (error) {
        console.error('Error fetching logs:', error);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});
router.get('/stats', async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const [totalLogs, errorCount, warningCount, infoCount, successCount, todayLogs] = await Promise.all([
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
    }
    catch (error) {
        console.error('Error fetching log stats:', error);
        res.status(500).json({ error: 'Failed to fetch log statistics' });
    }
});
router.post('/', async (req, res) => {
    try {
        const logSchema = zod_1.z.object({
            level: zod_1.z.enum(['error', 'warning', 'info', 'success']),
            message: zod_1.z.string(),
            source: zod_1.z.string(),
            userId: zod_1.z.string().optional(),
            ipAddress: zod_1.z.string().optional(),
            userAgent: zod_1.z.string().optional(),
            details: zod_1.z.any().optional()
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
    }
    catch (error) {
        console.error('Error creating log:', error);
        res.status(400).json({ error: 'Failed to create log entry' });
    }
});
router.get('/export', async (req, res) => {
    try {
        const { format = 'csv', level, source, startDate, endDate } = req.query;
        const filters = {};
        if (level && level !== 'all') {
            filters.level = level;
        }
        if (source && source !== 'all') {
            filters.source = source;
        }
        if (startDate || endDate) {
            filters.timestamp = {};
            if (startDate)
                filters.timestamp.gte = new Date(startDate);
            if (endDate)
                filters.timestamp.lte = new Date(endDate);
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
        }
        else {
            res.json(logs);
        }
    }
    catch (error) {
        console.error('Error exporting logs:', error);
        res.status(500).json({ error: 'Failed to export logs' });
    }
});
router.delete('/cleanup', async (req, res) => {
    try {
        const { olderThan = 90 } = req.query;
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
    }
    catch (error) {
        console.error('Error cleaning up logs:', error);
        res.status(500).json({ error: 'Failed to cleanup logs' });
    }
});
exports.default = router;
//# sourceMappingURL=system-logs.js.map