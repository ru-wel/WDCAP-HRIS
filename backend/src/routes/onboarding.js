import express from 'express';
import * as onboardingController from '../controllers/onboarding.controller.js';
import { authenticate, authorizeRoles, verifyEmployeeOwnership, verifyChecklistOwnership } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as onboardingValidation from '../validations/onboarding.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// creation of new employee + user route
router.post(
	'/complete',
	authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
	validate(onboardingValidation.createEmployeeWithAccountSchema),
	onboardingController.createEmployeeWithAccount
);

// get all checklists
router.get('/checklists', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), onboardingController.getAllChecklists);

// get checklist for current employee
router.get('/me/checklist', authorizeRoles(ROLES.EMPLOYEE), onboardingController.getMyChecklist);

// get checklist for a specific employee
router.get('/employee/:employeeId/checklist', verifyEmployeeOwnership, onboardingController.getEmployeeChecklist);

// send reminder email to employee for missing / rejected required documents
router.post(
	'/employee/:employeeId/remind-missing',
	authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
	onboardingController.sendMissingDocumentsReminder
);

// get a single checklist per ID
router.get('/checklist/:id', verifyChecklistOwnership, onboardingController.getChecklistItemById);

// bulk update checklist items (is_required field only)
router.put('/checklist', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(onboardingValidation.bulkUpdateChecklistItemsSchema), onboardingController.bulkUpdateChecklistItems);

// Update checklist item
router.put('/checklist/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(onboardingValidation.updateChecklistItemSchema), onboardingController.updateChecklistItem);

// Review a submitted document
router.post('/checklist/:id/review', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(onboardingValidation.reviewSubmissionSchema), onboardingController.reviewSubmission);

export default router;