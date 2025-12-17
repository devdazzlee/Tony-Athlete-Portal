export interface TrackingParameter {
    name: string;
    value: string;
    type: "STATIC" | "DYNAMIC" | "CUSTOM";
    required: boolean;
}
export declare class TrackingCodeModel {
    static create(data: any): Promise<any>;
    static findById(id: string): Promise<any | null>;
    static update(id: string, data: any): Promise<any>;
    static delete(id: string): Promise<void>;
    static list(filters?: any, page?: number, limit?: number): Promise<any[]>;
    static generatePixelCode(trackingCodeId: string, baseUrl: string): Promise<string>;
    static generateJavaScriptCode(trackingCodeId: string, baseUrl: string): Promise<string>;
    static generateServerToServerCode(trackingCodeId: string, baseUrl: string): Promise<string>;
    static generateWebhookCode(trackingCodeId: string, baseUrl: string): Promise<string>;
    static recordEvent(trackingCodeId: string, event: string, data: any, ipAddress: string, userAgent: string, referrer?: string): Promise<any>;
    static getEvents(trackingCodeId: string, page?: number, limit?: number): Promise<any[]>;
    static getEventStats(trackingCodeId: string, startDate?: Date, endDate?: Date): Promise<any>;
    static validateTrackingCode(trackingCodeId: string, event: string): Promise<boolean>;
}
//# sourceMappingURL=TrackingCode.d.ts.map