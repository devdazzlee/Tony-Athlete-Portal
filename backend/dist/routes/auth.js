"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
const authController = new AuthController_1.AuthController();
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerificationEmail);
router.post("/logout", auth_1.authenticateToken, authController.logout);
router.get("/me", auth_1.authenticateToken, authController.getProfile);
router.put("/profile", auth_1.authenticateToken, authController.updateProfile);
router.post("/change-password", auth_1.authenticateToken, authController.changePassword);
router.post("/2fa/setup", auth_1.authenticateToken, authController.setup2FA);
router.post("/2fa/verify", auth_1.authenticateToken, authController.verify2FA);
router.post("/2fa/disable", auth_1.authenticateToken, authController.disable2FA);
router.post("/2fa/backup-codes", auth_1.authenticateToken, authController.generateBackupCodes);
exports.default = router;
//# sourceMappingURL=auth.js.map