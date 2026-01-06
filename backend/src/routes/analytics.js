import express from 'express';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';
import * as analyticsController from '../controllers/analytics.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles(ROLES.ADMIN, ROLES.HR));

router.get('/summary', analyticsController.getAnalyticsSummary);

export default router;
