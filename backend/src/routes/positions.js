import express from 'express';
import * as positionController from '../controllers/position.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as positionValidation from '../validations/position.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// create position
router.post('/', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(positionValidation.createPositionSchema), positionController.createPosition);

// get all positions
router.get('/', positionController.getAllPositions);

// get position by id
router.get('/:id', validate(positionValidation.positionIdSchema), positionController.getPositionById);

// update position
router.put('/:id', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(positionValidation.updatePositionSchema), positionController.updatePosition);

// delete position - Admin only
router.delete('/:id', authorizeRoles(ROLES.ADMIN), validate(positionValidation.positionIdSchema), positionController.deletePosition);

export default router;