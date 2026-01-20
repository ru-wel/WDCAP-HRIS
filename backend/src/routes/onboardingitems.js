import express from 'express';
import * as onboardingItemController from '../controllers/onboardingitem.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as onboardingItemValidation from '../validations/onboardingitem.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// get all onboarding items
router.get('/', onboardingItemController.getAllOnboardingItems);

// get onboarding item by ID
router.get('/:id', onboardingItemController.getOnboardingItemById);

// create onboarding item
router.post('/', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(onboardingItemValidation.createOnboardingItemSchema), onboardingItemController.createOnboardingItem);

// update onboarding item
router.put('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(onboardingItemValidation.updateOnboardingItemSchema), onboardingItemController.updateOnboardingItem);

// delete onboarding item
router.delete('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), onboardingItemController.deleteOnboardingItem);

export default router;