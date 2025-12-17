"use strict";
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
var router = express_1.default.Router();
var prisma = new client_1.PrismaClient();
// Admin Dashboard Overview
router.get("/overview", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var now, thirtyDaysAgo_1, sevenDaysAgo, affiliates, allReferralCodes, allReferralUsages, _a, totalAffiliates, activeAffiliates, pendingAffiliates, totalRevenue, totalCommissions, dailyPerformance, i, date, startOfDay, endOfDay, _b, clicks, conversions, revenue, topAffiliates, sortedTopAffiliates, pendingPayouts, error_1;
    var _c, _d;
    return __generator(this, function (_e) {
        switch (_e.label) {
            case 0:
                _e.trys.push([0, 10, , 11]);
                now = new Date();
                thirtyDaysAgo_1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return [4 /*yield*/, prisma.affiliateProfile.findMany({
                        include: {
                            user: true,
                        },
                    })];
            case 1:
                affiliates = _e.sent();
                return [4 /*yield*/, prisma.referralCode.findMany()];
            case 2:
                allReferralCodes = _e.sent();
                return [4 /*yield*/, prisma.referralUsage.findMany({
                        where: {
                            createdAt: { gte: thirtyDaysAgo_1 },
                        },
                    })];
            case 3:
                allReferralUsages = _e.sent();
                return [4 /*yield*/, Promise.all([
                        prisma.affiliateProfile.count(),
                        prisma.affiliateProfile.count({
                            where: { status: "ACTIVE" },
                        }),
                        prisma.affiliateProfile.count({
                            where: { status: "PENDING" },
                        }),
                        prisma.referralUsage.aggregate({
                            where: { createdAt: { gte: thirtyDaysAgo_1 } },
                            _sum: { orderValue: true },
                        }),
                        prisma.referralUsage.aggregate({
                            where: { createdAt: { gte: thirtyDaysAgo_1 } },
                            _sum: { commissionAmount: true },
                        }),
                    ])];
            case 4:
                _a = _e.sent(), totalAffiliates = _a[0], activeAffiliates = _a[1], pendingAffiliates = _a[2], totalRevenue = _a[3], totalCommissions = _a[4];
                dailyPerformance = [];
                i = 6;
                _e.label = 5;
            case 5:
                if (!(i >= 0)) return [3 /*break*/, 8];
                date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
                startOfDay = new Date(date.setHours(0, 0, 0, 0));
                endOfDay = new Date(date.setHours(23, 59, 59, 999));
                return [4 /*yield*/, Promise.all([
                        prisma.affiliateClick.count({
                            where: {
                                createdAt: { gte: startOfDay, lte: endOfDay },
                            },
                        }),
                        prisma.referralUsage.count({
                            where: {
                                createdAt: { gte: startOfDay, lte: endOfDay },
                            },
                        }),
                        prisma.referralUsage.aggregate({
                            where: {
                                createdAt: { gte: startOfDay, lte: endOfDay },
                            },
                            _sum: { orderValue: true },
                        }),
                    ])];
            case 6:
                _b = _e.sent(), clicks = _b[0], conversions = _b[1], revenue = _b[2];
                dailyPerformance.push({
                    date: startOfDay.toISOString().split("T")[0],
                    totalClicks: clicks,
                    conversions: conversions,
                    revenue: revenue._sum.orderValue || 0,
                });
                _e.label = 7;
            case 7:
                i--;
                return [3 /*break*/, 5];
            case 8: return [4 /*yield*/, Promise.all(affiliates.slice(0, 10).map(function (affiliate) { return __awaiter(void 0, void 0, void 0, function () {
                    var codes, earnings, conversions;
                    var _a, _b, _c;
                    return __generator(this, function (_d) {
                        switch (_d.label) {
                            case 0: return [4 /*yield*/, prisma.referralCode.findMany({
                                    where: { affiliateId: affiliate.id },
                                })];
                            case 1:
                                codes = _d.sent();
                                return [4 /*yield*/, prisma.referralUsage.aggregate({
                                        where: {
                                            referralCodeId: { in: codes.map(function (c) { return c.id; }) },
                                            createdAt: { gte: thirtyDaysAgo_1 },
                                        },
                                        _sum: { commissionAmount: true },
                                    })];
                            case 2:
                                earnings = _d.sent();
                                return [4 /*yield*/, prisma.referralUsage.count({
                                        where: {
                                            referralCodeId: { in: codes.map(function (c) { return c.id; }) },
                                            createdAt: { gte: thirtyDaysAgo_1 },
                                        },
                                    })];
                            case 3:
                                conversions = _d.sent();
                                return [2 /*return*/, {
                                        id: affiliate.id,
                                        name: "".concat(((_a = affiliate.user) === null || _a === void 0 ? void 0 : _a.firstName) || "", " ").concat(((_b = affiliate.user) === null || _b === void 0 ? void 0 : _b.lastName) || "").trim() ||
                                            "Unknown",
                                        email: ((_c = affiliate.user) === null || _c === void 0 ? void 0 : _c.email) || "No email",
                                        status: affiliate.status,
                                        tier: affiliate.tier,
                                        totalEarnings: earnings._sum.commissionAmount || 0,
                                        totalConversions: conversions,
                                        lastActivity: affiliate.lastActivityAt,
                                    }];
                        }
                    });
                }); }))];
            case 9:
                topAffiliates = _e.sent();
                sortedTopAffiliates = topAffiliates
                    .sort(function (a, b) { return b.totalEarnings - a.totalEarnings; })
                    .slice(0, 5);
                pendingPayouts = [
                    {
                        id: "PAY-001",
                        affiliate: ((_c = sortedTopAffiliates[0]) === null || _c === void 0 ? void 0 : _c.name) || "Affiliate 1",
                        amount: 250.0,
                        method: "PayPal",
                        status: "pending",
                        requestDate: new Date().toISOString().split("T")[0],
                        email: ((_d = sortedTopAffiliates[0]) === null || _d === void 0 ? void 0 : _d.email) || "affiliate@example.com",
                    },
                ];
                res.json({
                    statistics: {
                        totalAffiliates: totalAffiliates,
                        activeAffiliates: activeAffiliates,
                        pendingAffiliates: pendingAffiliates,
                        totalRevenue: totalRevenue._sum.orderValue || 0,
                        totalCommissions: totalCommissions._sum.commissionAmount || 0,
                        averageCommissionRate: 15, // Mock
                        totalClicks: allReferralCodes.reduce(function (sum, code) { return sum + (code.currentUses || 0); }, 0),
                        totalConversions: allReferralUsages.length,
                        conversionRate: allReferralCodes.reduce(function (sum, code) { return sum + (code.currentUses || 0); }, 0) > 0
                            ? (allReferralUsages.length /
                                allReferralCodes.reduce(function (sum, code) { return sum + (code.currentUses || 0); }, 0)) *
                                100
                            : 0,
                    },
                    dailyPerformance: dailyPerformance,
                    topAffiliates: sortedTopAffiliates,
                    pendingPayouts: pendingPayouts,
                    systemAlerts: [
                        {
                            type: "warning",
                            title: "".concat(pendingAffiliates, " Pending Affiliate Applications"),
                            description: "Review and approve new affiliate applications to grow your program.",
                            time: "2 hours ago",
                        },
                        {
                            type: "info",
                            title: "Monthly Payout Processing",
                            description: "Process monthly payouts for ".concat(activeAffiliates, " affiliates."),
                            time: "1 day ago",
                        },
                    ],
                });
                return [3 /*break*/, 11];
            case 10:
                error_1 = _e.sent();
                console.error("Error fetching admin dashboard overview:", error_1);
                res
                    .status(500)
                    .json({ error: "Failed to fetch admin dashboard overview" });
                return [3 /*break*/, 11];
            case 11: return [2 /*return*/];
        }
    });
}); });
exports.default = router;
