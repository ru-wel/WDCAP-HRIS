import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar";
import { get } from "../../services/api.js";
import ReactPaginate from "react-paginate";
import { compareDate, compareText } from "../../utils/sort";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";

function LeaveLogs() {
  const [logs, setLogs] = useState([]);
  const [leaveTypesById, setLeaveTypesById] = useState(() => ({}));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("timestamp_newest");
  const [reportOpen, setReportOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  useEffect(() => {
    if (!filtersOpen) return;
    setDraftSortOrder(sortOrder);
  }, [filtersOpen, sortOrder]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const sortOptions = useMemo(
    () => [
      { value: "timestamp_newest", label: "Date | Time: Newest" },
      { value: "timestamp_oldest", label: "Date | Time: Oldest" },
      { value: "email_az", label: "Email: A - Z" },
      { value: "email_za", label: "Email: Z - A" },
      { value: "action_az", label: "Action: A - Z" },
      { value: "action_za", label: "Action: Z - A" },
      { value: "changes_az", label: "Changes: A - Z" },
      { value: "changes_za", label: "Changes: Z - A" },
    ],
    []
  );

  const defaultSort = "timestamp_newest";

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (sortOrder !== defaultSort) n += 1;
    return n;
  }, [sortOrder]);

  const clearFilters = () => {
    setDraftSortOrder(defaultSort);
  };

  const applyDraftFilters = () => {
    setSortOrder(draftSortOrder);
    setFiltersOpen(false);
  };

  const ChipButton = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
        active
          ? "bg-[#990100] text-white border-[#990100]"
          : "bg-white text-[#990100] border-[#990100] hover:bg-[#990100]/10",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const formatEmployeeName = (employee) => {
    if (!employee) return "";
    const first = employee.first_name || "";
    const last = employee.last_name || "";
    const name = `${first} ${last}`.trim();
    return name || "";
  };

  const formatTargetEmployeeLabel = (log, values) => {
    const targetName = String(log?.target_employee?.name || "").trim();
    const targetCode = String(log?.target_employee?.employee_code || "").trim();
    if (targetName && targetCode) return `${targetName} (${targetCode})`;
    if (targetName) return targetName;
    if (targetCode) return targetCode;

    const nestedEmployeeName = formatEmployeeName(values?.employees);
    const nestedEmployeeCode = String(values?.employees?.employee_id || "").trim();
    if (nestedEmployeeName && nestedEmployeeCode)
      return `${nestedEmployeeName} (${nestedEmployeeCode})`;
    if (nestedEmployeeName) return nestedEmployeeName;
    if (nestedEmployeeCode) return nestedEmployeeCode;

    const direct = String(values?.employee_id || "").trim();
    return direct;
  };

  const formatActorLabel = (log) => {
    const actorName = String(log?.actor?.name || "").trim();
    if (actorName) return actorName;
    const email = String(log?.users?.email || "").trim();
    return email || "N/A";
  };

  const getLeaveTypeName = (values) => {
    const nested = values?.leave_types;
    if (nested?.leave_type_name) return nested.leave_type_name;

    const direct = String(values?.leave_type_name || values?.leave_type || "").trim();
    if (direct) return direct;

    const id = values?.leave_type_id;
    const fromMap = id ? leaveTypesById[String(id)] : null;
    if (fromMap) return fromMap;

    return "";
  };

  const getActionLabel = (log) => {
    const table = String(log.table_name || "").toLowerCase();
    const action = String(log.action_type || "").toUpperCase();
    const oldV = log.old_values;
    const newV = log.new_values;

    if (table === "leave_requests") {
      if (action === "CREATE") return "Requested Leave";
      if (action === "UPDATE") {
        const oldStatus = String(oldV?.status || "").toUpperCase();
        const newStatus = String(newV?.status || "").toUpperCase();
        if (oldStatus && newStatus && oldStatus !== newStatus)
          return "Changed status of Leave";
        return "Updated Leave Request";
      }
      return action;
    }

    if (table === "leave_types") {
      if (action === "UPDATE") {
        const oldEnabled = oldV?.is_enabled ?? oldV?.enabled ?? null;
        const newEnabled = newV?.is_enabled ?? newV?.enabled ?? null;
        if (
          oldEnabled !== null &&
          newEnabled !== null &&
          oldEnabled !== newEnabled
        ) {
          return newEnabled ? "Enabled a Leave Type" : "Disabled a Leave Type";
        }
        return "Updated Leave Type";
      }
      if (action === "CREATE") return "Created Leave Type";
      if (action === "DELETE") return "Deleted Leave Type";
      return action;
    }

    if (table === "employee_leave_balances") {
      if (action === "UPDATE") return "Updated Leave Credits";
      return action;
    }

    return action;
  };

  const formatLeaveChanges = (log) => {
    const table = String(log.table_name || "").toLowerCase();
    const action = String(log.action_type || "").toUpperCase();
    const oldV = log.old_values;
    const newV = log.new_values;

    if (table === "leave_requests") {
      const values = newV || oldV;
      const leaveType = getLeaveTypeName(values);
      const start = values?.start_date ? String(values.start_date).slice(0, 10) : "N/A";

      const employeeLabel = formatTargetEmployeeLabel(log, values) || "N/A";

      if (action === "CREATE") {
        const label = [employeeLabel, leaveType].filter(Boolean).join(" - ");
        return `${label || "Leave"} - ${start}`;
      }

      if (action === "UPDATE") {
        const oldStatus = oldV?.status ? String(oldV.status) : null;
        const newStatus = newV?.status ? String(newV.status) : null;
        if (oldStatus && newStatus && oldStatus !== newStatus) {
          const label = [employeeLabel, leaveType].filter(Boolean).join(" - ");
          return `${label || employeeLabel} - ${start} - ${oldStatus} to ${newStatus}`;
        }
        const label = [employeeLabel, leaveType].filter(Boolean).join(" - ");
        return `${label || employeeLabel} - ${start}`;
      }

      return leaveType;
    }

    if (table === "leave_types") {
      const values = newV || oldV;
      const typeName = getLeaveTypeName(values);
      const oldEnabled = oldV?.is_enabled ?? oldV?.enabled ?? null;
      const newEnabled = newV?.is_enabled ?? newV?.enabled ?? null;
      if (
        action === "UPDATE" &&
        oldEnabled !== null &&
        newEnabled !== null &&
        oldEnabled !== newEnabled
      ) {
        return `${typeName} - ${newEnabled ? "Enabled" : "Disabled"}`;
      }
      return typeName;
    }

    if (table === "employee_leave_balances") {
      const values = newV || oldV;
      const employeeLabel = formatTargetEmployeeLabel(log, values) || "N/A";
      const leaveType = getLeaveTypeName(values);
      const oldBal = oldV?.current_balance;
      const newBal = newV?.current_balance;
      if (oldBal !== undefined && newBal !== undefined && oldBal !== newBal) {
        const label = [employeeLabel, leaveType].filter(Boolean).join(" - ");
        return `${label || employeeLabel}: ${oldBal} → ${newBal}`;
      }
      return [employeeLabel, leaveType].filter(Boolean).join(" - ") || employeeLabel;
    }

    return "—";
  };

  const fetchLeaveLogs = async () => {
    try {
      setLoading(true);

      const [logsResponse, typesResponse] = await Promise.all([
        get("/audit-logs/table/leave"),
        get("/leave/types"),
      ]);

      if (typesResponse?.success) {
        const list = Array.isArray(typesResponse?.data) ? typesResponse.data : [];
        const map = list.reduce((acc, t) => {
          const id = t?.leave_type_id;
          const name = String(t?.leave_type_name || "").trim();
          if (id && name) acc[String(id)] = name;
          return acc;
        }, {});
        setLeaveTypesById(map);
      }

      if (logsResponse?.success) {
        setLogs(logsResponse.data);
      } else {
        setError("Failed to load leave audit logs");
      }
    } catch (err) {
      console.error("Failed to fetch leave logs:", err);
      setError("Failed to load leave audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveLogs();
  }, []);

  const visibleLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? logs
      : logs.filter((log) => {
          const email = String(log.users?.email || "").toLowerCase();
          const actor = String(log.actor?.name || "").toLowerCase();
          const action = String(getActionLabel(log) || "").toLowerCase();
          const changes = String(formatLeaveChanges(log) || "").toLowerCase();
          return (
            email.includes(q) ||
            actor.includes(q) ||
            action.includes(q) ||
            changes.includes(q)
          );
        });

    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "timestamp_oldest":
          return compareDate(a.timestamp, b.timestamp);
        case "email_az":
          return compareText(a.users?.email, b.users?.email);
        case "email_za":
          return compareText(b.users?.email, a.users?.email);
        case "action_az":
          return compareText(getActionLabel(a), getActionLabel(b));
        case "action_za":
          return compareText(getActionLabel(b), getActionLabel(a));
        case "changes_az":
          return compareText(formatLeaveChanges(a), formatLeaveChanges(b));
        case "changes_za":
          return compareText(formatLeaveChanges(b), formatLeaveChanges(a));
        case "timestamp_newest":
        default:
          return compareDate(b.timestamp, a.timestamp);
      }
    });
  }, [logs, searchTerm, sortOrder]);

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentLogs = visibleLogs.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(visibleLogs.length / itemsPerPage);
  const multiPages = pageCount > 1;

  const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
  };

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, logs.length]);

  const handleGenerateReport = ({ startDate, endDate, fileType } = {}) => {
    const rowsForExport =
      startDate || endDate
        ? filterRowsByDateRange(
            visibleLogs,
            (log) => log?.timestamp,
            startDate,
            endDate
          )
        : visibleLogs;

    const stamp = new Date().toISOString().slice(0, 10);
    const ext = fileType === "XLSX" ? "xlsx" : "csv";
    const filename = `audit-leave-${stamp}.${ext}`;

    const columns = [
      {
        header: "Date | Time",
        value: (log) =>
          log?.timestamp ? new Date(log.timestamp).toLocaleString() : "",
      },
      { header: "User", value: (log) => formatActorLabel(log) },
      { header: "Action", value: (log) => getActionLabel(log) },
      { header: "Changes", value: (log) => formatLeaveChanges(log) },
    ];

    if (fileType === "XLSX") {
      exportRowsToXlsx({
        filename,
        sheetName: "Leave Logs",
        columns,
        rows: rowsForExport,
      });
    } else {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    }

    setReportOpen(false);
  };

  if (loading) {
      return (
        <div>
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-600">Loading Leave Audit Logs...</p>
          </div>
        </div>
      );
    }

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full mb-5">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Leave
          </h1>

          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((p) => !p)}
                className="bg-white lg:h-10 md:h-9 h-8 px-3 rounded-lg text-sm border border-[#990100] text-[#990100] hover:bg-[#990100]/10 transition cursor-pointer inline-flex items-center gap-2"
                aria-haspopup="dialog"
                aria-expanded={filtersOpen}
              >
                <span className="font-medium">Filters</span>

                {activeFiltersCount ? (
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#990100] text-white text-xs">
                    {activeFiltersCount}
                  </span>
                ) : null}

                <span className="text-xs">▾</span>
              </button>

              {filtersOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setFiltersOpen(false)}
                  />

                  <div className="relative bg-white w-[92%] max-w-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-10">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-bold text-[#990100]">Filters</p>
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(false)}
                        className="text-[#990100] hover:opacity-70 text-lg leading-none"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>

                    <div className="px-4 py-4 max-h-[65vh] overflow-y-auto">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Sort</p>
                      <div className="flex flex-wrap gap-2">
                        {sortOptions.map((opt) => (
                          <ChipButton
                            key={opt.value}
                            active={draftSortOrder === opt.value}
                            onClick={() => setDraftSortOrder(opt.value)}
                          >
                            {opt.label}
                          </ChipButton>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-semibold text-[#990100] hover:underline cursor-pointer"
                      >
                        Clear all
                      </button>
                      <button
                        type="button"
                        onClick={applyDraftFilters}
                        className="bg-[#990100] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#ad3332] transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

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
          <button
            className="generate-report-button"
            onClick={() => setReportOpen(true)}
          >
            Generate Report
          </button>
        </div>

        <ReportModal
          open={reportOpen}
          title="Generate Report - Leave Logs"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
        />

        {loading && (
          <div className="py-20 text-center text-gray-600">
            Loading leave audit logs...
          </div>
        )}

        {error && (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded mt-5">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">
                    Date | Time
                  </th>
                  <th className="th-style">User</th>
                  <th className="th-style">Action</th>
                  <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">
                    Changes
                  </th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="4"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No leave logs found
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
                          {formatActorLabel(log)}
                        </td>

                        <td className="td-style-nobtn">{getActionLabel(log)}</td>

                        <td className="td-style-nobtn hidden sm:table-cell">
                          {formatLeaveChanges(log)}
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
                Showing <b>{currentLogs.length}</b> of <b>{visibleLogs.length}</b>{" "}
                log{visibleLogs.length !== 1 ? "s" : ""}
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
                    previousClassName={
                      multiPages
                        ? "cursor-pointer hover:text-gray-500 hover:underline"
                        : "text-gray-400 cursor-not-allowed pointer-events-none"
                    }
                    previousLinkClassName="page-link"
                    nextClassName={
                      multiPages
                        ? "cursor-pointer hover:text-gray-500 hover:underline"
                        : "text-gray-400 cursor-not-allowed pointer-events-none"
                    }
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

export default LeaveLogs;