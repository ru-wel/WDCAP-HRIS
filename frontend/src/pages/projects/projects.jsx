import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/navbar";
import { get, post } from "../../services/api.js";
import { PROJECT_STATUSES } from "../../constants/config.js";
import ReactPaginate from "react-paginate";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { compareDate, compareText } from "../../utils/sort";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";
import { exportReportToPdf } from "../../utils/pdf.js";

function ViewProjectCard({ project, index, onClick, disabled }) {
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "2-digit",
    });
  };

  const dateRange = `${formatDate(project.start_date)} to ${formatDate(project.end_date)}`;

  const statusStyle = (status) => {
    switch (status) {
      case PROJECT_STATUSES.ACTIVE:
        return "bg-[#C8C8FF] text-[#0000FF]";
      case PROJECT_STATUSES.COMPLETED:
        return "text-[#198C19] bg-[#198C19]/25";
      case PROJECT_STATUSES.ON_HOLD:
        return "bg-[#FFA500]/25 text-[#FFA500]";
      case PROJECT_STATUSES.CANCELLED:
        return "bg-[#CC0000]/25 text-[#CC0000]";
      default:
        return "bg-gray-200 text-gray-600";
    }
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      className={[
        "text-left w-full transition duration-300 ease-in-out",
        disabled
          ? "cursor-default opacity-70"
          : "hover:scale-105 cursor-pointer",
      ].join(" ")}
    >
      <div className="bg-[#FFFFFF] border border-gray-300 rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
        <div>
          <h2 className="text-xl font-bold text-[#990100] mb-3">
            {project.project_name || `Project #${index + 1}`}
          </h2>

          <div className="flex items-center text-base mb-2 gap-3">
            <img src="icons/red-location.png" alt="location" className="w-6 h-6" />
            <span>{project.site_location}</span>
          </div>

          <div className="flex items-center text-base mb-2 gap-3">
            <img src="icons/red-leave.png" alt="calendar" className="w-6 h-6" />
            <span>{dateRange}</span>
          </div>

          <div className="flex items-center text-base gap-3">
            <img src="icons/red-employees.png" alt="employees" className="w-6 h-6" />
            <span>
              <span className="font-semibold">{project.employee_count ?? 0}</span>{" "}
              {project.employee_count === 1 ? "Employee" : "Employees"}
            </span>
          </div>

          
        </div>

        <div className="mt-4">
          <span
            className={`inline-block px-6 py-2 rounded-xl text-sm font-semibold ${statusStyle(
              project.status
            )}`}
          >
            {project.status}
          </span>
        </div>
      </div>
    </button>
  );
}


