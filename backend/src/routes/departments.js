import express from 'express';
import * as departmentController from '../controllers/departments.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as departmentValidation from '../validations/department.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// create department
router.post('/', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(departmentValidation.createDepartmentSchema), departmentController.createDepartment);

// get all departments
router.get('/', departmentController.getAllDepartments);

// get department by id
router.get('/:id', validate(departmentValidation.departmentIdSchema), departmentController.getDepartmentById);

// get department members
router.get('/:id/members', validate(departmentValidation.departmentIdSchema), departmentController.getDepartmentMembers);

// update department
router.put('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(departmentValidation.updateDepartmentSchema), departmentController.updateDepartment);

// delete department - Executive and HR
router.delete('/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(departmentValidation.departmentIdSchema), departmentController.deleteDepartment);

export default router;