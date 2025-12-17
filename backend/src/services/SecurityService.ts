import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class SecurityService {
  async generate2FASecret(userId: string) {
    const secret = crypto.randomBytes(32).toString('base64');
    
    await prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: secret,
        twoFactorEnabled: false
      }
    });

    return secret;
  }

  async verify2FAToken(userId: string, token: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user?.twoFactorSecret) {
      throw new Error('2FA not set up');
    }

    // Simple TOTP verification (in production, use a proper TOTP library)
    const expectedToken = this.generateTOTP(user.twoFactorSecret);
    return token === expectedToken;
  }

  private generateTOTP(secret: string): string {
    const epoch = Math.round(new Date().getTime() / 1000.0);
    const time = Math.floor(epoch / 30);
    const hash = crypto.createHmac('sha1', Buffer.from(secret, 'base64'))
      .update(Buffer.from(time.toString(16).padStart(16, '0'), 'hex'))
      .digest('hex');
    
    const offset = parseInt(hash.slice(-1), 16);
    const otp = (parseInt(hash.substr(offset * 2, 8), 16) & 0x7fffffff) % 1000000;
    
    return otp.toString().padStart(6, '0');
  }

  async logSecurityEvent(userId: string, event: string, details: string, ipAddress?: string, userAgent?: string) {
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
