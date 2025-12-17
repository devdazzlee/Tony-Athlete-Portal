"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BrandingModel = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class BrandingModel {
    static async createConfig(data) {
        return (await prisma.brandingConfig.create({
            data: {
                accountId: data.accountId,
                name: data.name,
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
        }));
    }
    static async findById(id) {
        return (await prisma.brandingConfig.findUnique({
            where: { id },
        }));
    }
    static async findByAccountId(accountId) {
        return (await prisma.brandingConfig.findFirst({
            where: {
                accountId,
                status: "ACTIVE",
            },
        }));
    }
    static async update(id, data) {
        return (await prisma.brandingConfig.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async delete(id) {
        await prisma.brandingConfig.delete({
            where: { id },
        });
    }
    static async list(filters = {}) {
        const where = {};
        if (filters.accountId)
            where.accountId = filters.accountId;
        if (filters.status)
            where.status = filters.status;
        return (await prisma.brandingConfig.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async createTemplate(data) {
        return (await prisma.brandingTemplate.create({
            data: {
                name: data.name,
                description: data.description || "",
                category: data.category,
                preview: data.preview || "",
                config: data.config || {},
                isDefault: data.isDefault || false,
                isPublic: data.isPublic || false,
            },
        }));
    }
    static async findTemplateById(id) {
        return (await prisma.brandingTemplate.findUnique({
            where: { id },
        }));
    }
    static async listTemplates(filters = {}) {
        const where = {};
        if (filters.category)
            where.category = filters.category;
        if (filters.isPublic !== undefined)
            where.isPublic = filters.isPublic;
        if (filters.isDefault !== undefined)
            where.isDefault = filters.isDefault;
        return (await prisma.brandingTemplate.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async applyTemplate(brandingId, templateId) {
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
    static async uploadAsset(brandingId, type, name, url, size, mimeType, dimensions, alt) {
        return (await prisma.brandingAsset.create({
            data: {
                brandingId,
                type: type,
                name,
                url,
                size,
                mimeType,
                dimensions,
                alt,
                status: "ACTIVE",
            },
        }));
    }
    static async findAssetById(id) {
        return (await prisma.brandingAsset.findUnique({
            where: { id },
        }));
    }
    static async listAssets(brandingId, filters = {}) {
        const where = { brandingId };
        if (filters.type)
            where.type = filters.type;
        if (filters.status)
            where.status = filters.status;
        return (await prisma.brandingAsset.findMany({
            where,
            orderBy: { createdAt: "desc" },
        }));
    }
    static async updateAsset(id, data) {
        return (await prisma.brandingAsset.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteAsset(id) {
        await prisma.brandingAsset.delete({
            where: { id },
        });
    }
    static async addCustomization(brandingId, component, property, value, type, order = 0) {
        return (await prisma.brandingCustomization.create({
            data: {
                brandingId,
                component,
                property,
                value,
                type: type,
                order,
                status: "ACTIVE",
            },
        }));
    }
    static async listCustomizations(brandingId, filters = {}) {
        const where = { brandingId };
        if (filters.component)
            where.component = filters.component;
        if (filters.type)
            where.type = filters.type;
        if (filters.status)
            where.status = filters.status;
        return (await prisma.brandingCustomization.findMany({
            where,
            orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        }));
    }
    static async updateCustomization(id, data) {
        return (await prisma.brandingCustomization.update({
            where: { id },
            data: {
                ...data,
                updatedAt: new Date(),
            },
        }));
    }
    static async deleteCustomization(id) {
        await prisma.brandingCustomization.delete({
            where: { id },
        });
    }
    static async generateBrandingCSS(brandingId) {
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
        if (branding.customCss) {
            css += `\n/* Custom CSS */\n${branding.customCss}`;
        }
        customizations.forEach((customization) => {
            css += `\n/* ${customization.component} - ${customization.property} */\n${customization.value}`;
        });
        return css;
    }
    static async generateBrandingJS(brandingId) {
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
        if (branding.customJs) {
            js += `\n/* Custom JavaScript */\n${branding.customJs}`;
        }
        customizations.forEach((customization) => {
            js += `\n/* ${customization.component} - ${customization.property} */\n${customization.value}`;
        });
        return js;
    }
    static async createDefaultTemplates() {
        const defaultTemplates = [
            {
                name: "Professional Blue",
                description: "Clean and professional blue theme",
                category: "PROFESSIONAL",
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
                category: "CREATIVE",
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
                category: "MINIMAL",
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
                category: "CORPORATE",
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
        const createdTemplates = [];
        for (const templateData of defaultTemplates) {
            const template = await this.createTemplate(templateData);
            createdTemplates.push(template);
        }
        return createdTemplates;
    }
    static async getBrandingPreview(brandingId) {
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
    static async exportBranding(brandingId) {
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
    static async importBranding(accountId, brandingData) {
        const branding = await this.createConfig({
            accountId,
            ...brandingData.branding,
        });
        if (brandingData.assets) {
            for (const assetData of brandingData.assets) {
                await this.uploadAsset(branding.id, assetData.type, assetData.name, assetData.url, assetData.size, assetData.mimeType, assetData.dimensions, assetData.alt);
            }
        }
        if (brandingData.customizations) {
            for (const customizationData of brandingData.customizations) {
                await this.addCustomization(branding.id, customizationData.component, customizationData.property, customizationData.value, customizationData.type, customizationData.order);
            }
        }
        return branding;
    }
}
exports.BrandingModel = BrandingModel;
//# sourceMappingURL=Branding.js.map