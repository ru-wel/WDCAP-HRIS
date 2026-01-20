import express from 'express';
import * as auditLogController from '../controllers/auditLog.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// get all audit logs (Executive / HR only)
router.get(
  '/',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  auditLogController.getAllAuditLogs
);

// get audit logs by table name (Executive / HR only)
router.get(
  '/table/:tableName',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  auditLogController.getAuditLogsByTable
);

// get audit logs by user id (Executive / HR only)
router.get(
  '/user/:userId',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR),
  auditLogController.getAuditLogsByUser
);

// log a generated report (all authenticated roles)
router.post(
  '/reports',
  authorizeRoles(ROLES.EXECUTIVE, ROLES.HR, ROLES.MANAGER, ROLES.EMPLOYEE),
  auditLogController.createReportAuditLog
);

export default router;