function NewProjectCard({ values, onChange, onSave, loading }) {
  const handleChange = (field, value) => {
    onChange({ ...values, [field]: value });
  };

  return (
    <div className="bg-[#FFFFFF] border border-gray-300 rounded-lg shadow-lg px-6 py-5 min-h-[170px] flex flex-col justify-between">
      <h2 className="text-xl font-bold text-[#c4bcbc] mb-2">{`New Project`}</h2>

      <div className="mb-3">
        <label className="block text-sm font-semibold mb-1 text-[#483D3D] uppercase">Project Name</label>
        <input
          type="text"
          value={values.project_name || ""}
          onChange={(e) => handleChange("project_name", e.target.value)}
          className="w-full border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white"
          placeholder="Enter project name"
          disabled={loading}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img src="icons/red-location.png" alt="location" className="w-4 h-4 mt-[2px]" />
        <input
          type="text"
          value={values.site_location || ""}
          onChange={(e) => handleChange("site_location", e.target.value)}
          className="flex-1 border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white"
          placeholder="Location"
          disabled={loading}
        />
      </div>

      <div className="mb-3 flex items-center gap-2">
        <img src="icons/red-leave.png" alt="calendar" className="w-4 h-4 mt-[2px]" />
        <input
          type="date"
          value={values.start_date || ""}
          onChange={(e) => handleChange("start_date", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-[40%]"
          placeholder="Start Date"
          min={values.start_date}
          disabled={loading}
        />
        <span className="text-sm">to</span>
        <input
          type="date"
          value={values.end_date || ""}
          onChange={(e) => handleChange("end_date", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-[40%]"
          placeholder="End Date"
          min={values.start_date}
          disabled={loading}
        />
      </div>

      <div className="mb-1 flex items-center gap-2">
        <span className="w-4" />
        <select
          value={values.status || PROJECT_STATUSES.ACTIVE}
          onChange={(e) => handleChange("status", e.target.value)}
          className="border border-gray-400 rounded-sm px-2 py-1 text-sm bg-white w-40"
          disabled={loading}
        >
          <option value={PROJECT_STATUSES.ACTIVE}>{PROJECT_STATUSES.ACTIVE}</option>
          <option value={PROJECT_STATUSES.COMPLETED}>{PROJECT_STATUSES.COMPLETED}</option>
          <option value={PROJECT_STATUSES.ON_HOLD}>{PROJECT_STATUSES.ON_HOLD}</option>
          <option value={PROJECT_STATUSES.CANCELLED}>{PROJECT_STATUSES.CANCELLED}</option>
        </select>
      </div>

      <div className="flex justify-center mt-3">
        <button
          onClick={onSave}
          disabled={loading || !values.project_name || !values.site_location || !values.start_date || !values.end_date || !values.status }
          className="bg-[#16A34A] hover:bg-[#15803D] disabled:opacity-50 green-button py-1.5 disabled:pointer-events-none"
        >
          {loading ? "Creating ..." : "Create Project"}
        </button>
      </div>
    </div>
  );
}

function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState([]);
  const [mode, setMode] = useState("view");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("project_name_az");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const defaultSort = "project_name_az";
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const sortOptions = useMemo(
    () => [
      { value: "project_name_az", label: "Project Name: A - Z" },
      { value: "project_name_za", label: "Project Name: Z - A" },
      { value: "site_location_az", label: "Site Location: A - Z" },
      { value: "site_location_za", label: "Site Location: Z - A" },
      { value: "status_az", label: "Status: A - Z" },
      { value: "status_za", label: "Status: Z - A" },
      { value: "start_date_newest", label: "Start Date: Newest" },
      { value: "start_date_oldest", label: "Start Date: Oldest" },
      { value: "end_date_newest", label: "End Date: Newest" },
      { value: "end_date_oldest", label: "End Date: Oldest" },
    ],
    []
  );

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (sortOrder !== defaultSort) n += 1;
    return n;
  }, [sortOrder]);

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

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "Confirmation",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
  });

  const [confirmBusy, setConfirmBusy] = useState(false);

  const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
    setConfirmState({
      open: true,
      title: title || "Confirmation",
      message: message || "",
      confirmText: confirmText || "OK",
      cancelText: cancelText ?? "Cancel",
      onConfirm: onConfirm || null,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
  };

  const handleConfirm = async () => {
    const fn = confirmState.onConfirm;

    if (!fn) {
      closeConfirm();
      return;
    }

    const snapshot = {
      title: confirmState.title,
      message: confirmState.message,
      confirmText: confirmState.confirmText,
      cancelText: confirmState.cancelText,
      onConfirm: confirmState.onConfirm,
    };

    try {
      setConfirmBusy(true);
      await fn?.();

      setConfirmState((prev) => {
        const isSameDialog =
          prev.open &&
          prev.onConfirm === snapshot.onConfirm &&
          prev.title === snapshot.title &&
          prev.message === snapshot.message &&
          prev.confirmText === snapshot.confirmText &&
          prev.cancelText === snapshot.cancelText;

        if (!isSameDialog) return prev;

        const wasConfirmation = snapshot.cancelText != null && snapshot.cancelText !== "";
        if (!wasConfirmation) {
          return { ...prev, open: false, onConfirm: null };
        }

        return {
          open: true,
          title: "Success",
          message: "Action completed successfully.",
          confirmText: "OK",
          cancelText: null,
          onConfirm: null,
        };
      });
    } catch (e) {
      setConfirmState({
        open: true,
        title: "Error",
        message: e?.message || "Action failed.",
        confirmText: "OK",
        cancelText: null,
        onConfirm: null,
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  const [newProject, setNewProject] = useState({
    project_name: "",
    site_location: "",
    start_date: "",
    end_date: "",
    status: PROJECT_STATUSES.ACTIVE,
  });

  const [itemOffset, setItemOffset] = useState(0);

  const filteredProjects = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? projects
      : projects.filter((p) => {
          const haystack = `${p.project_name || ""} ${p.site_location || ""} ${
            p.status || ""
          }`.toLowerCase();
          return haystack.includes(q);
        });

    return [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case "project_name_za":
          return compareText(b.project_name, a.project_name);
        case "site_location_az":
          return compareText(a.site_location, b.site_location);
        case "site_location_za":
          return compareText(b.site_location, a.site_location);
        case "status_az":
          return compareText(a.status, b.status);
        case "status_za":
          return compareText(b.status, a.status);
        case "start_date_newest":
          return compareDate(b.start_date, a.start_date);
        case "start_date_oldest":
          return compareDate(a.start_date, b.start_date);
        case "end_date_newest":
          return compareDate(b.end_date, a.end_date);
        case "end_date_oldest":
          return compareDate(a.end_date, b.end_date);
        case "project_name_az":
        default:
          return compareText(a.project_name, b.project_name);
      }
    });
  }, [projects, searchTerm, sortOrder]);

  let cardDescriptors;

  if (mode === "add") {
    cardDescriptors = [
      { type: "new" },
      ...filteredProjects.map((p) => ({ type: "view", project: p })),
    ];
  } else {
    cardDescriptors = filteredProjects.map((p) => ({
      type: "view",
      project: p,
    }));
  }

  const itemsPerPage = 6;
  const endOffset = itemOffset + itemsPerPage;
  const currentProj = cardDescriptors.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(cardDescriptors.length / itemsPerPage);
  const multiPages = pageCount > 1;

  const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
  };

  useEffect(() => {
    setItemOffset(0);
  }, [mode, projects.length, searchTerm, sortOrder]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await get("/projects");

      if (response.success) {
        const data = Array.isArray(response.data) ? response.data : [];
        setProjects(data);
        return data;
      }
      return [];
    } catch (error) {
      console.error("Failed to fetch projects:", error);
      setError(error.message || "Failed to load projects");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreateProject = async () => {
    if (!newProject.project_name || !newProject.site_location) {
      openConfirm({
        title: "Missing fields",
        message: "Please fill in project name and location.",
        confirmText: "OK",
        cancelText: null,
      });
      return;
    }

    openConfirm({
      title: "Create project",
      message: `Create project "${newProject.project_name}"?`,
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setActionLoading(true);

          const response = await post("/projects", {
            project_name: newProject.project_name,
            site_location: newProject.site_location,
            start_date: newProject.start_date || null,
            end_date: newProject.end_date || null,
            status: newProject.status || PROJECT_STATUSES.ACTIVE,
          });

          if (response.success) {
            setProjects((prev) => [...prev, response.data]);
            setNewProject({
              project_name: "",
              site_location: "",
              start_date: "",
              end_date: "",
              status: PROJECT_STATUSES.ACTIVE,
            });
            setMode("view");
            openConfirm({
              title: "Success",
              message: `Project "${newProject.project_name}" created successfully.`,
              confirmText: "OK",
              cancelText: null,
            });
          }
        } catch (error) {
          console.error("Create project error:", error);
          openConfirm({
            title: "Error",
            message: error.message || "Failed to create project",
            confirmText: "OK",
            cancelText: null,
          });
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const addProj = {
    project_name: "",
    site_location: "",
    start_date: "",
    end_date: "",
    status: PROJECT_STATUSES.ACTIVE,
  };
  
  const [initialAddData, setInitialAddData] = useState(addProj);
  const data = newProject;
  const initialData = initialAddData;

  const handleAddClick = () => {
    setNewProject(addProj);
    setInitialAddData(addProj); // snapshot
    setMode("add");
  };

  const unsavedChanges = mode === "add" && JSON.stringify(data) !== JSON.stringify(initialData);

  const handleCancelAdd = () => {
    if (!unsavedChanges) {
      setMode("view");
      return;
    }

    openConfirm({
      title: "Cancel adding project",
      message: "Leave without saving your changes?",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: () => {
        setNewProject(addProj);
        setMode("view");
      },
    });
  };

  const handleGenerateReport = async ({ startDate, endDate, fileType, category } = {}) => {
    setReportLoading(true);
    try {
    const freshData = await fetchProjects();
    const base =
      startDate || endDate
        ? filterRowsByDateRange(freshData, (p) => p?.start_date, startDate, endDate)
        : freshData;

    const cat = category || "all";
    const filteredProjects = base.filter((p) => {
      const s = String(p?.status || "");
      if (cat === "active") return s === PROJECT_STATUSES.ACTIVE;
      if (cat === "completed") return s === PROJECT_STATUSES.COMPLETED;
      if (cat === "on_hold") return s === PROJECT_STATUSES.ON_HOLD;
      return true;
    });

    const membersResults = await Promise.all(
      filteredProjects.map((p) =>
        get(`/projects/${p.id}/members`)
          .then((res) => (res?.success ? res.data : []))
          .catch(() => [])
      )
    );

    const rowsForExport = filteredProjects.flatMap((p, i) => {
      const members = Array.isArray(membersResults[i]) ? membersResults[i] : [];
      if (members.length === 0) {
        return [{
          project_name: p.project_name,
          site_location: p.site_location,
          start_date: p.start_date,
          end_date: p.end_date || '—',
          status: p.status,
          employee_count: p.employee_count ?? 0,
          employee_id: '',
          employee_name: '',
          position: '',
          personnel_type: '',
        }];
      }
      return members.map((m) => ({
        project_name: p.project_name,
        site_location: p.site_location,
        start_date: p.start_date,
        end_date: p.end_date || '—',
        status: p.status,
        employee_count: p.employee_count ?? 0,
        employee_id: m.employees?.employee_id || '',
        employee_name: [m.employees?.first_name, m.employees?.middle_name, m.employees?.last_name]
          .filter(Boolean).join(' '),
        position: m.employees?.positions?.position_title || '',
        personnel_type: m.employees?.personnel_type || '',
      }));
    });

    const stamp = new Date().toISOString().slice(0, 10);
    const upperType = String(fileType || "XLSX").toUpperCase();
    const isCsv = upperType === "CSV";
    const isPdf = upperType === "PDF";
    const ext = isPdf ? "pdf" : isCsv ? "csv" : "xlsx";
    const filename = `projects-report-${cat}-${stamp}.${ext}`;

    post("/audit-logs/reports", {
      report_name: "Projects Report",
      filename,
      start_date: startDate || null,
      end_date: endDate || null,
      row_count: rowsForExport.length,
      source: "projects",
    }).catch(() => {});

    const columns = [
      { header: "Project Name", value: (r) => r.project_name },
      { header: "Site Location", value: (r) => r.site_location },
      { header: "Start Date", value: (r) => r.start_date },
      { header: "End Date", value: (r) => r.end_date },
      { header: "Status", value: (r) => r.status },
      { header: "Employee Count", value: (r) => r.employee_count },
      { header: "Employee ID", value: (r) => r.employee_id },
      { header: "Employee Name", value: (r) => r.employee_name },
      { header: "Position", value: (r) => r.position },
      { header: "Personnel Type", value: (r) => r.personnel_type },
    ];

    if (isPdf) {
      const counts = {
        [PROJECT_STATUSES.ACTIVE]: filteredProjects.filter((p) => p.status === PROJECT_STATUSES.ACTIVE).length,
        [PROJECT_STATUSES.COMPLETED]: filteredProjects.filter((p) => p.status === PROJECT_STATUSES.COMPLETED).length,
        [PROJECT_STATUSES.ON_HOLD]: filteredProjects.filter((p) => p.status === PROJECT_STATUSES.ON_HOLD).length,
      };

      exportReportToPdf({
        filename,
        title: "Projects Report",
        summaryLines: [
          `Category: ${cat}`,
          startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
          `Projects: ${filteredProjects.length} | Active: ${counts[PROJECT_STATUSES.ACTIVE]} | Completed: ${counts[PROJECT_STATUSES.COMPLETED]} | On Hold: ${counts[PROJECT_STATUSES.ON_HOLD]}`,
        ],
        columns,
        rows: rowsForExport,
      }).catch(() => {});
    } else if (isCsv) {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({ filename, sheetName: "Projects", columns, rows: rowsForExport });
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
          <p className="text-gray-600">Loading Projects...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button onClick={fetchProjects} className="bg-[#990100] text-white px-4 py-2 rounded">
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">Projects</h1>

          <div className="flex items=center justify-end md:gap-4 gap-3">
            {mode === "view" && (
              <button className="generate-report-button" onClick={() => setReportOpen(true)}>
                Generate Report
              </button>
            )}

            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
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
                  src="icons/red-search.png"
                  className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                  alt="search"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="flex justify-end mt-6 gap-3 flex-wrap">
          {mode === "view" && (
            <>
              <ReportModal
                open={reportOpen}
                title="Generate Report - Projects"
                onClose={() => setReportOpen(false)}
                onGenerate={handleGenerateReport}
                loading={reportLoading}
                enableDateRange={true}
                dateRangeHint="filters by Start Date"
                fileTypes={["XLSX", "CSV", "PDF"]}
                categoryOptions={[
                  { value: "all", label: "All Projects" },
                  { value: "active", label: "Active" },
                  { value: "completed", label: "Completed" },
                  { value: "on_hold", label: "On Hold" },
                ]}
                defaultCategory="all"
              />

              <button className="mustard-button" onClick={handleAddClick}>
                Add New Project
              </button>
            </>
          )}

          {mode === "add" && (
            <button className="cursor-pointer text-white lg:px-5 px-4 py-[10px] lg:text-[15px] text-xs rounded-md bg-red-700 hover:bg-red-600 hover:scale-105 transition duration-300 ease-in-out" onClick={handleCancelAdd} >
              Cancel Changes
            </button>
          )}
        </div>

        {cardDescriptors.length === 0 && mode === "view" ? (
          <div className="mt-8 text-center py-20">
            <p className="text-gray-500 mb-4">No projects found</p>
            <button
              className="bg-[#F59E0B] text-white px-6 py-3 rounded-md hover:scale-105 transition duration-300 ease-in-out"
              onClick={handleAddClick}
            >
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentProj.map((item, index) => {
              if (item.type === "new") {
                return (
                  <NewProjectCard
                    key="new-project"
                    values={newProject}
                    onChange={setNewProject}
                    onSave={handleCreateProject}
                    loading={actionLoading}
                  />
                );
              }

              return (
                <ViewProjectCard key={item.project.id} project={item.project} index={index} onClick={() => navigate(`/projects/${item.project.id}`)} />
              );
            })}
          </div>
        )}

        {pageCount > 1 && (
          <div className=" flex justify-end mt-6 text-[#990100]">
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

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? "Processing…" : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={Boolean(actionLoading || confirmBusy)}
      />
    </div>
  );
}

export default Projects;