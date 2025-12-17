"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TermsConditionsModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class TermsConditionsModel {
    static async create(data) {
        return await prisma.termsConditions.create({
            data: {
                accountId: data.accountId,
                type: data.type,
                title: data.title,
                content: data.content,
                version: data.version || "1.0",
                status: data.status || "DRAFT",
                effectiveDate: data.effectiveDate || new Date(),
                expiryDate: data.expiryDate,
                requiresAcceptance: data.requiresAcceptance || false,
                acceptanceRequired: data.acceptanceRequired || [],
                lastModifiedBy: data.lastModifiedBy,
            },
        });
    }
    static async findById(id) {
        return await prisma.termsConditions.findUnique({
            where: { id },
        });
    }
    static async findByAccountAndType(accountId, type) {
        return await prisma.termsConditions.findFirst({
            where: {
                accountId,
                type: type,
                status: "ACTIVE",
            },
            orderBy: { effectiveDate: "desc" },
        });
    }
    static async update(id, data) {
        return await prisma.termsConditions.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        });
    }
    static async delete(id) {
        await prisma.termsConditions.update({
            where: { id },
            data: { status: "ARCHIVED" },
        });
    }
    static async list(accountId, filters = {}) {
        const where = { accountId };
        if (filters.type)
            where.type = filters.type;
        if (filters.status)
            where.status = filters.status;
        if (filters.requiresAcceptance !== undefined)
            where.requiresAcceptance = filters.requiresAcceptance;
        return await prisma.termsConditions.findMany({
            where,
            orderBy: { effectiveDate: "desc" },
        });
    }
    static async activate(id, userId) {
        const terms = await this.findById(id);
        if (!terms) {
            throw new Error("Terms not found");
        }
        await prisma.termsConditions.updateMany({
            where: {
                accountId: terms.accountId,
                type: terms.type,
                status: "ACTIVE",
            },
            data: { status: "ARCHIVED" },
        });
        return await this.update(id, {
            status: "ACTIVE",
            lastModifiedBy: userId,
        });
    }
    static async acceptTerms(termsId, userId, userRole, ipAddress, userAgent) {
        const terms = await this.findById(termsId);
        if (!terms) {
            throw new Error("Terms not found");
        }
        if (terms.acceptanceRequired.length > 0 &&
            !terms.acceptanceRequired.includes(userRole)) {
            throw new Error("User role is not required to accept these terms");
        }
        const existingAcceptance = await prisma.termsAcceptance.findFirst({
            where: {
                termsId,
                userId,
                version: terms.version,
            },
        });
        if (existingAcceptance) {
            throw new Error("Terms already accepted");
        }
        return (await prisma.termsAcceptance.create({
            data: {
                termsId,
                userId,
                userRole,
                acceptedAt: new Date(),
                ipAddress,
                userAgent,
                version: terms.version,
            },
        }));
    }
    static async getAcceptanceStatus(termsId, userId) {
        const terms = await this.findById(termsId);
        if (!terms) {
            return { accepted: false };
        }
        const acceptance = await prisma.termsAcceptance.findFirst({
            where: {
                termsId,
                userId,
                version: terms.version,
            },
        });
        return {
            accepted: !!acceptance,
            acceptance,
        };
    }
    static async getUserAcceptances(userId) {
        return (await prisma.termsAcceptance.findMany({
            where: { userId },
            include: {
                terms: true,
            },
            orderBy: { acceptedAt: "desc" },
        }));
    }
    static async getRequiredAcceptances(userId, userRole, accountId) {
        const requiredTerms = await prisma.termsConditions.findMany({
            where: {
                accountId,
                status: "ACTIVE",
                requiresAcceptance: true,
                acceptanceRequired: {
                    has: userRole,
                },
            },
        });
        const pendingTerms = [];
        for (const terms of requiredTerms) {
            const status = await this.getAcceptanceStatus(terms.id, userId);
            if (!status.accepted) {
                pendingTerms.push(terms);
            }
        }
        return pendingTerms;
    }
    static async createTemplate(data) {
        return (await prisma.termsTemplate.create({
            data: {
                name: data.name,
                description: data.description || "",
                type: data.type,
                category: data.category,
                content: data.content,
                variables: data.variables || [],
                isDefault: data.isDefault || false,
                isPublic: data.isPublic || false,
            },
        }));
    }
    static async findTemplateById(id) {
        return (await prisma.termsTemplate.findUnique({
            where: { id },
        }));
    }
    static async listTemplates(filters = {}) {
        const where = {};
        if (filters.type)
            where.type = filters.type;
        if (filters.category)
            where.category = filters.category;
        if (filters.isPublic !== undefined)
            where.isPublic = filters.isPublic;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.termsTemplate.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async generateFromTemplate(templateId, accountId, variables, userId) {
        const template = await this.findTemplateById(templateId);
        if (!template) {
            throw new Error("Template not found");
        }
        let content = template.content;
        for (const [key, value] of Object.entries(variables)) {
            const placeholder = `{{${key}}}`;
            content = content.replace(new RegExp(placeholder, "g"), value);
        }
        return await this.create({
            accountId,
            type: template.type,
            title: template.name,
            content,
            lastModifiedBy: userId,
        });
    }
    static async createDefaultTemplates() {
        const defaultTemplates = [
            {
                name: "Affiliate Program Terms",
                description: "Standard terms and conditions for affiliate programs",
                type: "AFFILIATE_TERMS",
                category: "LEGAL",
                content: `
          <h1>Affiliate Program Terms and Conditions</h1>
          
          <h2>1. Program Overview</h2>
          <p>Welcome to the {{companyName}} Affiliate Program. By participating in this program, you agree to be bound by these terms and conditions.</p>
          
          <h2>2. Eligibility</h2>
          <p>To be eligible for the program, you must:</p>
          <ul>
            <li>Be at least 18 years old</li>
            <li>Have a valid website or social media presence</li>
            <li>Comply with all applicable laws and regulations</li>
          </ul>
          
          <h2>3. Commission Structure</h2>
          <p>Commissions are paid at a rate of {{commissionRate}}% for qualified sales. Commissions are subject to the following terms:</p>
          <ul>
            <li>Commissions are paid {{payoutSchedule}}</li>
            <li>Minimum payout threshold is $50</li>
            <li>Commissions may be reversed for returns or chargebacks</li>
          </ul>
          
          <h2>4. Prohibited Activities</h2>
          <p>The following activities are strictly prohibited:</p>
          <ul>
            <li>Spam or unsolicited email marketing</li>
            <li>Misleading or false advertising</li>
            <li>Bidding on trademarked keywords</li>
            <li>Self-referrals or fraudulent activity</li>
          </ul>
          
          <h2>5. Termination</h2>
          <p>Either party may terminate this agreement at any time with {{noticePeriod}} notice. Upon termination, all outstanding commissions will be paid according to the standard schedule.</p>
          
          <h2>6. Limitation of Liability</h2>
          <p>{{companyName}} shall not be liable for any indirect, incidental, or consequential damages arising from this agreement.</p>
          
          <p><strong>Last Updated:</strong> {{effectiveDate}}</p>
        `,
                variables: [
                    "companyName",
                    "commissionRate",
                    "payoutSchedule",
                    "minimumPayout",
                    "noticePeriod",
                    "effectiveDate",
                ],
                isDefault: true,
                isPublic: true,
            },
            {
                name: "Privacy Policy",
                description: "Standard privacy policy template",
                type: "PRIVACY_POLICY",
                category: "LEGAL",
                content: `
          <h1>Privacy Policy</h1>
          
          <h2>1. Information We Collect</h2>
          <p>We collect information you provide directly to us, such as when you create an account, participate in our affiliate program, or contact us for support.</p>
          
          <h2>2. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Provide and maintain our services</li>
            <li>Process payments and commissions</li>
            <li>Send you important updates and notifications</li>
            <li>Improve our services and user experience</li>
          </ul>
          
          <h2>3. Information Sharing</h2>
          <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.</p>
          
          <h2>4. Data Security</h2>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
          
          <h2>5. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your information</li>
            <li>Opt out of marketing communications</li>
          </ul>
          
          <p><strong>Last Updated:</strong> {{effectiveDate}}</p>
        `,
                variables: ["effectiveDate"],
                isDefault: true,
                isPublic: true,
            },
        ];
        const createdTemplates = [];
        for (const templateData of defaultTemplates) {
            const template = await this.createTemplate(templateData);
            createdTemplates.push(template);
        }
        return createdTemplates;
    }
    static async getTermsHistory(accountId, type) {
        return await prisma.termsConditions.findMany({
            where: {
                accountId,
                type: type,
            },
            orderBy: { effectiveDate: "desc" },
        });
    }
    static async getAcceptanceStats(termsId) {
        const terms = await this.findById(termsId);
        if (!terms) {
            return null;
        }
        const acceptances = await prisma.termsAcceptance.findMany({
            where: { termsId },
        });
        const stats = {
            totalAcceptances: acceptances.length,
            byRole: {},
            byDate: {},
            byVersion: {},
        };
        acceptances.forEach((acceptance) => {
            stats.byRole[acceptance.userRole] =
                (stats.byRole[acceptance.userRole] || 0) + 1;
            const date = acceptance.acceptedAt.toISOString().split("T")[0];
            stats.byDate[date] = (stats.byDate[date] || 0) + 1;
            stats.byVersion[acceptance.version] =
                (stats.byVersion[acceptance.version] || 0) + 1;
        });
        return stats;
    }
    static async exportTerms(termsId) {
        const terms = await this.findById(termsId);
        if (!terms) {
            return null;
        }
        const acceptances = await prisma.termsAcceptance.findMany({
            where: { termsId },
        });
        return {
            terms,
            acceptances,
            exportedAt: new Date().toISOString(),
        };
    }
    static async importTerms(accountId, termsData, userId) {
        return await this.create({
            accountId,
            type: termsData.type,
            title: termsData.title,
            content: termsData.content,
            version: termsData.version,
            status: "DRAFT",
            effectiveDate: new Date(termsData.effectiveDate),
            expiryDate: termsData.expiryDate
                ? new Date(termsData.expiryDate)
                : undefined,
            requiresAcceptance: termsData.requiresAcceptance,
            acceptanceRequired: termsData.acceptanceRequired,
            lastModifiedBy: userId,
        });
    }
}
exports.TermsConditionsModel = TermsConditionsModel;
//# sourceMappingURL=TermsConditions.js.map