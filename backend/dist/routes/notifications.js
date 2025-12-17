"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', async (req, res) => {
    try {
        const { userId, type, status = 'all', page = 1, limit = 20, userRole } = req.query;
        const filters = {};
        if (userId) {
            filters.userId = userId;
        }
        if (userRole) {
            filters.userRole = userRole;
        }
        if (type && type !== 'all') {
            filters.type = type;
        }
        if (status && status !== 'all') {
            filters.read = status === 'read';
        }
        const notifications = await prisma.notification.findMany({
            where: filters,
            orderBy: {
                createdAt: 'desc'
            },
            skip: (Number(page) - 1) * Number(limit),
            take: Number(limit),
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true
                    }
                }
            }
        });
        const total = await prisma.notification.count({ where: filters });
        const unreadCount = await prisma.notification.count({
            where: { ...filters, read: false }
        });
        res.json({
            notifications,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            },
            unreadCount
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
router.get('/counts', async (req, res) => {
    try {
        const { userId, userRole } = req.query;
        const filters = {};
        if (userId)
            filters.userId = userId;
        if (userRole)
            filters.userRole = userRole;
        const [totalCount, unreadCount, systemCount, paymentCount, affiliateCount, conversionCount, alertCount] = await Promise.all([
            prisma.notification.count({ where: filters }),
            prisma.notification.count({ where: { ...filters, isRead: false } }),
            prisma.notification.count({ where: { ...filters, type: 'system' } }),
            prisma.notification.count({ where: { ...filters, type: 'payment' } }),
            prisma.notification.count({ where: { ...filters, type: 'affiliate' } }),
            prisma.notification.count({ where: { ...filters, type: 'conversion' } }),
            prisma.notification.count({ where: { ...filters, type: 'alert' } })
        ]);
        res.json({
            total: totalCount,
            unread: unreadCount,
            byType: {
                system: systemCount,
                payment: paymentCount,
                affiliate: affiliateCount,
                conversion: conversionCount,
                alert: alertCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching notification counts:', error);
        res.status(500).json({ error: 'Failed to fetch notification counts' });
    }
});
router.post('/', async (req, res) => {
    try {
        const notificationSchema = zod_1.z.object({
            userId: zod_1.z.string().optional(),
            userRole: zod_1.z.enum(['ADMIN', 'AFFILIATE']).optional(),
            type: zod_1.z.enum(['SYSTEM', 'SUCCESS', 'WARNING', 'ERROR', 'INFO']),
            title: zod_1.z.string(),
            message: zod_1.z.string(),
            priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
            data: zod_1.z.any().optional(),
            actionUrl: zod_1.z.string().optional(),
            expiresAt: zod_1.z.string().optional()
        });
        const data = notificationSchema.parse(req.body);
        if (!data.userId && data.userRole) {
            const users = await prisma.user.findMany({
                where: { role: data.userRole },
                select: { id: true }
            });
            const notifications = await Promise.all(users.map(user => prisma.notification.create({
                data: {
                    userId: user.id,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    data: data.data
                }
            })));
            res.status(201).json({
                message: `Created ${notifications.length} notifications`,
                notifications: notifications.slice(0, 5)
            });
        }
        else {
            const notification = await prisma.notification.create({
                data: {
                    userId: data.userId,
                    title: data.title,
                    message: data.message,
                    type: data.type,
                    data: data.data
                },
                include: {
                    user: {
                        select: {
                            firstName: true,
                            lastName: true,
                            email: true
                        }
                    }
                }
            });
            res.status(201).json(notification);
        }
    }
    catch (error) {
        console.error('Error creating notification:', error);
        res.status(400).json({ error: 'Failed to create notification' });
    }
});
router.put('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await prisma.notification.update({
            where: { id },
            data: {
                read: true
            }
        });
        res.json(notification);
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: 'Failed to mark notification as read' });
    }
});
router.put('/mark-all-read', async (req, res) => {
    try {
        const { userId, userRole } = req.body;
        const filters = { isRead: false };
        if (userId)
            filters.userId = userId;
        if (userRole)
            filters.userRole = userRole;
        const result = await prisma.notification.updateMany({
            where: filters,
            data: {
                read: true
            }
        });
        res.json({
            message: `Marked ${result.count} notifications as read`,
            updatedCount: result.count
        });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.notification.delete({
            where: { id }
        });
        res.json({ message: 'Notification deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: 'Failed to delete notification' });
    }
});
router.delete('/clear-all', async (req, res) => {
    try {
        const { userId, userRole, olderThan } = req.query;
        const filters = {};
        if (userId)
            filters.userId = userId;
        if (userRole)
            filters.userRole = userRole;
        if (olderThan) {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - Number(olderThan));
            filters.createdAt = { lt: cutoffDate };
        }
        const result = await prisma.notification.deleteMany({
            where: filters
        });
        res.json({
            message: `Deleted ${result.count} notifications`,
            deletedCount: result.count
        });
    }
    catch (error) {
        console.error('Error clearing notifications:', error);
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});
router.get('/preferences/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const preferences = {
            userId,
            email: {
                system: true,
                payment: true,
                affiliate: true,
                conversion: true,
                alert: true,
                announcement: true
            },
            push: {
                system: false,
                payment: true,
                affiliate: false,
                conversion: true,
                alert: true,
                announcement: false
            },
            frequency: 'immediate'
        };
        res.json(preferences);
    }
    catch (error) {
        console.error('Error fetching notification preferences:', error);
        res.status(500).json({ error: 'Failed to fetch notification preferences' });
    }
});
router.put('/preferences/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const preferencesSchema = zod_1.z.object({
            email: zod_1.z.object({
                system: zod_1.z.boolean(),
                payment: zod_1.z.boolean(),
                affiliate: zod_1.z.boolean(),
                conversion: zod_1.z.boolean(),
                alert: zod_1.z.boolean(),
                announcement: zod_1.z.boolean()
            }),
            push: zod_1.z.object({
                system: zod_1.z.boolean(),
                payment: zod_1.z.boolean(),
                affiliate: zod_1.z.boolean(),
                conversion: zod_1.z.boolean(),
                alert: zod_1.z.boolean(),
                announcement: zod_1.z.boolean()
            }),
            frequency: zod_1.z.enum(['immediate', 'daily', 'weekly'])
        });
        const preferences = preferencesSchema.parse(req.body);
        res.json({
            userId,
            ...preferences,
            updatedAt: new Date()
        });
    }
    catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(400).json({ error: 'Failed to update notification preferences' });
    }
});
router.post('/bulk', async (req, res) => {
    try {
        const bulkSchema = zod_1.z.object({
            userIds: zod_1.z.array(zod_1.z.string()).optional(),
            userRole: zod_1.z.enum(['ADMIN', 'AFFILIATE']).optional(),
            type: zod_1.z.enum(['SYSTEM', 'SUCCESS', 'WARNING', 'ERROR', 'INFO']),
            title: zod_1.z.string(),
            message: zod_1.z.string(),
            priority: zod_1.z.enum(['low', 'medium', 'high']).default('medium'),
            data: zod_1.z.any().optional(),
            actionUrl: zod_1.z.string().optional(),
            expiresAt: zod_1.z.string().optional()
        });
        const data = bulkSchema.parse(req.body);
        let targetUsers = [];
        if (data.userIds) {
            targetUsers = data.userIds;
        }
        else if (data.userRole) {
            const users = await prisma.user.findMany({
                where: { role: data.userRole },
                select: { id: true }
            });
            targetUsers = users.map(user => user.id);
        }
        if (targetUsers.length === 0) {
            return res.status(400).json({ error: 'No target users specified' });
        }
        const notifications = await Promise.all(targetUsers.map(userId => prisma.notification.create({
            data: {
                userId,
                type: data.type,
                title: data.title,
                message: data.message,
                data: data.data,
            }
        })));
        res.status(201).json({
            message: `Created ${notifications.length} bulk notifications`,
            count: notifications.length,
            notifications: notifications.slice(0, 5)
        });
    }
    catch (error) {
        console.error('Error sending bulk notifications:', error);
        res.status(400).json({ error: 'Failed to send bulk notifications' });
    }
});
router.get('/templates', async (req, res) => {
    try {
        const templates = [
            {
                id: 'welcome_affiliate',
                name: 'Welcome New Affiliate',
                type: 'affiliate',
                title: 'Welcome to {{programName}}!',
                message: 'Welcome {{affiliateName}}! Your affiliate account has been approved. You can now start promoting our offers and earning commissions.',
                variables: ['programName', 'affiliateName']
            },
            {
                id: 'conversion_approved',
                name: 'Conversion Approved',
                type: 'conversion',
                title: 'Conversion Approved - ${{amount}}',
                message: 'Great news! Your conversion for ${{amount}} has been approved. Commission: ${{commission}}',
                variables: ['amount', 'commission']
            },
            {
                id: 'payout_processed',
                name: 'Payout Processed',
                type: 'payment',
                title: 'Payout Processed - ${{amount}}',
                message: 'Your payout of ${{amount}} has been processed and will arrive in {{timeframe}}.',
                variables: ['amount', 'timeframe']
            },
            {
                id: 'system_maintenance',
                name: 'System Maintenance',
                type: 'system',
                title: 'Scheduled Maintenance',
                message: 'System maintenance is scheduled for {{date}} at {{time}}. Expected downtime: {{duration}}',
                variables: ['date', 'time', 'duration']
            },
            {
                id: 'performance_alert',
                name: 'Performance Alert',
                type: 'alert',
                title: 'Performance Alert: {{metric}}',
                message: 'Your {{metric}} has {{change}} by {{percentage}}% in the last {{period}}.',
                variables: ['metric', 'change', 'percentage', 'period']
            }
        ];
        res.json({ templates });
    }
    catch (error) {
        console.error('Error fetching notification templates:', error);
        res.status(500).json({ error: 'Failed to fetch notification templates' });
    }
});
exports.default = router;
//# sourceMappingURL=notifications.js.map