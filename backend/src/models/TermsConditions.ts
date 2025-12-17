import {
  PrismaClient,
  TermsConditions,
  TermsAcceptance,
  TermsTemplate,
} from "@prisma/client";

const prisma = new PrismaClient();

// TermsAcceptance and TermsTemplate are now imported from Prisma

export class TermsConditionsModel {
  static async create(data: any): Promise<TermsConditions> {
    return await prisma.termsConditions.create({
      data: {
        accountId: data.accountId!,
        type: data.type!,
        title: data.title!,
        content: data.content!,
        version: data.version || "1.0",
        status: data.status || "DRAFT",
        effectiveDate: data.effectiveDate || new Date(),
        expiryDate: data.expiryDate,
        requiresAcceptance: data.requiresAcceptance || false,
        acceptanceRequired: data.acceptanceRequired || [],
        lastModifiedBy: data.lastModifiedBy!,
      },
    });
  }

  static async findById(id: string): Promise<TermsConditions | null> {
    return await prisma.termsConditions.findUnique({
      where: { id },
    });
  }

  static async findByAccountAndType(
    accountId: string,
    type: string
  ): Promise<TermsConditions | null> {
    return await prisma.termsConditions.findFirst({
      where: {
        accountId,
        type: type as any,
        status: "ACTIVE",
      },
      orderBy: { effectiveDate: "desc" },
    });
  }

  static async update(
    id: string,
    data: Partial<TermsConditions>
  ): Promise<TermsConditions> {
    return await prisma.termsConditions.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.termsConditions.update({
      where: { id },
      data: { status: "ARCHIVED" },
    });
  }

  static async list(
    accountId: string,
    filters: any = {}
  ): Promise<TermsConditions[]> {
    const where: any = { accountId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.requiresAcceptance !== undefined)
      where.requiresAcceptance = filters.requiresAcceptance;

    return await prisma.termsConditions.findMany({
      where,
      orderBy: { effectiveDate: "desc" },
    });
  }

  static async activate(id: string, userId: string): Promise<TermsConditions> {
    const terms = await this.findById(id);
    if (!terms) {
      throw new Error("Terms not found");
    }

    // Archive previous active version of the same type
    await prisma.termsConditions.updateMany({
      where: {
        accountId: terms.accountId,
        type: terms.type,
        status: "ACTIVE",
      },
      data: { status: "ARCHIVED" },
    });

    // Activate new version
    return await this.update(id, {
      status: "ACTIVE",
      lastModifiedBy: userId,
    });
  }

  static async acceptTerms(
    termsId: string,
    userId: string,
    userRole: string,
    ipAddress: string,
    userAgent: string
  ): Promise<TermsAcceptance> {
    const terms = await this.findById(termsId);
    if (!terms) {
      throw new Error("Terms not found");
    }

    // Check if user role is required to accept
    if (
      terms.acceptanceRequired.length > 0 &&
      !terms.acceptanceRequired.includes(userRole)
    ) {
      throw new Error("User role is not required to accept these terms");
    }

    // Check if already accepted
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
    })) as TermsAcceptance;
  }

  static async getAcceptanceStatus(
    termsId: string,
    userId: string
  ): Promise<{ accepted: boolean; acceptance?: TermsAcceptance }> {
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

  static async getUserAcceptances(userId: string): Promise<TermsAcceptance[]> {
    return (await prisma.termsAcceptance.findMany({
      where: { userId },
      include: {
        terms: true,
      },
      orderBy: { acceptedAt: "desc" },
    })) as TermsAcceptance[];
  }

  static async getRequiredAcceptances(
    userId: string,
    userRole: string,
    accountId: string
  ): Promise<TermsConditions[]> {
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

    const pendingTerms: TermsConditions[] = [];

    for (const terms of requiredTerms) {
      const status = await this.getAcceptanceStatus(terms.id, userId);
      if (!status.accepted) {
        pendingTerms.push(terms);
      }
    }

    return pendingTerms;
  }

  static async createTemplate(
    data: Partial<TermsTemplate>
  ): Promise<TermsTemplate> {
    return (await prisma.termsTemplate.create({
      data: {
        name: data.name!,
        description: data.description || "",
        type: data.type!,
        category: data.category!,
        content: data.content!,
        variables: data.variables || [],
        isDefault: data.isDefault || false,
        isPublic: data.isPublic || false,
      },
    })) as TermsTemplate;
  }

  static async findTemplateById(id: string): Promise<TermsTemplate | null> {
    return (await prisma.termsTemplate.findUnique({
      where: { id },
    })) as TermsTemplate | null;
  }

  static async listTemplates(filters: any = {}): Promise<TermsTemplate[]> {
    const where: any = {};

    if (filters.type) where.type = filters.type;
    if (filters.category) where.category = filters.category;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await prisma.termsTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as TermsTemplate[];
  }

  static async generateFromTemplate(
    templateId: string,
    accountId: string,
    variables: Record<string, string>,
    userId: string
  ): Promise<TermsConditions> {
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    let content = template.content;

    // Replace variables
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      content = content.replace(new RegExp(placeholder, "g"), value);
    }

    return await this.create({
      accountId,
      type: template.type as any,
      title: template.name,
      content,
      lastModifiedBy: userId,
    });
  }

  static async createDefaultTemplates(): Promise<TermsTemplate[]> {
    const defaultTemplates = [
      {
        name: "Affiliate Program Terms",
        description: "Standard terms and conditions for affiliate programs",
        type: "AFFILIATE_TERMS",
        category: "LEGAL" as const,
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
        category: "LEGAL" as const,
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

    const createdTemplates: TermsTemplate[] = [];
    for (const templateData of defaultTemplates) {
      const template = await this.createTemplate(templateData);
      createdTemplates.push(template);
    }

    return createdTemplates;
  }

  static async getTermsHistory(
    accountId: string,
    type: string
  ): Promise<TermsConditions[]> {
    return await prisma.termsConditions.findMany({
      where: {
        accountId,
        type: type as any,
      },
      orderBy: { effectiveDate: "desc" },
    });
  }

  static async getAcceptanceStats(termsId: string): Promise<any> {
    const terms = await this.findById(termsId);
    if (!terms) {
      return null;
    }

    const acceptances = await prisma.termsAcceptance.findMany({
      where: { termsId },
    });

    const stats = {
      totalAcceptances: acceptances.length,
      byRole: {} as Record<string, number>,
      byDate: {} as Record<string, number>,
      byVersion: {} as Record<string, number>,
    };

    acceptances.forEach((acceptance) => {
      // By role
      stats.byRole[acceptance.userRole] =
        (stats.byRole[acceptance.userRole] || 0) + 1;

      // By date
      const date = acceptance.acceptedAt.toISOString().split("T")[0];
      stats.byDate[date] = (stats.byDate[date] || 0) + 1;

      // By version
      stats.byVersion[acceptance.version] =
        (stats.byVersion[acceptance.version] || 0) + 1;
    });

    return stats;
  }

  static async exportTerms(termsId: string): Promise<any> {
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

  static async importTerms(
    accountId: string,
    termsData: any,
    userId: string
  ): Promise<TermsConditions> {
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
