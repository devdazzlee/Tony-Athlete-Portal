import express, { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticateToken } from "../middleware/auth";

const router: Router = express.Router();
const authController = new AuthController();

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationEmail);

// Protected routes
router.post("/logout", authenticateToken, authController.logout);
router.get("/me", authenticateToken, authController.getProfile);
router.put("/profile", authenticateToken, authController.updateProfile);
router.post(
  "/change-password",
  authenticateToken,
  authController.changePassword
);

// 2FA routes
router.post("/2fa/setup", authenticateToken, authController.setup2FA);
router.post("/2fa/verify", authenticateToken, authController.verify2FA);
router.post("/2fa/disable", authenticateToken, authController.disable2FA);
router.post(
  "/2fa/backup-codes",
  authenticateToken,
  authController.generateBackupCodes
);

export default router;
