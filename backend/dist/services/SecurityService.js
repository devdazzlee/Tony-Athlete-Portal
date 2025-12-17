"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class SecurityService {
    async generate2FASecret(userId) {
        const secret = crypto_1.default.randomBytes(32).toString('base64');
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: secret,
                twoFactorEnabled: false
            }
        });
        return secret;
    }
    async verify2FAToken(userId, token) {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user?.twoFactorSecret) {
            throw new Error('2FA not set up');
        }
        const expectedToken = this.generateTOTP(user.twoFactorSecret);
        return token === expectedToken;
    }
    generateTOTP(secret) {
        const epoch = Math.round(new Date().getTime() / 1000.0);
        const time = Math.floor(epoch / 30);
        const hash = crypto_1.default.createHmac('sha1', Buffer.from(secret, 'base64'))
            .update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'))
            .digest('hex');
        const offset = parseInt(hash.slice(-1), 16);
        const otp = (parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff) % 1000000;
        return otp.toString().padStart(6, '0');
    }
    async logSecurityEvent(userId, event, details, ipAddress, userAgent) {
        return prisma.activity.create({
            data: {
                userId,
                action: event,
                resource: 'Security',
                details,
                ipAddress: ipAddress || null,
                userAgent: userAgent || null
            }
        });
    }
}
exports.SecurityService = SecurityService;
//# sourceMappingURL=SecurityService.js.map