import { Router } from "express";
import { z } from "zod";
import { authenticateToken, requireRole } from "../middleware/auth";
import emailService from "../services/EmailService";

const router: Router = Router();

router.get(
  "/",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (_req: any, res) => {
    try {
      const health = await emailService.verifyConnection();
      res.json({
        success: true,
        ...health,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        enabled: emailService.isEmailEnabled(),
        verified: false,
        error: error?.message || "Failed to verify email service",
      });
    }
  }
);

router.post(
  "/test",
  authenticateToken,
  requireRole(["ADMIN", "MANAGER"]),
  async (req: any, res) => {
    try {
      const schema = z.object({
        to: z.string().email().optional(),
      });
      const { to } = schema.parse(req.body || {});
      const recipient = to || req.user?.email;

      if (!recipient) {
        return res.status(400).json({
          success: false,
          error: "Recipient email is required",
        });
      }

      const sent = await emailService.sendEmail({
        to: recipient,
        subject: "SMTP test email - TC Nutrition Athlete Portal",
        html: `<p>SMTP test successful.</p><p>Sent at: ${new Date().toISOString()}</p>`,
      });

      if (!sent) {
        return res.status(503).json({
          success: false,
          sent: false,
          error: "Email not sent. Check SMTP configuration/auth.",
        });
      }

      res.json({
        success: true,
        sent: true,
        to: recipient,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        sent: false,
        error: error?.message || "Failed to send test email",
      });
    }
  }
);

export default router;
