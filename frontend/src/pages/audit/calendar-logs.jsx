import React, { useEffect, useMemo, useState } from "react";
import ReactPaginate from "react-paginate";
import { get, post } from "../../services/api.js";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import { exportReportToPdf } from "../../utils/pdf.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";
import { compareDate } from "../../utils/sort.js";

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "2-digit" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${date} | ${time}`;
};

const getEventTitle = (log) => {
  const nv = log?.new_values;
  const ov = log?.old_values;
  return nv?.title || ov?.title || "—";
};

const getEventType = (log) => {
  const nv = log?.new_values;
  const ov = log?.old_values;
  const raw = nv?.event_type || ov?.event_type || "";
  if (raw === "company_event") return "Company Event";
  if (raw === "holiday") return "Holiday";
  if (raw === "meeting") return "Meeting";
  return raw || "—";
};

const formatActionLabel = (actionType) => {
  if (actionType === "CREATE") return "Created Event";
  if (actionType === "UPDATE") return "Updated Event";
  if (actionType === "DELETE") return "Deleted Event";
  return actionType || "—";
};

const formatCalendarChanges = (log) => {
  const action = String(log?.action_type || "").toUpperCase();
  const nv = log?.new_values || {};
  const ov = log?.old_values || {};

  if (action === "CREATE") {
    const parts = [`Title: ${nv.title || "—"}`];
    if (nv.event_type) parts.push(`Type: ${getEventType(log)}`);
    if (nv.event_date) parts.push(`Date: ${nv.event_date}`);
    if (nv.end_date) parts.push(`End: ${nv.end_date}`);
    if (nv.description) parts.push(`Description: ${nv.description}`);
    return parts.join(" | ");
  }

  if (action === "DELETE") {
    const parts = [`Title: ${ov.title || "—"}`];
    if (ov.event_type) parts.push(`Type: ${getEventType({ new_values: null, old_values: ov })}`);
    if (ov.event_date) parts.push(`Date: ${ov.event_date}`);
    return parts.join(" | ");
  }

  if (action === "UPDATE") {
    const changes = [];
    const fields = [
      { key: "title", label: "Title" },
      { key: "event_type", label: "Type" },
      { key: "event_date", label: "Date" },
      { key: "end_date", label: "End Date" },
      { key: "description", label: "Description" },
    ];
    for (const { key, label } of fields) {
      if (ov[key] !== undefined && nv[key] !== undefined && String(ov[key]) !== String(nv[key])) {
        changes.push(`${label}: "${ov[key]}" → "${nv[key]}"`);
      } else if (ov[key] === undefined && nv[key] !== undefined && nv[key] !== null && nv[key] !== "") {
        changes.push(`${label} set to "${nv[key]}"`);
      }
    }
    return changes.length ? changes.join(" | ") : "No changes detected";
  }

  return "—";
};

function CalendarLogs() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const fetchCalendarLogs = async () => {
    setLoading(true);
    try {
      const res = await get("/audit-logs/table/company_events");
      const data = Array.isArray(res?.data) ? res.data : [];
      setRows(data);
      return data;
    } catch (e) {
      console.error("Failed to load calendar logs:", e);
      setRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendarLogs();
  }, []);

  const filteredRows = useMemo(() => {
    if (!searchTerm.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((log) =>
      [
        log?.users?.email,
        log?.action_type,
        log?.new_values?.title,
        log?.old_values?.title,
        log?.new_values?.event_type,
      ]
        .map((v) => String(v || "").toLowerCase())
        .some((s) => s.includes(q))
    );
  }, [rows, searchTerm]);

  const visibleLogs = useMemo(
    () => [...filteredRows].sort((a, b) => compareDate(b?.timestamp, a?.timestamp)),
    [filteredRows]
  );

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentLogs = visibleLogs.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(visibleLogs.length / itemsPerPage);
  const multiPages = pageCount > 1;
  const currentPage = pageCount ? Math.floor(itemOffset / itemsPerPage) + 1 : 0;

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, rows.length]);

  const handlePageClick = (event) => {
    setItemOffset(event.selected * itemsPerPage);
  };

  const handleGenerateReport = async ({ startDate, endDate, fileType } = {}) => {
    setReportLoading(true);
    try {
      const freshData = await fetchCalendarLogs();

      const rowsForExport =
        startDate || endDate
          ? filterRowsByDateRange(freshData, (log) => log?.timestamp, startDate, endDate)
          : freshData;

      const stamp = new Date().toISOString().slice(0, 10);
      const ext = fileType === "PDF" ? "pdf" : fileType === "XLSX" ? "xlsx" : "csv";
      const filename = `audit-calendar-${stamp}.${ext}`;

      post("/audit-logs/reports", {
        report_name: "Audit Calendar Report",
        filename,
        start_date: startDate || null,
        end_date: endDate || null,
        row_count: rowsForExport.length,
        source: "audit-calendar",
      }).catch(() => {});

      const columns = [
        { header: "Date | Time", value: (log) => formatDateTime(log?.timestamp) },
        { header: "User", value: (log) => log?.users?.email || "N/A" },
        { header: "Event Title", value: (log) => getEventTitle(log) },
        { header: "Event Type", value: (log) => getEventType(log) },
        { header: "Action", value: (log) => formatActionLabel(log?.action_type) },
        { header: "Changes", value: (log) => formatCalendarChanges(log) },
      ];

      if (fileType === "PDF") {
        await exportReportToPdf({
          filename,
          title: "Audit Log - Calendar Events",
          summaryLines: [
            startDate || endDate
              ? `Range: ${startDate || "…"} to ${endDate || "…"}`
              : "Range: All time",
            `Rows: ${rowsForExport.length}`,
          ],
          columns,
          rows: rowsForExport,
        });
      } else if (fileType === "XLSX") {
        await exportRowsToXlsx({ filename, sheetName: "Calendar Logs", columns, rows: rowsForExport });
      } else {
        exportRowsToCsv({ filename, columns, rows: rowsForExport });
      }

      setReportOpen(false);
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setReportLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Calendar Logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="">
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full mb-5">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Calendar
          </h1>

          <div className="flex justify-end items-center gap-3">
            <button type="button" className="generate-report-button" onClick={() => setReportOpen(true)} >
              Export Data
            </button>

            <div className="relative text-gray-600 border border-[#990100] rounded-lg">
              <input type="search" name="search" placeholder="Search" className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              <img src="/icons/red-search.png" className="absolute right-2 top-2 w-5 h-5" alt="search" />
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <ReportModal open={reportOpen} title="Export Data - Calendar Logs" onClose={() => setReportOpen(false)} onGenerate={handleGenerateReport} enableDateRange={true} dateRangeHint="filters by Log Date" fileTypes={["XLSX", "CSV", "PDF"]} loading={reportLoading} />

        <div className="div-table">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">Date | Time</th>
                <th className="th-style">User</th>
                <th className="th-style">Event Title</th>
                <th className="th-style">Event Type</th>
                <th className="th-style">Action</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">Changes</th>
              </tr>
            </thead>
            <tbody className="tbody-style">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : currentLogs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No calendar logs found
                  </td>
                </tr>
              ) : (
                currentLogs.map((log) => (
                  <tr key={log.id} className="tr-style">
                    <td className="td-style-nobtn">{formatDateTime(log?.timestamp)}</td>
                    <td className="td-style-nobtn font-medium">{log?.users?.email || "N/A"}</td>
                    <td className="td-style-nobtn">{getEventTitle(log)}</td>
                    <td className="td-style-nobtn">{getEventType(log)}</td>
                    <td className="td-style-nobtn">{formatActionLabel(log?.action_type)}</td>
                    <td className="td-style-nobtn">{formatCalendarChanges(log)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          <br />

          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{currentLogs.length}</b> of <b>{visibleLogs.length}</b>{" "}
              log{visibleLogs.length !== 1 ? "s" : ""}
              {pageCount ? (
                <>
                  {" "}| Page <b>{currentPage}</b> of <b>{pageCount}</b>
                </>
              ) : null}
            </p>

            {pageCount > 0 && (
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
                breakLinkClassName="page-link"
                containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                activeClassName="underline font-medium"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarLogs;
