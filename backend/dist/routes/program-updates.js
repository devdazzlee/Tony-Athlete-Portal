"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, category = 'all', priority = 'all', status = 'published', search } = req.query;
        const filters = {};
        if (category && category !== 'all') {
            filters.category = category;
        }
        if (priority && priority !== 'all') {
            filters.priority = priority;
        }
        if (status && status !== 'all') {
            filters.status = status;
        }
        if (search) {
            filters.OR = [
                { title: { contains: search, mode: 'insensitive' } },
                { content: { contains: search, mode: 'insensitive' } },
                { summary: { contains: search, mode: 'insensitive' } }
            ];
        }
        const mockUpdates = [
            {
                id: "UPDATE-001",
                title: "New Commission Structure Effective March 1st",
                summary: "We're introducing a new tiered commission structure that rewards top performers with higher rates.",
                content: "Starting March 1st, 2024, we're implementing a new tiered commission structure based on monthly performance:\n\n• Tier 1 (0-50 conversions): 15% commission\n• Tier 2 (51-100 conversions): 18% commission\n• Tier 3 (101+ conversions): 22% commission\n\nThis change will help reward our most dedicated affiliates while encouraging growth across all performance levels.",
                category: "commission",
                priority: "high",
                status: "published",
                publishedAt: new Date("2024-02-15T10:00:00Z"),
                createdAt: new Date("2024-02-10T10:00:00Z"),
                author: {
                    firstName: "Sarah",
                    lastName: "Johnson",
                    role: "Affiliate Manager"
                },
                tags: ["commission", "rates", "tiers"],
                attachments: [
                    {
                        name: "Commission Structure Guide.pdf",
                        url: "/downloads/commission-guide.pdf",
                        size: "245 KB"
                    }
                ]
            },
            {
                id: "UPDATE-002",
                title: "New Marketing Materials Available",
                summary: "Fresh banners, landing pages, and email templates now available in your affiliate dashboard.",
                content: "We've just released a new collection of high-converting marketing materials:\n\n**New Banners:**\n• 728x90 leaderboard banners\n• 300x250 medium rectangles\n• 160x600 skyscrapers\n\n**Landing Pages:**\n• Mobile-optimized product pages\n• Seasonal campaign pages\n• A/B tested high-conversion designs\n\n**Email Templates:**\n• Welcome series templates\n• Product announcement templates\n• Promotional campaign templates\n\nAll materials are available in your dashboard under 'Marketing Materials'.",
                category: "marketing",
                priority: "medium",
                status: "published",
                publishedAt: new Date("2024-02-10T14:30:00Z"),
                createdAt: new Date("2024-02-08T09:00:00Z"),
                author: {
                    firstName: "Mike",
                    lastName: "Chen",
                    role: "Creative Director"
                },
                tags: ["marketing", "banners", "templates"],
                attachments: []
            },
            {
                id: "UPDATE-003",
                title: "System Maintenance - February 20th",
                summary: "Scheduled maintenance window on February 20th from 2-4 AM EST. Minimal impact expected.",
                content: "We'll be performing routine system maintenance on February 20th, 2024, from 2:00 AM to 4:00 AM EST.\n\n**What to expect:**\n• Brief interruptions to tracking (5-10 minutes)\n• Dashboard may be temporarily unavailable\n• Affiliate links will continue to work normally\n• All data will be preserved and processed\n\n**No action required** from affiliates. Any missed tracking during the maintenance window will be automatically backfilled within 24 hours.\n\nWe appreciate your patience as we work to improve system performance and reliability.",
                category: "system",
                priority: "medium",
                status: "published",
                publishedAt: new Date("2024-02-05T16:00:00Z"),
                createdAt: new Date("2024-02-01T11:00:00Z"),
                author: {
                    firstName: "David",
                    lastName: "Rodriguez",
                    role: "Technical Operations"
                },
                tags: ["maintenance", "system", "downtime"],
                attachments: []
            },
            {
                id: "UPDATE-004",
                title: "Q1 2024 Performance Bonuses Announced",
                summary: "Earn additional bonuses based on Q1 performance metrics. Details and qualification criteria inside.",
                content: "We're excited to announce our Q1 2024 Performance Bonus program!\n\n**Bonus Tiers:**\n• Bronze: 100+ conversions = $500 bonus\n• Silver: 250+ conversions = $1,250 bonus\n• Gold: 500+ conversions = $3,000 bonus\n• Platinum: 1,000+ conversions = $7,500 bonus\n\n**Additional Qualifiers:**\n• Must maintain 95%+ link compliance\n• No policy violations during Q1\n• Active promotion for all 3 months\n\n**Tracking Period:** January 1 - March 31, 2024\n**Bonus Payout:** April 15, 2024\n\nStart planning your Q1 campaigns now to maximize your bonus potential!",
                category: "promotion",
                priority: "high",
                status: "published",
                publishedAt: new Date("2024-01-25T12:00:00Z"),
                createdAt: new Date("2024-01-20T10:00:00Z"),
                author: {
                    firstName: "Lisa",
                    lastName: "Wang",
                    role: "Affiliate Manager"
                },
                tags: ["bonus", "performance", "Q1"],
                attachments: [
                    {
                        name: "Q1 Bonus Program Details.pdf",
                        url: "/downloads/q1-bonus-details.pdf",
                        size: "189 KB"
                    }
                ]
            },
            {
                id: "UPDATE-005",
                title: "Policy Update: Cookie Duration Extended",
                summary: "Great news! We've extended our cookie duration from 30 to 45 days, effective immediately.",
                content: "We're pleased to announce an important policy update that benefits all our affiliates:\n\n**Cookie Duration Extension**\nEffective immediately, our tracking cookie duration has been extended from 30 days to 45 days.\n\n**What this means for you:**\n• Customers have 45 days (instead of 30) to complete their purchase\n• You'll be credited for conversions up to 45 days after the initial click\n• Higher conversion potential for longer consideration products\n• No changes to commission rates or payout terms\n\n**Implementation:**\n• All new clicks will automatically use the 45-day cookie\n• Existing cookies will be honored for their original 30-day term\n• Full implementation will be complete by February 1st\n\nThis change reflects our commitment to supporting affiliate success and recognizing the extended customer journey in today's market.",
                category: "policy",
                priority: "high",
                status: "published",
                publishedAt: new Date("2024-01-15T09:00:00Z"),
                createdAt: new Date("2024-01-10T15:30:00Z"),
                author: {
                    firstName: "Jennifer",
                    lastName: "Adams",
                    role: "Program Director"
                },
                tags: ["policy", "cookies", "duration"],
                attachments: []
            }
        ];
        let filteredUpdates = mockUpdates;
        if (category !== 'all') {
            filteredUpdates = filteredUpdates.filter(update => update.category === category);
        }
        if (priority !== 'all') {
            filteredUpdates = filteredUpdates.filter(update => update.priority === priority);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filteredUpdates = filteredUpdates.filter(update => update.title.toLowerCase().includes(searchLower) ||
                update.content.toLowerCase().includes(searchLower) ||
                update.summary.toLowerCase().includes(searchLower));
        }
        const total = filteredUpdates.length;
        const startIndex = (Number(page) - 1) * Number(limit);
        const paginatedUpdates = filteredUpdates.slice(startIndex, startIndex + Number(limit));
        res.json({
            updates: paginatedUpdates,
            pagination: {
                total,
                page: Number(page),
                limit: Number(limit),
                pages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching program updates:', error);
        res.status(500).json({ error: 'Failed to fetch program updates' });
    }
});
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const mockUpdate = {
            id: "UPDATE-001",
            title: "New Commission Structure Effective March 1st",
            summary: "We're introducing a new tiered commission structure that rewards top performers with higher rates.",
            content: "Starting March 1st, 2024, we're implementing a new tiered commission structure based on monthly performance:\n\n• Tier 1 (0-50 conversions): 15% commission\n• Tier 2 (51-100 conversions): 18% commission\n• Tier 3 (101+ conversions): 22% commission\n\nThis change will help reward our most dedicated affiliates while encouraging growth across all performance levels.\n\n**Implementation Timeline:**\n\n1. **February 15-28:** Transition period with notifications\n2. **March 1:** New structure goes live\n3. **March 15:** First payouts under new structure\n\n**Frequently Asked Questions:**\n\n**Q: How are tiers calculated?**\nA: Tiers are based on approved conversions in the current calendar month.\n\n**Q: When do tier changes take effect?**\nA: Tier changes are applied in real-time as you reach new thresholds.\n\n**Q: What happens to pending commissions?**\nA: Pending commissions will be paid at the rate active when the conversion was approved.\n\n**Need Help?**\nContact your affiliate manager or submit a support ticket if you have questions about the new commission structure.",
            category: "commission",
            priority: "high",
            status: "published",
            publishedAt: new Date("2024-02-15T10:00:00Z"),
            createdAt: new Date("2024-02-10T10:00:00Z"),
            updatedAt: new Date("2024-02-14T16:30:00Z"),
            author: {
                firstName: "Sarah",
                lastName: "Johnson",
                role: "Affiliate Manager",
                email: "sarah.johnson@company.com"
            },
            tags: ["commission", "rates", "tiers", "performance"],
            attachments: [
                {
                    name: "Commission Structure Guide.pdf",
                    url: "/downloads/commission-guide.pdf",
                    size: "245 KB",
                    downloadCount: 127
                },
                {
                    name: "FAQ - Commission Changes.pdf",
                    url: "/downloads/commission-faq.pdf",
                    size: "98 KB",
                    downloadCount: 89
                }
            ],
            relatedUpdates: [
                {
                    id: "UPDATE-004",
                    title: "Q1 2024 Performance Bonuses Announced",
                    publishedAt: new Date("2024-01-25T12:00:00Z")
                },
                {
                    id: "UPDATE-005",
                    title: "Policy Update: Cookie Duration Extended",
                    publishedAt: new Date("2024-01-15T09:00:00Z")
                }
            ],
            readCount: 342,
            reactions: {
                likes: 28,
                helpful: 45,
                questions: 7
            }
        };
        res.json(mockUpdate);
    }
    catch (error) {
        console.error('Error fetching program update:', error);
        res.status(500).json({ error: 'Failed to fetch program update' });
    }
});
router.post('/', async (req, res) => {
    try {
        const updateSchema = zod_1.z.object({
            title: zod_1.z.string().min(5).max(200),
            summary: zod_1.z.string().min(10).max(500),
            content: zod_1.z.string().min(50),
            category: zod_1.z.enum(['commission', 'marketing', 'system', 'policy', 'promotion', 'general']),
            priority: zod_1.z.enum(['low', 'medium', 'high']),
            status: zod_1.z.enum(['draft', 'published', 'archived']).default('draft'),
            tags: zod_1.z.array(zod_1.z.string()).default([]),
            publishAt: zod_1.z.string().optional(),
            notifyAffiliates: zod_1.z.boolean().default(true)
        });
        const data = updateSchema.parse(req.body);
        const programUpdate = {
            id: `UPDATE-${Date.now()}`,
            ...data,
            publishedAt: data.status === 'published' ? (data.publishAt ? new Date(data.publishAt) : new Date()) : null,
            createdAt: new Date(),
            author: {
                firstName: "Admin",
                lastName: "User",
                role: "System"
            },
            attachments: [],
            readCount: 0,
            reactions: {
                likes: 0,
                helpful: 0,
                questions: 0
            }
        };
        if (data.notifyAffiliates && data.status === 'published') {
            console.log('Would create notifications for all affiliates about new program update');
        }
        res.status(201).json(programUpdate);
    }
    catch (error) {
        console.error('Error creating program update:', error);
        res.status(400).json({ error: 'Failed to create program update' });
    }
});
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updateSchema = zod_1.z.object({
            title: zod_1.z.string().min(5).max(200).optional(),
            summary: zod_1.z.string().min(10).max(500).optional(),
            content: zod_1.z.string().min(50).optional(),
            category: zod_1.z.enum(['commission', 'marketing', 'system', 'policy', 'promotion', 'general']).optional(),
            priority: zod_1.z.enum(['low', 'medium', 'high']).optional(),
            status: zod_1.z.enum(['draft', 'published', 'archived']).optional(),
            tags: zod_1.z.array(zod_1.z.string()).optional(),
            publishAt: zod_1.z.string().optional()
        });
        const data = updateSchema.parse(req.body);
        const updatedUpdate = {
            id,
            ...data,
            updatedAt: new Date()
        };
        res.json(updatedUpdate);
    }
    catch (error) {
        console.error('Error updating program update:', error);
        res.status(400).json({ error: 'Failed to update program update' });
    }
});
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        res.json({ message: 'Program update deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting program update:', error);
        res.status(500).json({ error: 'Failed to delete program update' });
    }
});
router.get('/meta/categories', async (req, res) => {
    try {
        const categories = [
            {
                id: 'commission',
                name: 'Commission & Payouts',
                description: 'Updates about commission rates, payout schedules, and earning opportunities',
                count: 8,
                icon: 'DollarSign'
            },
            {
                id: 'marketing',
                name: 'Marketing Materials',
                description: 'New banners, landing pages, and promotional materials',
                count: 12,
                icon: 'Megaphone'
            },
            {
                id: 'system',
                name: 'System & Technical',
                description: 'Platform updates, maintenance schedules, and technical improvements',
                count: 5,
                icon: 'Settings'
            },
            {
                id: 'policy',
                name: 'Policies & Terms',
                description: 'Changes to program terms, policies, and compliance requirements',
                count: 3,
                icon: 'FileText'
            },
            {
                id: 'promotion',
                name: 'Promotions & Bonuses',
                description: 'Special promotions, bonus opportunities, and contests',
                count: 6,
                icon: 'Gift'
            },
            {
                id: 'general',
                name: 'General Announcements',
                description: 'Company news, program updates, and general information',
                count: 4,
                icon: 'Bell'
            }
        ];
        const statistics = {
            totalUpdates: 38,
            publishedThisMonth: 7,
            averageReadTime: '3.2 minutes',
            mostPopularCategory: 'marketing',
            lastUpdate: new Date("2024-02-15T10:00:00Z")
        };
        res.json({ categories, statistics });
    }
    catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});
