"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var express_1 = __importDefault(require("express"));
var auth_1 = require("../middleware/auth");
var client_1 = require("@prisma/client");
var zod_1 = require("zod");
var router = express_1.default.Router();
var prisma = new client_1.PrismaClient();
// Get all affiliates
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, status_1, tier, search, skip, where, affiliates, total, affiliatesWithStats, error_1;
    return __generator(this, function (_d) {
        switch (_d.label) {
            case 0:
                _d.trys.push([0, 4, , 5]);
                _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, status_1 = _a.status, tier = _a.tier, search = _a.search;
                skip = (parseInt(page) - 1) * parseInt(limit);
                where = {};
                if (status_1)
                    where.status = status_1;
                if (tier)
                    where.tier = tier;
                return [4 /*yield*/, prisma.affiliateProfile.findMany({
                        where: where,
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    phone: true,
                                    createdAt: true,
                                },
                            },
                        },
                        orderBy: { createdAt: "desc" },
                        skip: skip,
                        take: parseInt(limit),
                    })];
            case 1:
                affiliates = _d.sent();
                return [4 /*yield*/, prisma.affiliateProfile.count({ where: where })];
            case 2:
                total = _d.sent();
                return [4 /*yield*/, Promise.all(affiliates.map(function (affiliate) { return __awaiter(void 0, void 0, void 0, function () {
                        var referralCodes, _a, earnings, conversions, clicks, conversionRate;
                        var _b, _c, _d, _e;
                        return __generator(this, function (_f) {
                            switch (_f.label) {
                                case 0: return [4 /*yield*/, prisma.referralCode.findMany({
                                        where: { affiliateId: affiliate.id },
                                    })];
                                case 1:
                                    referralCodes = _f.sent();
                                    return [4 /*yield*/, Promise.all([
                                            prisma.referralUsage.aggregate({
                                                where: {
                                                    referralCodeId: { in: referralCodes.map(function (c) { return c.id; }) },
                                                },
                                                _sum: { commissionAmount: true },
                                            }),
                                            prisma.referralUsage.count({
                                                where: {
                                                    referralCodeId: { in: referralCodes.map(function (c) { return c.id; }) },
                                                },
                                            }),
                                            prisma.affiliateClick.count({
                                                where: { affiliateId: affiliate.id },
                                            }),
                                        ])];
                                case 2:
                                    _a = _f.sent(), earnings = _a[0], conversions = _a[1], clicks = _a[2];
                                    conversionRate = clicks > 0 ? (conversions / clicks) * 100 : 0;
                                    return [2 /*return*/, {
                                            id: affiliate.id,
                                            name: "".concat(((_b = affiliate.user) === null || _b === void 0 ? void 0 : _b.firstName) || "", " ").concat(((_c = affiliate.user) === null || _c === void 0 ? void 0 : _c.lastName) || "").trim() ||
                                                "Unknown",
                                            email: ((_d = affiliate.user) === null || _d === void 0 ? void 0 : _d.email) || "No email",
                                            joinDate: affiliate.createdAt.toISOString().split("T")[0],
                                            status: affiliate.status,
                                            tier: affiliate.tier,
                                            totalEarnings: earnings._sum.commissionAmount || 0,
                                            totalClicks: clicks,
                                            totalConversions: conversions,
                                            conversionRate: Math.round(conversionRate * 10) / 10,
                                            lastActivity: ((_e = affiliate.lastActivityAt) === null || _e === void 0 ? void 0 : _e.toISOString().split("T")[0]) || "N/A",
                                            paymentMethod: affiliate.paymentMethod,
                                            country: "Unknown", // Add to schema if needed
                                        }];
                            }
                        });
                    }); }))];
            case 3:
                affiliatesWithStats = _d.sent();
                res.json({
                    data: affiliatesWithStats,
                    pagination: {
                        page: parseInt(page),
                        limit: parseInt(limit),
                        total: total,
                        pages: Math.ceil(total / parseInt(limit)),
                    },
                });
                return [3 /*break*/, 5];
            case 4:
                error_1 = _d.sent();
                console.error("Error fetching affiliates:", error_1);
                res.status(500).json({ error: "Failed to fetch affiliates" });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Get affiliate details
