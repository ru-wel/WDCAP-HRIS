import express from 'express';
import * as leaveController from '../controllers/leave.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as leaveValidation from '../validations/leave.validation.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// Leave types
router.get('/types', leaveController.getLeaveTypes);

// Leave requests
router.get('/requests', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(leaveValidation.listLeaveRequestsSchema), leaveController.listLeaveRequests);
router.get('/requests/me', validate(leaveValidation.listMyLeaveRequestsSchema), leaveController.listMyLeaveRequests);
router.post('/requests', validate(leaveValidation.createLeaveRequestSchema), leaveController.createLeaveRequest);
router.put('/requests/:leave_request_id/status', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(leaveValidation.updateLeaveRequestStatusSchema), leaveController.updateLeaveRequestStatus);
router.put('/requests/:leave_request_id/cancel', authorizeRoles(ROLES.EMPLOYEE), validate(leaveValidation.cancelLeaveRequestSchema), leaveController.cancelLeaveRequest);

// Leave history
router.get('/history', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(leaveValidation.listLeaveHistorySchema), leaveController.listLeaveHistory);
router.get('/history/me', validate(leaveValidation.listMyLeaveHistorySchema), leaveController.listMyLeaveHistory);

// Leave balances/credits
router.get('/credits', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(leaveValidation.listLeaveCreditsSchema), leaveController.listLeaveCredits);
router.get('/credits/me', validate(leaveValidation.listMyLeaveCreditsSchema), leaveController.listMyLeaveCredits);
router.put('/credits/:leave_balance_id', authorizeRoles(ROLES.ADMIN, ROLES.HR), validate(leaveValidation.updateLeaveCreditSchema), leaveController.updateLeaveCredit);

export default router;
