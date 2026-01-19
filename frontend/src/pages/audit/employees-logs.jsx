import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar";
import DropDownFilter from "../../components/dropdownfilter";
import { get } from "../../services/api.js";
import ReactPaginate from 'react-paginate';
import { compareDate, compareText } from '../../utils/sort.js';
import { exportRowsToCsv } from '../../utils/csv.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import ReportModal from '../../components/report-modal.jsx';
import { filterRowsByDateRange } from '../../utils/reporting.js';

function EmployeesLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('timestamp_newest');
  const [reportOpen, setReportOpen] = useState(false);

  // Extract target employee name from log
  const getTargetEmployee = (log) => {
    const table = String(log?.table_name || '').toLowerCase();
    const { old_values, new_values } = log;

    // For CREATE and UPDATE, use new_values; for DELETE, use old_values
    const values = new_values || old_values;
    if (!values) return 'N/A';

    // Standard employee records
    if (table === 'employees') {
      const name = [values.first_name, values.middle_name, values.last_name]
        .filter(Boolean)
        .join(' ');
      const employeeId = values.employee_id || 'N/A';
      return `${name || 'N/A'} (${employeeId})`;
    }

    // 201 files / onboarding
    if (table === 'documents') {
      const employeeId = values.employee_id || 'N/A';
      const file = values.file_name || values.document_name || values.file_path || 'Document';
      return `${file} (${employeeId})`;
    }

    if (table === 'onboarding_checklists') {
      const employeeId = values.employee_id || values.employeeId || 'N/A';
      const itemName = values.onboarding_items?.item_name || values.item_name || values.checklist_item_name || 'Checklist Item';
      return `${itemName} (${employeeId})`;
    }

    if (table === 'onboarding_items') {
      const name = values.item_name || 'Onboarding Item';
      return name;
    }

    return 'N/A';
  };

  // format logs in a readable way
  const formatEmployeeChanges = (log) => {
    const { action_type, old_values, new_values } = log;
    const table = String(log?.table_name || '').toLowerCase();

    // fields to skip (technical/system fields, nested objects)
    const skipFields = [
      'id', 'user_id',
      'created_at', 'updated_at', 'deleted_at',
      'positions', 'departments', 'users' // nested objects
    ];

    // safely convert value to string
    const formatValue = (value) => {
      if (value === null || value === undefined) return 'N/A';
      if (typeof value === 'object') return '[Complex Data]';
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      return String(value);
    };

    // make field names readable
    const humanizeFieldName = (fieldName) => {
      const specialCases = {
        'position_id': 'Position',
        'department_id': 'Department',
        'employment_status': 'Employment Status',
        'personnel_type': 'Personnel Type',
        'hire_date': 'Hire Date',
        'birth_date': 'Birth Date'
      };

      if (specialCases[fieldName]) {
        return specialCases[fieldName];
      }

      return fieldName
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
    };

    // 201 files / onboarding items
    if (table === 'documents') {
      const v = new_values || old_values;
      if (!v) return '—';
      const file = v.file_name || v.document_name || v.file_path || 'Document';
      if (action_type === 'CREATE') return `Uploaded: ${file}`;
      if (action_type === 'DELETE') return `Deleted: ${file}`;
      if (action_type === 'UPDATE' && old_values && new_values) {
        const changes = [];
        const skip = ['id', 'created_at', 'updated_at', 'uploaded_at', 'uploaded_by', 'employee_id'];
        for (const key in new_values) {
          if (skip.includes(key)) continue;
          const oldVal = old_values[key];
          const newVal = new_values[key];
          if (oldVal === newVal) continue;
          changes.push(`${humanizeFieldName(key)}: ${formatValue(oldVal)} → ${formatValue(newVal)}`);
        }
        return changes.length ? changes.join(', ') : `Updated: ${file}`;
      }
      return file;
    }

    if (table === 'onboarding_checklists') {
      const v = new_values || old_values;
      if (!v) return '—';
      const itemName = v.onboarding_items?.item_name || v.item_name || 'Checklist Item';
      if (action_type === 'CREATE') {
        const count = v.items_count != null ? ` (${v.items_count} items)` : '';
        return `Created checklist${count}`;
      }
      if (action_type === 'UPDATE' && old_values && new_values) {
        const changes = [];
        const fields = ['status', 'remarks', 'is_required', 'document_id', 'submitted_at', 'reviewed_at', 'reviewed_by'];
        for (const key of fields) {
          if (old_values?.[key] === undefined && new_values?.[key] === undefined) continue;
          if (old_values?.[key] === new_values?.[key]) continue;
          changes.push(`${humanizeFieldName(key)}: ${formatValue(old_values?.[key])} → ${formatValue(new_values?.[key])}`);
        }
        return changes.length ? `${itemName}: ${changes.join(', ')}` : `${itemName}: Updated`;
      }
      return itemName;
    }

    if (table === 'onboarding_items') {
      const v = new_values || old_values;
      if (!v) return '—';
      const name = v.item_name || 'Onboarding Item';
      if (action_type === 'CREATE') return `Created: ${name}`;
      if (action_type === 'DELETE') return `Deleted: ${name}`;
      if (action_type === 'UPDATE' && old_values && new_values) {
        const changes = [];
        const skip = ['id', 'created_at', 'updated_at'];
        for (const key in new_values) {
          if (skip.includes(key)) continue;
          const oldVal = old_values[key];
          const newVal = new_values[key];
          if (oldVal === newVal) continue;
          changes.push(`${humanizeFieldName(key)}: ${formatValue(oldVal)} → ${formatValue(newVal)}`);
        }
        return changes.length ? `${name}: ${changes.join(', ')}` : `${name}: Updated`;
      }
      return name;
    }

    // CREATE: show employee name and key details
    if (action_type === 'CREATE' && new_values) {
      const name = [new_values.first_name, new_values.middle_name, new_values.last_name]
        .filter(Boolean)
        .join(' ');
      const dept = new_values.department_name || 'N/A';
      const position = new_values.position_title || 'N/A';
      return `${name} - ${dept}, ${position}`;
    }

    // UPDATE: show only changed fields
    if (action_type === 'UPDATE' && old_values && new_values) {
      const changes = [];

      // handle position changes (compare nested objects)
      if (new_values.positions && old_values.positions) {
        if (new_values.positions.id !== old_values.positions.id) {
          changes.push(`Position: ${old_values.positions.position_title} → ${new_values.positions.position_title}`);
        }
      }

      // handle department changes (compare nested objects)
      if (new_values.departments && old_values.departments) {
        if (new_values.departments.id !== old_values.departments.id) {
          changes.push(`Department: ${old_values.departments.department_name} → ${new_values.departments.department_name}`);
        }
      }

      // handle other regular field changes
      for (const key in new_values) {
        // skip technical fields and nested objects
        if (skipFields.includes(key)) continue;

        // check if value actually changed
        const oldVal = old_values[key];
        const newVal = new_values[key];

        //skip if value is an object or if values are the same
        if (typeof newVal === 'object' || oldVal === newVal) continue;

        const formattedOld = formatValue(oldVal);
        const formattedNew = formatValue(newVal);

        if (formattedOld !== formattedNew) {
          changes.push(`${humanizeFieldName(key)}: ${formattedOld} → ${formattedNew}`);
        }
      }

      return changes.length > 0 ? changes.join(', ') : 'No significant changes';
    }

    // DELETE: Show deleted employee name
    if (action_type === 'DELETE' && old_values) {
      const name = [old_values.first_name, old_values.middle_name, old_values.last_name]
        .filter(Boolean)
        .join(' ');
      return `Deleted: ${name}`;
    }

    return '—';
  };

  const fetchEmployeeLogs = async () => {
    try {
      setLoading(true);

      // pull employee audit logs
      const response = await get("/audit-logs/table/employees");

      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch employee logs:", err);
      setError("Failed to load employee audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeLogs();
  }, []);

  const visibleLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? logs
      : logs.filter((log) => {
          const email = String(log.users?.email || '').toLowerCase();
          const action = String(log.action_type || '').toLowerCase();
          const employee = String(getTargetEmployee(log) || '').toLowerCase();
          const changes = String(formatEmployeeChanges(log) || '').toLowerCase();
          return (
            email.includes(q) ||
            action.includes(q) ||
            employee.includes(q) ||
            changes.includes(q)
          );
        });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'timestamp_newest':
          return compareDate(b?.timestamp, a?.timestamp);
        case 'timestamp_oldest':
          return compareDate(a?.timestamp, b?.timestamp);
        case 'user_az':
          return compareText(a?.users?.email, b?.users?.email);
        case 'user_za':
          return compareText(b?.users?.email, a?.users?.email);
        case 'employee_az':
          return compareText(getTargetEmployee(a), getTargetEmployee(b));
        case 'employee_za':
          return compareText(getTargetEmployee(b), getTargetEmployee(a));
        case 'action_az':
          return compareText(a?.action_type, b?.action_type);
        case 'action_za':
          return compareText(b?.action_type, a?.action_type);
        case 'changes_az':
          return compareText(formatEmployeeChanges(a), formatEmployeeChanges(b));
        case 'changes_za':
          return compareText(formatEmployeeChanges(b), formatEmployeeChanges(a));
        default:
          return compareDate(b?.timestamp, a?.timestamp);
      }
    });

    return sorted;
  }, [logs, searchTerm, sortOrder]);

   //REACT-PAGINATE
    
      const [itemOffset, setItemOffset] = useState(0);
      const itemsPerPage = 15;
      const endOffset = itemOffset + itemsPerPage;
      const currentLogs = visibleLogs.slice(itemOffset, endOffset);
      const pageCount = Math.ceil(visibleLogs.length / itemsPerPage);
      const multiPages = pageCount > 1;
    
      const handlePageClick = (event) => {
        const newOffset = (event.selected * itemsPerPage);
        setItemOffset(newOffset);
      };

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, logs.length]);

  const handleGenerateReport = ({ startDate, endDate, fileType } = {}) => {
    const rowsForExport = (startDate || endDate)
      ? filterRowsByDateRange(visibleLogs, (log) => log?.timestamp, startDate, endDate)
      : visibleLogs;

    const stamp = new Date().toISOString().slice(0, 10);
    const upper = String(fileType || 'XLSX').toUpperCase();
    const isPdf = upper === 'PDF';
    const isXlsx = upper === 'XLSX';
    const isCsv = upper === 'CSV';
    const ext = isPdf ? 'pdf' : isXlsx ? 'xlsx' : 'csv';
    const filename = `audit-employees-${stamp}.${ext}`;

    const columns = [
      { header: 'Date | Time', value: (log) => (log?.timestamp ? new Date(log.timestamp).toLocaleString() : '') },
      { header: 'User', value: (log) => log?.users?.email || 'N/A' },
      { header: 'Employee', value: (log) => getTargetEmployee(log) },
      { header: 'Action', value: (log) => log?.action_type || '' },
      { header: 'Changes', value: (log) => formatEmployeeChanges(log) },
    ];

    // Audit log record (best-effort)
    post('/audit-logs/reports', {
      report_name: 'Audit Employees Report',
      filename,
      start_date: startDate || null,
      end_date: endDate || null,
      row_count: rowsForExport.length,
      source: 'audit-employees',
    }).catch(() => {});

    if (isPdf) {
      // use PDF exporter
      import('../../utils/pdf.js').then(({ exportReportToPdf }) => {
        try {
          exportReportToPdf({
            filename,
            title: 'Audit - Employees',
            summaryLines: [
              startDate || endDate ? `Range: ${startDate || '…'} to ${endDate || '…'}` : 'Range: All time',
              `Rows: ${rowsForExport.length}`,
            ],
            columns,
            rows: rowsForExport,
          });
        } catch (e) {
          console.error('Failed to export PDF:', e);
        }
      });
    } else if (isXlsx) {
      exportRowsToXlsx({ filename, sheetName: 'Employees Logs', columns, rows: rowsForExport });
    } else {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    }

    setReportOpen(false);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        {/* HEADER */}
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Employees
          </h1>

          <div className="flex items-center gap-3">
            <DropDownFilter
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'timestamp_newest', label: 'Date | Time: Newest' },
                { value: 'timestamp_oldest', label: 'Date | Time: Oldest' },
                { value: 'user_az', label: 'User: A - Z' },
                { value: 'user_za', label: 'User: Z - A' },
                { value: 'employee_az', label: 'Employee: A - Z' },
                { value: 'employee_za', label: 'Employee: Z - A' },
                { value: 'action_az', label: 'Action: A - Z' },
                { value: 'action_za', label: 'Action: Z - A' },
                { value: 'changes_az', label: 'Changes: A - Z' },
                { value: 'changes_za', label: 'Changes: Z - A' },
              ]}
            />

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none"
              />
              <img
                src="/icons/red-search.png"
                className="absolute right-2 top-2 w-5 h-5"
                alt="search"
              />
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="flex justify-end mt-5">
          <button className="generate-report-button" onClick={() => setReportOpen(true)}>
            Generate Report
          </button>
        </div>

        <ReportModal
          open={reportOpen}
          title="Generate Report - Audit Employees"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
          fileTypes={["XLSX", "CSV", "PDF"]}
        />

        {/* LOADING */}
        {loading && (
          <div className="py-20 text-center text-gray-600">
            Loading employee audit logs...
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded mt-5">
            {error}
          </div>
        )}

        {/* TABLE */}
        {!loading && !error && (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">
                    Date | Time
                  </th>
                  <th className="th-style">User</th>
                  <th className="th-style">Employee</th>
                  <th className="th-style">Action</th>
                  <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">
                    Changes
                  </th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No employee logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => {
                    const date = new Date(log.timestamp);

                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {date.toLocaleDateString()} |{" "}
                          {date.toLocaleTimeString()}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {log.users?.email || "N/A"}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {getTargetEmployee(log)}
                        </td>

                        <td className="td-style-nobtn">
                          {log.action_type}
                        </td>

                        <td className="td-style-nobtn hidden sm:table-cell">
                          {formatEmployeeChanges(log)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <br />

            <div className="lg:flex items-center lg:justify-between">
              <p className="lg:text-md text-sm">
                Showing <b>{currentLogs.length}</b> of <b>{visibleLogs.length}</b> log{visibleLogs.length !== 1 ? "s" : ""}
              </p>

              {pageCount > 1 && (
              <div className=" ">
                <ReactPaginate
                  breakLabel="..."
                  nextLabel=">"
                  onPageChange={handlePageClick}
                  pageRangeDisplayed={2}
                  pageCount={pageCount}
                  forcePage={Math.floor(itemOffset / itemsPerPage)}
                  previousLabel="<"
                  renderOnZeroPageCount={null}
                  marginPagesDisplayed={2}
                  pageClassName=""
                  pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                  previousClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                  previousLinkClassName="page-link"
                  nextClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                  nextLinkClassName="page-link"
                  breakClassName="page-item"
                  breakLinkClassName="page-link"
                  containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                  activeClassName="underline font-medium"
                />
              </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeesLogs;
