import express from 'express';
import * as employeeController from '../controllers/employee.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as employeeValidation from '../validations/employee.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// create employee
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(employeeValidation.createEmployeeSchema), employeeController.createEmployee);

// get all employees
router.get('/', employeeController.getAllEmployees);

// get employee by id
router.get('/:id', validate(employeeValidation.employeeIdSchema), employeeController.getEmployeeById);

// get employee by user_id
router.get('/user/:userId', employeeController.getEmployeeByUserId);

// update employee
router.put('/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(employeeValidation.updateEmployeeSchema), employeeController.updateEmployee);

// delete employee - Admin only
router.delete('/:id', authorizeRoles(ROLES.ADMIN), validate(employeeValidation.employeeIdSchema), employeeController.deleteEmployee);

export default router;