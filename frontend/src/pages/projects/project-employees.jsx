import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { get, post, del, put } from "../../services/api.js";
import ReactPaginate from "react-paginate";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { compareDate, compareText } from "../../utils/sort";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";

function AddEmployeeModal({
  isOpen,
  onClose,
  projectId,
  onEmployeeAdded,
  existingEmployeeIds,
  onNotify,
}) {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [availableEmployees, setAvailableEmployees] = React.useState([]);
  const [assignmentDate, setAssignmentDate] = React.useState(
    new Date().toISOString().split("T")[0]
  );
  const [status, setStatus] = React.useState("Active");
  const [loading, setLoading] = React.useState(false);
  const [addLoading, setAddLoading] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      fetchAvailableEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, projectId]);

  const fetchAvailableEmployees = async () => {
    try {
      setLoading(true);
      const response = await get("/employees");

      if (response.success) {
        setAvailableEmployees(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error);
      onNotify?.({
        title: "Error",
        message: error?.message || "Failed to load employees",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignedIds =
    existingEmployeeIds instanceof Set
      ? existingEmployeeIds
      : new Set(existingEmployeeIds || []);

  const filteredEmployees = searchTerm
    ? availableEmployees
        .filter((emp) => !assignedIds.has(emp.id))
        .filter((emp) => {
          const fullName = `${emp.first_name} ${emp.last_name}`.toLowerCase();
          return fullName.includes(searchTerm.toLowerCase());
        })
    : [];

  const handleSelectEmployee = (employee) => {
    setSelectedEmployee(employee);
    setSearchTerm("");
  };

  const handleAdd = async () => {
    if (!selectedEmployee) return;

    try {
      setAddLoading(true);

      const response = await post("/projectassignments", {
        project_id: projectId,
        employee_id: selectedEmployee.id,
        assignment_date: assignmentDate,
        status: status,
      });

      if (response.success) {
        onNotify?.({
          title: "Success",
          message: `${selectedEmployee.first_name} ${selectedEmployee.last_name} added to project successfully!`,
        });
        onEmployeeAdded();
        setSelectedEmployee(null);
        setSearchTerm("");
        setAssignmentDate(new Date().toISOString().split("T")[0]);
        setStatus("Active");
        onClose();
      }
    } catch (error) {
      console.error("Failed to add employee:", error);
      onNotify?.({
        title: "Error",
        message: error?.message || "Failed to add employee to project",
      });
    } finally {
      setAddLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#EDEDED]/50 p-4">
      <div
        className="bg-white rounded-lg shadow-lg w-full max-w-[560px] p-6 min-h-[300px] max-h-[90vh] overflow-y-auto"
        data-lenis-prevent
      >
        <div className="bg-[#990100] rounded-lg px-5 py-3 flex justify-between items-center">
          <h1 className="text-white text-lg font-semibold">Add New Employee</h1>
          <button
            onClick={onClose}
            className="text-white text-2xl font-bold hover:scale-110 transition"
          >
            ✕
          </button>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          {loading ? (
            <p className="text-gray-600">Loading employees...</p>
          ) : (
            <>
              <div className="flex items-center gap-3 w-full max-w-md">
                <input
                  type="text"
                  placeholder="Search Name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-base shadow"
                />

                <button
                  onClick={handleAdd}
                  disabled={!selectedEmployee || addLoading}
                  className={`px-6 py-2 rounded-lg text-base font-medium transition
                    ${
                      selectedEmployee && !addLoading
                        ? "bg-[#990100] text-white hover:bg-[#7a0100] hover:scale-105"
                        : "bg-gray-300 text-gray-600 cursor-not-allowed"
                    }`}
                >
                  {addLoading ? "Adding ..." : "Add"}
                </button>
              </div>

              {filteredEmployees.length > 0 && (
                <div
                  className="w-full max-w-md border rounded-lg bg-white shadow max-h-40 overflow-y-auto"
                  data-lenis-prevent
                >
                  {filteredEmployees.map((employee) => (
                    <button
                      key={employee.id}
                      type="button"
                      onClick={() => handleSelectEmployee(employee)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[#F5F5F5]"
                    >
                      {employee.first_name} {employee.last_name} (
                      {employee.employee_id})
                    </button>
                  ))}
                </div>
              )}

              {selectedEmployee && (
                <input
                  type="text"
                  value={`${selectedEmployee.first_name} ${selectedEmployee.last_name} (${selectedEmployee.employee_id})`}
                  readOnly
                  className="w-full max-w-md border rounded-lg px-3 py-2 text-base shadow bg-gray-50"
                />
              )}

              {selectedEmployee && (
                <>
                  <div className="w-full max-w-md mt-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Assignment Date
                    </label>
                    <input
                      type="date"
                      value={assignmentDate}
                      onChange={(e) => setAssignmentDate(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-base shadow"
                    />
                  </div>

                  <div className="w-full max-w-md">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-base shadow"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ProjectEmployees() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const canEditProject = user?.role === ROLES.ADMIN || user?.role === ROLES.HR;

  const [locationEditOpen, setLocationEditOpen] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [locationSaving, setLocationSaving] = useState(false);

  const [projectEmployees, setProjectEmployees] = useState([]);
  const [projectDetails, setProjectDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("name_az");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  useEffect(() => {
    setDraftSortOrder(sortOrder);
  }, [sortOrder]);

  const sortOptions = useMemo(
    () => [
      { value: "employee_id_asc", label: "Employee ID: Ascending" },
      { value: "employee_id_desc", label: "Employee ID: Descending" },
      { value: "name_az", label: "Name: A - Z" },
      { value: "name_za", label: "Name: Z - A" },
      { value: "position_az", label: "Position: A - Z" },
      { value: "position_za", label: "Position: Z - A" },
      { value: "personnel_type_az", label: "Personnel Type: A - Z" },
      { value: "personnel_type_za", label: "Personnel Type: Z - A" },
      { value: "date_added_newest", label: "Date Added: Newest" },
      { value: "date_added_oldest", label: "Date Added: Oldest" },
    ],
    []
  );

  const activeFiltersCount = useMemo(() => {
    return draftSortOrder ? 1 : 0;
  }, [draftSortOrder]);

  const clearDraftFilters = () => {
    setDraftSortOrder("name_az");
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

  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const openAddModal = () => setAddModalOpen(true);
  const closeAddModal = () => setAddModalOpen(false);

  const formatDate = (value) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
      cancelText: cancelText || "Cancel",
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

        const wasConfirmation =
          snapshot.cancelText != null && snapshot.cancelText !== "";
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

  const openInfo = ({ title, message }) => {
    openConfirm({
      title: title || "Info",
      message: message || "",
      confirmText: "OK",
      cancelText: null,
      onConfirm: null,
    });
  };

  const fetchProjectDetails = async () => {
    try {
      const response = await get(`/projects/${projectId}`);

      if (response.success) {
        setProjectDetails(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch project details:", error);
    }
  };

  useEffect(() => {
    const loc = projectDetails?.site_location || "";
    setLocationInput(loc);
  }, [projectDetails?.site_location]);

  const saveLocation = async () => {
    const next = locationInput.trim();
    if (!next || !projectId) return;

    openConfirm({
      title: "Confirm update",
      message: "Update project location?",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          setLocationSaving(true);
          const resp = await put(`/projects/${projectId}`, {
            site_location: next,
          });
          if (resp?.success) {
            setProjectDetails((prev) =>
              prev ? { ...prev, site_location: next } : prev
            );
            setLocationEditOpen(false);
            openInfo({ title: "Success", message: "Project location updated." });
          } else {
            openInfo({
              title: "Error",
              message: resp?.message || "Failed to update project location",
            });
          }
        } catch (e) {
          console.error("Failed to update project location:", e);
          openInfo({
            title: "Error",
            message: e?.message || "Failed to update project location",
          });
        } finally {
          setLocationSaving(false);
        }
      },
    });
  };

  const fetchProjectEmployees = async () => {
    try {
      setLoading(true);
      const response = await get(`/projectassignments/by-project/${projectId}`);

      if (response.success) {
        setProjectEmployees(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch project employees:", error);
      setError(error.message || "Failed to load employees");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEmployee = async (assignmentId) => {
    openConfirm({
      title: "Remove employee",
      message: "Are you sure you want to remove this employee from the project?",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: async () => {
        try {
          const response = await del(`/projectassignments/${assignmentId}`);

          if (response.success) {
            openInfo({
              title: "Success",
              message: "Employee removed from project successfully!",
            });
            fetchProjectEmployees();
          }
        } catch (error) {
          console.error("Failed to remove employee:", error);
          openInfo({
            title: "Error",
            message:
              error?.message || "Failed to remove employee from project",
          });
        }
      },
    });
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails();
      fetchProjectEmployees();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // REACT-PAGINATE
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const filtered = !q
      ? projectEmployees
      : projectEmployees.filter((a) => {
          const emp = a.employees || {};
          const name = `${emp.first_name || ""} ${emp.last_name || ""}`.toLowerCase();
          const empId = String(emp.employee_id || "").toLowerCase();
          const position = String(emp.positions?.position_title || "").toLowerCase();
          const type = String(emp.personnel_type || "").toLowerCase();
          return (
            name.includes(q) ||
            empId.includes(q) ||
            position.includes(q) ||
            type.includes(q)
          );
        });

    const sorted = [...filtered].sort((a, b) => {
      const aEmp = a.employees || {};
      const bEmp = b.employees || {};

      const aNameKey = `${aEmp.last_name || ""} ${aEmp.first_name || ""}`.trim();
      const bNameKey = `${bEmp.last_name || ""} ${bEmp.first_name || ""}`.trim();

      switch (sortOrder) {
        case "employee_id_asc":
          return compareText(aEmp.employee_id, bEmp.employee_id);
        case "employee_id_desc":
          return compareText(bEmp.employee_id, aEmp.employee_id);
        case "name_za":
          return compareText(bNameKey, aNameKey);
        case "position_az":
          return compareText(
            aEmp.positions?.position_title,
            bEmp.positions?.position_title
          );
        case "position_za":
          return compareText(
            bEmp.positions?.position_title,
            aEmp.positions?.position_title
          );
        case "personnel_type_az":
          return compareText(aEmp.personnel_type, bEmp.personnel_type);
        case "personnel_type_za":
          return compareText(bEmp.personnel_type, aEmp.personnel_type);
        case "date_added_newest":
          return compareDate(b.assignment_date, a.assignment_date);
        case "date_added_oldest":
          return compareDate(a.assignment_date, b.assignment_date);
        case "name_az":
        default:
          return compareText(aNameKey, bNameKey);
      }
    });

    return sorted;
  }, [projectEmployees, searchTerm, sortOrder]);

  const endOffset = itemOffset + itemsPerPage;
  const currentProjEmp = filteredAssignments.slice(itemOffset, endOffset);
  const assignedEmployeeIds = new Set(
    projectEmployees.map((a) => a.employee_id).filter(Boolean)
  );

  const pageCount = Math.ceil(filteredAssignments.length / itemsPerPage);
  const multiPages = pageCount > 1;

  const handlePageClick = (event) => {
    const newOffset = event.selected * itemsPerPage;
    setItemOffset(newOffset);
  };

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, projectEmployees.length]);

  return (
    <div>
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/projects")}
              className="text-[#990100] hover:text-[#CC0000] transition-colors flex items-center gap-1 text-sm font-medium cursor-pointer"
            >
              <span className="text-xl">←</span>Back
            </button>
            <span className="text-gray-300">|</span>
            <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
              {projectDetails?.project_name || `Project #${projectId}`} Employees
            </h1>
          </div>

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
                      <p className="text-sm font-bold text-[#990100]">
                        Filters
                      </p>
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
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        Sort
                      </p>
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
                        onClick={clearDraftFilters}
                        className="text-[#C60000] font-semibold hover:underline"
                      >
                        Clear all
                      </button>

                      <button
                        type="button"
                        onClick={applyDraftFilters}
                        className="bg-[#C60000] text-white px-6 py-2 rounded-md hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out"
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
              <img
                src="/icons/red-search.png"
                className="absolute right-2 top-2 w-5 h-5"
                alt="search"
              />
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        <div className="mt-6 bg-white rounded-lg border border-gray-200 shadow-lg p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-[#990100]">
                Project Overview
              </h2>

              <div className="mt-3 rounded-md border border-gray-200 overflow-hidden">
                <div className="bg-[#EDEDED] px-4 py-3">
                  <p className="text-center font-bold text-gray-900 tracking-wide uppercase">
                    {(projectDetails?.project_name || `Project #${projectId}`) +
                      (projectDetails?.site_location
                        ? `, ${projectDetails.site_location}`
                        : "")}
                  </p>
                </div>

                <div className="px-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-[180px_12px_1fr] gap-y-2 text-sm text-gray-900">
                    <div className="font-semibold uppercase tracking-wide">
                      Project ID
                    </div>
                    <div className="font-semibold hidden sm:block">:</div>
                    <div className="break-words">
                      {projectDetails?.project_code || projectId || "—"}
                    </div>

                    <div className="font-semibold uppercase tracking-wide">
                      Project Name
                    </div>
                    <div className="font-semibold hidden sm:block">:</div>
                    <div className="break-words">
                      {projectDetails?.project_name || "—"}
                    </div>

                    <div className="font-semibold uppercase tracking-wide">
                      Status
                    </div>
                    <div className="font-semibold hidden sm:block">:</div>
                    <div className="break-words">
                      {projectDetails?.status || "—"}
                    </div>

                    <div className="font-semibold uppercase tracking-wide">
                      Date Started
                    </div>
                    <div className="font-semibold hidden sm:block">:</div>
                    <div className="break-words">
                      {formatDate(projectDetails?.start_date)}
                    </div>

                    <div className="font-semibold uppercase tracking-wide">
                      Contract Completion Date
                    </div>
                    <div className="font-semibold hidden sm:block">:</div>
                    <div className="break-words">
                      {formatDate(projectDetails?.end_date)}
                    </div>

                    <div className="font-semibold uppercase tracking-wide">
                      Location
                    </div>
                    <div className="font-semibold hidden sm:block">:</div>
                    <div className="break-words">
                      {projectDetails?.site_location || "—"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {canEditProject && (
              <button
                type="button"
                onClick={() => {
                  setLocationEditOpen((v) => !v);
                }}
                className="bg-[#990100] text-white px-4 py-2 rounded-md hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
              >
                {locationEditOpen ? "Close" : "Update Location"}
              </button>
            )}
          </div>

          {locationEditOpen && canEditProject && (
            <div className="mt-4">
              <div className="mt-3 flex flex-col md:flex-row gap-3 items-start md:items-center">
                <div className="flex-1 w-full">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    placeholder="Enter location"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={saveLocation}
                  disabled={locationSaving || !locationInput.trim()}
                  className={`px-5 py-2 rounded-md text-sm text-white transition ${
                    locationSaving || !locationInput.trim()
                      ? "bg-[#ad3332]/60 cursor-not-allowed"
                      : "bg-[#990100] hover:bg-[#ad3332] hover:scale-105"
                  }`}
                >
                  {locationSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex justify-center items-center py-20">
            <p className="text-gray-600">Loading employees...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
            <button
              onClick={() => {
                setError("");
                fetchProjectDetails();
                fetchProjectEmployees();
              }}
              className="mt-2 bg-red-600 text-white px-4 py-2 rounded text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <div className="flex justify-end mt-5">
            <button onClick={openAddModal} className="generate-report-button">
              Add Employee
            </button>
          </div>
        )}

        <div className="div-table">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">
                  Employee ID
                </th>
                <th className="th-style">Name</th>
                <th className="th-style">Position</th>
                <th className="th-style">Personnel Type</th>
                <th className="th-style">Date Added</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="tbody-style">
              {currentProjEmp.map((assignment) => (
                <tr key={assignment.id} className="tr-style">
                  <td className="td-style font-medium">
                    {assignment.employees?.employee_id || "N/A"}
                  </td>
                  <td className="td-style">
                    {(assignment.employees?.first_name || "") +
                      " " +
                      (assignment.employees?.last_name || "") || "Unknown"}
                  </td>
                  <td className="td-style">
                    {assignment.employees?.positions?.position_title || "N/A"}
                  </td>
                  <td className="td-style">
                    {assignment.employees?.personnel_type}
                  </td>
                  <td className="td-style">
                    {assignment.assignment_date
                      ? new Date(assignment.assignment_date).toLocaleDateString(
                          "en-US",
                          { month: "2-digit", day: "2-digit", year: "2-digit" }
                        )
                      : "N/A"}
                  </td>

                  <td className="td-style">
                    <button
                      onClick={() => handleDeleteEmployee(assignment.id)}
                      className="bg-[#CC0000] text-white text-sm px-4 py-[6px] rounded-lg hover:bg-[#aa0000] hover:scale-105 transition"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />
          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{currentProjEmp.length}</b> of{" "}
              <b>{filteredAssignments.length}</b>
            </p>

            <div>
              {multiPages && (
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
              )}
            </div>
          </div>
        </div>
      </div>

      <AddEmployeeModal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        projectId={projectId}
        onEmployeeAdded={fetchProjectEmployees}
        existingEmployeeIds={assignedEmployeeIds}
        onNotify={openInfo}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? "Processing…" : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={confirmBusy}
      />
    </div>
  );
}

export default ProjectEmployees;