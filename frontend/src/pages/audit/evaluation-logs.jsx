import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar";
import { get } from "../../services/api.js";
import ReactPaginate from "react-paginate";
import { compareDate, compareText } from "../../utils/sort.js";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";

function EvaluationLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("timestamp_newest");
  const [reportOpen, setReportOpen] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  useEffect(() => {
    setDraftSortOrder(sortOrder);
  }, [sortOrder]);

  const sortOptions = useMemo(
    () => [
      { value: "timestamp_newest", label: "Date | Time: Newest" },
      { value: "timestamp_oldest", label: "Date | Time: Oldest" },
      { value: "user_az", label: "User: A - Z" },
      { value: "user_za", label: "User: Z - A" },
      { value: "action_az", label: "Action: A - Z" },
      { value: "action_za", label: "Action: Z - A" },
      { value: "changes_az", label: "Changes: A - Z" },
      { value: "changes_za", label: "Changes: Z - A" },
    ],
    []
  );

  const activeFiltersCount = useMemo(() => {
    return draftSortOrder ? 1 : 0;
  }, [draftSortOrder]);

  const clearFilters = () => {
    setDraftSortOrder("timestamp_newest");
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

  const safeJsonParse = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === "object") return value;
    if (typeof value !== "string") return null;
    const s = value.trim();
    if (!s) return null;
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  const parseNotesSummary = (notes) => {
    const raw = String(notes || "").trim();
    if (!raw) return { score: "", remarks: "" };

    const scoreMatch = raw.match(/^\s*Score\s*:\s*(.+)\s*$/im);
    const remarksMatch = raw.match(/^\s*Remarks\s*:\s*([\s\S]+?)(?:\n\s*\n|$)/im);

    return {
      score: scoreMatch ? String(scoreMatch[1] || "").trim() : "",
      remarks: remarksMatch ? String(remarksMatch[1] || "").trim() : "",
    };
  };

  const summarizeDocs = (rawDocs) => {
    const obj = safeJsonParse(rawDocs);
    if (!obj || typeof obj !== "object") return "";

    const names = [];
    if (obj.file?.fileName) names.push(String(obj.file.fileName));
    if (obj.breakdown?.fileName) names.push(`Breakdown: ${String(obj.breakdown.fileName)}`);
    if (obj.final?.fileName) names.push(`Final: ${String(obj.final.fileName)}`);
    if (!names.length && obj.file?.name) names.push(String(obj.file.name));

    return names.filter(Boolean).join(", ");
  };

  const fmtDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  };

  const getEmployeeLabel = (log) => {
    const v = log?.new_values || log?.old_values;
    const empCode = v?.employees?.employee_id || v?.employee_code || v?.employee_id;
    const name =
      v?.employee_name ||
      (v?.employees ? `${v?.employees?.first_name || ""} ${v?.employees?.last_name || ""}`.trim() : "") ||
      "";

    const label = `${empCode || ""}${empCode && name ? " - " : ""}${name}`.trim();
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label)) {
      return "";
    }
    return label;
  };

  const formatEvalAction = (log) => {
    const v = log?.new_values || log?.old_values;
    if (log?.action_type === "GENERATE_REPORT") {
      const name = v?.report_name || v?.reportName || "";
      return name ? `Generated Report — ${name}` : "Generated Report";
    }
    const employee = getEmployeeLabel(log);
    const type = v?.evaluation_type || "";
    const date = v?.evaluation_date ? new Date(v.evaluation_date).toLocaleDateString() : "";
    const bits = [employee, type, date].filter(Boolean).join(" — ");
    if (log?.action_type === "CREATE") return bits ? `Scheduled Evaluation — ${bits}` : "Scheduled Evaluation";
    if (log?.action_type === "UPDATE") return bits ? `Updated Evaluation — ${bits}` : "Updated Evaluation";
    if (log?.action_type === "DELETE") return bits ? `Deleted Evaluation — ${bits}` : "Deleted Evaluation";
    return bits ? `${log?.action_type || "Activity"} — ${bits}` : `${log?.action_type || "Activity"}`;
  };

  const formatEvalChanges = (log) => {
    const oldV = log?.old_values;
    const newV = log?.new_values;
    const action = String(log?.action_type || "").toUpperCase();

    if (action === "GENERATE_REPORT") {
      const v = newV || oldV || {};
      const name = String(v?.report_name || v?.reportName || "").trim();
      const file = String(v?.filename || "").trim();
      const start = String(v?.start_date || "").trim();
      const end = String(v?.end_date || "").trim();
      const rows = v?.row_count;

      const bits = [
        name ? `name: ${name}` : null,
        file ? `file: ${file}` : null,
        start || end ? `range: ${start || "—"} to ${end || "—"}` : null,
        Number.isFinite(Number(rows)) ? `rows: ${Number(rows)}` : null,
      ].filter(Boolean);
      return bits.length ? bits.join(", ") : "—";
    }

    if (!oldV && !newV) return "—";

    if (action !== "UPDATE" || !oldV || !newV) {
      const v = newV || oldV || {};
      const { score, remarks } = parseNotesSummary(v?.evaluation_notes);
      const docs = summarizeDocs(v?.evaluation_document_path);
      const bits = [
        v?.evaluation_type ? `type: ${v.evaluation_type}` : null,
        v?.evaluation_date ? `date: ${fmtDate(v.evaluation_date)}` : null,
        score ? `score: ${score}` : null,
        remarks ? `remarks: ${remarks}` : null,
        docs ? `documents: ${docs}` : null,
      ].filter(Boolean);
      return bits.length ? bits.join(", ") : "—";
    }

    const changes = [];

    if (oldV?.evaluation_type !== newV?.evaluation_type) {
      changes.push(`type: ${String(oldV?.evaluation_type ?? "—")} → ${String(newV?.evaluation_type ?? "—")}`);
    }

    if (oldV?.evaluation_date !== newV?.evaluation_date) {
      changes.push(`date: ${fmtDate(oldV?.evaluation_date) || "—"} → ${fmtDate(newV?.evaluation_date) || "—"}`);
    }

    const oldNotes = parseNotesSummary(oldV?.evaluation_notes);
    const newNotes = parseNotesSummary(newV?.evaluation_notes);
    if (oldNotes.score !== newNotes.score) {
      changes.push(`score: ${oldNotes.score || "—"} → ${newNotes.score || "—"}`);
    }
    if (oldNotes.remarks !== newNotes.remarks) {
      const from = oldNotes.remarks ? oldNotes.remarks : "—";
      const to = newNotes.remarks ? newNotes.remarks : "—";
      changes.push(`remarks: ${from} → ${to}`);
    }

    const oldDocs = summarizeDocs(oldV?.evaluation_document_path);
    const newDocs = summarizeDocs(newV?.evaluation_document_path);
    if (oldDocs !== newDocs) {
      changes.push(`documents: ${oldDocs || "—"} → ${newDocs || "—"}`);
    }

    return changes.length ? changes.join(", ") : "—";
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await get("/audit-logs/table/performance_evaluations");
        const data = Array.isArray(response?.data) ? response.data : [];
        if (!cancelled) setLogs(data);
      } catch (err) {
        console.error("Failed to fetch evaluation logs:", err);
        if (!cancelled) setError("Failed to load evaluation audit logs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? logs
      : logs.filter(
          (log) =>
            String(log.users?.email || "").toLowerCase().includes(q) ||
            String(log.action_type || "").toLowerCase().includes(q) ||
            (log.old_values && JSON.stringify(log.old_values).toLowerCase().includes(q)) ||
            (log.new_values && JSON.stringify(log.new_values).toLowerCase().includes(q))
        );

    const getChangeText = (log) => {
      const oldText = log?.old_values ? JSON.stringify(log.old_values) : "";
      const newText = log?.new_values ? JSON.stringify(log.new_values) : "";
      return `${oldText} ${newText}`.trim();
    };

    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "timestamp_newest":
          return compareDate(b?.timestamp, a?.timestamp);
        case "timestamp_oldest":
          return compareDate(a?.timestamp, b?.timestamp);
        case "user_az":
          return compareText(a?.users?.email, b?.users?.email);
        case "user_za":
          return compareText(b?.users?.email, a?.users?.email);
        case "action_az":
          return compareText(a?.action_type, b?.action_type);
        case "action_za":
          return compareText(b?.action_type, a?.action_type);
        case "changes_az":
          return compareText(getChangeText(a), getChangeText(b));
        case "changes_za":
          return compareText(getChangeText(b), getChangeText(a));
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
    const rowsForExport = startDate || endDate
      ? filterRowsByDateRange(visibleLogs, (log) => log?.timestamp, startDate, endDate)
      : visibleLogs;

    const stamp = new Date().toISOString().slice(0, 10);
    const ext = fileType === "XLSX" ? "xlsx" : "csv";
    const filename = `audit-evaluation-${stamp}.${ext}`;

    const columns = [
      { header: "Date | Time", value: (log) => (log?.timestamp ? new Date(log.timestamp).toLocaleString() : "") },
      { header: "Email", value: (log) => log?.users?.email || "N/A" },
      { header: "Action", value: (log) => formatEvalAction(log) },
      { header: "Changes", value: (log) => formatEvalChanges(log) },
    ];

    if (fileType === "XLSX") {
      exportRowsToXlsx({ filename, sheetName: "Evaluation Logs", columns, rows: rowsForExport });
    } else {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    }

    setReportOpen(false);
  };

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full mb-5">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">Evaluation</h1>

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

              {filtersOpen && (
                <div className="absolute right-0 mt-2 z-50 w-[320px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <div className="flex flex-col">
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

                    <div className="px-4 py-3">
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
              )}
            </div>

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input
                type="search"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none"
              />
              <img src="/icons/red-search.png" className="absolute right-2 top-2 w-5 h-5" alt="search" />
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
          title="Generate Report - Evaluation Logs"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
        />

        {loading && <div className="py-20 text-center text-gray-600">Loading evaluation audit logs...</div>}

        {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mt-5">{error}</div>}

        {!loading && !error && (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">Date | Time</th>
                  <th className="th-style">Email</th>
                  <th className="th-style">Action</th>
                  <th className="th-style hidden sm:table-cell rounded-tr-lg rounded-br-lg">Changes</th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                      No evaluation logs found
                    </td>
                  </tr>
                ) : (
                  currentLogs.map((log) => {
                    const date = new Date(log.timestamp);

                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {date.toLocaleDateString()} | {date.toLocaleTimeString()}
                        </td>

                        <td className="td-style-nobtn font-medium">{log.users?.email || "N/A"}</td>

                        <td className="td-style-nobtn">{formatEvalAction(log)}</td>

                        <td className="td-style-nobtn hidden sm:table-cell">{formatEvalChanges(log)}</td>
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

export default EvaluationLogs;
