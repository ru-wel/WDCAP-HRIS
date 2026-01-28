import express from 'express';
import * as calendarController from '../controllers/calendar.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as calendarValidation from '../validations/calendar.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// get calendar events
router.get('/events', validate(calendarValidation.getEventsSchema, 'query'), calendarController.getCalendarEvents);

// get event details by id
router.get('/events/:id', validate(calendarValidation.eventIdSchema), calendarController.getEventDetails);

// get leave request details by id
router.get('/leaves/:leaveId', validate(calendarValidation.leaveIdSchema), calendarController.getLeaveDetails);

// create company event
router.post('/events', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(calendarValidation.createCompanyEventSchema), calendarController.createCompanyEvent);

// update company event
router.put('/events/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(calendarValidation.updateCompanyEventSchema), calendarController.updateCompanyEvent);

// delete company event
router.delete('/events/:id', authorizeRoles(ROLES.EXECUTIVE, ROLES.HR), validate(calendarValidation.eventIdSchema), calendarController.deleteCompanyEvent);

export default router;
