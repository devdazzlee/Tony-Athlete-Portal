export interface UserProfile {
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    timezone: string;
    language: string;
    dateFormat: string;
    currency: string;
    notifications: NotificationSettings;
    security: SecuritySettings;
    preferences: UserPreferences;
    createdAt: Date;
    updatedAt: Date;
}
export interface NotificationSettings {
    email: {
        commissionEarned: boolean;
        payoutProcessed: boolean;
        accountUpdates: boolean;
        marketingEmails: boolean;
        systemAlerts: boolean;
    };
    push: {
        commissionEarned: boolean;
        payoutProcessed: boolean;
        accountUpdates: boolean;
        systemAlerts: boolean;
    };
    sms: {
        payoutProcessed: boolean;
        securityAlerts: boolean;
    };
}
export interface SecuritySettings {
    twoFactorEnabled: boolean;
    twoFactorSecret?: string;
    backupCodes?: string[];
    loginAlerts: boolean;
    sessionTimeout: number;
    allowedIPs: string[];
    passwordLastChanged: Date;
    lastPasswordChange: Date;
}
export interface UserPreferences {
    dashboard: {
        defaultView: "OVERVIEW" | "DETAILED" | "CUSTOM";
        widgets: string[];
        refreshInterval: number;
    };
    reports: {
        defaultFormat: "PDF" | "CSV" | "EXCEL";
        includeCharts: boolean;
        autoSchedule: boolean;
    };
    affiliate: {
        showPersonalInfo: boolean;
        allowDirectContact: boolean;
        publicProfile: boolean;
    };
}
export declare class ProfileModel {
    static createProfile(userId: string, data: any): Promise<any>;
    static getProfile(userId: string): Promise<any | null>;
    static updateProfile(userId: string, data: any): Promise<any>;
    static updatePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
    static updateNotificationSettings(userId: string, settings: any): Promise<any>;
    static updateSecuritySettings(userId: string, settings: any): Promise<any>;
    static updatePreferences(userId: string, preferences: any): Promise<any>;
    static uploadAvatar(userId: string, avatarUrl: string): Promise<any>;
    static enableTwoFactor(userId: string, secret: string, backupCodes: string[]): Promise<any>;
    static disableTwoFactor(userId: string): Promise<any>;
    static addAllowedIP(userId: string, ipAddress: string): Promise<any>;
    static removeAllowedIP(userId: string, ipAddress: string): Promise<any>;
    static getPublicProfile(userId: string): Promise<any>;
    static searchProfiles(query: string, filters?: any, page?: number, limit?: number): Promise<any[]>;
    static getProfileStats(userId: string): Promise<any>;
    static deleteProfile(userId: string): Promise<void>;
    static exportProfileData(userId: string): Promise<any>;
}
//# sourceMappingURL=Profile.d.ts.map