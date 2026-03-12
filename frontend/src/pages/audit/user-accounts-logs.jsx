import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar";
import { get, post } from "../../services/api.js";
import ReactPaginate from "react-paginate";
import { compareDate, compareText } from "../../utils/sort.js";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import { exportReportToPdf } from "../../utils/pdf.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} | ${time}`;
};

function UserAccountsLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("timestamp_newest");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

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
      { value: "user_az", label: "User: A - Z" },
      { value: "user_za", label: "User: Z - A" },
      { value: "target_az", label: "Target: A - Z" },
      { value: "target_za", label: "Target: Z - A" },
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

  const getTargetUser = (log) => {
    const actionType = String(log?.action_type || "").toUpperCase();
    if (actionType === "PASSWORD_RESET_REQUEST") {
      return (
        log?.new_values?.email ||
        log?.old_values?.email ||
        log?.record_id ||
        "N/A"
      );
    }

    const passwordVal = log?.new_values?.password;
    if (passwordVal === "reset_via_email") {
      return log?.users?.email || "N/A";
    }

    const { old_values, new_values } = log;
    const values = new_values || old_values;
    if (!values) return "N/A";
    return values.email || "N/A";
  };

  const formatActionLabel = (actionType, newValues) => {
    const normalized = String(actionType || "").toUpperCase();
    if (normalized === "PASSWORD_RESET_REQUEST") return "Password Reset Request";
    if (normalized === "UPDATE") {
      const passwordVal = newValues?.password;
      if (passwordVal === "reset_via_email") return "Password Reset";
      if (passwordVal === "reset_by_admin" || passwordVal === "updated") return "Password Reset";
    }
    return actionType || "";
  };

  const formatChanges = (newValues, actionType) => {
    const normalized = String(actionType || "").toUpperCase();
    if (normalized === "PASSWORD_RESET_REQUEST") {
      return "Requested password reset (Forgot Password)";
    }

    const passwordVal = newValues?.password;
    if (passwordVal === "reset_via_email") return "Password reset via email link";
    if (passwordVal === "reset_by_admin") return "Password reset by admin";
    if (passwordVal === "updated") return "Password reset by admin";

    if (!newValues || ["LOGIN", "LOGOUT", "DELETE"].includes(actionType)) {
      return "—";
    }

    return Object.entries(newValues)
      .map(([key, value]) => `${key}: ${value}`)
      .join(", ");
  };

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await get("/audit-logs/table/users");
      if (response.success) {
        setLogs(response.data);
        return response.data;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setError(err.message || "Failed to load logs");
      return [];
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

    const email = String(log.users?.email || "").toLowerCase();
    const target = String(getTargetUser(log) || "").toLowerCase();
    const action = String(log.action_type || "").toLowerCase();
    const changes = String(formatChanges(log.new_values, log.action_type) || "").toLowerCase();

    return email.includes(q) || target.includes(q) || action.includes(q) || changes.includes(q);
  });

  const visibleLogs = [...filteredLogs].sort((a, b) => {
    switch (sortOrder) {
      case "timestamp_newest":
        return compareDate(b?.timestamp, a?.timestamp);
      case "timestamp_oldest":
        return compareDate(a?.timestamp, b?.timestamp);
      case "user_az":
        return compareText(a?.users?.email, b?.users?.email);
      case "user_za":
        return compareText(b?.users?.email, a?.users?.email);
      case "target_az":
        return compareText(getTargetUser(a), getTargetUser(b));
      case "target_za":
        return compareText(getTargetUser(b), getTargetUser(a));
      case "action_az":
        return compareText(a?.action_type, b?.action_type);
      case "action_za":
        return compareText(b?.action_type, a?.action_type);
      case "changes_az":
        return compareText(
          formatChanges(a?.new_values, a?.action_type),
          formatChanges(b?.new_values, b?.action_type)
        );
      case "changes_za":
        return compareText(
          formatChanges(b?.new_values, b?.action_type),
          formatChanges(a?.new_values, a?.action_type)
        );
      default:
        return compareDate(b?.timestamp, a?.timestamp);
    }
  });

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentLogs = visibleLogs.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(visibleLogs.length / itemsPerPage);
  const multiPages = pageCount > 1;
  const currentPage = pageCount ? Math.floor(itemOffset / itemsPerPage) + 1 : 0;

  const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
  };

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, logs.length]);

  const handleGenerateReport = async ({ startDate, endDate, fileType } = {}) => {
    setReportLoading(true);
    try {
      const freshData = await fetchAuditLogs();

      const rowsForExport =
        startDate || endDate
          ? filterRowsByDateRange(freshData, (log) => log?.timestamp, startDate, endDate)
          : freshData;

      const columns = [
        {
          header: "Date | Time",
          value: (log) => formatDateTime(log?.timestamp),
        },
        { header: "User", value: (log) => log?.users?.email || "N/A" },
        { header: "User Account", value: (log) => getTargetUser(log) },
        { header: "Action", value: (log) => formatActionLabel(log?.action_type, log?.new_values) },
        { header: "Changes", value: (log) => formatChanges(log?.new_values, log?.action_type) },
      ];

      const stamp = new Date().toISOString().slice(0, 10);
      const ext = fileType === "PDF" ? "pdf" : fileType === "CSV" ? "csv" : "xlsx";
      const filename = `audit-user-accounts-${stamp}.${ext}`;

      post("/audit-logs/reports", {
        report_name: "Audit User Accounts Report",
        filename,
        start_date: startDate || null,
        end_date: endDate || null,
        row_count: rowsForExport.length,
        source: "audit-user-accounts",
      }).catch(() => {});

      if (fileType === "PDF") {
        await exportReportToPdf({
          filename,
          title: "Audit Log - User Accounts",
          summaryLines: [
            startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
            `Rows: ${rowsForExport.length}`,
          ],
          columns,
          rows: rowsForExport,
        });
      } else if (fileType === "CSV") {
        exportRowsToCsv({ filename, columns, rows: rowsForExport });
      } else {
        exportRowsToXlsx({ filename, sheetName: "User Accounts Logs", columns, rows: rowsForExport });
      }

      setReportOpen(false);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading User Accounts Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            User Accounts
          </h1>

          <div className="flex items-center jusitfy-end gap-3">
            <button type="button" className="generate-report-button" onClick={() => setReportOpen(true)} >
            Export Data
            </button>

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

        <ReportModal
          open={reportOpen}
          title="Export Data - User Account Logs"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
          dateRangeHint="filters by Log Date"
          fileTypes={["XLSX", "CSV", "PDF"]}
          loading={reportLoading}
        />

        {loading && (
          <div className="flex justify-center py-20">
            <p className="text-gray-600">Loading logs...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-5">
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
                  <th className="th-style">User Account</th>
                  <th className="th-style">Action</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">
                    Changes
                  </th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                      No logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => {
                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {formatDateTime(log?.timestamp)}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {log.users?.email || "N/A"}
                        </td>

                        <td className="td-style-nobtn font-medium">
                          {getTargetUser(log)}
                        </td>

                        <td className="td-style-nobtn">
                          {formatActionLabel(log.action_type, log.new_values)}
                        </td>

                        <td className="td-style-nobtn">
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
                Showing <b>{currentLogs.length}</b> of <b>{visibleLogs.length}</b> log
                {visibleLogs.length !== 1 ? "s" : ""}
                {pageCount ? (
                <>
                  {" "}
                  | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                </>
              ) : null}
              </p>

              {pageCount > 1 && (
                <div>
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

export default UserAccountsLogs;