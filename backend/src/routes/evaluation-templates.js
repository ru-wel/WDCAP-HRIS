import express from 'express';
import * as templateController from '../controllers/template.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as templateValidation from '../validations/template.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// get all active templates (any authenticated user can view)
router.get('/', templateController.getActiveTemplates);

// get all templates including inactive (HR/Executive only)
router.get('/all', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), templateController.getAllTemplates);

// get all position-template assignments (HR/Executive/Manager)
router.get('/assignments', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER), templateController.getPositionTemplateAssignments);

// get template assigned to a specific position (HR/Executive/Manager)
router.get(
  '/position/:positionId',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER),
  validate(templateValidation.positionIdParamSchema),
  templateController.getTemplateForPosition
);

// assign a template to a position
router.put(
  '/assignments/assign',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.assignTemplateSchema),
  templateController.assignTemplateToPosition
);

// unassign a template from a position
router.delete(
  '/assignments/position/:positionId',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.positionIdParamSchema),
  templateController.unassignTemplateFromPosition
);

// create a new template
router.post(
  '/',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.createTemplateSchema),
  templateController.createTemplate
);

// get a single template with full details (any authenticated user)
router.get(
  '/:id',
  validate(templateValidation.templateIdParamSchema),
  templateController.getTemplateById
);

// update template metadata
router.put(
  '/:id',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.updateTemplateSchema),
  templateController.updateTemplate
);

// deactivate a template
router.put(
  '/:id/deactivate',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.templateIdParamSchema),
  templateController.deactivateTemplate
);

// reactivate a template
router.put(
  '/:id/reactivate',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.templateIdParamSchema),
  templateController.reactivateTemplate
);

// add a section to a template
router.post(
  '/:id/sections',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.addSectionSchema),
  templateController.addSection
);

// update a section
router.put(
  '/:id/sections/:sectionId',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.updateSectionSchema),
  templateController.updateSection
);

// delete a section
router.delete(
  '/:id/sections/:sectionId',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.sectionParamsSchema),
  templateController.deleteSection
);

// add an item to a section
router.post(
  '/:id/sections/:sectionId/items',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.addItemSchema),
  templateController.addItem
);

// update an item
router.put(
  '/:id/sections/:sectionId/items/:itemId',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.updateItemSchema),
  templateController.updateItem
);

// delete an item
router.delete(
  '/:id/sections/:sectionId/items/:itemId',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  validate(templateValidation.itemParamsSchema),
  templateController.deleteItem
);

export default router;
