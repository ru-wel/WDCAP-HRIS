import express from 'express';
import * as assignmentController from '../controllers/projectassignment.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as assignmentValidation from '../validations/projectassignment.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// CREATE ASSIGNMENT - Executive & HR
router.post('/', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(assignmentValidation.createAssignmentSchema), assignmentController.createAssignment);

// GET ALL ASSIGNMENTS
router.get('/', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), assignmentController.getAllAssignments);

// GET ASSIGNMENTS BY PROJECT
router.get('/by-project/:projectId', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), assignmentController.getAssignmentByProject);

// GET ASSIGNMENT BY ID
router.get('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(assignmentValidation.assignmentIdSchema), assignmentController.getAssignmentById);

// UPDATE ASSIGNMENT - Executive & HR
router.put('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(assignmentValidation.updateAssignmentSchema), assignmentController.updateAssignment);

// DELETE ASSIGNMENT - Executive and HR
router.delete('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(assignmentValidation.assignmentIdSchema), assignmentController.deleteAssignment);

export default router;
