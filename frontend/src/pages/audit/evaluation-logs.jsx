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

function EvaluationLogs() {
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

  const isTemplateLog = (log) => String(log?.table_name || '').toLowerCase() === 'evaluation_templates';

  const formatTemplateAction = (log) => {
    const v = log?.new_values || log?.old_values || {};
    const action = String(v?.action || '').toLowerCase();
    const name = v?.name || v?.template_name || '';

    if (action === 'add_section') return `Added Section — ${v?.section_title || ''}`;
    if (action === 'update_section') return `Updated Section — ${v?.title || v?.section_id || ''}`;
    if (action === 'delete_section') return `Deleted Section — ${v?.section_title || ''}`;
    if (action === 'add_item') return `Added Item — ${v?.question_text || ''}`;
    if (action === 'update_item') return `Updated Item`;
    if (action === 'delete_item') return `Deleted Item`;
    if (action === 'assign_to_position') return `Assigned Template — ${v?.template_name || ''} → ${v?.position_title || ''}`;
    if (action === 'unassign_from_position') return `Unassigned Template — ${v?.template_name || ''} from ${v?.position_title || ''}`;

    if (log?.action_type === 'CREATE') return name ? `Created Template — ${name}` : 'Created Template';
    if (log?.action_type === 'UPDATE') {
      if (v?.is_active === false) return name ? `Deactivated Template — ${name}` : 'Deactivated Template';
      if (v?.is_active === true && log?.old_values?.is_active === false) return name ? `Reactivated Template — ${name}` : 'Reactivated Template';
      return name ? `Updated Template — ${name}` : 'Updated Template';
    }
    if (log?.action_type === 'DELETE') return name ? `Deleted Template — ${name}` : 'Deleted Template';
    return `Template ${log?.action_type || 'Activity'}`;
  };

  const formatTemplateChanges = (log) => {
    const oldV = log?.old_values;
    const newV = log?.new_values;
    const v = newV || oldV || {};
    const action = String(v?.action || '').toLowerCase();

    if (action === 'add_section') {
      return [`section: ${v?.section_title || '—'}`, v?.items_count ? `items: ${v.items_count}` : null].filter(Boolean).join(', ');
    }
    if (action === 'update_section') {
      return [v?.title ? `title: ${v.title}` : null, v?.description ? `description: ${v.description}` : null].filter(Boolean).join(', ') || '—';
    }
    if (action === 'delete_section') return `removed section: ${v?.section_title || '—'}`;
    if (action === 'add_item') return `question: ${v?.question_text || '—'}`;
    if (action === 'update_item') return v?.question_text ? `question: ${v.question_text}` : '—';
    if (action === 'delete_item') return 'removed item';
    if (action === 'assign_to_position') return `${v?.position_title || '—'} → ${v?.template_name || '—'}`;
    if (action === 'unassign_from_position') return `removed: ${v?.position_title || '—'} from ${v?.template_name || '—'}`;

    if (v?.is_active === false) return `deactivated: ${v?.template_name || '—'}`;
    if (v?.is_active === true && oldV?.is_active === false) return `reactivated: ${v?.template_name || '—'}`;

    // For template metadata updates (UPDATE action with both old and new values)
    if (log?.action_type === 'UPDATE' && oldV && newV && !action) {
      const changes = [];

      if (oldV?.name !== newV?.name) {
        changes.push(`name: ${oldV?.name || '—'} → ${newV?.name || '—'}`);
      }

      if (oldV?.description !== newV?.description) {
        changes.push(`description: ${oldV?.description || '—'} → ${newV?.description || '—'}`);
      }

      return changes.length ? changes.join(', ') : '—';
    }

    // For CREATE or when only new values exist
    const bits = [
      v?.name ? `name: ${v.name}` : null,
      v?.description ? `description: ${v.description}` : null,
      v?.sections_count ? `sections: ${v.sections_count}` : null,
    ].filter(Boolean);
    return bits.length ? bits.join(', ') : '—';
  };

  const formatEvalAction = (log) => {
    if (isTemplateLog(log)) return formatTemplateAction(log);

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
    if (isTemplateLog(log)) return formatTemplateChanges(log);

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

  const fetchEvaluationLogs = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await get("/audit-logs/table/evaluations");
      const data = Array.isArray(response?.data) ? response.data : [];
      setLogs(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch evaluation logs:", err);
      setError("Failed to load evaluation logs");
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluationLogs();
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
      const freshData = await fetchEvaluationLogs();

      const rowsForExport = startDate || endDate
        ? filterRowsByDateRange(freshData, (log) => log?.timestamp, startDate, endDate)
        : freshData;

      const stamp = new Date().toISOString().slice(0, 10);
      const ext = fileType === "PDF" ? "pdf" : fileType === "XLSX" ? "xlsx" : "csv";
      const filename = `audit-evaluation-${stamp}.${ext}`;

      post("/audit-logs/reports", {
        report_name: "Audit Evaluation Report",
        filename,
        start_date: startDate || null,
        end_date: endDate || null,
        row_count: rowsForExport.length,
        source: "audit-evaluation",
      }).catch(() => {});

      const columns = [
        { header: "Date | Time", value: (log) => formatDateTime(log?.timestamp) },
        { header: "User", value: (log) => log?.users?.email || "N/A" },
        { header: "Action", value: (log) => formatEvalAction(log) },
        { header: "Changes", value: (log) => formatEvalChanges(log) },
      ];

      if (fileType === "PDF") {
        await exportReportToPdf({
          filename,
          title: "Audit Log - Evaluations",
          summaryLines: [
            startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
            `Rows: ${rowsForExport.length}`,
          ],
          columns,
          rows: rowsForExport,
        });
      } else if (fileType === "XLSX") {
        exportRowsToXlsx({ filename, sheetName: "Evaluation Logs", columns, rows: rowsForExport });
      } else {
        exportRowsToCsv({ filename, columns, rows: rowsForExport });
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
          <p className="text-gray-600">Loading Evaluation Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full mb-5">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">Evaluation</h1>

          <div className="flex items-center justify-end gap-3">
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
              <img src="/icons/red-search.png" className="absolute right-2 top-2 w-5 h-5" alt="search" />
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <ReportModal open={reportOpen} title="Export Data - Evaluation Logs" onClose={() => setReportOpen(false)} onGenerate={handleGenerateReport} enableDateRange={true} dateRangeHint="filters by Log Date" fileTypes={["XLSX", "CSV", "PDF"]} loading={reportLoading} />

        {loading && <div className="py-20 text-center text-gray-600">Loading evaluation logs...</div>}

        {error && <div className="bg-red-100 text-red-700 px-4 py-3 rounded mt-5">{error}</div>}

        {!loading && !error && (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">Date | Time</th>
                  <th className="th-style">Email</th>
                  <th className="th-style">Action</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">Changes</th>
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
                    return (
                      <tr key={log.id} className="tr-style">
                        <td className="td-style-nobtn">
                          {formatDateTime(log?.timestamp)}
                        </td>

                        <td className="td-style-nobtn font-medium">{log.users?.email || "N/A"}</td>

                        <td className="td-style-nobtn">{formatEvalAction(log)}</td>

                        <td className="td-style-nobtn">{formatEvalChanges(log)}</td>
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
