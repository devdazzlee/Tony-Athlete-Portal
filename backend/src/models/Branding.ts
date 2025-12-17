import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface BrandingConfig {
  id: string;
  accountId: string;
  name: string;
  logo: string;
  favicon: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  linkColor: string;
  buttonColor: string;
  buttonTextColor: string;
  fontFamily: string;
  fontSize: string;
  customCss: string;
  customJs: string;
  footerText: string;
  removeBranding: boolean;
  customDomain: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandingTemplate {
  id: string;
  name: string;
  description: string;
  category: "PROFESSIONAL" | "CREATIVE" | "MINIMAL" | "CORPORATE" | "MODERN";
  preview: string;
  config: Partial<BrandingConfig>;
  isDefault: boolean;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandingAsset {
  id: string;
  brandingId: string;
  type: "LOGO" | "FAVICON" | "BACKGROUND" | "ICON" | "BANNER" | "SOCIAL_MEDIA";
  name: string;
  url: string;
  size: number;
  mimeType: string;
  dimensions: {
    width: number;
    height: number;
  };
  alt: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export interface BrandingCustomization {
  id: string;
  brandingId: string;
  component: string;
  property: string;
  value: string;
  type: "CSS" | "JS" | "HTML" | "CONFIG";
  order: number;
  status: "ACTIVE" | "INACTIVE";
  createdAt: Date;
  updatedAt: Date;
}

export class BrandingModel {
  static async createConfig(
    data: Partial<BrandingConfig>
  ): Promise<BrandingConfig> {
    return (await (prisma as any).brandingConfig.create({
      data: {
        accountId: data.accountId!,
        name: data.name!,
        logo: data.logo || "",
        favicon: data.favicon || "",
        primaryColor: data.primaryColor || "#3b82f6",
        secondaryColor: data.secondaryColor || "#10b981",
        accentColor: data.accentColor || "#f59e0b",
        backgroundColor: data.backgroundColor || "#ffffff",
        textColor: data.textColor || "#1f2937",
        linkColor: data.linkColor || "#3b82f6",
        buttonColor: data.buttonColor || "#3b82f6",
        buttonTextColor: data.buttonTextColor || "#ffffff",
        fontFamily: data.fontFamily || "Inter, sans-serif",
        fontSize: data.fontSize || "16px",
        customCss: data.customCss || "",
        customJs: data.customJs || "",
        footerText: data.footerText || "",
        removeBranding: data.removeBranding || false,
        customDomain: data.customDomain || "",
        status: data.status || "ACTIVE",
      },
    })) as BrandingConfig;
  }

  static async findById(id: string): Promise<BrandingConfig | null> {
    return (await (prisma as any).brandingConfig.findUnique({
      where: { id },
    })) as BrandingConfig | null;
  }

  static async findByAccountId(
    accountId: string
  ): Promise<BrandingConfig | null> {
    return (await (prisma as any).brandingConfig.findFirst({
      where: {
        accountId,
        status: "ACTIVE",
      },
    })) as BrandingConfig | null;
  }

  static async update(
    id: string,
    data: Partial<BrandingConfig>
  ): Promise<BrandingConfig> {
    return (await (prisma as any).brandingConfig.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as BrandingConfig;
  }

  static async delete(id: string): Promise<void> {
    await (prisma as any).brandingConfig.delete({
      where: { id },
    });
  }

  static async list(filters: any = {}): Promise<BrandingConfig[]> {
    const where: any = {};

    if (filters.accountId) where.accountId = filters.accountId;
    if (filters.status) where.status = filters.status;

    return (await (prisma as any).brandingConfig.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as BrandingConfig[];
  }

  static async createTemplate(
    data: Partial<BrandingTemplate>
  ): Promise<BrandingTemplate> {
    return (await (prisma as any).brandingTemplate.create({
      data: {
        name: data.name!,
        description: data.description || "",
        category: data.category!,
        preview: data.preview || "",
        config: data.config || {},
        isDefault: data.isDefault || false,
        isPublic: data.isPublic || false,
      },
    })) as BrandingTemplate;
  }

  static async findTemplateById(id: string): Promise<BrandingTemplate | null> {
    return (await (prisma as any).brandingTemplate.findUnique({
      where: { id },
    })) as BrandingTemplate | null;
  }

  static async listTemplates(filters: any = {}): Promise<BrandingTemplate[]> {
    const where: any = {};

    if (filters.category) where.category = filters.category;
    if (filters.isPublic !== undefined) where.isPublic = filters.isPublic;
    if (filters.isDefault !== undefined) where.isDefault = filters.isDefault;

    return (await (prisma as any).brandingTemplate.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as BrandingTemplate[];
  }

  static async applyTemplate(
    brandingId: string,
    templateId: string
  ): Promise<BrandingConfig> {
    const template = await this.findTemplateById(templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    const branding = await this.findById(brandingId);
    if (!branding) {
      throw new Error("Branding config not found");
    }

    return await this.update(brandingId, template.config);
  }

  static async uploadAsset(
    brandingId: string,
    type: string,
    name: string,
    url: string,
    size: number,
    mimeType: string,
    dimensions: any,
    alt: string
  ): Promise<BrandingAsset> {
    return (await (prisma as any).brandingAsset.create({
      data: {
        brandingId,
        type: type as any,
        name,
        url,
        size,
        mimeType,
        dimensions,
        alt,
        status: "ACTIVE",
      },
    })) as BrandingAsset;
  }

  static async findAssetById(id: string): Promise<BrandingAsset | null> {
    return (await (prisma as any).brandingAsset.findUnique({
      where: { id },
    })) as BrandingAsset | null;
  }

  static async listAssets(
    brandingId: string,
    filters: any = {}
  ): Promise<BrandingAsset[]> {
    const where: any = { brandingId };

    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    return (await (prisma as any).brandingAsset.findMany({
      where,
      orderBy: { createdAt: "desc" },
    })) as BrandingAsset[];
  }

  static async updateAsset(
    id: string,
    data: Partial<BrandingAsset>
  ): Promise<BrandingAsset> {
    return (await (prisma as any).brandingAsset.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as BrandingAsset;
  }

  static async deleteAsset(id: string): Promise<void> {
    await (prisma as any).brandingAsset.delete({
      where: { id },
    });
  }

  static async addCustomization(
    brandingId: string,
    component: string,
    property: string,
    value: string,
    type: string,
    order: number = 0
  ): Promise<BrandingCustomization> {
    return (await (prisma as any).brandingCustomization.create({
      data: {
        brandingId,
        component,
        property,
        value,
        type: type as any,
        order,
        status: "ACTIVE",
      },
    })) as BrandingCustomization;
  }

  static async listCustomizations(
    brandingId: string,
    filters: any = {}
  ): Promise<BrandingCustomization[]> {
    const where: any = { brandingId };

    if (filters.component) where.component = filters.component;
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    return (await (prisma as any).brandingCustomization.findMany({
      where,
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    })) as BrandingCustomization[];
  }

  static async updateCustomization(
    id: string,
    data: Partial<BrandingCustomization>
  ): Promise<BrandingCustomization> {
    return (await (prisma as any).brandingCustomization.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    })) as BrandingCustomization;
  }

  static async deleteCustomization(id: string): Promise<void> {
    await (prisma as any).brandingCustomization.delete({
      where: { id },
    });
  }

  static async generateBrandingCSS(brandingId: string): Promise<string> {
    const branding = await this.findById(brandingId);
    if (!branding) {
      return "";
    }

    const customizations = await this.listCustomizations(brandingId, {
      type: "CSS",
    });

    let css = `
      :root {
        --primary-color: ${branding.primaryColor};
        --secondary-color: ${branding.secondaryColor};
        --accent-color: ${branding.accentColor};
        --background-color: ${branding.backgroundColor};
        --text-color: ${branding.textColor};
        --link-color: ${branding.linkColor};
        --button-color: ${branding.buttonColor};
        --button-text-color: ${branding.buttonTextColor};
        --font-family: ${branding.fontFamily};
        --font-size: ${branding.fontSize};
      }
      
      body {
        font-family: var(--font-family);
        font-size: var(--font-size);
        color: var(--text-color);
        background-color: var(--background-color);
      }
      
      .btn-primary {
        background-color: var(--button-color);
        color: var(--button-text-color);
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 0.375rem;
        cursor: pointer;
      }
      
      .btn-primary:hover {
        opacity: 0.9;
      }
      
      a {
        color: var(--link-color);
        text-decoration: none;
      }
      
      a:hover {
        text-decoration: underline;
      }
      
      .text-primary {
        color: var(--primary-color);
      }
      
      .text-secondary {
        color: var(--secondary-color);
      }
      
      .bg-primary {
        background-color: var(--primary-color);
      }
      
      .bg-secondary {
        background-color: var(--secondary-color);
      }
    `;

    // Add custom CSS
    if (branding.customCss) {
      css += `\n/* Custom CSS */\n${branding.customCss}`;
    }

    // Add customizations
    customizations.forEach((customization) => {
      css += `\n/* ${customization.component} - ${customization.property} */\n${customization.value}`;
    });

    return css;
  }

  static async generateBrandingJS(brandingId: string): Promise<string> {
    const branding = await this.findById(brandingId);
    if (!branding) {
      return "";
    }

    const customizations = await this.listCustomizations(brandingId, {
      type: "JS",
    });

    let js = `
      // Branding JavaScript
      document.addEventListener('DOMContentLoaded', function() {
        // Apply branding colors
        const root = document.documentElement;
        root.style.setProperty('--primary-color', '${branding.primaryColor}');
        root.style.setProperty('--secondary-color', '${branding.secondaryColor}');
        root.style.setProperty('--accent-color', '${branding.accentColor}');
        
        // Apply custom font
        document.body.style.fontFamily = '${branding.fontFamily}';
        document.body.style.fontSize = '${branding.fontSize}';
      });
    `;

    // Add custom JS
    if (branding.customJs) {
      js += `\n/* Custom JavaScript */\n${branding.customJs}`;
    }

    // Add customizations
    customizations.forEach((customization) => {
      js += `\n/* ${customization.component} - ${customization.property} */\n${customization.value}`;
    });

    return js;
  }

  static async createDefaultTemplates(): Promise<BrandingTemplate[]> {
    const defaultTemplates = [
      {
        name: "Professional Blue",
        description: "Clean and professional blue theme",
        category: "PROFESSIONAL" as const,
        config: {
          primaryColor: "#3b82f6",
          secondaryColor: "#10b981",
          accentColor: "#f59e0b",
          backgroundColor: "#ffffff",
          textColor: "#1f2937",
          fontFamily: "Inter, sans-serif",
        },
      },
      {
        name: "Creative Purple",
        description: "Creative and modern purple theme",
        category: "CREATIVE" as const,
        config: {
          primaryColor: "#8b5cf6",
          secondaryColor: "#06b6d4",
          accentColor: "#f97316",
          backgroundColor: "#fafafa",
          textColor: "#374151",
          fontFamily: "Poppins, sans-serif",
        },
      },
      {
        name: "Minimal Gray",
        description: "Minimal and clean gray theme",
        category: "MINIMAL" as const,
        config: {
          primaryColor: "#6b7280",
          secondaryColor: "#9ca3af",
          accentColor: "#ef4444",
          backgroundColor: "#ffffff",
          textColor: "#111827",
          fontFamily: "System UI, sans-serif",
        },
      },
      {
        name: "Corporate Green",
        description: "Corporate and trustworthy green theme",
        category: "CORPORATE" as const,
        config: {
          primaryColor: "#059669",
          secondaryColor: "#0d9488",
          accentColor: "#dc2626",
          backgroundColor: "#f9fafb",
          textColor: "#1f2937",
          fontFamily: "Roboto, sans-serif",
        },
      },
    ];

    const createdTemplates: BrandingTemplate[] = [];
    for (const templateData of defaultTemplates) {
      const template = await this.createTemplate(templateData);
      createdTemplates.push(template);
    }

    return createdTemplates;
  }

  static async getBrandingPreview(brandingId: string): Promise<any> {
    const branding = await this.findById(brandingId);
    if (!branding) {
      return null;
    }

    const assets = await this.listAssets(brandingId);
    const customizations = await this.listCustomizations(brandingId);

    return {
      branding,
      assets,
      customizations,
      css: await this.generateBrandingCSS(brandingId),
      js: await this.generateBrandingJS(brandingId),
    };
  }

  static async exportBranding(brandingId: string): Promise<any> {
    const branding = await this.findById(brandingId);
    if (!branding) {
      return null;
    }

    const assets = await this.listAssets(brandingId);
    const customizations = await this.listCustomizations(brandingId);

    return {
      branding,
      assets,
      customizations,
      css: await this.generateBrandingCSS(brandingId),
      js: await this.generateBrandingJS(brandingId),
      exportedAt: new Date().toISOString(),
    };
  }

  static async importBranding(
    accountId: string,
    brandingData: any
  ): Promise<BrandingConfig> {
    const branding = await this.createConfig({
      accountId,
      ...brandingData.branding,
    });

    // Import assets
    if (brandingData.assets) {
      for (const assetData of brandingData.assets) {
        await this.uploadAsset(
          branding.id,
          assetData.type,
          assetData.name,
          assetData.url,
          assetData.size,
          assetData.mimeType,
          assetData.dimensions,
          assetData.alt
        );
      }
    }

    // Import customizations
    if (brandingData.customizations) {
      for (const customizationData of brandingData.customizations) {
        await this.addCustomization(
          branding.id,
          customizationData.component,
          customizationData.property,
          customizationData.value,
          customizationData.type,
          customizationData.order
        );
      }
    }

    return branding;
  }
}
