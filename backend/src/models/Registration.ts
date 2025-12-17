import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SystemSettingsService } from "../services/SystemSettingsService";

const prisma = new PrismaClient();

export interface RegistrationField {
  id: string;
  name: string;
  label: string;
  type:
    | "TEXT"
    | "EMAIL"
    | "PASSWORD"
    | "PHONE"
    | "SELECT"
    | "CHECKBOX"
    | "RADIO"
    | "TEXTAREA"
    | "FILE"
    | "DATE";
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: FieldValidation;
  order: number;
}

export interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customMessage?: string;
}

export interface RegistrationSettings {
  allowRegistration: boolean;
  requireApproval: boolean;
  requireEmailVerification: boolean;
  autoAssignTier: boolean;
  defaultTierId?: string;
  welcomeEmail: boolean;
  welcomeEmailTemplate?: string;
  redirectUrl?: string;
  customCss?: string;
  customJs?: string;
}

export interface RegistrationSubmission {
  id: string;
  formId: string;
  data: Record<string, any>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "UNDER_REVIEW";
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  notes?: string;
  ipAddress: string;
  userAgent: string;
}

export interface RegistrationWorkflow {
  id: string;
  accountId: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowStep {
  id: string;
  name: string;
  type: "FORM" | "APPROVAL" | "EMAIL" | "WEBHOOK" | "CONDITION";
  order: number;
  settings: any;
  conditions?: WorkflowCondition[];
}

export interface WorkflowCondition {
  field: string;
  operator: "EQUALS" | "NOT_EQUALS" | "CONTAINS" | "GREATER_THAN" | "LESS_THAN";
  value: any;
}

export class RegistrationModel {
  static async createForm(data: any): Promise<any> {
    return (await prisma.registrationForm.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        fields: (data.fields || []) as any,
        settings: (data.settings || {
          allowRegistration: true,
          requireApproval: true,
          requireEmailVerification: true,
          autoAssignTier: false,
          welcomeEmail: true,
        }) as any,
        status: data.status || "DRAFT",
      },
    })) as unknown as any;
  }

  static async findFormById(id: string): Promise<any | null> {
    return (await prisma.registrationForm.findUnique({
      where: { id },
    })) as unknown as any | null;
  }

  static async findActiveForm(accountId: string): Promise<any | null> {
    return (await prisma.registrationForm.findFirst({
      where: {
        accountId,
        status: "ACTIVE",
      },
    })) as unknown as any | null;
  }

  static async updateForm(id: string, data: any): Promise<any> {
    return (await prisma.registrationForm.update({
      where: { id },
      data: {
        ...data,
        fields: data.fields as any,
        settings: data.settings as any,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async deleteForm(id: string): Promise<void> {
    await prisma.registrationForm.delete({
      where: { id },
    });
  }

  static async listForms(accountId: string, filters: any = {}): Promise<any[]> {
    const where: any = { accountId };

    if (filters.status) where.status = filters.status;

    return (await prisma.registrationForm.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async submitRegistration(
    formId: string,
    data: Record<string, any>,
    ipAddress: string,
    userAgent: string
  ): Promise<RegistrationSubmission> {
    const form = await this.findFormById(formId);
    if (!form) {
      throw new Error("Registration form not found");
    }

    if (form.status !== "ACTIVE") {
      throw new Error("Registration form is not active");
    }

    // Validate required fields
    const validation = await this.validateSubmission(form, data);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
    }

    // Create submission
    const submission = (await prisma.registrationSubmission.create({
      data: {
        formId,
        data: data as any,
        status: "PENDING",
        submittedAt: new Date(),
        ipAddress,
        userAgent,
      },
    })) as unknown as RegistrationSubmission;

    // Process submission based on form settings
    await this.processSubmission(submission, form);

    return submission;
  }

  private static async validateSubmission(
    form: any,
    data: Record<string, any>
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    for (const field of form.fields as any) {
      if (
        field.required &&
        (!data[field.name] || data[field.name].toString().trim() === "")
      ) {
        errors.push(`${field.label} is required`);
        continue;
      }

      if (data[field.name] && field.validation) {
        const value = data[field.name].toString();
        const validation = field.validation;

        if (validation.minLength && value.length < validation.minLength) {
          errors.push(
            `${field.label} must be at least ${validation.minLength} characters`
          );
        }

        if (validation.maxLength && value.length > validation.maxLength) {
          errors.push(
            `${field.label} must be no more than ${validation.maxLength} characters`
          );
        }

        if (validation.pattern && !new RegExp(validation.pattern).test(value)) {
          errors.push(
            validation.customMessage || `${field.label} format is invalid`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private static async processSubmission(
    submission: RegistrationSubmission,
    form: any
  ): Promise<void> {
    const settings = form.settings as any;

    if (settings.requireApproval) {
      // Keep status as PENDING for manual approval
      return;
    }

    // Auto-approve and create user/affiliate
    await this.approveSubmission(submission.id, "system", "Auto-approved");
  }

  static async approveSubmission(
    submissionId: string,
    reviewedBy: string,
    notes?: string
  ): Promise<RegistrationSubmission> {
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

    // Update submission status
    const updatedSubmission = (await prisma.registrationSubmission.update({
      where: { id: submissionId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy,
        notes,
      },
    })) as unknown as RegistrationSubmission;

    // Create user and affiliate
    await this.createUserFromSubmission(submission as any, form);

    return updatedSubmission;
  }

  static async rejectSubmission(
    submissionId: string,
    reviewedBy: string,
    notes: string
  ): Promise<RegistrationSubmission> {
    return (await prisma.registrationSubmission.update({
      where: { id: submissionId },
      data: {
        status: "REJECTED",
        reviewedAt: new Date(),
        reviewedBy,
        notes,
      },
    })) as unknown as RegistrationSubmission;
  }

  private static async createUserFromSubmission(
    submission: RegistrationSubmission,
    form: any
  ): Promise<void> {
    const data = submission.data as any;

    // Create user
    const hashedPassword = await bcrypt.hash(data.password, 12);

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

    // Create affiliate profile
    const defaultCommissionRate =
      await SystemSettingsService.getDefaultCommissionRate();

    const affiliate = await prisma.affiliateProfile.create({
      data: {
        userId: user.id,
        companyName: data.companyName || "",
        website: data.website || "",
        phone: data.phone || "",
        address: (data.address || {}) as any,
        taxId: data.taxId || "",
        bankAccount: data.bankAccount || "",
        paymentMethod: "BANK_TRANSFER",
        status: "ACTIVE",
        tier: (form.settings as any).defaultTierId || "BRONZE",
        commissionRate: defaultCommissionRate,
      },
    });

    // Send welcome email if enabled
    if ((form.settings as any).welcomeEmail) {
      // Implementation for sending welcome email
      console.log("Sending welcome email to:", user.email);
    }
  }

  static async getSubmissions(
    formId: string,
    filters: any = {},
    page: number = 1,
    limit: number = 20
  ): Promise<RegistrationSubmission[]> {
    const skip = (page - 1) * limit;
    const where: any = { formId };

    if (filters.status) where.status = filters.status;
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
    })) as unknown as RegistrationSubmission[];
  }

  static async createWorkflow(data: any): Promise<any> {
    return (await prisma.registrationWorkflow.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        description: data.description || "",
        steps: (data.steps || []) as any,
        status: data.status || "ACTIVE",
        form: {
          connect: { id: data.formId },
        },
      },
    })) as unknown as any;
  }

  static async findWorkflowById(id: string): Promise<any | null> {
    return (await prisma.registrationWorkflow.findUnique({
      where: { id },
    })) as unknown as any | null;
  }

  static async updateWorkflow(id: string, data: any): Promise<any> {
    return (await prisma.registrationWorkflow.update({
      where: { id },
      data: {
        ...data,
        steps: data.steps as any,
        updatedAt: new Date(),
      },
    })) as unknown as any;
  }

  static async deleteWorkflow(id: string): Promise<void> {
    await prisma.registrationWorkflow.delete({
      where: { id },
    });
  }

  static async listWorkflows(accountId: string): Promise<any[]> {
    return (await prisma.registrationWorkflow.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
    })) as unknown as any[];
  }

  static async executeWorkflow(
    workflowId: string,
    submissionData: Record<string, any>
  ): Promise<void> {
    const workflow = await this.findWorkflowById(workflowId);
    if (!workflow) {
      throw new Error("Workflow not found");
    }

    if (workflow.status !== "ACTIVE") {
      throw new Error("Workflow is not active");
    }

    // Execute workflow steps in order
    for (const step of workflow.steps as any) {
      await this.executeWorkflowStep(step, submissionData);
    }
  }

  private static async executeWorkflowStep(
    step: WorkflowStep,
    data: Record<string, any>
  ): Promise<void> {
    // Check conditions if any
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
        return; // Skip this step
      }
    }

    // Execute step based on type
    switch (step.type) {
      case "FORM":
        // Handle form submission
        break;
      case "APPROVAL":
        // Handle approval process
        break;
      case "EMAIL":
        // Send email
        break;
      case "WEBHOOK":
        // Call webhook
        break;
      case "CONDITION":
        // Handle conditional logic
        break;
    }
  }

  static async getRegistrationStats(
    accountId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any> {
    const where: any = {
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
      byStatus: {} as Record<string, number>,
      byForm: {} as Record<string, number>,
      byDay: {} as Record<string, number>,
    };

    // Calculate approval rate
    if (submissions.length > 0) {
      stats.approvalRate =
        (stats.approvedSubmissions / submissions.length) * 100;
    }

    // Count by status
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

  static async createDefaultForm(accountId: string): Promise<any> {
    const defaultFields: RegistrationField[] = [
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

  static async exportFormData(formId: string): Promise<any> {
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

  static async importFormData(accountId: string, formData: any): Promise<any> {
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
