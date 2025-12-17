import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import emailService from "../services/EmailService";
import { SecurityService } from "../services/SecurityService";
import { setAuthCookies, clearAuthCookies } from "../middleware/auth";
import { z } from "zod";

const authService = new AuthService();
const securityService = new SecurityService();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["ADMIN", "AFFILIATE", "MANAGER"]).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(8),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional(),
  timezone: z.string().optional(),
  language: z.string().optional(),
});

export class AuthController {
  async register(req: Request, res: Response) {
    try {
      const data = registerSchema.parse(req.body);
      console.log("🚀 ~ AuthController ~ register ~ data:", data);
      const result = await authService.register(data as any);

      // Note: Welcome email will be sent after email verification
      // Don't set auth cookies here - user must verify email first

      res.status(201).json({
        message:
          result.message ||
          "Registration successful! Please check your email to verify your account.",
        // Don't return token or user until email is verified
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async login(req: Request, res: Response) {
    try {
      const data = loginSchema.parse(req.body);
      const result = await authService.login(
        data as any,
        req.ip,
        req.get("User-Agent")
      );

      // Set authentication cookies (will skip if cross-domain)
      setAuthCookies(res, result.token, result.user, req);

      res.json({
        message: "Login successful",
        token: result.token,
        user: result.user,
      });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(401).json({ error: error.message });
    }
  }

  async logout(req: any, res: Response) {
    try {
      await authService.logout(req.user.id);

      // Clear authentication cookies
      clearAuthCookies(res);

      res.json({ message: "Logout successful" });
    } catch (error: any) {
      console.error("Logout error:", error);
      res.status(500).json({ error: error.message });
    }
  }

  async getProfile(req: any, res: Response) {
    try {
      const user = await authService.getProfile(req.user.id);
      res.json(user);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateProfile(req: any, res: Response) {
    try {
      const data = updateProfileSchema.parse(req.body);
      const user = await authService.updateProfile(req.user.id, data);
      res.json(user);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async changePassword(req: any, res: Response) {
    try {
      const data = changePasswordSchema.parse(req.body);
      await authService.changePassword(
        req.user.id,
        data.currentPassword,
        data.newPassword
      );
      res.json({ message: "Password changed successfully" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async forgotPassword(req: Request, res: Response) {
    try {
      const data = forgotPasswordSchema.parse(req.body);
      await authService.forgotPassword(data.email);
      res.json({ message: "Password reset email sent" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(500).json({ error: error.message });
    }
  }

  async resetPassword(req: Request, res: Response) {
    try {
      const data = resetPasswordSchema.parse(req.body);
      await authService.resetPassword(data.token, data.password);
      res.json({ message: "Password reset successfully" });
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res
          .status(400)
          .json({ error: "Invalid input data", details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }

  async setup2FA(req: any, res: Response) {
    try {
      const secret = await securityService.generate2FASecret(req.user.id);
      res.json({ secret });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async verify2FA(req: any, res: Response) {
    try {
      const { token } = req.body;
      const isValid = await securityService.verify2FAToken(req.user.id, token);

      if (isValid) {
        await authService.enable2FA(req.user.id);
        res.json({ message: "2FA enabled successfully" });
      } else {
        res.status(400).json({ error: "Invalid token" });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async disable2FA(req: any, res: Response) {
    try {
      await authService.disable2FA(req.user.id);
      res.json({ message: "2FA disabled successfully" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async generateBackupCodes(req: any, res: Response) {
    try {
      const codes = await authService.generateBackupCodes(req.user.id);
      res.json({ codes });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async verifyEmail(req: Request, res: Response) {
    try {
      const { token } = req.body;

      if (!token) {
        return res
          .status(400)
          .json({ error: "Verification token is required" });
      }

      const result = await authService.verifyEmail(token);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async resendVerificationEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const result = await authService.resendVerificationEmail(email);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
}
