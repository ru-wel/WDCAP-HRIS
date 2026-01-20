import { supabase } from '../config/supabase.js';
import { InternalServerError } from '../utils/errors.js';
import { ROLES, PROJECT_STATUSES, EMPLOYMENT_STATUSES } from '../config/constants.js';
import logger from '../utils/logger.js';
import { enrichAuditLogs } from './auditLog.service.js';

const toCount = (count) => (Number.isFinite(Number(count)) ? Number(count) : 0);

const countRows = async (tableName, { column = '*', filters = [] } = {}) => {
  let query = supabase.from(tableName).select(column, { count: 'exact', head: true });
  for (const f of filters) {
    if (!f) continue;
    if (f.op === 'eq') query = query.eq(f.col, f.val);
    if (f.op === 'in') query = query.in(f.col, f.val);
  }

  const { count, error } = await query;
  if (error) throw new InternalServerError(error.message);
  return toCount(count);
};

const getRecentAuditLogs = async (limit = 5) => {
  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      `
        id,
        user_id,
        action_type,
        table_name,
        record_id,
        old_values,
        new_values,
        timestamp,
        users ( id, email, role, employee_id )
      `
    )
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw new InternalServerError(error.message);

  const enriched = await enrichAuditLogs(data || []);

  return enriched.map((r) => ({
    id: r.id,
    action_type: r.action_type,
    table_name: r.table_name,
    record_id: r.record_id,
    old_values: r.old_values,
    new_values: r.new_values,
    timestamp: r.timestamp,
    user: {
      email: r.users?.email || '',
      role: r.users?.role || ''
    },
    actor: r.actor || null,
    target_employee: r.target_employee || null,
  }));
};

const getRecentAuditLogsByUser = async (userId, limit = 5) => {
  if (!userId) return [];
  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      `
        id,
        user_id,
        action_type,
        table_name,
        record_id,
        old_values,
        new_values,
        timestamp,
        users ( id, email, role, employee_id )
      `
    )
    .eq('user_id', userId)
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (error) throw new InternalServerError(error.message);

  const enriched = await enrichAuditLogs(data || []);

  return enriched.map((r) => ({
    id: r.id,
    action_type: r.action_type,
    table_name: r.table_name,
    record_id: r.record_id,
    old_values: r.old_values,
    new_values: r.new_values,
    timestamp: r.timestamp,
    user: {
      email: r.users?.email || '',
      role: r.users?.role || ''
    },
    actor: r.actor || null,
    target_employee: r.target_employee || null,
  }));
};

const getPendingEvaluations = async ({ limit = 5 } = {}) => {
  // "Pending" = scheduled evaluation with no submitted result yet.
  // A result can be either uploaded docs OR score/remarks saved into notes.

  const { data, error } = await supabase
    .from('performance_evaluations')
    .select(
      `
        evaluation_id,
        employee_id,
        evaluation_date,
        evaluation_type,
        evaluation_notes,
        evaluation_document_path,
        employees (
          id,
          employee_id,
          first_name,
          last_name,
          positions ( position_title )
        )
      `
    )
    .is('evaluation_document_path', null) // filter out completed evaluations that have documents
    .order('evaluation_date', { ascending: true })
    .limit(50);

  if (error) throw new InternalServerError(error.message);

  const rows = Array.isArray(data) ? data : [];

  const hasScoreOrRemarks = (notes) => {
    const s = String(notes || '').trim();
    if (!s) return false;
    // submitEvaluation writes "Score:" / "Remarks:" lines
    return /^\s*(score|remarks)\s*:/im.test(s);
  };

  const pending = rows.filter((r) => {
    const textHasResult = hasScoreOrRemarks(r?.evaluation_notes);
    // pending only when no score/remarks in notes
    return !textHasResult;
  });

  // Deduplicate by employee to match "employees who are due" language.
  const seen = new Set();
  const unique = [];
  for (const r of pending) {
    const key = String(r?.employee_id || '');
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(r);
    if (unique.length >= limit) break;
  }

  return {
    count: seen.size,
    items: unique.map((r) => {
      const emp = r.employees || {};
      const name = `${emp.first_name || ''} ${emp.last_name || ''}`.trim();
      return {
        evaluation_id: r.evaluation_id,
        employee_id: r.employee_id,
        employee_code: emp.employee_id || '',
        employee_name: name,
        position_title: emp.positions?.position_title || '',
        evaluation_date: r.evaluation_date,
        evaluation_type: r.evaluation_type || ''
      };
    })
  };
};

export const getDashboardSummary = async (user) => {
  try {
    const role = user?.role || '';
    const employeeId = user?.employee_id || null;
    const userId = user?.id || null;

    const pendingLeaveRequestsCount = await countRows('leave_requests', {
      column: 'leave_request_id',
      filters: [
        { op: 'eq', col: 'status', val: 'PENDING' },
        ...(role === ROLES.EMPLOYEE && employeeId ? [{ op: 'eq', col: 'employee_id', val: employeeId }] : [])
      ]
    });

    const summary = {
      role,
      pendingLeaveRequestsCount
    };

    // Executive/HR-only dashboard blocks.
    if (role === ROLES.EXECUTIVE || role === ROLES.HR) {
      const [employeesCount, departmentsCount, activeProjectsCount, recentAuditLogs, pendingEvaluations] = await Promise.all([
        countRows('employees', { column: 'id', filters: [{ op: 'eq', col: 'employment_status', val: EMPLOYMENT_STATUSES.ACTIVE }] }),
        countRows('departments', { column: 'id' }),
        countRows('projects', {
          column: 'id',
          filters: [{ op: 'eq', col: 'status', val: PROJECT_STATUSES.ACTIVE }]
        }),
        getRecentAuditLogs(5),
        getPendingEvaluations({ limit: 5 })
      ]);

      Object.assign(summary, {
        employeesCount,
        departmentsCount,
        activeProjectsCount,
        recentAuditLogs,
        pendingEvaluationsCount: pendingEvaluations?.count ?? 0,
        pendingEvaluations: pendingEvaluations?.items ?? []
      });
    } else if (role === ROLES.EMPLOYEE) {
      const [recentAuditLogs] = await Promise.all([
        getRecentAuditLogsByUser(userId, 5)
      ]);

      Object.assign(summary, {
        recentAuditLogs
      });
    }

    return summary;
  } catch (error) {
    logger.error('Error building dashboard summary:', error);
    throw error;
  }
};
