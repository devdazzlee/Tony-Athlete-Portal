"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const router = express_1.default.Router();
const prisma = new client_1.PrismaClient();
router.get("/faq", async (req, res) => {
    try {
        const { category } = req.query;
        const faqItems = [
            {
                id: "faq-1",
                category: "Getting Started",
                question: "How do I become an affiliate?",
                answer: "To become an affiliate, simply sign up for an account and complete your profile. Once approved, you'll get access to your unique referral links and marketing materials.",
                helpful: 245,
                notHelpful: 12,
                createdAt: new Date("2024-01-01"),
            },
            {
                id: "faq-2",
                category: "Getting Started",
                question: "How do I generate my first affiliate link?",
                answer: "Navigate to the 'Links & Assets' section in your dashboard. Enter the URL you want to promote, and click 'Generate Link'. You'll receive a unique tracking link that you can share.",
                helpful: 198,
                notHelpful: 8,
                createdAt: new Date("2024-01-01"),
            },
            {
                id: "faq-3",
                category: "Commissions",
                question: "When do I get paid?",
                answer: "Commissions are paid out monthly, typically within the first 5 business days of each month. You must have a minimum balance of $50 to request a payout.",
                helpful: 312,
                notHelpful: 15,
                createdAt: new Date("2024-01-02"),
            },
            {
                id: "faq-4",
                category: "Commissions",
                question: "What is the commission rate?",
                answer: "Commission rates vary based on your tier and the products you promote. Rates typically range from 5% to 30%. Check your dashboard for your current commission rate.",
                helpful: 267,
                notHelpful: 19,
                createdAt: new Date("2024-01-02"),
            },
            {
                id: "faq-5",
                category: "Technical",
                question: "How do I track my performance?",
                answer: "Your dashboard provides real-time analytics including clicks, conversions, and earnings. You can filter by date range and view detailed reports in the Statistics section.",
                helpful: 189,
                notHelpful: 7,
                createdAt: new Date("2024-01-03"),
            },
            {
                id: "faq-6",
                category: "Technical",
                question: "Can I use my links on social media?",
                answer: "Yes! Our affiliate links work on all platforms including Facebook, Instagram, Twitter, TikTok, and more. Make sure to disclose your affiliate relationship as required by law.",
                helpful: 223,
                notHelpful: 11,
                createdAt: new Date("2024-01-03"),
            },
            {
                id: "faq-7",
                category: "Account",
                question: "How do I update my payment information?",
                answer: "Go to Settings > Payout Settings to update your payment method, email, or bank details. Changes may take 24-48 hours to process.",
                helpful: 156,
                notHelpful: 6,
                createdAt: new Date("2024-01-04"),
            },
            {
                id: "faq-8",
                category: "Account",
                question: "Can I have multiple accounts?",
                answer: "No, each person is allowed only one affiliate account. Multiple accounts may result in suspension and forfeiture of commissions.",
                helpful: 134,
                notHelpful: 23,
                createdAt: new Date("2024-01-04"),
            },
        ];
        const filteredFAQs = category
            ? faqItems.filter((item) => item.category === category)
            : faqItems;
        const categories = [...new Set(faqItems.map((item) => item.category))];
        res.json({
            faqs: filteredFAQs,
            categories,
            total: filteredFAQs.length,
        });
    }
    catch (error) {
        console.error("Error fetching FAQ:", error);
        res.status(500).json({ error: "Failed to fetch FAQ items" });
    }
});
router.post("/faq/:id/helpful", auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { helpful } = req.body;
        res.json({
            success: true,
            message: helpful ? "Marked as helpful" : "Marked as not helpful",
        });
    }
    catch (error) {
        console.error("Error marking FAQ:", error);
        res.status(500).json({ error: "Failed to update FAQ feedback" });
    }
});
router.get("/tickets", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { status } = req.query;
        const tickets = [
            {
                id: "TICKET-001",
                subject: "Payment issue",
                category: "Payment Problems",
                status: "Open",
                priority: "High",
                createdAt: new Date("2024-10-10"),
                updatedAt: new Date("2024-10-12"),
                lastResponse: "Support Team",
                messages: 3,
            },
            {
                id: "TICKET-002",
                subject: "Link not tracking clicks",
                category: "Technical Support",
                status: "In Progress",
                priority: "Medium",
                createdAt: new Date("2024-10-05"),
                updatedAt: new Date("2024-10-11"),
                lastResponse: "You",
                messages: 5,
            },
            {
                id: "TICKET-003",
                subject: "Commission rate question",
                category: "Commission Questions",
                status: "Resolved",
                priority: "Low",
                createdAt: new Date("2024-09-28"),
                updatedAt: new Date("2024-09-30"),
                lastResponse: "Support Team",
                messages: 2,
            },
        ];
        const filteredTickets = status
            ? tickets.filter((ticket) => ticket.status === status)
            : tickets;
        res.json({
            tickets: filteredTickets,
            total: filteredTickets.length,
            summary: {
                open: tickets.filter((t) => t.status === "Open").length,
                inProgress: tickets.filter((t) => t.status === "In Progress").length,
                resolved: tickets.filter((t) => t.status === "Resolved").length,
            },
        });
    }
    catch (error) {
        console.error("Error fetching tickets:", error);
        res.status(500).json({ error: "Failed to fetch support tickets" });
    }
});
router.post("/tickets", auth_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { subject, category, priority, message } = req.body;
        const schema = zod_1.z.object({
            subject: zod_1.z.string().min(5).max(200),
            category: zod_1.z.string(),
            priority: zod_1.z.enum(["Low", "Medium", "High", "Critical"]),
            message: zod_1.z.string().min(10),
        });
        const validatedData = schema.parse({
            subject,
            category,
            priority,
            message,
        });
        const ticket = {
            id: `TICKET-${crypto_1.default.randomBytes(3).toString("hex").toUpperCase()}`,
            subject: validatedData.subject,
            category: validatedData.category,
            status: "Open",
            priority: validatedData.priority,
            createdAt: new Date(),
            updatedAt: new Date(),
            lastResponse: "You",
            messages: 1,
            userId,
        };
        res.json({
            success: true,
            ticket,
            message: "Support ticket created successfully. Our team will respond within 24-48 hours.",
        });
    }
    catch (error) {
        console.error("Error creating ticket:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to create support ticket" });
    }
});
router.get("/tickets/:id", auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const ticket = {
            id,
            subject: "Payment issue",
            category: "Payment Problems",
            status: "Open",
            priority: "High",
            createdAt: new Date("2024-10-10"),
            updatedAt: new Date("2024-10-12"),
            messages: [
                {
                    id: "msg-1",
                    sender: "You",
                    message: "I haven't received my payment for September. Can you please check?",
                    timestamp: new Date("2024-10-10T10:30:00"),
                    isSupport: false,
                },
                {
                    id: "msg-2",
                    sender: "Support Team",
                    message: "Thank you for contacting us. We're looking into your payment issue. Can you please provide your payout ID?",
                    timestamp: new Date("2024-10-11T14:20:00"),
                    isSupport: true,
                },
                {
                    id: "msg-3",
                    sender: "You",
                    message: "Sure, it's PAY-001 from September 30th.",
                    timestamp: new Date("2024-10-12T09:15:00"),
                    isSupport: false,
                },
            ],
        };
        res.json(ticket);
    }
    catch (error) {
        console.error("Error fetching ticket details:", error);
        res.status(500).json({ error: "Failed to fetch ticket details" });
    }
});
router.post("/tickets/:id/reply", auth_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const schema = zod_1.z.object({
            message: zod_1.z.string().min(1),
        });
        const validatedData = schema.parse({ message });
        const reply = {
            id: `msg-${crypto_1.default.randomBytes(3).toString("hex")}`,
            sender: "You",
            message: validatedData.message,
            timestamp: new Date(),
            isSupport: false,
        };
        res.json({
            success: true,
            reply,
            message: "Reply sent successfully",
        });
    }
    catch (error) {
        console.error("Error replying to ticket:", error);
        if (error instanceof zod_1.z.ZodError) {
            return res
                .status(400)
                .json({ error: "Invalid input data", details: error.errors });
        }
        res.status(500).json({ error: "Failed to send reply" });
    }
});
router.get("/terms", async (req, res) => {
    try {
        const terms = {
            lastUpdated: new Date("2024-01-01"),
            sections: [
                {
                    title: "Affiliate Agreement",
                    content: "By joining our affiliate program, you agree to promote our products in accordance with these terms and conditions.",
                },
                {
                    title: "Commission Structure",
                    content: "Commissions are calculated based on completed sales. The commission rate depends on your tier level and product category.",
                },
                {
                    title: "Payment Terms",
                    content: "Payments are processed monthly with a minimum payout threshold of $50. Payments are made via PayPal or bank transfer.",
                },
                {
                    title: "Prohibited Activities",
                    content: "Affiliates may not use spam, misleading advertising, or trademark infringement. Violation may result in account termination.",
                },
                {
                    title: "Cookie Duration",
                    content: "Our tracking cookies are valid for 30 days. Any purchase made within this period will be credited to your account.",
                },
            ],
        };
        res.json(terms);
    }
    catch (error) {
        console.error("Error fetching terms:", error);
        res.status(500).json({ error: "Failed to fetch program terms" });
    }
});
router.get("/knowledge-base", async (req, res) => {
    try {
        const { category, search } = req.query;
        const articles = [
            {
                id: "kb-1",
                title: "Getting Started with Affiliate Marketing",
                category: "Guides",
                excerpt: "Learn the basics of affiliate marketing and how to get started with our program.",
                views: 1245,
                helpful: 189,
                lastUpdated: new Date("2024-09-15"),
            },
            {
                id: "kb-2",
                title: "Best Practices for Social Media Promotion",
                category: "Marketing Tips",
                excerpt: "Discover effective strategies for promoting affiliate links on social media platforms.",
                views: 987,
                helpful: 156,
                lastUpdated: new Date("2024-09-20"),
            },
            {
                id: "kb-3",
                title: "Understanding Commission Tiers",
                category: "Commissions",
                excerpt: "Learn about our tier system and how to increase your commission rate.",
                views: 756,
                helpful: 134,
                lastUpdated: new Date("2024-10-01"),
            },
        ];
        let filteredArticles = articles;
        if (category) {
            filteredArticles = filteredArticles.filter((article) => article.category === category);
        }
        if (search) {
            const searchLower = search.toLowerCase();
            filteredArticles = filteredArticles.filter((article) => article.title.toLowerCase().includes(searchLower) ||
                article.excerpt.toLowerCase().includes(searchLower));
        }
        res.json({
            articles: filteredArticles,
            total: filteredArticles.length,
        });
    }
    catch (error) {
        console.error("Error fetching knowledge base:", error);
        res.status(500).json({ error: "Failed to fetch knowledge base articles" });
    }
});
exports.default = router;
//# sourceMappingURL=support.js.map