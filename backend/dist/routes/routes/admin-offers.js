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
// Get all offers
router.get("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, _b, page, _c, limit, status_1, offers, filteredOffers, skip, paginatedOffers;
    return __generator(this, function (_d) {
        try {
            _a = req.query, _b = _a.page, page = _b === void 0 ? 1 : _b, _c = _a.limit, limit = _c === void 0 ? 20 : _c, status_1 = _a.status;
            offers = [
                {
                    id: "OFFER-001",
                    name: "Premium Plan Promotion",
                    description: "30% commission on premium plan sales",
                    commissionType: "Percentage",
                    commissionValue: 30,
                    category: "Software",
                    status: "active",
                    startDate: "2024-01-01",
                    endDate: "2024-12-31",
                    clicks: 1250,
                    conversions: 45,
                    revenue: 12500.0,
                    affiliatesCount: 23,
                    conversionRate: 3.6,
                },
                {
                    id: "OFFER-002",
                    name: "Basic Plan Special",
                    description: "20% commission on basic plan",
                    commissionType: "Percentage",
                    commissionValue: 20,
                    category: "Software",
                    status: "active",
                    startDate: "2024-01-01",
                    endDate: "2024-12-31",
                    clicks: 890,
                    conversions: 32,
                    revenue: 3200.0,
                    affiliatesCount: 18,
                    conversionRate: 3.6,
                },
                {
                    id: "OFFER-003",
                    name: "Enterprise Package",
                    description: "Flat $500 commission per enterprise sale",
                    commissionType: "Fixed",
                    commissionValue: 500,
                    category: "Enterprise",
                    status: "active",
                    startDate: "2024-01-01",
                    endDate: "2024-12-31",
                    clicks: 345,
                    conversions: 8,
                    revenue: 80000.0,
                    affiliatesCount: 5,
                    conversionRate: 2.3,
                },
            ];
            filteredOffers = status_1
                ? offers.filter(function (o) { return o.status === status_1; })
                : offers;
            skip = (parseInt(page) - 1) * parseInt(limit);
            paginatedOffers = filteredOffers.slice(skip, skip + parseInt(limit));
            res.json({
                data: paginatedOffers,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: filteredOffers.length,
                    pages: Math.ceil(filteredOffers.length / parseInt(limit)),
                },
                summary: {
                    active: offers.filter(function (o) { return o.status === "active"; }).length,
                    paused: offers.filter(function (o) { return o.status === "paused"; }).length,
                    ended: offers.filter(function (o) { return o.status === "ended"; }).length,
                    totalRevenue: offers.reduce(function (sum, o) { return sum + o.revenue; }, 0),
                },
            });
        }
        catch (error) {
            console.error("Error fetching offers:", error);
            res.status(500).json({ error: "Failed to fetch offers" });
        }
        return [2 /*return*/];
    });
}); });
// Create new offer
router.post("/", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, name_1, description, commissionType, commissionValue, category, startDate, endDate, schema, validatedData, offer;
    return __generator(this, function (_b) {
        try {
            _a = req.body, name_1 = _a.name, description = _a.description, commissionType = _a.commissionType, commissionValue = _a.commissionValue, category = _a.category, startDate = _a.startDate, endDate = _a.endDate;
            schema = zod_1.z.object({
                name: zod_1.z.string().min(3),
                description: zod_1.z.string().min(10),
                commissionType: zod_1.z.enum(["Percentage", "Fixed"]),
                commissionValue: zod_1.z.number().positive(),
                category: zod_1.z.string(),
                startDate: zod_1.z.string(),
                endDate: zod_1.z.string().optional(),
            });
            validatedData = schema.parse({
                name: name_1,
                description: description,
                commissionType: commissionType,
                commissionValue: commissionValue,
                category: category,
                startDate: startDate,
                endDate: endDate,
            });
            offer = __assign(__assign({ id: "OFFER-".concat(Date.now()) }, validatedData), { status: "active", clicks: 0, conversions: 0, revenue: 0, affiliatesCount: 0, conversionRate: 0, createdAt: new Date() });
            res.json({
                success: true,
                message: "Offer created successfully",
                offer: offer,
            });
        }
        catch (error) {
            console.error("Error creating offer:", error);
            if (error instanceof zod_1.z.ZodError) {
                return [2 /*return*/, res
                        .status(400)
                        .json({ error: "Invalid input data", details: error.errors })];
            }
            res.status(500).json({ error: "Failed to create offer" });
        }
        return [2 /*return*/];
    });
}); });
// Update offer
router.put("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id, updates;
    return __generator(this, function (_a) {
        try {
            id = req.params.id;
            updates = req.body;
            res.json({
                success: true,
                message: "Offer updated successfully",
                offer: __assign(__assign({ id: id }, updates), { updatedAt: new Date() }),
            });
        }
        catch (error) {
            console.error("Error updating offer:", error);
            res.status(500).json({ error: "Failed to update offer" });
        }
        return [2 /*return*/];
    });
}); });
// Delete offer
router.delete("/:id", auth_1.authenticateToken, (0, auth_1.requireRole)(["ADMIN"]), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var id;
    return __generator(this, function (_a) {
        try {
            id = req.params.id;
            res.json({
                success: true,
                message: "Offer deleted successfully",
            });
        }
        catch (error) {
            console.error("Error deleting offer:", error);
            res.status(500).json({ error: "Failed to delete offer" });
        }
        return [2 /*return*/];
    });
}); });
exports.default = router;