router.get("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, affiliate, referralCodes, _a, earnings, conversions, clicks, error_2;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                id = req.params.id;
                return [4 /*yield*/, prisma.affiliateProfile.findUnique({
                        where: { id: id },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    email: true,
                                    firstName: true,
                                    lastName: true,
                                    phone: true,
                                    createdAt: true,
                                },
                            },
                        },
                    })];
            case 1:
                affiliate = _b.sent();
                if (!affiliate) {
                    return [2 /*return*/, res.status(404).json({ error: "Affiliate not found" })];
                }
                return [4 /*yield*/, prisma.referralCode.findMany({
                        where: { affiliateId: affiliate.id },
                    })];
            case 2:
                referralCodes = _b.sent();
                return [4 /*yield*/, Promise.all([
                        prisma.referralUsage.aggregate({
                            where: {
                                referralCodeId: { in: referralCodes.map(function (c) { return c.id; }) },
                            },
                            _sum: { commissionAmount: true },
                        }),
                        prisma.referralUsage.count({
                            where: {
                                referralCodeId: { in: referralCodes.map(function (c) { return c.id; }) },
                            },
                        }),
                        prisma.affiliateClick.count({
                            where: { affiliateId: affiliate.id },
                        }),
                    ])];
            case 3:
                _a = _b.sent(), earnings = _a[0], conversions = _a[1], clicks = _a[2];
                res.json({
                    affiliate: __assign(__assign({}, affiliate), { user: affiliate.user, stats: {
                            totalEarnings: earnings._sum.commissionAmount || 0,
                            totalConversions: conversions,
                            totalClicks: clicks,
                            conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
                        }, referralCodes: referralCodes.length }),
                });
                return [3 /*break*/, 5];
            case 4:
                error_2 = _b.sent();
                console.error("Error fetching affiliate details:", error_2);
                res.status(500).json({ error: "Failed to fetch affiliate details" });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Update affiliate status
