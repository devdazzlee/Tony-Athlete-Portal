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
export declare class BrandingModel {
    static createConfig(data: Partial<BrandingConfig>): Promise<BrandingConfig>;
    static findById(id: string): Promise<BrandingConfig | null>;
    static findByAccountId(accountId: string): Promise<BrandingConfig | null>;
    static update(id: string, data: Partial<BrandingConfig>): Promise<BrandingConfig>;
    static delete(id: string): Promise<void>;
    static list(filters?: any): Promise<BrandingConfig[]>;
    static createTemplate(data: Partial<BrandingTemplate>): Promise<BrandingTemplate>;
    static findTemplateById(id: string): Promise<BrandingTemplate | null>;
    static listTemplates(filters?: any): Promise<BrandingTemplate[]>;
    static applyTemplate(brandingId: string, templateId: string): Promise<BrandingConfig>;
    static uploadAsset(brandingId: string, type: string, name: string, url: string, size: number, mimeType: string, dimensions: any, alt: string): Promise<BrandingAsset>;
    static findAssetById(id: string): Promise<BrandingAsset | null>;
    static listAssets(brandingId: string, filters?: any): Promise<BrandingAsset[]>;
    static updateAsset(id: string, data: Partial<BrandingAsset>): Promise<BrandingAsset>;
    static deleteAsset(id: string): Promise<void>;
    static addCustomization(brandingId: string, component: string, property: string, value: string, type: string, order?: number): Promise<BrandingCustomization>;
    static listCustomizations(brandingId: string, filters?: any): Promise<BrandingCustomization[]>;
    static updateCustomization(id: string, data: Partial<BrandingCustomization>): Promise<BrandingCustomization>;
    static deleteCustomization(id: string): Promise<void>;
    static generateBrandingCSS(brandingId: string): Promise<string>;
    static generateBrandingJS(brandingId: string): Promise<string>;
    static createDefaultTemplates(): Promise<BrandingTemplate[]>;
    static getBrandingPreview(brandingId: string): Promise<any>;
    static exportBranding(brandingId: string): Promise<any>;
    static importBranding(accountId: string, brandingData: any): Promise<BrandingConfig>;
}
//# sourceMappingURL=Branding.d.ts.map