import * as auditLogService from "../services/auditLog.service.js";

// get all audit logs
export const getAllAuditLogs = async (req, res, next) => {
  try {
    const logs = await auditLogService.getAllAuditLogs();

    res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully",
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// get audit logs by table name
export const getAuditLogsByTable = async (req, res, next) => {
  try {
    const { tableName } = req.params;

    const logs = await auditLogService.getAuditLogsByTable(tableName);

    res.status(200).json({
      success: true,
      message: `Audit logs for table ${tableName} retrieved successfully`,
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// get audit logs by user
export const getAuditLogsByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const logs = await auditLogService.getAuditLogsByUser(userId);

    res.status(200).json({
      success: true,
      message: "Audit logs for user retrieved successfully",
      data: logs
    });
  } catch (error) {
    next(error);
  }
};

// create audit log entry for report generation
export const createReportAuditLog = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const {
      report_name,
      filename = null,
      start_date = null,
      end_date = null,
      row_count = null,
      source = null,
    } = req.body || {};

    await auditLogService.createReportAuditLog({
      userId,
      reportName: report_name,
      filename,
      startDate: start_date,
      endDate: end_date,
      rowCount: row_count,
      source,
    });

    res.status(201).json({
      success: true,
      message: "Report audit log created successfully",
    });
  } catch (error) {
    next(error);
  }
};
