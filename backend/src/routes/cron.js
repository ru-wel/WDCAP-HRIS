import express from 'express';
import { validateCronRequest } from '../middleware/cronAuth.js';
import * as cronController from '../controllers/cron.controller.js';

const router = express.Router();

// send evaluation reminders (7 days before due date)
router.post('/evaluation-reminders',
  validateCronRequest,
  cronController.sendEvaluationReminders
);

export default router;
