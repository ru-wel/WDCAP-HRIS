import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { adminResetPasswordSchema, changePasswordSchema, loginSchema, passwordResetRequestSchema, registerSchema, resetPasswordSchema } from '../validations/auth.validation.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.post('/register', authenticate, authorizeRoles(ROLES.ADMIN), validate(registerSchema), authController.register); // /api/auth/register
router.post('/login', validate(loginSchema), authController.login);                                                               // /api/auth/login
router.post('/logout', authenticate, authController.logout);                                                                      // /api/auth/logout
router.get('/me', authenticate, authController.getCurrentUser);                                                                   // /api/auth/me
router.post('/change-password', authenticate, validate(changePasswordSchema), authController.changePassword);                     // /api/auth/change-password
router.post('/admin-reset-password', authenticate, authorizeRoles(ROLES.ADMIN), validate(adminResetPasswordSchema), authController.adminResetPassword);
router.post('/password-reset-request', validate(passwordResetRequestSchema), authController.requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh', authController.refreshToken);
router.post('/google-login', authController.googleLogin);                                                                        // /api/auth/google-login

export default router;