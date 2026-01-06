import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = express.Router();

router.use(authenticate);

// Role-aware summary used by the frontend dashboard.
router.get('/summary', dashboardController.getDashboardSummary);

export default router;
