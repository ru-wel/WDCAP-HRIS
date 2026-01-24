import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar";
import { get } from "../../services/api.js";
import ReactPaginate from "react-paginate";
import { compareDate, compareText } from "../../utils/sort";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";

const formatReportAction = (log) => {
  const action = String(log?.action_type || "").toUpperCase();
  if (action === "GENERATE_REPORT") return "Generated Report";
  return log?.action_type || "—";
};

const getReportName = (log) => {
  const v = log?.new_values;
  return v?.report_name || v?.reportName || v?.report || "N/A";
};

const formatDateTimePht = (timestamp) => {
  if (!timestamp) return { date: "", time: "" };
  const d = new Date(timestamp);
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };

  const date = d.toLocaleDateString("en-US", {
    timeZone: "Asia/Manila",
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  });

  const time = `${d.toLocaleTimeString("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })} PHT`;

  return { date, time };
};

function ReportsLogs() {
  const [logs, setLogs] = useState([]);
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

  const fetchReportLogs = async () => {
    try {
      setLoading(true);
      const response = await get("/audit-logs/table/reports");
      if (response?.success) setLogs(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Failed to fetch report logs:", err);
      setError("Failed to load report logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportLogs();
  }, []);

  const visibleLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? logs
      : logs.filter((log) => {
          const email = String(log?.users?.email || "").toLowerCase();
          const action = String(formatReportAction(log) || "").toLowerCase();
          const changes = String(getReportName(log) || "").toLowerCase();
          const timestamp = String(log?.timestamp || "").toLowerCase();
          return (
            email.includes(q) ||
            action.includes(q) ||
            changes.includes(q) ||
            timestamp.includes(q)
          );
        });

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "timestamp_oldest":
          return compareDate(a?.timestamp, b?.timestamp);
        case "email_az":
          return compareText(a?.users?.email, b?.users?.email);
        case "email_za":
          return compareText(b?.users?.email, a?.users?.email);
        case "action_az":
          return compareText(formatReportAction(a), formatReportAction(b));
        case "action_za":
          return compareText(formatReportAction(b), formatReportAction(a));
        case "changes_az":
          return compareText(getReportName(a), getReportName(b));
        case "changes_za":
          return compareText(getReportName(b), getReportName(a));
        case "timestamp_newest":
        default:
          return compareDate(b?.timestamp, a?.timestamp);
      }
    });

    return sorted;
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
        ? filterRowsByDateRange(visibleLogs, (log) => log?.timestamp, startDate, endDate)
        : visibleLogs;

    const columns = [
      {
        header: "Date | Time",
        value: (log) => (log?.timestamp ? new Date(log.timestamp).toLocaleString() : ""),
      },
      { header: "Email", value: (log) => log?.users?.email || "N/A" },
      { header: "Action", value: (log) => formatReportAction(log) },
      { header: "Changes", value: (log) => getReportName(log) },
    ];

    const stamp = new Date().toISOString().slice(0, 10);
    if (fileType === "CSV") {
      exportRowsToCsv({ filename: `audit-reports-${stamp}.csv`, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({
        filename: `audit-reports-${stamp}.xlsx`,
        sheetName: "Reports Logs",
        columns,
        rows: rowsForExport,
      });
    }

    setReportOpen(false);
  };

  if (loading) {
      return (
        <div>
          <div className="flex items-center justify-center min-h-screen">
            <p className="text-gray-600">Loading Reports Audit Logs...</p>
          </div>
        </div>
      );
    }

  return (
    <div className="">
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <div className="">
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
              Reports
            </h1>
          </div>

          <div className="flex items-center justify-end md:gap-4 gap-3">
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

            <div className="relative text-gray-600 border border-[#990100] rounded-lg ">
              <input
                type="search"
                name="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
              />
              <button
                type="submit"
                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
              >
                <img
                  src="/icons/red-search.png"
                  className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                  alt="search"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6 " />

        <div className="flex justify-end mt-5">
          <button className="generate-report-button" onClick={() => setReportOpen(true)}>
            Generate Report
          </button>
        </div>

        <ReportModal
          open={reportOpen}
          title="Generate Report - Reports Logs"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
        />

        <div className="div-table">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">Date | Time</th>
                <th className="th-style">Email</th>
                <th className="th-style">Action</th>
                <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">
                  Changes
                </th>
              </tr>
            </thead>
            <tbody className="tbody-style">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    Loading report logs...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-red-600">
                    {error}
                  </td>
                </tr>
              ) : visibleLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                    No report logs found
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => {
                  const dt = formatDateTimePht(log?.timestamp);
                  return (
                    <tr
                      key={log?.id || `${log?.timestamp}-${log?.user_id}`}
                      className="tr-style"
                    >
                      <td className="td-style-nobtn">
                        {dt.date} | {dt.time}
                      </td>
                      <td className="td-style-nobtn font-medium">
                        {log?.users?.email || "N/A"}
                      </td>
                      <td className="td-style-nobtn">{formatReportAction(log)}</td>
                      <td className="td-style-nobtn hidden sm:table-cell">
                        {getReportName(log)}
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
            </p>

            {pageCount > 1 && (
              <div className=" ">
                <ReactPaginate
                  breakLabel="..."
                  nextLabel=">"
                  onPageChange={handlePageClick}
                  pageRangeDisplayed={2}
                  pageCount={pageCount}
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
                  forcePage={Math.floor(itemOffset / itemsPerPage)}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsLogs;