router.post('/:id/read', async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.body;
        res.json({
            message: 'Update marked as read',
            updateId: id,
            userId,
            readAt: new Date()
        });
    }
    catch (error) {
        console.error('Error marking update as read:', error);
        res.status(500).json({ error: 'Failed to mark update as read' });
    }
});
router.post('/:id/react', async (req, res) => {
    try {
        const { id } = req.params;
        const reactionSchema = zod_1.z.object({
            userId: zod_1.z.string(),
            type: zod_1.z.enum(['like', 'helpful', 'question'])
        });
        const { userId, type } = reactionSchema.parse(req.body);
        res.json({
            message: 'Reaction added successfully',
            updateId: id,
            userId,
            reactionType: type,
            timestamp: new Date()
        });
    }
    catch (error) {
        console.error('Error adding reaction:', error);
        res.status(400).json({ error: 'Failed to add reaction' });
    }
});
router.get('/:id/attachments', async (req, res) => {
    try {
        const { id } = req.params;
        const attachments = [
            {
                id: 'ATT-001',
                name: 'Commission Structure Guide.pdf',
                url: '/downloads/commission-guide.pdf',
                size: '245 KB',
                type: 'application/pdf',
                downloadCount: 127,
                uploadedAt: new Date("2024-02-10T10:00:00Z")
            },
            {
                id: 'ATT-002',
                name: 'FAQ - Commission Changes.pdf',
                url: '/downloads/commission-faq.pdf',
                size: '98 KB',
                type: 'application/pdf',
                downloadCount: 89,
                uploadedAt: new Date("2024-02-12T14:30:00Z")
            }
        ];
        res.json({ attachments });
    }
    catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});
exports.default = router;
//# sourceMappingURL=program-updates.js.map