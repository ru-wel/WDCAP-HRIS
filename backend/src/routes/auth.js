import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';
import { loginSchema, registerSchema } from '../validations/auth.validation.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

router.post('/register', authenticate, authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(registerSchema), authController.register); // /api/auth/register
router.post('/login', validate(loginSchema), authController.login);                                                               // /api/auth/login
router.post('/logout', authenticate, authController.logout);                                                                      // /api/auth/logout
router.get('/me', authenticate, authController.getCurrentUser);                                                                   // /api/auth/me
router.post('/refresh', authController.refreshToken);

export default router;