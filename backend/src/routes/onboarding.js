import express from 'express';
import * as onboardingController from '../controllers/onboarding.controller.js';
import { authenticate, authorizeRoles, verifyEmployeeOwnership, verifyChecklistOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as onboardingValidation from '../validations/onboarding.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// get all checklists
router.get('/checklists', authorizeRoles(ROLES.ADMIN, ROLES.HR), onboardingController.getAllChecklists);

// get checklist for a specific employee
router.get('/employee/:employeeId/checklist', verifyEmployeeOwnership, onboardingController.getEmployeeChecklist);

// get a single checklist per ID
router.get('/checklist/:id', verifyChecklistOwnership, onboardingController.getChecklistItemById);

// Update checklist item
router.put('/checklist/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(onboardingValidation.updateChecklistItemSchema), onboardingController.updateChecklistItem);

// Review a submitted document
router.post('/checklist/:id/review', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(onboardingValidation.reviewSubmissionSchema), onboardingController.reviewSubmission);

export default router;