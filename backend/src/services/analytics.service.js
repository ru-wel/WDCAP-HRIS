import { supabase } from '../config/supabase.js';
import { InternalServerError } from '../utils/errors.js';
import { AUDIT_ACTIONS, EMPLOYMENT_STATUSES, PROJECT_STATUSES } from '../config/constants.js';
import logger from '../utils/logger.js';

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

const titleize = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  if (upper === raw) {
    return raw
      .toLowerCase()
      .split('_')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }
  return raw;
};

const inc = (map, key, amount = 1) => {
  const k = String(key || '').trim();
  if (!k) return;
  map.set(k, (map.get(k) || 0) + amount);
};

const mapToChartRows = (map, { keyName = 'name', sort = 'desc' } = {}) => {
  const rows = Array.from(map.entries()).map(([k, v]) => ({ [keyName]: k, value: v }));
  rows.sort((a, b) => {
    if (sort === 'alpha') return String(a[keyName]).localeCompare(String(b[keyName]));
    return (b.value || 0) - (a.value || 0);
  });
  return rows;
};

const mapReportModule = ({ source, tableName, reportName } = {}) => {
  const candidates = [source, tableName, reportName]
    .map((v) => String(v || '').trim())
    .filter(Boolean);

  const combined = candidates.join(' ').toLowerCase();
  if (!combined) return 'Reports';

  // 201 files / onboarding checklists belong to the Employees module in the UI.
  if (
    combined.includes('201') ||
    combined.includes('201-files') ||
    combined.includes('onboarding') ||
    combined.includes('checklist') ||
    combined.includes('employee files')
  ) {
    return 'Employees';
  }

  if (combined.includes('employee')) return 'Employees';
  if (combined.includes('project')) return 'Projects';
  if (combined.includes('department')) return 'Departments';
  if (combined.includes('leave')) return 'Leave';
  if (combined.includes('user')) return 'Users';

  return titleize(candidates[0] || 'Reports');
};

const formatReportId = (seq) => `RP-${String(Number(seq) || 0).padStart(5, '0')}`;

export const getAnalyticsSummary = async () => {
  try {
    const [employeesCount, activeProjectsCount, pendingLeaveRequestsCount] = await Promise.all([
      countRows('employees', { column: 'id', filters: [{ op: 'eq', col: 'employment_status', val: EMPLOYMENT_STATUSES.ACTIVE }] }),
      countRows('projects', { column: 'id', filters: [{ op: 'eq', col: 'status', val: PROJECT_STATUSES.ACTIVE }] }),
      countRows('leave_requests', { column: 'leave_request_id', filters: [{ op: 'eq', col: 'status', val: 'PENDING' }] })
    ]);

    const summary = {
      totalEmployees: employeesCount,
      activeProjects: activeProjectsCount,
      pendingLeaves: pendingLeaveRequestsCount
    };

    const [employeeRows, projectRows, leaveRows, reportAuditRows] = await Promise.all([
      supabase.from('employees').select('employment_status, personnel_type, departments ( department_name )'),
      supabase.from('projects').select('status'),
      supabase.from('leave_requests').select('status, leave_types ( leave_type_name )'),
      supabase
        .from('audit_logs')
        .select(
          `
          id,
          table_name,
          timestamp,
          new_values,
          users ( email, role )
        `
        )
        .eq('action_type', AUDIT_ACTIONS.GENERATE_REPORT)
        .order('timestamp', { ascending: false })
        .limit(50)
    ]);

    if (employeeRows.error) throw new InternalServerError(employeeRows.error.message);
    if (projectRows.error) throw new InternalServerError(projectRows.error.message);
    if (leaveRows.error) throw new InternalServerError(leaveRows.error.message);
    if (reportAuditRows.error) throw new InternalServerError(reportAuditRows.error.message);

    const departmentCounts = new Map();
    const employmentStatusCounts = new Map();
    const personnelTypeCounts = new Map();
    for (const r of employeeRows.data || []) {
      const dept = r.departments?.department_name || 'Unassigned';
      inc(departmentCounts, dept);

      const status = r.employment_status || 'Unknown';
      inc(employmentStatusCounts, status);

      const type = titleize(r.personnel_type || 'Unknown');
      inc(personnelTypeCounts, type);
    }

    // Ensure stable keys for the donut chart (Active/Inactive)
    if (!employmentStatusCounts.has(EMPLOYMENT_STATUSES.ACTIVE) && !employmentStatusCounts.has(EMPLOYMENT_STATUSES.INACTIVE)) {
      // no-op; keep whatever is present
    }

    const projectStatusCounts = new Map();
    for (const r of projectRows.data || []) {
      const status = r.status || 'Unknown';
      inc(projectStatusCounts, titleize(status));
    }

    const leaveStatusCounts = new Map();
    const leaveTypeCounts = new Map();
    for (const r of leaveRows.data || []) {
      const status = r.status || 'Unknown';
      inc(leaveStatusCounts, titleize(status));

      const type = r.leave_types?.leave_type_name || 'Unknown';
      inc(leaveTypeCounts, type);
    }

    const employeesByDepartment = mapToChartRows(departmentCounts, { keyName: 'department', sort: 'desc' });
    const employeeStatusData = mapToChartRows(employmentStatusCounts, { keyName: 'name', sort: 'desc' });
    const employeesByPersonnelType = mapToChartRows(personnelTypeCounts, { keyName: 'name', sort: 'desc' });
    const projectsByStatus = mapToChartRows(projectStatusCounts, { keyName: 'name', sort: 'desc' });
    const leaveStatusData = mapToChartRows(leaveStatusCounts, { keyName: 'name', sort: 'desc' });
    const leaveTypesData = mapToChartRows(leaveTypeCounts, { keyName: 'name', sort: 'desc' });

    // audit_logs.id is UUID, so we generate RP sequence numbers.
    // Requirement: RP-00001 must be the earliest (oldest) report, not the newest.
    const reportAuditData = reportAuditRows.data || [];
    const oldestFirst = [...reportAuditData].sort((a, b) => {
      const ta = new Date(a?.timestamp || 0).getTime();
      const tb = new Date(b?.timestamp || 0).getTime();
      if (ta !== tb) return ta - tb;
      return String(a?.id || '').localeCompare(String(b?.id || ''));
    });
    const idToSeq = new Map(oldestFirst.map((r, i) => [String(r?.id || ''), i + 1]));

    const reportRows = reportAuditData.map((r) => {
      const newValues = r.new_values || {};
      const source = newValues.source || '';
      const reportName = newValues.report_name || 'Report';
      const role = r.users?.role || '';
      const seq = idToSeq.get(String(r?.id || '')) || 0;

      return {
        id: formatReportId(seq),
        name: reportName,
        module: mapReportModule({ source, tableName: r.table_name, reportName }),
        generatedBy: role || 'System',
        date: r.timestamp || null,
        status: 'READY'
      };
    });

    return {
      summary,
      employeesByDepartment,
      employeeStatusData,
      employeesByPersonnelType,
      projectsByStatus,
      leaveStatusData,
      leaveTypesData,
      reportRows
    };
  } catch (error) {
    logger.error('Error building analytics summary:', error);
    throw error;
  }
};
