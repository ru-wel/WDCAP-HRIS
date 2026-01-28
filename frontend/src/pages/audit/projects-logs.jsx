import React, { useEffect, useMemo, useState } from "react";
import Navbar from "../../components/navbar";
import { get } from "../../services/api.js";
import ReactPaginate from "react-paginate";
import { compareDate, compareText } from "../../utils/sort.js";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";

function ProjectsLogs() {
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
      { value: "user_az", label: "User: A - Z" },
      { value: "user_za", label: "User: Z - A" },
      { value: "project_az", label: "Project: A - Z" },
      { value: "project_za", label: "Project: Z - A" },
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

  const getTargetProject = (log) => {
    const { old_values, new_values } = log;
    const values = new_values || old_values;
    if (!values) return "N/A";
    return values.project_name || "N/A";
  };

  const formatProjectChanges = (log) => {
    const { action_type, old_values, new_values } = log;
    const skipFields = ["id", "created_at", "updated_at"];

    const humanizeFieldName = (fieldName) => {
      const specialCases = {
        project_name: "Project Name",
        site_location: "Site Location",
        start_date: "Start Date",
        end_date: "End Date",
      };

      if (specialCases[fieldName]) return specialCases[fieldName];

      return fieldName
        .replace(/_/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());
    };

    if (action_type === "CREATE" && new_values) {
      return `Created: ${new_values.project_name} - ${
        new_values.site_location || "N/A"
      }`;
    }

    if (action_type === "UPDATE" && old_values && new_values) {
      const changes = [];

      for (const key in new_values) {
        if (skipFields.includes(key)) continue;

        const oldVal = old_values[key];
        const newVal = new_values[key];

        if (oldVal !== newVal) {
          changes.push(
            `${humanizeFieldName(key)}: ${oldVal || "N/A"} → ${newVal || "N/A"}`
          );
        }
      }

      return changes.length > 0 ? changes.join(", ") : "No significant changes";
    }

    if (action_type === "DELETE" && old_values) {
      return `Deleted: ${old_values.project_name}`;
    }

    return "—";
  };

  const fetchProjectLogs = async () => {
    try {
      setLoading(true);
      const response = await get("/audit-logs/table/projects");
      if (response.success) {
        setLogs(response.data);
      }
    } catch (err) {
      console.error("Failed to fetch project logs:", err);
      setError("Failed to load project audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectLogs();
  }, []);

  const visibleLogs = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? logs
      : logs.filter((log) => {
          const email = String(log.users?.email || "").toLowerCase();
          const action = String(log.action_type || "").toLowerCase();
          const project = String(getTargetProject(log) || "").toLowerCase();
          const changes = String(formatProjectChanges(log) || "").toLowerCase();
          return (
            email.includes(q) ||
            action.includes(q) ||
            project.includes(q) ||
            changes.includes(q)
          );
        });

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
        case "project_az":
          return compareText(getTargetProject(a), getTargetProject(b));
        case "project_za":
          return compareText(getTargetProject(b), getTargetProject(a));
        case "action_az":
          return compareText(a?.action_type, b?.action_type);
        case "action_za":
          return compareText(b?.action_type, a?.action_type);
        case "changes_az":
          return compareText(formatProjectChanges(a), formatProjectChanges(b));
        case "changes_za":
          return compareText(formatProjectChanges(b), formatProjectChanges(a));
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
    const filename = `audit-projects-${stamp}.${ext}`;

    const columns = [
      {
        header: "Date | Time",
        value: (log) =>
          log?.timestamp ? new Date(log.timestamp).toLocaleString() : "",
      },
      { header: "User", value: (log) => log?.users?.email || "N/A" },
      { header: "Project", value: (log) => getTargetProject(log) },
      { header: "Action", value: (log) => log?.action_type || "" },
      { header: "Changes", value: (log) => formatProjectChanges(log) },
    ];

    if (fileType === "XLSX") {
      exportRowsToXlsx({
        filename,
        sheetName: "Projects Logs",
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
            <p className="text-gray-600">Loading Projects Audit Logs...</p>
          </div>
        </div>
      );
    }

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Projects
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
          title="Generate Report - Project Logs"
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
          enableDateRange={true}
        />

        {loading && (
          <div className="py-20 text-center text-gray-600">
            Loading project audit logs...
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
                  <th className="th-style">Project</th>
                  <th className="th-style">Action</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">
                    Changes
                  </th>
                </tr>
              </thead>

              <tbody className="tbody-style">
                {visibleLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-8 text-center text-gray-500"
                    >
                      No project logs found
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
                          {getTargetProject(log)}
                        </td>

                        <td className="td-style-nobtn">{log.action_type}</td>

                        <td className="td-style-nobtn">
                          {formatProjectChanges(log)}
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

export default ProjectsLogs;