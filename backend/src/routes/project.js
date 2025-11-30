import express from 'express';
import * as projectController from '../controllers/project.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as projectValidation from '../validations/project.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// create project
// NOTE: Adjust roles if you use different role names for project owners/managers
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(projectValidation.createProjectSchema), projectController.createProject);

// get all projects
router.get('/', projectController.getAllProjects);

// get project by id
router.get('/:id', validate(projectValidation.projectIdSchema), projectController.getProjectById);

// update project
router.put('/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(projectValidation.updateProjectSchema), projectController.updateProject);

// delete project - Admin only
router.delete('/:id', authorizeRoles(ROLES.ADMIN), validate(projectValidation.projectIdSchema), projectController.deleteProject);

export default router;
