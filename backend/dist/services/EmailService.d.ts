interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
interface EmailHealthResult {
    enabled: boolean;
    verified: boolean;
    config: {
        host: string;
        port: number;
        secure: boolean;
        userConfigured: boolean;
        passConfigured: boolean;
        fromConfigured: boolean;
    };
    error?: string;
}
interface AffiliateDiscountCodeInfo {
    code: string;
    discountText?: string;
    allowanceAmount?: number;
    freeShipping?: boolean;
    expiresAt?: Date | string | null;
    description?: string | null;
}
declare class EmailService {
    private transporter;
    private emailEnabled;
    private strictMode;
    constructor();
    isEmailEnabled(): boolean;
    verifyConnection(): Promise<EmailHealthResult>;
    sendEmail(options: EmailOptions): Promise<boolean>;
    sendVerificationEmail(email: string, firstName: string, verificationToken: string): Promise<void>;
    sendWelcomeEmail(email: string, firstName: string): Promise<void>;
    sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void>;
    sendCommissionPaidEmail(email: string, firstName: string, commissionDetails: {
        commissionId: string;
        amount: number;
        commissionRate: number;
        orderValue: number;
        referralCode: string;
        paidDate: string;
        paymentMethod: string;
    }): Promise<void>;
    sendOfferCreatedEmail(email: string, firstName: string, offerDetails: {
        offerName: string;
        offerDescription: string;
        commissionRate: number;
        startDate: string;
        endDate: string;
        referralCodes: string[];
    }): Promise<void>;
    sendAffiliateDiscountAssignedEmail(email: string, firstName: string, codes: AffiliateDiscountCodeInfo[]): Promise<void>;
    sendDeliverableReviewEmail(email: string, firstName: string, status: "APPROVED" | "REJECTED", adminComment?: string | null): Promise<boolean>;
    static generateToken(): string;
    static generateTokenExpiry(): Date;
}
declare const emailService: EmailService;
export { EmailService };
export default emailService;
//# sourceMappingURL=EmailService.d.ts.map