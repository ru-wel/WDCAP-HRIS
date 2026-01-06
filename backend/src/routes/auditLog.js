import express from 'express';
import * as auditLogController from '../controllers/auditLog.controller.js';
import { authenticate, authorizeRoles } from '../middleware/auth.js';
import { ROLES } from '../config/constants.js';

const router = express.Router();

// all routes require authentication
router.use(authenticate);

// get all audit logs (Admin / HR only)
router.get(
  '/',
  authorizeRoles(ROLES.ADMIN),
  auditLogController.getAllAuditLogs
);

// get audit logs by table name (Admin / HR only)
router.get(
  '/table/:tableName',
  authorizeRoles(ROLES.ADMIN),
  auditLogController.getAuditLogsByTable
);

// get audit logs by user id (Admin / HR only)
router.get(
  '/user/:userId',
  authorizeRoles(ROLES.ADMIN),
  auditLogController.getAuditLogsByUser
);

// log a generated report (all authenticated roles)
router.post(
  '/reports',
  authorizeRoles(ROLES.ADMIN, ROLES.HR, ROLES.EMPLOYEE),
  auditLogController.createReportAuditLog
);

export default router;
