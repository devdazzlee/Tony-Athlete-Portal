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
// Get all payouts
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, status_1, payouts, filteredPayouts, skip, paginatedPayouts;
    return __generator(this, function (_d) {
        try {
            _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, status_1 = _a.status;
            payouts = [
                {
                    id: "PAY-001",
                    affiliateId: "aff-1",
                    affiliateName: "John Doe",
                    amount: 250.0,
                    method: "PayPal",
                    status: "pending",
                    requestDate: "2024-10-10",
                    email: "john@example.com",
                    commissionsCount: 15,
                },
                {
                    id: "PAY-002",
                    affiliateId: "aff-2",
                    affiliateName: "Sarah Wilson",
                    amount: 180.5,
                    method: "Bank Transfer",
                    status: "processing",
                    requestDate: "2024-10-09",
                    email: "sarah@example.com",
                    commissionsCount: 12,
                },
                {
                    id: "PAY-003",
                    affiliateId: "aff-3",
                    affiliateName: "Mike Johnson",
                    amount: 420.75,
                    method: "PayPal",
                    status: "completed",
                    requestDate: "2024-10-05",
                    email: "mike@example.com",
                    commissionsCount: 25,
                    processedDate: "2024-10-08",
                },
            ];
            filteredPayouts = status_1
                ? payouts.filter(function (p) { return p.status === status_1; })
                : payouts;
            skip = (parseInt(page) - 1) * parseInt(limit);
            paginatedPayouts = filteredPayouts.slice(skip, skip + parseInt(limit));
            res.json({
                data: paginatedPayouts,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredPayouts.length,
                    pages: Math.ceil(filteredPayouts.length / parseInt(limit)),
                },
                summary: {
                    pending: payouts.filter(function (p) { return p.status === "pending"; }).length,
                    processing: payouts.filter(function (p) { return p.status === "processing"; }).length,
                    completed: payouts.filter(function (p) { return p.status === "completed"; }).length,
                    totalPendingAmount: payouts
                        .filter(function (p) { return p.status === "pending"; })
                        .reduce(function (sum, p) { return sum + p.amount; }, 0),
                },
            });
        }
        catch (error) {
            console.error("Error fetching payouts:", error);
            res.status(500).json({ error: "Failed to fetch payouts" });
        }
        return [2 /*return*/];
    });
}); });
// Update payout status
router.patch("/:id/status", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, _a, status_2, notes, validStatuses;
    return __generator(this, function (_b) {
        try {
            id = req.params.id;
            _a = req.body, status_2 = _a.status, notes = _a.notes;
            validStatuses = ["pending", "processing", "completed", "failed"];
            if (!validStatuses.includes(status_2)) {
                return [2 /*return*/, res.status(400).json({ error: "Invalid status" })];
            }
            // In a real app, update the database
            res.json({
                success: true,
                message: "Payout status updated to ".concat(status_2),
                payout: {
                    id: id,
                    status: status_2,
                    notes: notes,
                    updatedAt: new Date(),
                },
            });
        }
        catch (error) {
            console.error("Error updating payout status:", error);
            res.status(500).json({ error: "Failed to update payout status" });
        }
        return [2 /*return*/];
    });
}); });
// Process bulk payouts
router.post("/process-bulk", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var payoutIds;
    return __generator(this, function (_a) {
        try {
            payoutIds = req.body.payoutIds;
            if (!Array.isArray(payoutIds) || payoutIds.length === 0) {
                return [2 /*return*/, res.status(400).json({ error: "Invalid payout IDs" })];
            }
            // In a real app, process all payouts
            res.json({
                success: true,
                message: "".concat(payoutIds.length, " payouts processed successfully"),
                processedCount: payoutIds.length,
            });
        }
        catch (error) {
            console.error("Error processing bulk payouts:", error);
            res.status(500).json({ error: "Failed to process bulk payouts" });
        }
        return [2 /*return*/];
    });
}); });
// Get payout analytics
router.get("/analytics", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, period, analytics;
    return __generator(this, function (_b) {
        try {
            _a = req.query.period, period = _a === void 0 ? "30d" : _a;
            analytics = {
                period: period,
                totalPayouts: 156,
                totalAmount: 45320.5,
                averagePayoutAmount: 290.51,
                byStatus: {
                    pending: 12,
                    processing: 5,
                    completed: 135,
                    failed: 4,
                },
                byMethod: {
                    PayPal: 98,
                    "Bank Transfer": 52,
                    Check: 6,
                },
                dailyStats: [
                    { date: "2024-10-09", payouts: 5, amount: 1250.0 },
                    { date: "2024-10-10", payouts: 8, amount: 2150.5 },
                    { date: "2024-10-11", payouts: 3, amount: 890.0 },
                    { date: "2024-10-12", payouts: 6, amount: 1680.75 },
                    { date: "2024-10-13", payouts: 4, amount: 1120.0 },
                    { date: "2024-10-14", payouts: 7, amount: 1950.25 },
                    { date: "2024-10-15", payouts: 2, amount: 580.0 },
                ],
            };
            res.json(analytics);
        }
        catch (error) {
            console.error("Error fetching payout analytics:", error);
            res.status(500).json({ error: "Failed to fetch payout analytics" });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
