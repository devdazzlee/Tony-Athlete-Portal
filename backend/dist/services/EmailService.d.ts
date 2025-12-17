interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
declare class EmailService {
    private transporter;
    constructor();
    sendEmail(options: EmailOptions): Promise<void>;
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
    static generateToken(): string;
    static generateTokenExpiry(): Date;
}
declare const emailService: EmailService;
export { EmailService };
export default emailService;
//# sourceMappingURL=EmailService.d.ts.map