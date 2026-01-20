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
router.post('/', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(projectValidation.createProjectSchema), projectController.createProject);

// get all projects
router.get('/', projectController.getAllProjects);

// get my projects (current employee)
router.get('/my', projectController.getMyProjects);

// get project by id
router.get('/:id', validate(projectValidation.projectIdSchema), projectController.getProjectById);

// get project members
router.get('/:id/members', validate(projectValidation.projectIdSchema), projectController.getProjectMembers);

// update project
router.put('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(projectValidation.updateProjectSchema), projectController.updateProject);

// delete project - Executive and HR
router.delete('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(projectValidation.projectIdSchema), projectController.deleteProject);

export default router;
