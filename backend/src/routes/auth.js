import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { adminResetPasswordSchema, changePasswordSchema, loginSchema, passwordResetRequestSchema, registerSchema, resetPasswordSchema } from '../validations/auth.validation.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import { loginLimiter, refreshLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', authenticate, authorizeRoles(ROLES.EXECUTIVE), validate(registerSchema), authController.register); // /api/auth/register
router.post('/login', loginLimiter, validate(loginSchema), authController.login);                                                 // /api/auth/login
router.post('/logout', authenticate, authController.logout);                                                                      // /api/auth/logout
router.get('/me', authenticate, authController.getCurrentUser);                                                                   // /api/auth/me
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);                     // /api/auth/change-password
router.post('/admin-reset-password', authenticate, authorizeRoles(ROLES.EXECUTIVE), validate(adminResetPasswordSchema), authController.adminResetPassword);
router.post('/password-reset-request', validate(passwordResetRequestSchema), authController.requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh', refreshLimiter, authController.refreshToken);
router.post('/google-login', loginLimiter, authController.googleLogin);                                                           // /api/auth/google-login

export default router;