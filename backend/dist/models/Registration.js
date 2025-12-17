"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistrationModel = void 0;
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const SystemSettingsService_1 = require("../services/SystemSettingsService");
const prisma = new client_1.PrismaClient();
class RegistrationModel {
    static async createForm(data) {
        return (await prisma.registrationForm.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                fields: (data.fields || []),
                settings: (data.settings || {
                    allowRegistration: true,
                    requireApproval: true,
                    requireEmailVerification: true,
                    autoAssignTier: false,
                    welcomeEmail: true,
                }),
                status: data.status || "DRAFT",
            },
        }));
    }
    static async findFormById(id) {
        return (await prisma.registrationForm.findUnique({
            where: { id },
        }));
    }
    static async findActiveForm(accountId) {
        return (await prisma.registrationForm.findFirst({
            where: {
                accountId,
                status: "ACTIVE",
            },
        }));
    }
    static async updateForm(id, data) {
        return (await prisma.registrationForm.update({
            where: { id },
            data: {
                ...data,
                fields: data.fields,
                settings: data.settings,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteForm(id) {
        await prisma.registrationForm.delete({
            where: { id },
        });
    }
    static async listForms(accountId, filters = {}) {
        const where = { accountId };
        if (filters.status)
            where.status = filters.status;
        return (await prisma.registrationForm.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async submitRegistration(formId, data, ipAddress, userAgent) {
        const form = await this.findFormById(formId);
        if (!form) {
            throw new Error("Registration form not found");
        }
        if (form.status !== "ACTIVE") {
            throw new Error("Registration form is not active");
        }
        const validation = await this.validateSubmission(form, data);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
        }
        const submission = (await prisma.registrationSubmission.create({
            data: {
                formId,
                data: data,
                status: "PENDING",
                submittedAt: new Date(),
                ipAddress,
                userAgent,
            },
        }));
        await this.processSubmission(submission, form);
        return submission;
    }
    static async validateSubmission(form, data) {
        const errors = [];
        for (const field of form.fields) {
            if (field.required &&
                (!data[field.name] || data[field.name].toString().trim() === "")) {
                errors.push(`${field.label} is required`);
                continue;
            }
            if (data[field.name] && field.validation) {
                const value = data[field.name].toString();
                const validation = field.validation;
                if (validation.minLength && value.length < validation.minLength) {
                    errors.push(`${field.label} must be at least ${validation.minLength} characters`);
                }
                if (validation.maxLength && value.length > validation.maxLength) {
                    errors.push(`${field.label} must be no more than ${validation.maxLength} characters`);
                }
                if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
                    errors.push(validation.customMessage || `${field.label} format is invalid`);
                }
            }
        }
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    static async processSubmission(submission, form) {
        const settings = form.settings;
        if (settings.requireApproval) {
            return;
        }
        await this.approveSubmission(submission.id, "system", "Auto-approved");
    }
    static async approveSubmission(submissionId, reviewedBy, notes) {
        const submission = await prisma.registrationSubmission.findUnique({
            where: { id: submissionId },
        });
        if (!submission) {
            throw new Error("Submission not found");
        }
        const form = await this.findFormById(submission.formId);
        if (!form) {
            throw new Error("Form not found");
        }
        const updatedSubmission = (await prisma.registrationSubmission.update({
            where: { id: submissionId },
            data: {
                status: "APPROVED",
                reviewedAt: new Date(),
                reviewedBy,
                notes,
            },
        }));
        await this.createUserFromSubmission(submission, form);
        return updatedSubmission;
    }
    static async rejectSubmission(submissionId, reviewedBy, notes) {
        return (await prisma.registrationSubmission.update({
            where: { id: submissionId },
            data: {
                status: "REJECTED",
                reviewedAt: new Date(),
                reviewedBy,
                notes,
            },
        }));
    }
    static async createUserFromSubmission(submission, form) {
        const data = submission.data;
        const hashedPassword = await bcryptjs_1.default.hash(data.password, 12);
        const user = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: data.firstName,
                lastName: data.lastName,
                role: "AFFILIATE",
                status: "ACTIVE",
            },
        });
        const defaultCommissionRate = await SystemSettingsService_1.SystemSettingsService.getDefaultCommissionRate();
        const affiliate = await prisma.affiliateProfile.create({
            data: {
                userId: user.id,
                companyName: data.companyName || "",
                website: data.website || "",
                phone: data.phone || "",
                address: (data.address || {}),
                taxId: data.taxId || "",
                bankAccount: data.bankAccount || "",
                paymentMethod: "BANK_TRANSFER",
                status: "ACTIVE",
                tier: form.settings.defaultTierId || "BRONZE",
                commissionRate: defaultCommissionRate,
            },
        });
        if (form.settings.welcomeEmail) {
            console.log("Sending welcome email to:", user.email);
        }
    }
    static async getSubmissions(formId, filters = {}, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = { formId };
        if (filters.status)
            where.status = filters.status;
        if (filters.startDate && filters.endDate) {
            where.submittedAt = {
                gte: filters.startDate,
                lte: filters.endDate,
            };
        }
        return (await prisma.registrationSubmission.findMany({
            where,
            skip,
            take: limit,
            orderBy: { submittedAt: "desc" },
        }));
    }
    static async createWorkflow(data) {
        return (await prisma.registrationWorkflow.create({
            data: {
                accountId: data.accountId,
                name: data.name,
                description: data.description || "",
                steps: (data.steps || []),
                status: data.status || "ACTIVE",
                form: {
                    connect: { id: data.formId },
                },
            },
        }));
    }
    static async findWorkflowById(id) {
        return (await prisma.registrationWorkflow.findUnique({
            where: { id },
        }));
    }
    static async updateWorkflow(id, data) {
        return (await prisma.registrationWorkflow.update({
            where: { id },
            data: {
                ...data,
                steps: data.steps,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteWorkflow(id) {
        await prisma.registrationWorkflow.delete({
            where: { id },
        });
    }
    static async listWorkflows(accountId) {
        return (await prisma.registrationWorkflow.findMany({
            where: { accountId },
            orderBy: { createdAt: "desc" },
        }));
    }
    static async executeWorkflow(workflowId, submissionData) {
        const workflow = await this.findWorkflowById(workflowId);
        if (!workflow) {
            throw new Error("Workflow not found");
        }
        if (workflow.status !== "ACTIVE") {
            throw new Error("Workflow is not active");
        }
        for (const step of workflow.steps) {
            await this.executeWorkflowStep(step, submissionData);
        }
    }
    static async executeWorkflowStep(step, data) {
        if (step.conditions) {
            const conditionsMet = step.conditions.every((condition) => {
                const value = data[condition.field];
                switch (condition.operator) {
                    case "EQUALS":
                        return value === condition.value;
                    case "NOT_EQUALS":
                        return value !== condition.value;
                    case "CONTAINS":
                        return String(value).includes(String(condition.value));
                    case "GREATER_THAN":
                        return Number(value) > Number(condition.value);
                    case "LESS_THAN":
                        return Number(value) < Number(condition.value);
                    default:
                        return false;
                }
            });
            if (!conditionsMet) {
                return;
            }
        }
        switch (step.type) {
            case "FORM":
                break;
            case "APPROVAL":
                break;
            case "EMAIL":
                break;
            case "WEBHOOK":
                break;
            case "CONDITION":
                break;
        }
    }
    static async getRegistrationStats(accountId, startDate, endDate) {
        const where = {
            form: { accountId },
        };
        if (startDate && endDate) {
            where.submittedAt = {
                gte: startDate,
                lte: endDate,
            };
        }
        const submissions = await prisma.registrationSubmission.findMany({
            where,
            include: {
                form: true,
            },
        });
        const stats = {
            totalSubmissions: submissions.length,
            pendingSubmissions: submissions.filter((s) => s.status === "PENDING")
                .length,
            approvedSubmissions: submissions.filter((s) => s.status === "APPROVED")
                .length,
            rejectedSubmissions: submissions.filter((s) => s.status === "REJECTED")
                .length,
            approvalRate: 0,
            byStatus: {},
            byForm: {},
            byDay: {},
        };
        if (submissions.length > 0) {
            stats.approvalRate =
                (stats.approvedSubmissions / submissions.length) * 100;
        }
        submissions.forEach((submission) => {
            stats.byStatus[submission.status] =
                (stats.byStatus[submission.status] || 0) + 1;
            stats.byForm[submission.formId] =
                (stats.byForm[submission.formId] || 0) + 1;
            const day = submission.submittedAt.toISOString().split("T")[0];
            stats.byDay[day] = (stats.byDay[day] || 0) + 1;
        });
        return stats;
    }
    static async createDefaultForm(accountId) {
        const defaultFields = [
            {
                id: "firstName",
                name: "firstName",
                label: "First Name",
                type: "TEXT",
                required: true,
                placeholder: "Enter your first name",
                validation: {
                    minLength: 2,
                    maxLength: 50,
                },
                order: 1,
            },
            {
                id: "lastName",
                name: "lastName",
                label: "Last Name",
                type: "TEXT",
                required: true,
                placeholder: "Enter your last name",
                validation: {
                    minLength: 2,
                    maxLength: 50,
                },
                order: 2,
            },
            {
                id: "email",
                name: "email",
                label: "Email Address",
                type: "EMAIL",
                required: true,
                placeholder: "Enter your email address",
                validation: {
                    pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
                    customMessage: "Please enter a valid email address",
                },
                order: 3,
            },
            {
                id: "password",
                name: "password",
                label: "Password",
                type: "PASSWORD",
                required: true,
                placeholder: "Enter your password",
                validation: {
                    minLength: 8,
                    maxLength: 128,
                },
                order: 4,
            },
            {
                id: "companyName",
                name: "companyName",
                label: "Company Name",
                type: "TEXT",
                required: false,
                placeholder: "Enter your company name",
                order: 5,
            },
            {
                id: "website",
                name: "website",
                label: "Website",
                type: "TEXT",
                required: false,
                placeholder: "Enter your website URL",
                order: 6,
            },
            {
                id: "phone",
                name: "phone",
                label: "Phone Number",
                type: "PHONE",
                required: false,
                placeholder: "Enter your phone number",
                order: 7,
            },
        ];
        return await this.createForm({
            accountId,
            name: "Default Affiliate Registration",
            description: "Standard registration form for new affiliates",
            fields: defaultFields,
            settings: {
                allowRegistration: true,
                requireApproval: true,
                requireEmailVerification: true,
                autoAssignTier: true,
                welcomeEmail: true,
            },
            status: "ACTIVE",
        });
    }
    static async exportFormData(formId) {
        const form = await this.findFormById(formId);
        if (!form) {
            return null;
        }
        const submissions = await this.getSubmissions(formId);
        return {
            form,
            submissions,
            exportedAt: new Date().toISOString(),
        };
    }
    static async importFormData(accountId, formData) {
        return await this.createForm({
            accountId,
            name: formData.name,
            description: formData.description,
            fields: formData.fields,
            settings: formData.settings,
            status: "DRAFT",
        });
    }
}
exports.RegistrationModel = RegistrationModel;
//# sourceMappingURL=Registration.js.map