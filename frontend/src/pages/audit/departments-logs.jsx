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

function DepartmentsLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('timestamp_newest');
  const [reportOpen, setReportOpen] = useState(false);

  // extract target department name from logs
  const getTargetDepartment = (log) => {
    const { old_values, new_values } = log;

    // for CREATE and UPDATE, use new_values; for DELETE, use old_values
    const values = new_values || old_values;

    if (!values) return 'N/A';

    return values.department_name || 'N/A';
  };

  // format department changes
  const formatDepartmentChanges = (log) => {
    const { action_type, old_values, new_values } = log;

    if (action_type === 'GENERATE_REPORT') {
      const reportName = new_values?.report_name || 'Report';
      const filename = new_values?.filename ? ` (${new_values.filename})` : '';
      const start = new_values?.start_date;
      const end = new_values?.end_date;
      const range = start || end ? ` | Range: ${start || '…'} → ${end || '…'}` : '';
      const rows = Number.isFinite(Number(new_values?.row_count)) ? ` | Rows: ${Number(new_values.row_count)}` : '';
      return `Generated: ${reportName}${filename}${range}${rows}`;
    }

    // CREATE: show department name
    if (action_type === 'CREATE' && new_values) {
      return `Created: ${new_values.department_name}`;
    }

    // UPDATE: show name change
    if (action_type === 'UPDATE' && old_values && new_values) {
      if (old_values.department_name !== new_values.department_name) {
        return `Department Name: ${old_values.department_name} → ${new_values.department_name}`;
      }
      return 'No significant changes';
    }

    // DELETE: show deleted department
    if (action_type === 'DELETE' && old_values) {
      return `Deleted: ${old_values.department_name}`;
    }

    return '—';
  };

  const fetchDepartmentLogs = async () => {
    try {
      setLoading(true);

      // pull department audit logs
      const response = await get("/audit-logs/table/departments");

      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch department logs:", err);
      setError("Failed to load department audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartmentLogs();
  }, []);

  const visibleLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? logs
      : logs.filter((log) => {
          const email = String(log.users?.email || '').toLowerCase();
          const action = String(log.action_type || '').toLowerCase();
          const dept = String(getTargetDepartment(log) || '').toLowerCase();
          const changes = String(formatDepartmentChanges(log) || '').toLowerCase();
          return (
            email.includes(q) ||
            action.includes(q) ||
            dept.includes(q) ||
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
        case 'department_az':
          return compareText(getTargetDepartment(a), getTargetDepartment(b));
        case 'department_za':
          return compareText(getTargetDepartment(b), getTargetDepartment(a));
        case 'action_az':
          return compareText(a?.action_type, b?.action_type);
        case 'action_za':
          return compareText(b?.action_type, a?.action_type);
        case 'changes_az':
          return compareText(formatDepartmentChanges(a), formatDepartmentChanges(b));
        case 'changes_za':
          return compareText(formatDepartmentChanges(b), formatDepartmentChanges(a));
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
    const ext = fileType === 'XLSX' ? 'xlsx' : 'csv';
    const filename = `audit-departments-${stamp}.${ext}`;

    const columns = [
      { header: 'Date | Time', value: (log) => (log?.timestamp ? new Date(log.timestamp).toLocaleString() : '') },
      { header: 'User', value: (log) => log?.users?.email || 'N/A' },
      { header: 'Department', value: (log) => getTargetDepartment(log) },
      { header: 'Action', value: (log) => log?.action_type || '' },
      { header: 'Changes', value: (log) => formatDepartmentChanges(log) },
    ];

    if (fileType === 'XLSX') {
      exportRowsToXlsx({ filename, sheetName: 'Departments Logs', columns, rows: rowsForExport });
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
            Departments
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
                { value: 'department_az', label: 'Department: A - Z' },
                { value: 'department_za', label: 'Department: Z - A' },
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
          title="Generate Report - Audit Departments"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
        />

        {/* LOADING */}
        {loading && (
          <div className="py-20 text-center text-gray-600">
            Loading department audit logs...
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
                  <th className="th-style">Department</th>
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
                      No department logs found
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
                          {getTargetDepartment(log)}
                        </td>

                        <td className="td-style-nobtn">
                          {log.action_type}
                        </td>

                        <td className="td-style-nobtn hidden sm:table-cell">
                          {formatDepartmentChanges(log)}
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

export default DepartmentsLogs;
