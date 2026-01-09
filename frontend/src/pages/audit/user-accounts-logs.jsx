import React, { useEffect, useState } from "react";
import Navbar from "../../components/navbar";
import DropDownFilter from "../../components/dropdownfilter";
import { get } from "../../services/api.js";
import ReactPaginate from 'react-paginate';
import { compareDate, compareText } from '../../utils/sort.js';
import { exportRowsToCsv } from '../../utils/csv.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import ReportModal from '../../components/report-modal.jsx';
import { filterRowsByDateRange } from '../../utils/reporting.js';

function UserAccountsLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('timestamp_newest');
  const [reportOpen, setReportOpen] = useState(false);

  // Extract target user email from log
  const getTargetUser = (log) => {
    const actionType = String(log?.action_type || '').toUpperCase();
    if (actionType === 'PASSWORD_RESET_REQUEST') {
      return log?.new_values?.email || log?.old_values?.email || log?.record_id || 'N/A';
    }

    const { old_values, new_values } = log;

    // For CREATE and UPDATE, use new_values; for DELETE, use old_values
    const values = new_values || old_values;

    if (!values) return 'N/A';

    return values.email || 'N/A';
  };

  const formatActionLabel = (actionType) => {
    const normalized = String(actionType || '').toUpperCase();
    if (normalized === 'PASSWORD_RESET_REQUEST') return 'Password Reset Request';
    return actionType || '';
  };

  // format logs in a readable way
  const formatChanges = (newValues, actionType) => {
    const normalized = String(actionType || '').toUpperCase();
    if (normalized === 'PASSWORD_RESET_REQUEST') {
      // Keep this readable; avoid dumping IP/UA in the table.
      return 'Requested password reset (Forgot Password)';
    }

    // no changes for these actions
    if (!newValues || ['LOGIN', 'LOGOUT', 'DELETE'].includes(actionType)) {
      return '—';
    }

    return Object.entries(newValues)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  };

  // fetch audit logs (users only)
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);

      // pull only USER logs
      const response = await get("/audit-logs/table/users");

      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return true;

    const email = String(log.users?.email || '').toLowerCase();
    const target = String(getTargetUser(log) || '').toLowerCase();
    const action = String(log.action_type || '').toLowerCase();
    const changes = String(formatChanges(log.new_values, log.action_type) || '').toLowerCase();
    return (
      email.includes(q) ||
      target.includes(q) ||
      action.includes(q) ||
      changes.includes(q)
    );
  });

  const visibleLogs = [...filteredLogs].sort((a, b) => {
    switch (sortOrder) {
      case 'timestamp_newest':
        return compareDate(b?.timestamp, a?.timestamp);
      case 'timestamp_oldest':
        return compareDate(a?.timestamp, b?.timestamp);
      case 'user_az':
        return compareText(a?.users?.email, b?.users?.email);
      case 'user_za':
        return compareText(b?.users?.email, a?.users?.email);
      case 'target_az':
        return compareText(getTargetUser(a), getTargetUser(b));
      case 'target_za':
        return compareText(getTargetUser(b), getTargetUser(a));
      case 'action_az':
        return compareText(a?.action_type, b?.action_type);
      case 'action_za':
        return compareText(b?.action_type, a?.action_type);
      case 'changes_az':
        return compareText(formatChanges(a?.new_values, a?.action_type), formatChanges(b?.new_values, b?.action_type));
      case 'changes_za':
        return compareText(formatChanges(b?.new_values, b?.action_type), formatChanges(a?.new_values, a?.action_type));
      default:
        return compareDate(b?.timestamp, a?.timestamp);
    }
  });

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

    const columns = [
      { header: 'Date | Time', value: (log) => (log?.timestamp ? new Date(log.timestamp).toLocaleString() : '') },
      { header: 'User', value: (log) => log?.users?.email || 'N/A' },
      { header: 'User Account', value: (log) => getTargetUser(log) },
      { header: 'Action', value: (log) => formatActionLabel(log?.action_type) },
      { header: 'Changes', value: (log) => formatChanges(log?.new_values, log?.action_type) },
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    if (fileType === 'CSV') {
      exportRowsToCsv({ filename: `audit-user-accounts-${stamp}.csv`, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({ filename: `audit-user-accounts-${stamp}.xlsx`, sheetName: 'User Accounts Logs', columns, rows: rowsForExport });
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
            User Accounts
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
                { value: 'target_az', label: 'Target: A - Z' },
                { value: 'target_za', label: 'Target: Z - A' },
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
          title="Generate Report - User Account Logs"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
        />

        {/* LOADING */}
        {loading && (
          <div className="flex justify-center py-20">
            <p className="text-gray-600">Loading audit logs...</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-5">
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
                  <th className="th-style">User Account</th>
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
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => {
                    const dateObj = new Date(log.timestamp);

                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {dateObj.toLocaleDateString()} |{" "}
                          {dateObj.toLocaleTimeString()}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {log.users?.email || "N/A"}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {getTargetUser(log)}
                        </td>

                        <td className="td-style-nobtn">
                          {formatActionLabel(log.action_type)}
                        </td>

                        <td className="td-style-nobtn hidden sm:table-cell">
                          {formatChanges(log.new_values, log.action_type)}
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

export default UserAccountsLogs;