router.patch("/:id/status", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, status_2, validStatuses, updatedAffiliate, error_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                id = req.params.id;
                status_2 = req.body.status;
                validStatuses = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];
                if (!validStatuses.includes(status_2)) {
                    return [2 /*return*/, res.status(400).json({ error: "Invalid status" })];
                }
                return [4 /*yield*/, prisma.affiliateProfile.update({
                        where: { id: id },
                        data: { status: status_2 },
                    })];
            case 1:
                updatedAffiliate = _a.sent();
                res.json({
                    success: true,
                    message: "Affiliate status updated to ".concat(status_2),
                    affiliate: updatedAffiliate,
                });
                return [3 /*break*/, 3];
            case 2:
                error_3 = _a.sent();
                console.error("Error updating affiliate status:", error_3);
                res.status(500).json({ error: "Failed to update affiliate status" });
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Update affiliate tier and commission rate
router.patch("/:id/tier", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, tier, commissionRate, schema, validatedData, updatedAffiliate, error_4;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                _b.trys.push([0, 4, , 5]);
                id = req.params.id;
                _a = req.body, tier = _a.tier, commissionRate = _a.commissionRate;
                schema = zod_1.z.object({
                    tier: zod_1.z.enum(["BRONZE", "SILVER", "GOLD", "PLATINUM"]).optional(),
                    commissionRate: zod_1.z.number().min(0).max(100).optional(),
                });
                validatedData = schema.parse({ tier: tier, commissionRate: commissionRate });
                return [4 /*yield*/, prisma.affiliateProfile.update({
                        where: { id: id },
                        data: __assign({ tier: validatedData.tier }, (validatedData.commissionRate !== undefined &&
                            {
                            // Update commission rate in referral codes
                            })),
                    })];
            case 1:
                updatedAffiliate = _b.sent();
                if (!(validatedData.commissionRate !== undefined)) return [3 /*break*/, 3];
                return [4 /*yield*/, prisma.referralCode.updateMany({
                        where: { affiliateId: id },
                        data: { commissionRate: validatedData.commissionRate },
                    })];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                res.json({
                    success: true,
                    message: "Affiliate tier and commission rate updated successfully",
                    affiliate: updatedAffiliate,
                });
                return [3 /*break*/, 5];
            case 4:
                error_4 = _b.sent();
                console.error("Error updating affiliate tier:", error_4);
                if (error_4 instanceof zod_1.z.ZodError) {
                    return [2 /*return*/, res
                            .status(400)
                            .json({ error: "Invalid input data", details: error_4.errors })];
                }
                res.status(500).json({ error: "Failed to update affiliate tier" });
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Delete affiliate
router.delete("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, affiliate, error_5;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 3, , 4]);
                id = req.params.id;
                return [4 /*yield*/, prisma.affiliateProfile.findUnique({
                        where: { id: id },
                    })];
            case 1:
                affiliate = _a.sent();
                if (!affiliate) {
                    return [2 /*return*/, res.status(404).json({ error: "Affiliate not found" })];
                }
                // Delete affiliate (cascades to referral codes and usages)
                return [4 /*yield*/, prisma.affiliateProfile.delete({
                        where: { id: id },
                    })];
            case 2:
                // Delete affiliate (cascades to referral codes and usages)
                _a.sent();
                res.json({
                    success: true,
                    message: "Affiliate deleted successfully",
                });
                return [3 /*break*/, 4];
            case 3:
                error_5 = _a.sent();
                console.error("Error deleting affiliate:", error_5);
                res.status(500).json({ error: "Failed to delete affiliate" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
// Get affiliate analytics
router.get("/:id/analytics", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, period, now, startDate, referralCodes, _b, clicks, conversions, revenue, commissions, error_6;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 3, , 4]);
                id = req.params.id;
                _a = req.query.period, period = _a === void 0 ? "30d" : _a;
                now = new Date();
                startDate = void 0;
                switch (period) {
                    case "7d":
                        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                        break;
                    case "30d":
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                        break;
                    case "90d":
                        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                        break;
                    default:
                        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                }
                return [4 /*yield*/, prisma.referralCode.findMany({
                        where: { affiliateId: id },
                    })];
            case 1:
                referralCodes = _c.sent();
                return [4 /*yield*/, Promise.all([
                        prisma.affiliateClick.count({
                            where: {
                                affiliateId: id,
                                createdAt: { gte: startDate },
                            },
                        }),
                        prisma.referralUsage.count({
                            where: {
                                referralCodeId: { in: referralCodes.map(function (c) { return c.id; }) },
                                createdAt: { gte: startDate },
                            },
                        }),
                        prisma.referralUsage.aggregate({
                            where: {
                                referralCodeId: { in: referralCodes.map(function (c) { return c.id; }) },
                                createdAt: { gte: startDate },
                            },
                            _sum: { orderValue: true },
                        }),
                        prisma.referralUsage.aggregate({
                            where: {
                                referralCodeId: { in: referralCodes.map(function (c) { return c.id; }) },
                                createdAt: { gte: startDate },
                            },
                            _sum: { commissionAmount: true },
                        }),
                    ])];
            case 2:
                _b = _c.sent(), clicks = _b[0], conversions = _b[1], revenue = _b[2], commissions = _b[3];
                res.json({
                    period: period,
                    analytics: {
                        totalClicks: clicks,
                        totalConversions: conversions,
                        totalRevenue: revenue._sum.orderValue || 0,
                        totalCommissions: commissions._sum.commissionAmount || 0,
                        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
                        averageOrderValue: conversions > 0 ? (revenue._sum.orderValue || 0) / conversions : 0,
                    },
                });
                return [3 /*break*/, 4];
            case 3:
                error_6 = _c.sent();
                console.error("Error fetching affiliate analytics:", error_6);
                res.status(500).json({ error: "Failed to fetch affiliate analytics" });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
