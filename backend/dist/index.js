"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const auth_1 = __importDefault(require("./routes/auth"));
const dashboard_1 = __importDefault(require("./routes/dashboard"));
const affiliate_1 = __importDefault(require("./routes/affiliate"));
const offer_1 = __importDefault(require("./routes/offer"));
const analytics_1 = __importDefault(require("./routes/analytics"));
const automation_1 = __importDefault(require("./routes/automation"));
const integration_1 = __importDefault(require("./routes/integration"));
const security_1 = __importDefault(require("./routes/security"));
const enterprise_1 = __importDefault(require("./routes/enterprise"));
const mobile_1 = __importDefault(require("./routes/mobile"));
const compliance_1 = __importDefault(require("./routes/compliance"));
const webhook_1 = __importDefault(require("./routes/webhook"));
const offers_1 = __importDefault(require("./routes/offers"));
const alerts_1 = __importDefault(require("./routes/alerts"));
const payout_builder_1 = __importDefault(require("./routes/payout-builder"));
const traffic_control_1 = __importDefault(require("./routes/traffic-control"));
const webhooks_1 = __importDefault(require("./routes/webhooks"));
const system_logs_1 = __importDefault(require("./routes/system-logs"));
const real_time_analytics_1 = __importDefault(require("./routes/real-time-analytics"));
const advanced_analytics_1 = __importDefault(require("./routes/advanced-analytics"));
const affiliate_links_1 = __importDefault(require("./routes/affiliate-links"));
const coupons_1 = __importDefault(require("./routes/coupons"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const program_updates_1 = __importDefault(require("./routes/program-updates"));
const tracking_1 = __importDefault(require("./routes/tracking"));
const referral_1 = __importDefault(require("./routes/referral"));
const commission_management_1 = __importDefault(require("./routes/commission-management"));
const commissions_1 = __importDefault(require("./routes/commissions"));
const statistics_1 = __importDefault(require("./routes/statistics"));
const links_1 = __importDefault(require("./routes/links"));
const support_1 = __importDefault(require("./routes/support"));
const settings_1 = __importDefault(require("./routes/settings"));
const admin_dashboard_1 = __importDefault(require("./routes/admin-dashboard"));
const admin_affiliates_1 = __importDefault(require("./routes/admin-affiliates"));
const admin_payouts_1 = __importDefault(require("./routes/admin-payouts"));
const admin_offers_1 = __importDefault(require("./routes/admin-offers"));
const admin_settings_1 = __importDefault(require("./routes/admin-settings"));
const admin_affiliate_codes_1 = __importDefault(require("./routes/admin-affiliate-codes"));
const admin_deliverables_1 = __importDefault(require("./routes/admin-deliverables"));
const admin_feedback_1 = __importDefault(require("./routes/admin-feedback"));
const admin_tiers_1 = __importDefault(require("./routes/admin-tiers"));
const system_settings_1 = __importDefault(require("./routes/system-settings"));
const upload_1 = __importDefault(require("./routes/upload"));
const websites_1 = __importDefault(require("./routes/websites"));
const athlete_1 = __importDefault(require("./routes/athlete"));
const shopify_1 = __importDefault(require("./routes/shopify"));
const manager_shopify_1 = __importDefault(require("./routes/manager-shopify"));
const admin_shopify_1 = __importDefault(require("./routes/admin-shopify"));
const payment_1 = __importDefault(require("./routes/payment"));
const ShopifySyncScheduler_1 = __importDefault(require("./services/ShopifySyncScheduler"));
dotenv_1.default.config();
const isProduction = process.env.NODE_ENV === "production";
const isVercel = !!process.env.VERCEL;
const logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    transports: [
        ...(!isVercel && !isProduction
            ? [
                new winston_1.default.transports.File({
                    filename: "logs/error.log",
                    level: "error",
                }),
                new winston_1.default.transports.File({ filename: "logs/combined.log" }),
            ]
            : []),
        new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }),
    ],
});
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: [
            process.env.FRONTEND_URL || "http://localhost:3001",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:8000",
            "https://trackdesk-frontend.vercel.app",
            "https://trackdesk-t1hm.vercel.app",
            "null",
        ],
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        credentials: true,
    },
});
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: false,
}));
app.use((0, cors_1.default)({
    origin: function (origin, callback) {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            process.env.FRONTEND_URL || "http://localhost:3001",
            "http://localhost:3000",
            "http://localhost:3001",
            "http://localhost:3002",
            "http://localhost:8000",
            "https://trackdesk-frontend.vercel.app",
            "https://trackdesk-t1hm.vercel.app",
        ];
        if (allowedOrigins.indexOf(origin) !== -1 ||
            origin.startsWith("http://localhost:")) {
            callback(null, true);
        }
        else {
            callback(null, true);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Cache-Control",
        "Pragma",
        "Cookie",
        "X-Requested-With",
        "X-Trackdesk-Version",
        "X-Trackdesk-Website-Id",
        "X-Trackdesk-Session-Id",
    ],
    exposedHeaders: ["Set-Cookie"],
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
app.options("*", (0, cors_1.default)());
app.get("/health", (req, res) => {
    res.status(200).json({ status: "OK", timestamp: new Date().toISOString() });
});
app.use("/api/auth", auth_1.default);
app.use("/api/dashboard", dashboard_1.default);
app.use("/api/affiliates", affiliate_1.default);
app.use("/api/offers", offer_1.default);
app.use("/api/analytics", analytics_1.default);
app.use("/api/automation", automation_1.default);
app.use("/api/integrations", integration_1.default);
app.use("/api/security", security_1.default);
app.use("/api/enterprise", enterprise_1.default);
app.use("/api/mobile", mobile_1.default);
app.use("/api/compliance", compliance_1.default);
app.use("/api/webhooks", webhook_1.default);
app.use("/api/offers", offers_1.default);
app.use("/api/alerts", alerts_1.default);
app.use("/api/payout-builder", payout_builder_1.default);
app.use("/api/traffic-control", traffic_control_1.default);
app.use("/api/webhooks-v2", webhooks_1.default);
app.use("/api/system-logs", system_logs_1.default);
app.use("/api/real-time-analytics", real_time_analytics_1.default);
app.use("/api/advanced-analytics", advanced_analytics_1.default);
app.use("/api/affiliate-links", affiliate_links_1.default);
app.use("/api/coupons", coupons_1.default);
app.use("/api/notifications", notifications_1.default);
app.use("/api/program-updates", program_updates_1.default);
app.use("/api/tracking", tracking_1.default);
app.use("/api/referral", referral_1.default);
app.use("/api/commission-management", commission_management_1.default);
app.use("/api/commissions", commissions_1.default);
app.use("/api/statistics", statistics_1.default);
app.use("/api/links", links_1.default);
app.use("/api/support", support_1.default);
app.use("/api/settings", settings_1.default);
app.use("/api/admin/dashboard", admin_dashboard_1.default);
app.use("/api/admin/affiliates", admin_affiliates_1.default);
app.use("/api/admin/payouts", admin_payouts_1.default);
app.use("/api/admin/offers", admin_offers_1.default);
app.use("/api/admin/settings", admin_settings_1.default);
app.use("/api/admin/affiliate-codes", admin_affiliate_codes_1.default);
app.use("/api/admin/deliverables", admin_deliverables_1.default);
app.use("/api/admin/feedback", admin_feedback_1.default);
app.use("/api/admin/tiers", admin_tiers_1.default);
app.use("/api/system/settings", system_settings_1.default);
app.use("/api/system-settings", system_settings_1.default);
app.use("/api/upload", upload_1.default);
app.use("/api/websites", websites_1.default);
app.use("/api/athlete", athlete_1.default);
app.use("/api/shopify", shopify_1.default);
app.use("/api/manager/shopify", manager_shopify_1.default);
app.use("/api/admin/shopify", admin_shopify_1.default);
app.use("/api/payment", payment_1.default);
io.on("connection", (socket) => {
    logger.info(`Client connected: ${socket.id}`);
    socket.on("join_affiliate", (affiliateId) => {
        socket.join(`affiliate_${affiliateId}`);
        logger.info(`Client ${socket.id} joined affiliate room: ${affiliateId}`);
    });
    socket.on("join_admin", () => {
        socket.join("admin");
        logger.info(`Client ${socket.id} joined admin room`);
    });
    socket.on("disconnect", () => {
        logger.info(`Client disconnected: ${socket.id}`);
    });
});
app.use((error, req, res, next) => {
    logger.error("Unhandled error:", error);
    res.status(500).json({ error: "Internal server error" });
});
app.get("/", (req, res) => {
    res.json({
        message: "TC Nutrition Athlete Portal API",
        version: "1.0.0",
        status: "running",
        endpoints: {
            auth: "/api/auth",
            dashboard: "/api/dashboard",
            affiliates: "/api/affiliates",
            offers: "/api/offers",
            analytics: "/api/analytics",
            automation: "/api/automation",
            integrations: "/api/integrations",
            security: "/api/security",
            enterprise: "/api/enterprise",
            mobile: "/api/mobile",
            compliance: "/api/compliance",
            webhooks: "/api/webhooks",
            alerts: "/api/alerts",
            payoutBuilder: "/api/payout-builder",
            trafficControl: "/api/traffic-control",
            webhooksV2: "/api/webhooks-v2",
            systemLogs: "/api/system-logs",
            realTimeAnalytics: "/api/real-time-analytics",
            advancedAnalytics: "/api/advanced-analytics",
            affiliateLinks: "/api/affiliate-links",
            coupons: "/api/coupons",
            notifications: "/api/notifications",
            programUpdates: "/api/program-updates",
        },
        documentation: "https://docs.tcnutrition.com",
        support: "support@tcnutrition.com",
    });
});
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
    });
});
app.use("*", (req, res) => {
    res.status(404).json({ error: "Route not found" });
});
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
    logger.info(`🚀 TC Nutrition Athlete Portal Backend Server running on port ${PORT}`);
    logger.info(`📡 WebSocket server running on port ${PORT}`);
    logger.info(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
    if (process.env.ENABLE_SHOPIFY_SYNC !== 'false') {
        ShopifySyncScheduler_1.default.startScheduler();
        logger.info(`🔄 Shopify auto-sync scheduler started (hourly)`);
    }
});
process.on("SIGTERM", async () => {
    logger.info("SIGTERM received, shutting down gracefully");
    ShopifySyncScheduler_1.default.stopScheduler();
    server.close(() => {
        logger.info("Server closed");
        process.exit(0);
    });
});
exports.default = app;
//# sourceMappingURL=index.js.map