import express from 'express';
import * as assignmentController from '../controllers/projectassignment.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as assignmentValidation from '../validations/projectassignment.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// CREATE ASSIGNMENT - Admin & HR
router.post(
  '/',
  authorizeRoles(ROLES.ADMIN, ROLES.HR),
  validate(assignmentValidation.createAssignmentSchema),
  assignmentController.createAssignment
);

// GET ALL ASSIGNMENTS
router.get('/', assignmentController.getAllAssignments);

// GET ASSIGNMENT BY ID
router.get(
  '/:id',
  validate(assignmentValidation.assignmentIdSchema),
  assignmentController.getAssignmentById
);

// UPDATE ASSIGNMENT - Admin & HR
router.put(
  '/:id',
  authorizeRoles(ROLES.ADMIN, ROLES.HR),
  validate(assignmentValidation.updateAssignmentSchema),
  assignmentController.updateAssignment
);

// DELETE ASSIGNMENT - Admin only
router.delete(
  '/:id',
  authorizeRoles(ROLES.ADMIN),
  validate(assignmentValidation.assignmentIdSchema),
  assignmentController.deleteAssignment
);

export default router;
