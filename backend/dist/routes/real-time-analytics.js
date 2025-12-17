"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
router.get('/metrics', async (req, res) => {
    try {
        const now = new Date();
        const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
        const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const activeUsers = await prisma.click.groupBy({
            by: ['ipAddress'],
            where: {
                createdAt: {
                    gte: lastHour
                }
            },
            _count: {
                ipAddress: true
            }
        });
        const liveClicks = await prisma.click.count({
            where: {
                createdAt: {
                    gte: lastHour
                }
            }
        });
        const liveConversions = await prisma.conversion.count({
            where: {
                createdAt: {
                    gte: lastHour
                }
            }
        });
        const liveRevenueResult = await prisma.conversion.aggregate({
            where: {
                createdAt: {
                    gte: lastHour
                }
            },
            _sum: {
                customerValue: true
            }
        });
        res.json({
            activeUsers: activeUsers.length,
            liveClicks,
            liveConversions,
            liveRevenue: liveRevenueResult._sum.customerValue || 0
        });
    }
    catch (error) {
        console.error('Error fetching real-time metrics:', error);
        res.status(500).json({ error: 'Failed to fetch real-time metrics' });
    }
});
router.get('/activity', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        const recentClicks = await prisma.click.findMany({
            where: {
                createdAt: {
                    gte: lastHour
                }
            },
            include: {
                affiliate: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: Number(limit) / 2
        });
        const recentConversions = await prisma.conversion.findMany({
            where: {
                createdAt: {
                    gte: lastHour
                }
            },
            include: {
                affiliate: {
                    select: {
                        user: {
                            select: {
                                firstName: true,
                                lastName: true
                            }
                        }
                    }
                },
                offer: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: Number(limit) / 2
        });
        const activity = [
            ...recentClicks.map(click => ({
                id: `click-${click.id}`,
                type: 'click',
                user: click.affiliate?.user ? `${click.affiliate.user.firstName} ${click.affiliate.user.lastName}` : 'Anonymous',
                action: `Clicked link`,
                timestamp: click.createdAt,
                location: `${click.city || 'Unknown'}, ${click.country || 'Unknown'}`,
                device: click.device || 'Unknown',
                status: 'success'
            })),
            ...recentConversions.map(conversion => ({
                id: `conversion-${conversion.id}`,
                type: 'conversion',
                user: 'Anonymous',
                action: `Converted`,
                timestamp: conversion.createdAt,
                location: 'Unknown',
                device: 'Unknown',
                status: 'success'
            }))
        ];
        activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        res.json(activity.slice(0, Number(limit)));
    }
    catch (error) {
        console.error('Error fetching live activity:', error);
        res.status(500).json({ error: 'Failed to fetch live activity' });
    }
});
router.get('/geography', async (req, res) => {
    try {
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        const countryStats = await prisma.click.groupBy({
            by: ['country'],
            where: {
                createdAt: {
                    gte: lastHour
                },
                country: {
                    not: null
                }
            },
            _count: {
                country: true
            },
            orderBy: {
                _count: {
                    country: 'desc'
                }
            },
            take: 5
        });
        const totalClicks = countryStats.reduce((sum, country) => sum + country._count.country, 0);
        const topCountries = countryStats.map(country => ({
            country: country.country,
            clicks: country._count.country,
            percentage: totalClicks > 0 ? Math.round((country._count.country / totalClicks) * 100) : 0
        }));
        res.json({ topCountries });
    }
    catch (error) {
        console.error('Error fetching geography data:', error);
        res.status(500).json({ error: 'Failed to fetch geography data' });
    }
});
router.get('/devices', async (req, res) => {
    try {
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        const deviceStats = await prisma.click.groupBy({
            by: ['device'],
            where: {
                createdAt: {
                    gte: lastHour
                },
                device: {
                    not: null
                }
            },
            _count: {
                device: true
            },
            orderBy: {
                _count: {
                    device: 'desc'
                }
            }
        });
        const totalClicks = deviceStats.reduce((sum, device) => sum + device._count.device, 0);
        const topDevices = deviceStats.map(device => ({
            device: device.device,
            clicks: device._count.device,
            percentage: totalClicks > 0 ? Math.round((device._count.device / totalClicks) * 100) : 0
        }));
        res.json({ topDevices });
    }
    catch (error) {
        console.error('Error fetching device data:', error);
        res.status(500).json({ error: 'Failed to fetch device data' });
    }
});
router.get('/browsers', async (req, res) => {
    try {
        const lastHour = new Date(Date.now() - 60 * 60 * 1000);
        const browserStats = await prisma.click.groupBy({
            by: ['browser'],
            where: {
                createdAt: {
                    gte: lastHour
                },
                browser: {
                    not: null
                }
            },
            _count: {
                browser: true
            },
            orderBy: {
                _count: {
                    browser: 'desc'
                }
            }
        });
        const totalClicks = browserStats.reduce((sum, browser) => sum + browser._count.browser, 0);
        const topBrowsers = browserStats.map(browser => ({
            browser: browser.browser,
            clicks: browser._count.browser,
            percentage: totalClicks > 0 ? Math.round((browser._count.browser / totalClicks) * 100) : 0
        }));
        res.json({ topBrowsers });
    }
    catch (error) {
        console.error('Error fetching browser data:', error);
        res.status(500).json({ error: 'Failed to fetch browser data' });
    }
});
router.get('/fraud-alerts', async (req, res) => {
    try {
        const now = new Date();
        const lastHour = new Date(now.getTime() - 60 * 60 * 1000);
        const suspiciousIPs = await prisma.click.groupBy({
            by: ['ipAddress'],
            where: {
                createdAt: {
                    gte: lastHour
                }
            },
            _count: {
                ipAddress: true
            },
            having: {
                ipAddress: {
                    _count: {
                        gt: 50
                    }
                }
            }
        });
        const currentHourClicks = await prisma.click.count({
            where: {
                createdAt: {
                    gte: lastHour
                }
            }
        });
        const previousHour = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        const previousHourClicks = await prisma.click.count({
            where: {
                createdAt: {
                    gte: previousHour,
                    lt: lastHour
                }
            }
        });
        const alerts = [];
        if (suspiciousIPs.length > 0) {
            alerts.push({
                type: 'suspicious_pattern',
                title: 'Suspicious Click Pattern',
                message: `${suspiciousIPs.length} IP addresses with unusual click patterns detected`,
                severity: 'high',
                createdAt: new Date()
            });
        }
        if (previousHourClicks > 0 && (currentHourClicks / previousHourClicks) > 3) {
            alerts.push({
                type: 'traffic_spike',
                title: 'Unusual Traffic Spike',
                message: `Traffic increased by ${Math.round((currentHourClicks / previousHourClicks - 1) * 100)}% in the last hour`,
                severity: 'medium',
                createdAt: new Date()
            });
        }
        res.json({ alerts });
    }
    catch (error) {
        console.error('Error fetching fraud alerts:', error);
        res.status(500).json({ error: 'Failed to fetch fraud alerts' });
    }
});
exports.default = router;
//# sourceMappingURL=real-time-analytics.js.map