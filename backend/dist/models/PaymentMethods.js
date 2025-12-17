"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentMethodsModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class PaymentMethodsModel {
    static async create(data) {
        return (await prisma.paymentMethodConfig.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                type: data.type,
                status: data.status || "ACTIVE",
                settings: (data.settings || {
                    sandboxMode: true,
                    customFields: {},
                    additionalSettings: {},
                    fees: data.fees || {
                        fixedFee: 0,
                        percentageFee: 0,
                        minimumFee: 0,
                        maximumFee: 0,
                        currency: "USD",
                    },
                    limits: data.limits || {
                        minimumAmount: 10,
                        maximumAmount: 10000,
                        dailyLimit: 50000,
                        monthlyLimit: 500000,
                        currency: "USD",
                    },
                    requirements: data.requirements || {
                        kycRequired: false,
                        bankAccountRequired: false,
                        taxIdRequired: false,
                        addressRequired: false,
                        phoneRequired: false,
                        additionalDocuments: [],
                    },
                    supportedCurrencies: data.supportedCurrencies || ["USD"],
                    processingTime: data.processingTime || "1-3 business days",
                    description: data.description || "",
                    instructions: data.instructions || "",
                }),
            },
        }));
    }
    static async findById(id) {
        return (await prisma.paymentMethodConfig.findUnique({
            where: { id },
        }));
    }
    static async update(id, data) {
        return (await prisma.paymentMethodConfig.update({
            where: { id },
            data: {
                ...data,
                settings: data.settings,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.paymentMethodConfig.update({
            where: { id },
            data: { status: "INACTIVE" },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.type)
            where.type = filters.type;
        if (filters.status)
            where.status = filters.status;
        return (await prisma.paymentMethodConfig.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async getActiveMethods(accountId) {
        return await this.list(accountId, { status: "ACTIVE" });
    }
    static async calculateFees(paymentMethodId, amount, currency) {
        const paymentMethod = await this.findById(paymentMethodId);
        if (!paymentMethod) {
            throw new Error("Payment method not found");
        }
        const fees = paymentMethod.settings.fees;
        let totalFees = 0;
        const percentageFee = (amount * fees.percentageFee) / 100;
        totalFees += fees.fixedFee;
        if (totalFees < fees.minimumFee) {
            totalFees = fees.minimumFee;
        }
        else if (totalFees > fees.maximumFee) {
            totalFees = fees.maximumFee;
        }
        const netAmount = amount - totalFees;
        return {
            totalFees,
            netAmount,
            breakdown: {
                fixedFee: fees.fixedFee,
                percentageFee: percentageFee,
                totalFees,
                netAmount,
            },
        };
    }
    static async validatePayment(paymentMethodId, amount, currency, affiliateId) {
        const paymentMethod = await this.findById(paymentMethodId);
        if (!paymentMethod) {
            return { valid: false, errors: ["Payment method not found"] };
        }
        const errors = [];
        if (paymentMethod.status !== "ACTIVE") {
            errors.push("Payment method is not active");
        }
        const supportedCurrencies = paymentMethod.settings
            .supportedCurrencies;
        if (!supportedCurrencies.includes(currency)) {
            errors.push(`Currency ${currency} is not supported by this payment method`);
        }
        const limits = paymentMethod.settings.limits;
        if (amount < limits.minimumAmount) {
            errors.push(`Amount must be at least ${limits.minimumAmount} ${limits.currency}`);
        }
        if (amount > limits.maximumAmount) {
            errors.push(`Amount cannot exceed ${limits.maximumAmount} ${limits.currency}`);
        }
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const dailyUsage = await prisma.payout.aggregate({
            where: {
                affiliateId,
                paymentMethodId,
                status: "COMPLETED",
                createdAt: {
                    gte: startOfDay,
                },
            },
            _sum: { amount: true },
        });
        const monthlyUsage = await prisma.payout.aggregate({
            where: {
                affiliateId,
                paymentMethodId,
                status: "COMPLETED",
                createdAt: {
                    gte: startOfMonth,
                },
            },
            _sum: { amount: true },
        });
        if (dailyUsage._sum.amount &&
            dailyUsage._sum.amount + amount > limits.dailyLimit) {
            errors.push("Daily limit would be exceeded");
        }
        if (monthlyUsage._sum.amount &&
            monthlyUsage._sum.amount + amount > limits.monthlyLimit) {
            errors.push("Monthly limit would be exceeded");
        }
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id: affiliateId },
        });
        if (affiliate) {
            const requirements = paymentMethod.settings.requirements;
            if (requirements.kycRequired && !affiliate.kycVerified) {
                errors.push("KYC verification is required for this payment method");
            }
            if (requirements.bankAccountRequired && !affiliate.bankAccount) {
                errors.push("Bank account information is required for this payment method");
            }
            if (requirements.taxIdRequired && !affiliate.taxId) {
                errors.push("Tax ID is required for this payment method");
            }
            if (requirements.addressRequired && !affiliate.address) {
                errors.push("Address information is required for this payment method");
            }
            if (requirements.phoneRequired && !affiliate.phone) {
                errors.push("Phone number is required for this payment method");
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static async recordUsage(paymentMethodId, affiliateId, amount, success, processingTime) {
        const existing = await prisma.paymentMethodUsage.findUnique({
            where: { paymentMethodId_affiliateId: { paymentMethodId, affiliateId } },
        });
        if (existing) {
            return (await prisma.paymentMethodUsage.update({
                where: { id: existing.id },
                data: {
                    usage: existing.usage + 1,
                    lastUsed: new Date(),
                    updatedAt: new Date(),
                },
            }));
        }
        else {
            return (await prisma.paymentMethodUsage.create({
                data: {
                    paymentMethodId,
                    affiliateId,
                    usage: 1,
                    lastUsed: new Date(),
                },
            }));
        }
    }
    static async getUsageStats(paymentMethodId) {
        const usage = await prisma.paymentMethodUsage.findMany({
            where: { paymentMethodId },
        });
        const stats = {
            totalUsers: usage.length,
            totalUsage: usage.reduce((sum, u) => sum + u.usage, 0),
            topUsers: usage
                .sort((a, b) => b.usage - a.usage)
                .slice(0, 10)
                .map((u) => ({
                affiliateId: u.affiliateId,
                usage: u.usage,
                lastUsed: u.lastUsed,
            })),
        };
        return stats;
    }
    static async createDefaultMethods(accountId) {
        const defaultMethods = [
            {
                name: "PayPal",
                type: "PAYPAL",
                settings: {
                    sandboxMode: true,
                    customFields: {},
                    additionalSettings: {},
                },
                fees: {
                    fixedFee: 0.3,
                    percentageFee: 2.9,
                    minimumFee: 0.3,
                    maximumFee: 0,
                    currency: "USD",
                },
                limits: {
                    minimumAmount: 1,
                    maximumAmount: 10000,
                    dailyLimit: 50000,
                    monthlyLimit: 500000,
                    currency: "USD",
                },
                requirements: {
                    kycRequired: false,
                    bankAccountRequired: false,
                    taxIdRequired: false,
                    addressRequired: true,
                    phoneRequired: false,
                    additionalDocuments: [],
                },
                supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
                processingTime: "Instant",
                description: "Fast and secure PayPal payments",
                instructions: "Enter your PayPal email address to receive payments",
            },
            {
                name: "Bank Transfer",
                type: "BANK_TRANSFER",
                settings: {
                    sandboxMode: false,
                    customFields: {},
                    additionalSettings: {},
                },
                fees: {
                    fixedFee: 0,
                    percentageFee: 0,
                    minimumFee: 0,
                    maximumFee: 0,
                    currency: "USD",
                },
                limits: {
                    minimumAmount: 50,
                    maximumAmount: 50000,
                    dailyLimit: 100000,
                    monthlyLimit: 1000000,
                    currency: "USD",
                },
                requirements: {
                    kycRequired: true,
                    bankAccountRequired: true,
                    taxIdRequired: true,
                    addressRequired: true,
                    phoneRequired: true,
                    additionalDocuments: ["Bank statement", "Government ID"],
                },
                supportedCurrencies: ["USD", "EUR", "GBP", "CAD", "AUD"],
                processingTime: "1-3 business days",
                description: "Direct bank transfer to your account",
                instructions: "Provide your bank account details including routing number and account number",
            },
            {
                name: "Wise (formerly TransferWise)",
                type: "WISE",
                settings: {
                    sandboxMode: true,
                    customFields: {},
                    additionalSettings: {},
                },
                fees: {
                    fixedFee: 0,
                    percentageFee: 0.5,
                    minimumFee: 0,
                    maximumFee: 0,
                    currency: "USD",
                },
                limits: {
                    minimumAmount: 1,
                    maximumAmount: 1000000,
                    dailyLimit: 1000000,
                    monthlyLimit: 10000000,
                    currency: "USD",
                },
                requirements: {
                    kycRequired: true,
                    bankAccountRequired: false,
                    taxIdRequired: false,
                    addressRequired: true,
                    phoneRequired: true,
                    additionalDocuments: ["Government ID"],
                },
                supportedCurrencies: [
                    "USD",
                    "EUR",
                    "GBP",
                    "CAD",
                    "AUD",
                    "JPY",
                    "CHF",
                    "SEK",
                    "NZD",
                ],
                processingTime: "Same day",
                description: "Low-cost international money transfers",
                instructions: "Create a Wise account and provide your Wise email address",
            },
        ];
        const createdMethods = [];
        for (const methodData of defaultMethods) {
            const method = await this.create({
                accountId,
                ...methodData,
            });
            createdMethods.push(method);
        }
        return createdMethods;
    }
    static async getAffiliateMethods(affiliateId) {
        const affiliate = await prisma.affiliateProfile.findUnique({
            where: { id: affiliateId },
        });
        if (!affiliate) {
            return [];
        }
        const allMethods = await this.getActiveMethods(affiliate.userId);
        const availableMethods = [];
        for (const method of allMethods) {
            const validation = await this.validatePayment(method.id, 100, "USD", affiliateId);
            if (validation.valid) {
                availableMethods.push(method);
            }
        }
        return availableMethods;
    }
    static async getMethodComparison(accountId) {
        const methods = await this.getActiveMethods(accountId);
        return methods.map((method) => ({
            id: method.id,
            name: method.name,
            type: method.type,
            settings: method.settings,
        }));
    }
    static async updateMethodStatus(id, status) {
        return await this.update(id, { status: status });
    }
    static async getMethodHealth(accountId) {
        const methods = await this.list(accountId);
        const health = {
            totalMethods: methods.length,
            activeMethods: methods.filter((m) => m.status === "ACTIVE").length,
            inactiveMethods: methods.filter((m) => m.status === "INACTIVE").length,
            suspendedMethods: methods.filter((m) => m.status === "SUSPENDED").length,
            byType: {},
        };
        methods.forEach((method) => {
            health.byType[method.type] = (health.byType[method.type] || 0) + 1;
        });
        return health;
    }
}
exports.PaymentMethodsModel = PaymentMethodsModel;
//# sourceMappingURL=PaymentMethods.js.map